/**
 * Firestore クライアント — 重複判定用の tweet_id 台帳
 *
 * コレクション: posted_x_bookmarks
 * ドキュメント ID: tweet_id
 * フィールド: posted_at, bootstrap
 */

import { Firestore } from "@google-cloud/firestore";

const COLLECTION = "posted_x_bookmarks";

export interface PostedBookmark {
  posted_at: string;
  bootstrap: boolean;
}

export class BookmarkStore {
  private readonly db: Firestore;
  private readonly collection: string;

  constructor(db?: Firestore) {
    this.db = db ?? new Firestore();
    this.collection = COLLECTION;
  }

  /**
   * tweet_id が既に登録済みか確認する
   */
  async exists(tweetId: string): Promise<boolean> {
    const doc = await this.db.collection(this.collection).doc(tweetId).get();
    return doc.exists;
  }

  /**
   * 複数の tweet_id を一括チェックし、既に登録済みの ID セットを返す
   */
  async filterExisting(tweetIds: string[]): Promise<Set<string>> {
    if (tweetIds.length === 0) return new Set();

    const existing = new Set<string>();

    // Firestore の getAll は一度に最大100件
    const refs = tweetIds.map((id) =>
      this.db.collection(this.collection).doc(id),
    );
    const docs = await this.db.getAll(...refs);

    for (const doc of docs) {
      if (doc.exists) {
        existing.add(doc.id);
      }
    }

    return existing;
  }

  /**
   * tweet_id を保存する（Slack 投稿成功後に呼ぶ）
   */
  async save(tweetId: string, bootstrap: boolean): Promise<void> {
    const data: PostedBookmark = {
      posted_at: new Date().toISOString(),
      bootstrap,
    };

    await this.db.collection(this.collection).doc(tweetId).set(data);
  }

  /**
   * 複数の tweet_id を一括保存する
   */
  async saveBatch(tweetIds: string[], bootstrap: boolean): Promise<void> {
    if (tweetIds.length === 0) return;

    const batch = this.db.batch();
    const now = new Date().toISOString();

    for (const tweetId of tweetIds) {
      const ref = this.db.collection(this.collection).doc(tweetId);
      batch.set(ref, { posted_at: now, bootstrap } satisfies PostedBookmark);
    }

    await batch.commit();
  }
}
