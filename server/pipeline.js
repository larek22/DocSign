import { callResponses } from './llmClient.js';
import { normalizeText, chunkText } from './chunking.js';
import { schemaDescription, validateAnalysis } from './schema.js';

const analyzerPrompt = `Ты — старший юрист. На входе текст фрагмента договора (chunk). Задача: найти риски и вернуть ТОЛЬКО JSON по схеме risks[].
Поля: id, severity (high|medium|low), category (payment|liability|term|termination|jurisdiction|privacy|ip|confidentiality|other),
title, why, quote (обязателен: цитата из текста), location:{chunk,start,end}, fix:{action, proposed_text}, confidence (0..1).
Верни JSON { "risks": [...], "missing": [], "redflags": [] } без пояснений.`;

const judgePrompt = `Ты — партнер и судья. Тебе передан массив локальных рисков по чанкам. Объедини дубликаты, снизь шум, оставь только бизнес-значимые.
Верни единый JSON строго по итоговой схеме: ${schemaDescription}
Требования: severity только high/medium/low, quote оставляем, confidence 0..1, category из списка.
Без текста вне JSON.`;

const repairPrompt = `JSON не прошел валидацию. Исправь строго под схему: ${schemaDescription}. Не добавляй пояснений вне JSON.`;

const parseJSON = (raw, log) => {
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fence?.[1] || raw;
  try {
    return JSON.parse(text);
  } catch (error) {
    log?.('error', 'Парсинг JSON не удался', { message: error.message, snippet: text.slice(0, 200) });
    return null;
  }
};

const mapChunkRisks = async ({ chunks, apiKey, log, options }) => {
  const results = [];
  for (let idx = 0; idx < chunks.length; idx += 1) {
    const chunk = chunks[idx];
    log?.('info', 'LLM анализ чанка', { id: chunk.id, size: chunk.text.length });
    const answer = await callResponses({
      system: analyzerPrompt,
      user: `chunk_id: ${chunk.id}\n\n${chunk.text}`,
      apiKey,
      model: options?.model || 'gpt-5-mini',
      maxOutputTokens: options?.maxTokens || 1200,
      topP: options?.topP || 1,
      log,
    });
    const json = parseJSON(answer, log);
    if (json?.risks?.length) {
      json.risks.forEach((r, i) => {
        results.push({ ...r, location: r.location || { chunk: idx }, id: r.id || `${chunk.id}_r${i + 1}` });
      });
    }
  }
  return results;
};

export const analyzeDocument = async ({ text, apiKey, options = {}, log = console.log }) => {
  const started = Date.now();
  const normalized = normalizeText(text);
  const chunks = chunkText(normalized, 1600);

  const chunkRisks = await mapChunkRisks({ chunks, apiKey, log, options });

  const judgeAnswer = await callResponses({
    system: judgePrompt,
    user: JSON.stringify({ chunks, risks: chunkRisks }).slice(0, 12000),
    apiKey,
    model: options?.model || 'gpt-5-mini',
    maxOutputTokens: options?.maxTokens || 1500,
    topP: options?.topP || 1,
    log,
  });

  let combined = parseJSON(judgeAnswer, log);
  const validated = validateAnalysis(combined || {});
  if (!validated.success) {
    log?.('info', 'Запуск repair-прохода для JSON');
    const repairAnswer = await callResponses({
      system: repairPrompt,
      user: judgeAnswer,
      apiKey,
      model: options?.model || 'gpt-5-mini',
      maxOutputTokens: options?.maxTokens || 1500,
      topP: options?.topP || 1,
      log,
    });
    combined = parseJSON(repairAnswer, log);
  }

  const validatedFinal = validateAnalysis(combined || {});
  if (!validatedFinal.success) {
    throw new Error('Итоговый JSON не прошел валидацию после repair.');
  }

  return {
    ...validatedFinal.data,
    meta: {
      ...(validatedFinal.data.meta || {}),
      model: options?.model || 'gpt-5-mini',
      chunks: chunks.length,
      elapsed_ms: Date.now() - started,
    },
  };
};
