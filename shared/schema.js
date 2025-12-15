import { z } from 'zod';

export const riskSchema = z.object({
  id: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  category: z.enum(['payment', 'liability', 'term', 'termination', 'jurisdiction', 'privacy', 'ip', 'other']).default('other'),
  title: z.string(),
  why: z.string(),
  quote: z.string().max(400),
  location: z.object({
    chunk: z.number().int().nonnegative(),
    start: z.number().int().nonnegative().optional(),
    end: z.number().int().nonnegative().optional(),
  }),
  fix: z.object({
    action: z.string().optional(),
    proposed_text: z.string().optional(),
  }),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const analysisResultSchema = z.object({
  doc: z
    .object({
      title: z.string().optional(),
      lang: z.string().optional(),
      type: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .default({}),
  summary: z
    .object({
      one_liner: z.string().optional(),
      key_points: z.array(z.string()).default([]),
    })
    .default({ key_points: [] }),
  risks: z.array(riskSchema).default([]),
  missing: z
    .array(
      z.object({
        question: z.string(),
        why: z.string().optional(),
      })
    )
    .default([]),
  redflags: z
    .array(
      z.object({
        title: z.string(),
        why: z.string().optional(),
        quote: z.string().optional(),
      })
    )
    .default([]),
  meta: z
    .object({
      model: z.string().default('gpt-5-mini'),
      chunks: z.number().int().nonnegative().default(0),
      elapsed_ms: z.number().int().nonnegative().default(0),
      steps: z.array(z.object({ step: z.string(), status: z.enum(['pending', 'running', 'done', 'error']), detail: z.string().optional() })).optional(),
    })
    .default({ model: 'gpt-5-mini', chunks: 0, elapsed_ms: 0 }),
});

export const schemaDescription = `JSON schema strictly:
{
  doc: { title?:string, lang?:string, type?:string, confidence?:number },
  summary: { one_liner?:string, key_points:string[] },
  risks: [
    { id:string, severity:"high|medium|low", category:"payment|liability|term|termination|jurisdiction|privacy|ip|other", title:string, why:string, quote:string<=400, location:{chunk:number,start?:number,end?:number}, fix:{action?:string, proposed_text?:string}, confidence:number }
  ],
  missing: [{ question:string, why?:string }],
  redflags: [{ title:string, why?:string, quote?:string }],
  meta: { model:string, chunks:number, elapsed_ms:number, steps?:[{step:string,status:"pending|running|done|error",detail?:string}] }
}`;

export const validateAnalysis = (payload) => analysisResultSchema.safeParse(payload);
