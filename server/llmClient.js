const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extractText = (data, log) => {
  if (!data) return { text: '', types: [] };

  const types = [];
  const parts = [];

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    types.push('output_text');
    parts.push(data.output_text);
  }

  if (Array.isArray(data.output)) {
    data.output.forEach((item) => {
      if (!item?.content) return;
      item.content.forEach((c) => {
        if (!c) return;
        if (c.json) {
          types.push(`content:${c.type || 'json'}`);
          try {
            parts.push(JSON.stringify(c.json));
          } catch (e) {
            parts.push('');
          }
          return;
        }
        if (typeof c.text === 'string') {
          types.push(`content:${c.type || 'text'}`);
          parts.push(c.text);
        }
      });
    });
  }

  if (!parts.length && Array.isArray(data.choices)) {
    types.push('choices');
    const content = data.choices[0]?.message?.content;
    if (content) parts.push(content);
  }

  if (!parts.length) {
    log?.('info', 'LLM ответ без извлекаемого контента', { keys: Object.keys(data || {}) });
    return { text: '', types };
  }

  return { text: parts.join(''), types };
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
    response_format: { type: 'json_object' },
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

    const bodyText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch (e) {
      parsed = null;
    }

    if (response.ok) {
      const { text, types } = extractText(parsed, log);
      log?.('info', 'LLM ответ получен', {
        raw: text?.slice(0, 400) || 'пусто',
        contentTypes: types,
      });
      if (!text?.trim()) {
        throw new Error('LLM ответ пуст: не удалось извлечь текст или JSON.');
      }
      return text;
    }

    log?.('error', 'Ответ LLM вернул ошибку', { status: response.status, body: bodyText.slice(0, 400) });

    if (response.status === 429 || response.status >= 500) {
      attempt += 1;
      if (attempt > MAX_RETRIES) throw new Error(`LLM ошибка ${response.status}: ${bodyText}`);
      await sleep(400 * attempt);
      continue;
    }

    throw new Error(`LLM ошибка ${response.status}: ${bodyText}`);
  }
};
