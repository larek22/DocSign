import { normalizeText } from './normalize.js';

const headingRegex = /(^|\n)(\d+(?:\.\d+)*\.?|[A-ZА-Я][^\n]{0,60})\n/;

export const chunkText = (rawText, targetSize = 1600) => {
  const text = normalizeText(rawText || '');
  const paragraphs = text.split(/\n{2,}/g);
  const chunks = [];
  let buffer = '';
  let start = 0;
  let chunkId = 0;

  const flush = () => {
    if (!buffer.trim()) return;
    const end = start + buffer.length;
    chunks.push({ id: `chunk_${chunkId++}`, text: buffer.trim(), start, end });
    start = end + 2; // account for split delimiter
    buffer = '';
  };

  paragraphs.forEach((p) => {
    const candidate = buffer ? `${buffer}\n\n${p}` : p;
    const isHeadingSplit = headingRegex.test(`\n${p}\n`);
    if (candidate.length > targetSize || isHeadingSplit) {
      flush();
      buffer = p;
    } else {
      buffer = candidate;
    }
  });

  flush();
  if (!chunks.length) {
    chunks.push({ id: 'chunk_0', text, start: 0, end: text.length });
  }
  return chunks;
};
