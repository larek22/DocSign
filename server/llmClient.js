const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extractText = (data, log) => {
  if (!data) return { text: '', types: [] };

  const types = [];
  if (data.output_text) {
    types.push('output_text');
    return { text: data.output_text, types };
  }

  if (Array.isArray(data.output)) {
    const parts = data.output.flatMap((item) => {
      if (!item?.content) return [];
      return item.content.map((c) => {
        if (!c) return '';
        if (c.json) {
          types.push(`content:${c.type || 'json'}`);
          try {
            return JSON.stringify(c.json);
          } catch (e) {
            return '';
          }
        }
        types.push(`content:${c.type || 'text'}`);
        return c.text || '';
      });
    });
    return { text: parts.join(''), types };
  }

  if (Array.isArray(data.choices)) {
    types.push('choices');
    return { text: data.choices[0]?.message?.content || '', types };
  }

  log?.('info', 'LLM ответ без извлекаемого контента', { keys: Object.keys(data || {}) });
  return { text: '', types };
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
