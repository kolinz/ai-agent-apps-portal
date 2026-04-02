/**
 * src/lib/db/migrate.ts
 *
 * マイグレーション実行スクリプト
 *
 * 【通常の使用方法（推奨）】
 * Drizzle Kitを使ったマイグレーション（2ステップ）：
 *
 * ステップ1: マイグレーションファイルの生成
 * ```cmd
 * npm run db:generate
 * ```
 * → drizzle/ フォルダにSQLファイルが生成される
 *
 * ステップ2: マイグレーションのDB適用
 * ```cmd
 * npm run db:migrate
 * ```
 * → このファイル（migrate.ts）が実行され、drizzle/フォルダのSQLがDBに適用される
 *
 * 【開発中の素早い方法】
 * スキーマをDBに直接push（マイグレーションファイルを生成しない）：
 * ```cmd
 * npm run db:push
 * ```
 * ⚠️ 本番環境への適用前に必ず db:generate → db:migrate の正規フローを使うこと
 *
 * 【PostgreSQL移行時の変更箇所】
 * - better-sqlite3 → pg または postgres（接続ライブラリ）
 * - drizzle-orm/better-sqlite3 → drizzle-orm/node-postgres
 * - migrate関数のimport元を変更する
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';

async function runMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL ?? './data/portal.db';

  const dbPath = path.isAbsolute(DATABASE_URL)
    ? DATABASE_URL
    : path.resolve(process.cwd(), DATABASE_URL);

  // DBディレクトリが存在しない場合は作成
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 DBディレクトリを作成しました: ${dbDir}`);
  }

  console.log(`\n🗄️  データベース: ${dbPath}`);
  console.log('🚀 マイグレーションを開始します...\n');

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite);

  // drizzle/ フォルダのマイグレーションファイルを順番に適用する
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), './drizzle'),
  });

  console.log('\n✅ マイグレーションが完了しました。');
  console.log('\n次のステップ：');
  console.log('  npm run db:seed   → 管理者ユーザーの初期登録\n');

  sqlite.close();
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('\n❌ マイグレーション中にエラーが発生しました：');
  console.error(error);
  process.exit(1);
});
