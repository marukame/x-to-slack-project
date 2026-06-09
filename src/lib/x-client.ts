/**
 * X API クライアント
 *
 * - ブックマーク取得（最大10件）
 * - 401 時に自動 token refresh
 * - TokenStore 経由でトークン管理
 */

import type { TokenStore } from "./token-store.js";
import { refreshAccessToken } from "./x-token.js";
import { buildTweetUrl } from "./x-url.js";
import type { BookmarksResponse } from "../types/x.js";
import type { Bookmark } from "../types/bookmark.js";

export interface XClientOptions {
  clientId: string;
  userId: string;
  tokenStore: TokenStore;
  fetchLimit?: number;
}

export class XClient {
  private readonly clientId: string;
  private readonly userId: string;
  private readonly tokenStore: TokenStore;
  private readonly fetchLimit: number;

  constructor(options: XClientOptions) {
    this.clientId = options.clientId;
    this.userId = options.userId;
    this.tokenStore = options.tokenStore;
    this.fetchLimit = options.fetchLimit ?? 10;
  }

  /**
   * ブックマーク一覧を取得し、Bookmark[] に変換して返す
   */
  async fetchBookmarks(): Promise<Bookmark[]> {
    const params = new URLSearchParams({
      max_results: String(this.fetchLimit),
      "tweet.fields": "author_id,created_at,text,lang",
      expansions: "author_id",
      "user.fields": "username",
    });

    const url = `https://api.x.com/2/users/${this.userId}/bookmarks?${params}`;
    const response = await this.fetchWithRefresh(url);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Bookmarks API failed: ${response.status} ${body}`);
    }

    const json: BookmarksResponse = await response.json();

    if (!json.data || json.data.length === 0) {
      return [];
    }

    // author_id → username のマップ
    const userMap = new Map<string, string>();
    if (json.includes?.users) {
      for (const user of json.includes.users) {
        userMap.set(user.id, user.username);
      }
    }

    return json.data.map((tweet) => {
      const username = userMap.get(tweet.author_id);
      return {
        tweetId: tweet.id,
        authorUsername: username,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
        url: buildTweetUrl(tweet.id, username),
        text: tweet.text,
        lang: tweet.lang,
      };
    });
  }

  /**
   * API 呼び出し。401 なら refresh して1回だけ再試行する。
   */
  private async fetchWithRefresh(url: string): Promise<Response> {
    const tokens = await this.tokenStore.read();

    const firstResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (firstResponse.status !== 401) {
      return firstResponse;
    }

    // token refresh
    const newTokens = await refreshAccessToken(
      this.clientId,
      tokens.refreshToken,
    );
    await this.tokenStore.write(newTokens);

    return fetch(url, {
      headers: { Authorization: `Bearer ${newTokens.accessToken}` },
    });
  }
}
