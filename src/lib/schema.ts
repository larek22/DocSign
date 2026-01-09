import { z } from 'zod';
import { analysisResultSchema, riskSchema, schemaDescription } from '../../shared/schema.js';

export const AnalysisResultSchema = analysisResultSchema;
export const RiskSchema = riskSchema;
export const SchemaDescription = schemaDescription;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Risk = z.infer<typeof RiskSchema>;
