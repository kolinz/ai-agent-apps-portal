/**
 * drizzle.config.ts
 *
 * Drizzle ORM 設定ファイル
 *
 * 使用するコマンド：
 *   npm run db:generate  → スキーマからマイグレーションファイルを生成
 *   npm run db:migrate   → マイグレーションをDBに適用
 *   npm run db:push      → スキーマをDBに直接push（開発中のみ推奨）
 *   npm run db:studio    → Drizzle Studioを起動（DBブラウザ）
 *
 * PostgreSQL移行時の変更箇所：
 *   dialect: 'sqlite' → 'postgresql'
 *   dbCredentials.url → dbCredentials.connectionString（接続文字列）
 *   drizzle-orm/better-sqlite3 → drizzle-orm/node-postgres
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  /** スキーマ定義ファイルのパス */
  schema: './src/lib/db/schema.ts',

  /**
   * マイグレーションファイルの出力先
   * git管理する（チームで共有するマイグレーション履歴として使用）
   */
  out: './drizzle',

  /** DBの種別（将来のPostgreSQL移行時は 'postgresql' に変更） */
  dialect: 'sqlite',

  dbCredentials: {
    /** DBファイルのパス（.env.local の DATABASE_URL を参照） */
    url: process.env.DATABASE_URL ?? './data/portal.db',
  },

  /**
   * マイグレーションファイルの命名規則
   * デフォルトの連番形式（0001_xxx.sql）を使用する
   */
  migrations: {
    prefix: 'index',
  },

  /** 詳細ログの出力（開発中はtrueを推奨） */
  verbose: true,

  /** 破壊的変更（カラム削除等）の安全チェック */
  strict: true,
});
