/**
 * X OAuth 2.0 PKCE 認可スクリプト
 *
 * 使い方:
 *   1. .env に X_CLIENT_ID を設定
 *   2. npm run auth を実行
 *   3. 表示されるURLをブラウザで開く
 *   4. Xでアプリを許可
 *   5. コールバック後に access_token / refresh_token が表示される
 */

import crypto from "node:crypto";
import http from "node:http";
import { URL, URLSearchParams } from "node:url";
import { config } from "dotenv";

config();

const CLIENT_ID = process.env.X_CLIENT_ID;
if (!CLIENT_ID) {
  console.error("X_CLIENT_ID が .env に設定されていません");
  process.exit(1);
}

const PORT = Number(process.env.AUTH_PORT ?? 8888);
const CALLBACK_URL = `http://localhost:${PORT}/callback`;
const SCOPES = ["bookmark.read", "tweet.read", "users.read", "offline.access"];

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: CALLBACK_URL,
    code_verifier: codeVerifier,
    client_id: CLIENT_ID!,
  });

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}

async function main() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const authUrl = new URL("https://x.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", CALLBACK_URL);
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  console.log("\n=== X OAuth 2.0 PKCE 認可 ===\n");
  console.log("以下のURLをブラウザで開いてください:\n");
  console.log(authUrl.toString());
  console.log("\nコールバック待機中...\n");

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith("/callback")) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const url = new URL(req.url, "http://localhost:3000");
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error(`認可エラー: ${error}`);
      res.writeHead(400);
      res.end(`Error: ${error}`);
      server.close();
      process.exit(1);
    }

    if (returnedState !== state) {
      console.error("state が一致しません");
      res.writeHead(400);
      res.end("State mismatch");
      server.close();
      process.exit(1);
    }

    if (!code) {
      console.error("authorization code がありません");
      res.writeHead(400);
      res.end("No code");
      server.close();
      process.exit(1);
    }

    try {
      const tokenData = await exchangeCodeForToken(code, codeVerifier);

      console.log("=== トークン取得成功 ===\n");
      console.log(`ACCESS_TOKEN:\n${tokenData.access_token}\n`);
      console.log(`REFRESH_TOKEN:\n${tokenData.refresh_token}\n`);
      console.log(`有効期限: ${tokenData.expires_in} 秒\n`);
      console.log(".env に以下を設定してください:");
      console.log(`X_ACCESS_TOKEN=${tokenData.access_token}`);
      console.log(`X_REFRESH_TOKEN=${tokenData.refresh_token}`);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h1>認可成功</h1><p>ターミナルにトークンが表示されています。このタブは閉じてOKです。</p>",
      );
    } catch (err) {
      console.error("トークン交換エラー:", err);
      res.writeHead(500);
      res.end("Token exchange failed");
    }

    server.close();
  });

  server.listen(PORT, () => {
    console.log(`localhost:${PORT} でコールバック待機中...`);
  });
}

main();
