/**
 * X ブックマーク取得テストスクリプト
 *
 * 使い方:
 *   1. .env に X_ACCESS_TOKEN を設定（auth-x.ts で取得）
 *   2. npm run test-fetch を実行
 */

import { config } from "dotenv";

config();

const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error("X_ACCESS_TOKEN が .env に設定されていません");
  console.error("先に npm run auth でトークンを取得してください");
  process.exit(1);
}

interface XUser {
  id: string;
  username: string;
  name: string;
}

interface XTweet {
  id: string;
  author_id: string;
  created_at?: string;
  text?: string;
}

interface BookmarksResponse {
  data?: XTweet[];
  includes?: { users?: XUser[] };
  meta?: { result_count: number; next_token?: string };
}

async function fetchMe(): Promise<XUser> {
  const response = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`/users/me failed: ${response.status} ${body}`);
  }

  const json = await response.json();
  return json.data;
}

async function fetchBookmarks(userId: string): Promise<BookmarksResponse> {
  const params = new URLSearchParams({
    max_results: "10",
    "tweet.fields": "author_id,created_at",
    expansions: "author_id",
    "user.fields": "username",
  });

  const url = `https://api.x.com/2/users/${userId}/bookmarks?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bookmarks API failed: ${response.status} ${body}`);
  }

  return response.json();
}

function buildTweetUrl(tweetId: string, username?: string): string {
  if (username) {
    return `https://x.com/${username}/status/${tweetId}`;
  }
  return `https://x.com/i/web/status/${tweetId}`;
}

async function main() {
  console.log("\n=== X ブックマーク取得テスト ===\n");

  // ユーザー情報取得（X_USER_ID の確認も兼ねる）
  console.log("ユーザー情報を取得中...");
  const me = await fetchMe();
  console.log(`  User ID: ${me.id}`);
  console.log(`  Username: @${me.username}`);
  console.log(`  Name: ${me.name}`);
  console.log(`\n  → .env に X_USER_ID=${me.id} を設定してください\n`);

  // ブックマーク取得
  console.log("ブックマークを取得中...");
  const bookmarks = await fetchBookmarks(me.id);

  if (!bookmarks.data || bookmarks.data.length === 0) {
    console.log("  ブックマークが0件です");
    return;
  }

  const userMap = new Map<string, string>();
  if (bookmarks.includes?.users) {
    for (const user of bookmarks.includes.users) {
      userMap.set(user.id, user.username);
    }
  }

  console.log(`  取得件数: ${bookmarks.data.length}\n`);
  console.log("--- ブックマーク一覧 ---\n");

  for (const tweet of bookmarks.data) {
    const username = userMap.get(tweet.author_id);
    const url = buildTweetUrl(tweet.id, username);
    console.log(`  tweet_id: ${tweet.id}`);
    console.log(`  author:   @${username ?? tweet.author_id}`);
    console.log(`  url:      ${url}`);
    if (tweet.created_at) {
      console.log(`  created:  ${tweet.created_at}`);
    }
    console.log("");
  }

  console.log(`合計: ${bookmarks.data.length} 件`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
