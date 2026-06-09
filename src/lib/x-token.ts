/**
 * X OAuth 2.0 トークン管理
 *
 * - access_token の期限切れ時に refresh_token で自動更新
 * - TokenStore 経由でトークンを永続化（ローカル: .env / 本番: Secret Manager）
 */

import type { TokenSet, TokenStore } from "./token-store.js";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * refresh_token を使って新しい access_token を取得する
 */
export async function refreshAccessToken(
  clientId: string,
  refreshToken: string,
): Promise<TokenSet> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${body}`);
  }

  const data: TokenResponse = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * access_token で API を呼び、401 なら refresh して再試行する
 */
export async function fetchWithTokenRefresh(
  url: string,
  options: {
    clientId: string;
    tokenStore: TokenStore;
  },
): Promise<{ response: Response; tokens: TokenSet }> {
  const { clientId, tokenStore } = options;
  const tokens = await tokenStore.read();

  // 1回目: 現在の access_token で試行
  const firstResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  if (firstResponse.status !== 401) {
    return { response: firstResponse, tokens };
  }

  // 2回目: refresh して再試行
  const newTokens = await refreshAccessToken(clientId, tokens.refreshToken);
  await tokenStore.write(newTokens);

  const retryResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${newTokens.accessToken}` },
  });

  return { response: retryResponse, tokens: newTokens };
}
