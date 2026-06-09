/**
 * Token refresh テストスクリプト
 *
 * 使い方:
 *   1. .env に X_CLIENT_ID, X_ACCESS_TOKEN, X_REFRESH_TOKEN を設定
 *   2. npm run test-refresh を実行
 */

import { config } from "dotenv";
import { EnvFileTokenStore } from "../src/lib/token-store.js";
import { fetchWithTokenRefresh } from "../src/lib/x-token.js";

config();

const CLIENT_ID = process.env.X_CLIENT_ID;
if (!CLIENT_ID) {
  console.error("X_CLIENT_ID を .env に設定してください");
  process.exit(1);
}

async function main() {
  console.log("\n=== Token Refresh テスト ===\n");

  const tokenStore = new EnvFileTokenStore();
  const initialTokens = await tokenStore.read();

  const { response, tokens } = await fetchWithTokenRefresh(
    "https://api.x.com/2/users/me",
    { clientId: CLIENT_ID!, tokenStore },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`API 呼び出し失敗: ${response.status} ${body}`);
    process.exit(1);
  }

  const json = await response.json();
  console.log(`ユーザー: @${json.data.username} (${json.data.name})`);

  if (tokens.accessToken !== initialTokens.accessToken) {
    console.log("トークンが更新された（永続化済み）");
  } else {
    console.log("トークンは有効（更新不要）");
  }

  console.log("\nテスト成功");
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
