/**
 * Slack Web API クライアント（chat.postMessage）
 *
 * Incoming Webhook では unfurl_links が機能しないため、
 * Bot Token + Web API を使用して URL プレビューを有効化する。
 */

export class SlackClient {
  private readonly botToken: string;
  private readonly channelId: string;

  constructor(botToken: string, channelId: string) {
    this.botToken = botToken;
    this.channelId = channelId;
  }

  /**
   * テキストメッセージを Slack に投稿する
   */
  async post(text: string): Promise<void> {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify({
        channel: this.channelId,
        text,
        unfurl_links: true,
      }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      throw new Error(`Slack post failed: ${data.error}`);
    }
  }

  /**
   * 複数の URL を1件ずつ個別メッセージで投稿する
   */
  async postUrls(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.post(url);
    }
  }

  /**
   * 要約付きで投稿する（1件ずつ）
   */
  async postWithSummaries(
    items: Array<{ url: string; summary: string }>,
  ): Promise<void> {
    for (const item of items) {
      const text = `${item.summary}\n${item.url}`;
      await this.post(text);
    }
  }
}
