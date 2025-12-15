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
      const content = extractText(parsed);
      log?.('info', 'LLM ответ получен', { raw: content?.slice(0, 400) || 'пусто' });
      return content;
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
