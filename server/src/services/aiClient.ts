/**
 * Shared AI API Client for Groq / LLM completions
 * Centralizes model fallback, timeout management, JSON parsing, and authentication.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

export async function callGroq(
  prompt: string,
  systemPrompt: string = 'You are an expert academic evaluator, curriculum architect, and skill diagnostic engine for university students. Always respond with strictly valid JSON only. Do not include markdown code blocks or text outside the JSON.'
): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq HTTP ${res.status}: ${errText}`);
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      // Clean markdown code fence if present
      const cleaned = content.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      console.warn(`[Groq AI ${model} Notice]: ${err.message}. Trying next model if available.`);
    }
  }

  throw lastError;
}
