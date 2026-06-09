/**
 * 要約プレビュー（Slack 投稿なし、コンソール出力のみ）
 *
 * 使い方:
 *   1. .env に GEMINI_API_KEY を設定
 *   2. npx tsx scripts/test-summary-preview.ts を実行
 */

import { config } from "dotenv";
import { GeminiClient } from "../src/lib/gemini.js";

config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY を .env に設定してください");
  process.exit(1);
}

const sampleTweets = [
  {
    url: "https://x.com/user/status/111",
    text: "AI agents are transforming how we build software. The key insight is that agents need good harnesses, not just good prompts.",
    lang: "en",
  },
  {
    url: "https://x.com/user/status/222",
    text: "LLMを使ったプロダクト開発で重要なのは、プロンプトエンジニアリングだけでなく、コンテキストエンジニアリングとハーネスエンジニアリングの3層で考えること。モデルの能力を制約で縛るのではなく、環境全体を設計する視点が必要。",
    lang: "ja",
  },
];

async function main() {
  const gemini = new GeminiClient(API_KEY!);

  console.log("\n=== Slack 投稿プレビュー（実際には投稿しない） ===\n");

  for (const tweet of sampleTweets) {
    const summary = await gemini.summarize(tweet.text, tweet.lang);
    console.log("---");
    console.log(`言語: ${tweet.lang}`);
    console.log(`原文: ${tweet.text}`);
    console.log(`要約: ${summary}`);
    console.log(`\nSlack 投稿イメージ:`);
    console.log(`${summary}\n${tweet.url}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
