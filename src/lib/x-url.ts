/**
 * X 投稿 URL 生成
 */

export function buildTweetUrl(tweetId: string, username?: string): string {
  if (username) {
    return `https://x.com/${username}/status/${tweetId}`;
  }
  return `https://x.com/i/web/status/${tweetId}`;
}
