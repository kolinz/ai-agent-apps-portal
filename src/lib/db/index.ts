/**
 * src/lib/db/index.ts
 *
 * Drizzle ORM + better-sqlite3 クライアント初期化
 *
 * 設計方針：
 * - シングルトンパターンでDBクライアントを管理する
 * - Next.jsのホットリロード時に複数のDBインスタンスが生成されるのを防ぐ
 * - 将来のPostgreSQL移行時は、このファイルのみ差し替えれば良い設計とする
 *   （スキーマ定義・クエリコードはそのまま使用可能）
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// ============================================================
// DBファイルパスの解決
// ============================================================
const DATABASE_URL = process.env.DATABASE_URL ?? './data/portal.db';

/**
 * DBファイルのパスを解決する
 * 相対パスの場合はプロジェクトルート（process.cwd()）を基準に解決する
 */
function resolveDatabasePath(url: string): string {
  if (path.isAbsolute(url)) {
    return url;
  }
  return path.resolve(process.cwd(), url);
}

const dbPath = resolveDatabasePath(DATABASE_URL);

// ============================================================
// DBディレクトリの自動作成
// ============================================================
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ============================================================
// シングルトンパターン（Next.js開発モードのホットリロード対策）
// ============================================================
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
}

function createDb() {
  const sqlite = new Database(dbPath);

  /**
   * WAL（Write-Ahead Logging）モードを有効化する
   * - 読み取りと書き込みの並行性が向上する
   * - Next.jsのAPIルートが同時にアクセスする際のロック競合を軽減する
   * - PostgreSQL移行時は不要（PostgreSQLはデフォルトでWAL相当の動作をする）
   */
  sqlite.pragma('journal_mode = WAL');

  /**
   * 外部キー制約を有効化する
   * SQLiteはデフォルトで外部キー制約が無効なため、明示的に有効化する必要がある
   */
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

/**
 * Drizzle ORM DBクライアント（シングルトン）
 *
 * 使用例：
 * ```typescript
 * import { db } from '@/lib/db';
 * import { users } from '@/lib/db/schema';
 *
 * const allUsers = await db.select().from(users);
 * ```
 */
export const db =
  process.env.NODE_ENV === 'production'
    ? createDb()
    : (global.__db ??= createDb());

/**
 * 型エクスポート（呼び出し元での型推論用）
 */
export type Db = typeof db;

/**
 * スキーマの再エクスポート（インポートパスの簡略化）
 *
 * 使用例：
 * ```typescript
 * import { db, users, apps } from '@/lib/db';
 * ```
 */
export { schema };
export * from './schema';
