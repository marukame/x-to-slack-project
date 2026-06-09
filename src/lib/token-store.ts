/**
 * TokenStore — トークンの読み書きを抽象化
 *
 * ローカル: EnvFileTokenStore（.env ファイル）
 * 本番:     SecretManagerTokenStore（GCP Secret Manager）
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  read(): Promise<TokenSet>;
  write(tokens: TokenSet): Promise<void>;
}

// --- ローカル用: .env ファイル ---

export class EnvFileTokenStore implements TokenStore {
  private readonly envPath: string;

  constructor(envPath?: string) {
    this.envPath = envPath ?? resolve(process.cwd(), ".env");
  }

  async read(): Promise<TokenSet> {
    const accessToken = process.env.X_ACCESS_TOKEN;
    const refreshToken = process.env.X_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      throw new Error(
        "X_ACCESS_TOKEN / X_REFRESH_TOKEN が .env に設定されていない",
      );
    }

    return { accessToken, refreshToken };
  }

  async write(tokens: TokenSet): Promise<void> {
    let content = readFileSync(this.envPath, "utf-8");

    content = content.replace(
      /^X_ACCESS_TOKEN=.*$/m,
      `X_ACCESS_TOKEN=${tokens.accessToken}`,
    );
    content = content.replace(
      /^X_REFRESH_TOKEN=.*$/m,
      `X_REFRESH_TOKEN=${tokens.refreshToken}`,
    );

    writeFileSync(this.envPath, content, "utf-8");

    // プロセス内の env も更新
    process.env.X_ACCESS_TOKEN = tokens.accessToken;
    process.env.X_REFRESH_TOKEN = tokens.refreshToken;
  }
}

// --- 本番用: GCP Secret Manager ---

export class SecretManagerTokenStore implements TokenStore {
  private readonly projectId: string;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(options: {
    projectId: string;
    accessTokenSecret?: string;
    refreshTokenSecret?: string;
  }) {
    this.projectId = options.projectId;
    this.accessTokenSecret = options.accessTokenSecret ?? "X_ACCESS_TOKEN";
    this.refreshTokenSecret = options.refreshTokenSecret ?? "X_REFRESH_TOKEN";
  }

  async read(): Promise<TokenSet> {
    const [accessToken, refreshToken] = await Promise.all([
      this.getSecret(this.accessTokenSecret),
      this.getSecret(this.refreshTokenSecret),
    ]);
    return { accessToken, refreshToken };
  }

  async write(tokens: TokenSet): Promise<void> {
    await Promise.all([
      this.addSecretVersion(this.accessTokenSecret, tokens.accessToken),
      this.addSecretVersion(this.refreshTokenSecret, tokens.refreshToken),
    ]);
  }

  private async getSecret(secretId: string): Promise<string> {
    const name = `projects/${this.projectId}/secrets/${secretId}/versions/latest`;
    const url = `https://secretmanager.googleapis.com/v1/${name}:access`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${await this.getGcpToken()}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Secret Manager read failed (${secretId}): ${response.status} ${body}`,
      );
    }

    const json = await response.json();
    // payload.data は base64 エンコード
    return Buffer.from(json.payload.data, "base64").toString("utf-8");
  }

  private async addSecretVersion(
    secretId: string,
    value: string,
  ): Promise<void> {
    const parent = `projects/${this.projectId}/secrets/${secretId}`;
    const url = `https://secretmanager.googleapis.com/v1/${parent}:addVersion`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await this.getGcpToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: { data: Buffer.from(value).toString("base64") },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Secret Manager write failed (${secretId}): ${response.status} ${body}`,
      );
    }
  }

  /**
   * Cloud Run 上ではメタデータサーバーからアクセストークンを取得
   */
  private async getGcpToken(): Promise<string> {
    const url =
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

    const response = await fetch(url, {
      headers: { "Metadata-Flavor": "Google" },
    });

    if (!response.ok) {
      throw new Error(`GCP metadata token fetch failed: ${response.status}`);
    }

    const json = await response.json();
    return json.access_token;
  }
}

// --- ファクトリ ---

export function createTokenStore(): TokenStore {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  if (projectId) {
    return new SecretManagerTokenStore({ projectId });
  }

  return new EnvFileTokenStore();
}
