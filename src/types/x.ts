/**
 * X API レスポンスの型定義
 */

export interface XUser {
  id: string;
  username: string;
  name: string;
}

export interface XTweet {
  id: string;
  author_id: string;
  created_at?: string;
  text?: string;
  lang?: string;
}

export interface BookmarksResponse {
  data?: XTweet[];
  includes?: { users?: XUser[] };
  meta?: { result_count: number; next_token?: string };
}
