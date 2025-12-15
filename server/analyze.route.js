import express from 'express';
import { analyzeDocument } from './pipeline.js';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { text, options } = req.body || {};
  const apiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'API ключ не указан на сервере.' });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Текст документа пуст. Загрузите корректный файл.' });
  }

  const log = (level, message, payload) => {
    // lightweight server log
    // eslint-disable-next-line no-console
    console.log(`[pipeline:${level}] ${message}`, payload || '');
  };

  try {
    const analysis = await analyzeDocument({ text, apiKey, options, log });
    return res.json(analysis);
  } catch (error) {
    const status = /ключ|auth/i.test(error.message) ? 401 : 500;
    return res.status(status).json({ error: error.message });
  }
});

export default router;
