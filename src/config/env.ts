/**
 * 環境変数の読み込みと検証
 */

export interface AppConfig {
  xClientId: string;
  xUserId: string;
  bookmarkFetchLimit: number;
  bootstrapMode: boolean;
  slackPostMode: "batch";
  enableSummary: boolean;
  googleCloudProject?: string;
  slackBotToken?: string;
  slackChannelId?: string;
  geminiApiKey?: string;
}

export function loadConfig(): AppConfig {
  const xClientId = requireEnv("X_CLIENT_ID");
  const xUserId = requireEnv("X_USER_ID");

  // BOOTSTRAP_MODE が明示的に false でない限り true（安全側倒し）
  const bootstrapMode = process.env.BOOTSTRAP_MODE !== "false";

  // Slack Bot Token / Channel ID はローカル開発時は .env から、本番は Secret Manager から
  const slackBotToken = process.env.SLACK_BOT_TOKEN || undefined;
  const slackChannelId = process.env.SLACK_CHANNEL_ID || undefined;

  return {
    xClientId,
    xUserId,
    bookmarkFetchLimit: Number(process.env.X_BOOKMARK_FETCH_LIMIT ?? 10),
    bootstrapMode,
    slackPostMode: "batch",
    enableSummary: process.env.ENABLE_SUMMARY === "true",
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || undefined,
    slackBotToken,
    slackChannelId,
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていない`);
  }
  return value;
}
