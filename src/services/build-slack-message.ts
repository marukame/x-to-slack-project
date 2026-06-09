/**
 * Slack 投稿メッセージ生成
 *
 * 1時間分のブックマーク URL をまとめて1メッセージにする
 */

import type { Bookmark } from "../types/bookmark.js";

export function buildSlackMessage(bookmarks: Bookmark[]): string {
  const urls = bookmarks.map((b) => b.url).join("\n");
  return `📌 新しいXブックマーク\n${urls}`;
}
