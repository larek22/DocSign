import crypto from 'crypto';
import { callResponses } from './llmClient.js';
import { chunkText } from './chunking.js';
import { normalizeText } from './normalize.js';
import { schemaDescription, validateAnalysis } from './schema.js';

const trimQuote = (quote = '') => (quote.length > 400 ? `${quote.slice(0, 397)}...` : quote);

const parseJSON = (raw, log) => {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fenced?.[1] || raw;
  try {
    return JSON.parse(text);
  } catch (error) {
    log?.('error', 'Парсинг JSON не удался', { message: error.message, snippet: text.slice(0, 200) });
    return null;
  }
};

const analyzerPrompt = `Ты — юрист-аналитик. На входе один chunk договора и его id.
Найди риски, неоднозначности, кабальные условия. Верни ТОЛЬКО JSON формата {"risks":[],"missing":[],"redflags":[]}.
Правила:
- severity: high|medium|low
- category: payment|liability|term|termination|jurisdiction|privacy|ip|other
- quote: краткая цитата <=400 символов из чанка
- location.chunk = индекс чанка
- fix: { action?, proposed_text? }
- confidence 0..1
Никакого полного текста договора, только краткие цитаты.`;

const judgePrompt = `Ты — судья. Тебе даны chunks и локальные риски по ним. Объедини дубликаты, убери шум, нормализуй категории и
верни единый JSON строго по схеме: ${schemaDescription}
Требования: только JSON, цитаты <=400 символов, location.chunk обязателен, confidence 0..1.`;

const repairPrompt = `JSON не прошел валидацию. Исправь строго под схему: ${schemaDescription}. Верни только JSON, без пояснений.`;

const sanitizeRisks = (risks = []) =>
  risks.map((risk) => ({
    ...risk,
    quote: trimQuote(risk.quote || ''),
    id: risk.id || `risk_${crypto.randomUUID()}`,
    location: {
      chunk: Number.isFinite(Number(risk.location?.chunk)) ? Number(risk.location.chunk) : 0,
      start: risk.location?.start,
      end: risk.location?.end,
    },
  }));

const analyzeChunks = async ({ chunks, apiKey, options, log }) => {
  const local = [];
  for (let idx = 0; idx < chunks.length; idx += 1) {
    const chunk = chunks[idx];
    log?.('info', 'LLM анализ чанка', { id: chunk.id, length: chunk.text.length });
    const answer = await callResponses({
      system: analyzerPrompt,
      user: `chunk_id:${idx}\nstart:${chunk.start}\n${chunk.text}`.slice(0, 6000),
      apiKey,
      model: options?.model || 'gpt-5-mini',
      maxOutputTokens: options?.maxTokens || 900,
      topP: 1,
      log,
    });
    const json = parseJSON(answer, log);
    if (json?.risks?.length) {
      json.risks.forEach((r, i) => {
        const locChunk = Number.isFinite(Number(r.location?.chunk)) ? Number(r.location.chunk) : idx;
        local.push({
          ...r,
          id: r.id || `${chunk.id}_r${i + 1}`,
          location: {
            chunk: locChunk,
            start: r.location?.start,
            end: r.location?.end,
          },
          quote: trimQuote(r.quote || ''),
        });
      });
    }
  }
  return local;
};

const attemptRepair = async ({ payload, apiKey, options, log, attempts = 2 }) => {
  let current = payload;
  for (let i = 0; i < attempts; i += 1) {
    const repaired = await callResponses({
      system: repairPrompt,
      user: JSON.stringify(current).slice(0, 12000),
      apiKey,
      model: options?.model || 'gpt-5-mini',
      maxOutputTokens: options?.maxTokens || 1200,
      topP: 1,
      log,
    });
    const json = parseJSON(repaired, log);
    const validated = validateAnalysis(json || {});
    if (validated.success) return validated.data;
    current = json || current;
  }
  return null;
};

export const analyzeDocument = async ({ text, apiKey, options = {}, log = console.log }) => {
  const started = Date.now();
  const steps = [
    { step: 'extract', status: 'running' },
    { step: 'chunk', status: 'pending' },
    { step: 'analyze', status: 'pending' },
    { step: 'validate', status: 'pending' },
  ];

  const normalized = normalizeText(text || '');
  if (!normalized) {
    const err = new Error('Текст документа пуст после нормализации.');
    err.steps = steps;
    throw err;
  }

  steps[0].status = 'done';
  steps[1].status = 'running';
  const chunks = chunkText(normalized, 1400);
  steps[1].status = 'done';

  steps[2].status = 'running';
  const chunkRisks = await analyzeChunks({ chunks, apiKey, options, log });

  const judgeAnswer = await callResponses({
    system: judgePrompt,
    user: JSON.stringify({
      chunks: chunks.map((c, idx) => ({ id: idx, start: c.start, end: c.end, text: c.text.slice(0, 1600) })),
      risks: sanitizeRisks(chunkRisks),
    }).slice(0, 12000),
    apiKey,
    model: options?.model || 'gpt-5-mini',
    maxOutputTokens: options?.maxTokens || 2000,
    topP: 1,
    log,
  });

  const combined = parseJSON(judgeAnswer, log);
  let validated = validateAnalysis(combined || {});
  steps[2].status = 'done';

  if (!validated.success) {
    steps[3].status = 'running';
    const repaired = await attemptRepair({ payload: combined || {}, apiKey, options, log });
    if (repaired) {
      validated = { success: true, data: repaired };
    }
  }

  if (!validated.success) {
    steps[3].status = 'error';
    const err = new Error('Итоговый JSON не прошел валидацию даже после repair.');
    err.steps = steps;
    throw err;
  }

  const data = validated.data;
  const finalRisks = sanitizeRisks(data.risks).map((r) => ({ ...r, quote: trimQuote(r.quote || '') }));

  steps[3].status = 'done';

  return {
    ...data,
    risks: finalRisks,
    meta: {
      ...(data.meta || {}),
      model: options?.model || 'gpt-5-mini',
      chunks: chunks.length,
      elapsed_ms: Date.now() - started,
      steps,
    },
  };
};
