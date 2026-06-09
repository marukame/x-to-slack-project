/**
 * アプリケーション内部で使うブックマーク型
 */

export interface Bookmark {
  tweetId: string;
  authorUsername?: string;
  authorId: string;
  createdAt?: string;
  url: string;
  text?: string;
  lang?: string;
}
