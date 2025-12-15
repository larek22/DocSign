const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extractText = (data) => {
  if (!data) return '';
  if (data.output_text) return data.output_text;
  if (Array.isArray(data.output)) {
    return data.output
      .flatMap((item) => item?.content || [])
      .map((c) => c?.text || '')
      .join('');
  }
  if (Array.isArray(data.choices)) {
    return data.choices[0]?.message?.content || '';
  }
  return '';
};

export const callResponses = async ({ system, user, apiKey, model = 'gpt-5-mini', maxOutputTokens = 1200, topP = 1, log }) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const payload = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: system }] },
      { role: 'user', content: [{ type: 'input_text', text: user }] },
    ],
    ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
    ...(topP ? { top_p: topP } : {}),
  };

  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const content = extractText(data);
      log?.('info', 'LLM ответ получен', { content: content.slice(0, 400) || 'пусто' });
      return content;
    }

    const body = await response.text();
    log?.('error', 'Ответ LLM вернул ошибку', { status: response.status, body: body.slice(0, 400) });

    if (response.status === 429 || response.status >= 500) {
      attempt += 1;
      if (attempt > MAX_RETRIES) throw new Error(`LLM ошибка ${response.status}: ${body}`);
      await sleep(300 * attempt);
      continue;
    }
    throw new Error(`LLM ошибка ${response.status}: ${body}`);
  }
};
