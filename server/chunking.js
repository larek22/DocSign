export const normalizeText = (input = '') =>
  input
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const chunkText = (text, targetSize = 1200) => {
  const normalized = normalizeText(text);
  const paragraphs = normalized.split(/\n{2,}/g);
  const chunks = [];
  let buffer = '';
  let chunkIndex = 0;
  paragraphs.forEach((p) => {
    const candidate = buffer ? `${buffer}\n\n${p}` : p;
    if (candidate.length >= targetSize && buffer) {
      chunks.push({ id: `chunk_${chunkIndex++}`, text: buffer });
      buffer = p;
    } else if (candidate.length >= targetSize) {
      chunks.push({ id: `chunk_${chunkIndex++}`, text: candidate });
      buffer = '';
    } else {
      buffer = candidate;
    }
  });
  if (buffer) {
    chunks.push({ id: `chunk_${chunkIndex++}`, text: buffer });
  }
  if (!chunks.length) {
    chunks.push({ id: 'chunk_0', text: normalized });
  }
  return chunks;
};
