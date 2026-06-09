/**
 * Gemini API クライアント — 要約・翻訳
 *
 * - 日本語投稿: 要約のみ
 * - 日本語以外: 日本語に翻訳 → 要約
 */

export class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? "gemini-2.5-flash";
  }

  /**
   * 投稿を要約する。日本語以外の場合は翻訳も行う。
   */
  async summarize(text: string, lang?: string): Promise<string> {
    const isJapanese = lang === "ja";

    const prompt = isJapanese
      ? `以下のSNS投稿を日本語で1〜2文に要約してください。要約のみ出力し、余計な前置きは不要です。\n\n${text}`
      : `以下のSNS投稿を日本語に翻訳し、1〜2文に要約してください。要約のみ出力し、余計な前置きは不要です。\n\n${text}`;

    return this.generate(prompt);
  }

  private async generate(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API failed: ${response.status} ${body}`);
    }

    const json = (await response.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API returned empty response");
    }

    return text.trim();
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}
