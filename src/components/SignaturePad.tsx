import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PenTool, Edit3, RotateCcw, RotateCw, Trash2, Check } from 'lucide-react';

type ButtonProps = {
  children?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'tool' | 'toolActive';
  className?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  title?: string;
};

type Point = { x: number; y: number; pressure?: number; width?: number; time: number };
type Path = { points: Point[]; color: string; tool: 'fountain' | 'ballpoint' };

type SignaturePadProps = {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
};

const cn = (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(' ');

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false, title }) => {
  const baseStyle = 'flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none';
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    tool: 'p-3 rounded-xl border border-transparent hover:bg-slate-100 text-slate-500 transition-all',
    toolActive: 'p-3 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-sm ring-1 ring-slate-200',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn(baseStyle, variants[variant], className)}>
      {Icon && <Icon size={18} strokeWidth={2.5} />}
      {children}
    </button>
  );
};

const computePressure = (
  e: PointerEvent,
  velocity: number,
  lastPressure: number,
  type: 'fountain' | 'ballpoint',
) => {
  const hasHardwarePressure = e.pressure && e.pressure !== 0.5;

  if (hasHardwarePressure) {
    const pressure = e.pressure;
    const target = type === 'fountain' ? pressure * 4.5 : 2 + pressure * 1.5;
    return lastPressure * 0.7 + target * 0.3;
  }

  const config = {
    fountain: { min: 0.8, max: 4.5, smoothing: 0.85, velocityFactor: 0.6 },
    ballpoint: { min: 2.2, max: 2.8, smoothing: 0.6, velocityFactor: 0.1 },
  };

  const cfg = config[type] || config.fountain;
  let targetWidth = cfg.max - velocity * cfg.velocityFactor;
  targetWidth = Math.max(cfg.min, Math.min(cfg.max, targetWidth));

  return lastPressure * cfg.smoothing + targetWidth * (1 - cfg.smoothing);
};

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<'fountain' | 'ballpoint'>('fountain');
  const [color, setColor] = useState<string>('#0047AB');
  const [history, setHistory] = useState<Path[]>([]);
  const [redoStack, setRedoStack] = useState<Path[]>([]);

  const points = useRef<Point[]>([]);
  const lastPressure = useRef<number>(2);
  const isDrawing = useRef<boolean>(false);

  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    p0: Point & { width: number },
    p1: Point & { width: number },
    p2: Point & { width: number },
  ) => {
    ctx.beginPath();
    const startX = (p0.x + p1.x) / 2;
    const startY = (p0.y + p1.y) / 2;
    const endX = (p1.x + p2.x) / 2;
    const endY = (p1.y + p2.y) / 2;

    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(p1.x, p1.y, endX, endY);
    ctx.lineWidth = p1.width;
    ctx.stroke();
  };

  const redraw = useCallback((ctx: CanvasRenderingContext2D, paths: Path[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    paths.forEach((path) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = path.color;

      if (path.points.length < 2) {
        const p = path.points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = path.color;
        ctx.fill();
        return;
      }

      for (let i = 1; i < path.points.length - 1; i++) {
        drawSegment(ctx, path.points[i - 1], path.points[i], path.points[i + 1]);
      }
    });
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    redraw(ctx, history);
  }, [history, redraw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => requestAnimationFrame(initCanvas));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [initCanvas]);

  const getCoords = (e: PointerEvent): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: (e.clientX - (rect?.left ?? 0)),
      y: (e.clientY - (rect?.top ?? 0)),
      pressure: e.pressure,
      time: Date.now(),
      width: lastPressure.current,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

    isDrawing.current = true;
    const pt = getCoords(e);

    lastPressure.current = tool === 'ballpoint' ? 2 : 1.5;
    points.current = [{ ...pt, width: lastPressure.current }];

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, lastPressure.current / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();

    const baseEvent = e.nativeEvent;
    const events = baseEvent.getCoalescedEvents ? baseEvent.getCoalescedEvents() : [baseEvent];
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    events.forEach((rawEvent) => {
      const pt = getCoords(rawEvent);
      const lastPt = points.current[points.current.length - 1];

      const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      if (dist < 1) return;

      const dt = Math.max(1, pt.time - lastPt.time);
      const velocity = dist / dt;

      const width = computePressure(rawEvent, velocity, lastPressure.current, tool);
      lastPressure.current = width;

      const newPoint = { ...pt, width };
      points.current.push(newPoint);

      if (points.current.length > 2) {
        const i = points.current.length - 2;
        drawSegment(ctx, points.current[i - 1], points.current[i], points.current[i + 1]);
      }
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const newHistory = [...history, { points: [...points.current], color, tool }];
    setHistory(newHistory);
    setRedoStack([]);
    points.current = [];
  };

  const undo = () => {
    if (history.length === 0) return;
    const next = history.slice(0, -1);
    setHistory(next);
    setRedoStack([history[history.length - 1], ...redoStack]);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) redraw(ctx, next);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = [...history, redoStack[0]];
    setHistory(next);
    setRedoStack(redoStack.slice(1));

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) redraw(ctx, next);
  };

  const clear = () => {
    setHistory([]);
    setRedoStack([]);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL());
  }, [onSave]);

  useEffect(() => {
    initCanvas();
  }, [history.length, initCanvas]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <div
        ref={containerRef}
        className="relative h-64 w-full bg-[#fdfdfd] rounded-2xl shadow-inner border border-slate-200 overflow-hidden touch-none select-none group"
        style={{
          backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="relative z-10 w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />

        {history.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <span className="text-2xl text-slate-300 font-serif italic transform -rotate-3">Распишитесь здесь...</span>
          </div>
        )}

        <div className="absolute top-3 right-3 flex gap-1 z-20">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-2 bg-white/80 backdrop-blur rounded-lg hover:bg-white text-slate-600 shadow-sm border border-slate-200 disabled:opacity-30 transition-all"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-2 bg-white/80 backdrop-blur rounded-lg hover:bg-white text-slate-600 shadow-sm border border-slate-200 disabled:opacity-30 transition-all"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={clear}
            disabled={history.length === 0}
            className="p-2 bg-white/80 backdrop-blur rounded-lg hover:bg-white text-red-500 shadow-sm border border-slate-200 disabled:opacity-30 transition-all ml-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <Button variant={tool === 'fountain' ? 'toolActive' : 'tool'} onClick={() => setTool('fountain')} title="Перьевая ручка">
              <PenTool size={20} />
            </Button>
            <Button variant={tool === 'ballpoint' ? 'toolActive' : 'tool'} onClick={() => setTool('ballpoint')} title="Шариковая ручка">
              <Edit3 size={20} />
            </Button>
          </div>

          <div className="flex gap-2 items-center pl-2 border-l border-slate-200">
            {['#0047AB', '#0f172a', '#b91c1c'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-slate-300 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel}>Отмена</Button>
          <Button variant="primary" onClick={handleSave} disabled={history.length === 0} icon={Check}>
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
