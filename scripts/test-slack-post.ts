/**
 * Slack 投稿テストスクリプト
 *
 * 使い方:
 *   1. .env に SLACK_BOT_TOKEN と SLACK_CHANNEL_ID を設定
 *   2. npx tsx scripts/test-slack-post.ts を実行
 */

import { config } from "dotenv";
import { SlackClient } from "../src/lib/slack.js";

config();

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error(
    "SLACK_BOT_TOKEN と SLACK_CHANNEL_ID を .env に設定してください",
  );
  process.exit(1);
}

async function main() {
  console.log("\n=== Slack 投稿テスト（1件ずつ投稿） ===\n");

  const testUrls = ["https://x.com/MacopeninSUTABA/status/2063456663063986368"];

  const client = new SlackClient(BOT_TOKEN, CHANNEL_ID);
  await client.postUrls(testUrls);

  console.log(`${testUrls.length} 件投稿完了 — チャンネルを確認してください`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
