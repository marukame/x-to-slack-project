/**
 * ブックマーク同期ユースケース
 *
 * 処理フロー:
 * 1. X API からブックマーク取得
 * 2. Firestore で重複判定
 * 3. BOOTSTRAP_MODE 判定
 * 4. Slack 投稿（BOOTSTRAP_MODE=false の場合のみ）
 * 5. Firestore 保存（Slack 投稿成功後）
 * 6. ログ出力
 */

import type { AppConfig } from "../config/env.js";
import type { XClient } from "../lib/x-client.js";
import type { BookmarkStore } from "../lib/firestore.js";
import type { SlackClient } from "../lib/slack.js";
import type { GeminiClient } from "../lib/gemini.js";
import { filterNewBookmarks } from "./filter-new-bookmarks.js";

export interface SyncResult {
  event: string;
  fetched_count: number;
  new_count: number;
  posted_count: number;
  bootstrap_mode: boolean;
  registered_count?: number;
  error_type?: string;
  message?: string;
  status?: number;
}

export async function syncBookmarks(deps: {
  config: AppConfig;
  xClient: XClient;
  bookmarkStore: BookmarkStore;
  slackClient?: SlackClient;
  geminiClient?: GeminiClient;
}): Promise<SyncResult> {
  const { config, xClient, bookmarkStore, slackClient, geminiClient } = deps;

  // 1. X API からブックマーク取得
  const bookmarks = await xClient.fetchBookmarks();

  // 2. Firestore で重複判定
  const newBookmarks = await filterNewBookmarks(bookmarks, bookmarkStore);

  // 3. BOOTSTRAP_MODE の場合: Slack 投稿せず Firestore に登録して終了
  if (config.bootstrapMode) {
    if (newBookmarks.length > 0) {
      const tweetIds = newBookmarks.map((b) => b.tweetId);
      await bookmarkStore.saveBatch(tweetIds, true);
    }

    return {
      event: "bootstrap_completed",
      fetched_count: bookmarks.length,
      new_count: newBookmarks.length,
      registered_count: newBookmarks.length,
      posted_count: 0,
      bootstrap_mode: true,
    };
  }

  // 4. 新規ブックマークが0件なら何もしない
  if (newBookmarks.length === 0) {
    return {
      event: "no_new_bookmarks",
      fetched_count: bookmarks.length,
      new_count: 0,
      posted_count: 0,
      bootstrap_mode: false,
    };
  }

  // 5. Slack 投稿（1件ずつ個別メッセージで投稿、リンクプレビュー対応）
  if (!slackClient) {
    throw new Error("SLACK_BOT_TOKEN / SLACK_CHANNEL_ID が設定されていない");
  }

  if (config.enableSummary && geminiClient) {
    // 要約付き投稿
    const items = await Promise.all(
      newBookmarks.map(async (b) => {
        const summary = b.text
          ? await geminiClient.summarize(b.text, b.lang)
          : "";
        return { url: b.url, summary };
      }),
    );
    await slackClient.postWithSummaries(items);
  } else {
    // URL のみ投稿
    const urls = newBookmarks.map((b) => b.url);
    await slackClient.postUrls(urls);
  }

  // 6. Slack 投稿成功後に Firestore 保存
  const tweetIds = newBookmarks.map((b) => b.tweetId);
  await bookmarkStore.saveBatch(tweetIds, false);

  return {
    event: "sync_completed",
    fetched_count: bookmarks.length,
    new_count: newBookmarks.length,
    posted_count: newBookmarks.length,
    bootstrap_mode: false,
  };
}
