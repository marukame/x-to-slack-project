/**
 * 未投稿ブックマーク抽出
 *
 * 取得したブックマーク一覧から Firestore に既登録の tweet_id を除外し、
 * 未投稿分だけ返す。
 */

import type { BookmarkStore } from "../lib/firestore.js";
import type { Bookmark } from "../types/bookmark.js";

export async function filterNewBookmarks(
  bookmarks: Bookmark[],
  store: BookmarkStore,
): Promise<Bookmark[]> {
  if (bookmarks.length === 0) return [];

  const tweetIds = bookmarks.map((b) => b.tweetId);
  const existing = await store.filterExisting(tweetIds);

  return bookmarks.filter((b) => !existing.has(b.tweetId));
}
