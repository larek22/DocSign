import express from 'express';
import analyzeRoute from './analyze.route.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '2mb' }));
app.use('/api', analyzeRoute);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`LLM pipeline server listening on :${PORT}`);
});
