/**
 * HTTP Server — Cloud Run エントリポイント
 *
 * POST /sync-bookmarks で同期処理を実行
 */

import http from "node:http";
import { config as loadDotenv } from "dotenv";
import { loadConfig } from "./config/env.js";
import { createTokenStore } from "./lib/token-store.js";
import { XClient } from "./lib/x-client.js";
import { BookmarkStore } from "./lib/firestore.js";
import { SlackClient } from "./lib/slack.js";
import { GeminiClient } from "./lib/gemini.js";
import { syncBookmarks } from "./services/sync-bookmarks.js";

loadDotenv();

const PORT = Number(process.env.PORT ?? 8080);

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/sync-bookmarks") {
    try {
      const appConfig = loadConfig();
      const tokenStore = createTokenStore();
      const xClient = new XClient({
        clientId: appConfig.xClientId,
        userId: appConfig.xUserId,
        tokenStore,
        fetchLimit: appConfig.bookmarkFetchLimit,
      });
      const bookmarkStore = new BookmarkStore();
      const slackClient =
        appConfig.slackBotToken && appConfig.slackChannelId
          ? new SlackClient(appConfig.slackBotToken, appConfig.slackChannelId)
          : undefined;

      const geminiClient = appConfig.geminiApiKey
        ? new GeminiClient(appConfig.geminiApiKey)
        : undefined;

      const result = await syncBookmarks({
        config: appConfig,
        xClient,
        bookmarkStore,
        slackClient,
        geminiClient,
      });

      // Cloud Logging 用の構造化ログ
      console.log(JSON.stringify(result));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      const errorResult = {
        event: "sync_failed",
        error_type: err instanceof Error ? err.constructor.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
      };
      console.error(JSON.stringify(errorResult));

      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify(errorResult));
    }
    return;
  }

  // ヘルスチェック
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ event: "server_started", port: PORT }));
});
