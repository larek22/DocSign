import { z } from 'zod';

export const riskSchema = z.object({
  id: z.string().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  category: z
    .enum([
      'payment',
      'liability',
      'term',
      'termination',
      'jurisdiction',
      'privacy',
      'ip',
      'confidentiality',
      'other',
    ])
    .optional(),
  title: z.string().min(1).optional(),
  why: z.string().min(1).optional(),
  quote: z.string().min(1).optional(),
  location: z
    .object({
      chunk: z.number().int().nonnegative(),
      start: z.number().int().nonnegative().optional(),
      end: z.number().int().nonnegative().optional(),
    })
    .optional(),
  fix: z
    .object({
      action: z.string().optional(),
      proposed_text: z.string().optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const analysisSchema = z.object({
  doc: z
    .object({
      title: z.string().optional(),
      lang: z.string().optional(),
      type: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
  summary: z
    .object({
      one_liner: z.string().optional(),
      key_points: z.array(z.string()).optional(),
    })
    .optional(),
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
      model: z.string(),
      chunks: z.number().int().nonnegative().optional(),
      elapsed_ms: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export const schemaDescription = `JSON schema:
{
  doc: { title, lang, type, confidence },
  summary: { one_liner, key_points: [] },
  risks: [
    { id, severity (high|medium|low), category, title, why, quote, location:{chunk,start,end}, fix:{action, proposed_text}, confidence }
  ],
  missing: [{ question, why }],
  redflags: [{ title, why, quote }],
  meta: { model, chunks, elapsed_ms }
}`;

export const validateAnalysis = (payload) => analysisSchema.safeParse(payload);
