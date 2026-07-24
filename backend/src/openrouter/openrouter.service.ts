// backend/src/openrouter/openrouter.service.ts

import { Injectable, Logger } from '@nestjs/common';

export type OpenRouterChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

/**
 * OpenRouterはOpenAI互換のREST API。SDKは使わずfetchで直接呼ぶ
 * (この環境では新規npmパッケージのインストールができないため)
 */
@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  async chat(
    history: OpenRouterChatMessage[],
    message: string,
    systemInstruction: string,
    apiKey?: string,
  ): Promise<string> {
    const key = apiKey || process.env.OPENROUTER_API_KEY;

    if (!key) {
      throw new Error('OpenRouter APIキーが設定されていません。');
    }

    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...history,
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenRouter API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('OpenRouterから有効な応答が得られませんでした。');
    }

    return text.trim();
  }
}
