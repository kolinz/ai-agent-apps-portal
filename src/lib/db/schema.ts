/**
 * src/lib/db/schema.ts
 *
 * Drizzle ORM スキーマ定義
 *
 * 設計方針：
 * - SQLite（better-sqlite3）で動作し、将来のPostgreSQL移行を想定した型・構文に統一する
 * - SQLite固有の型（INTEGER PRIMARY KEY AUTOINCREMENT等）は使用しない
 * - 主キーはUUID（TEXT）で統一する
 * - 日時はISO 8601文字列（TEXT）で統一する（SQLiteのDATETIME型に依存しない）
 * - ARRAYはJSON文字列（TEXT）で代替する（例：roles カラム）
 * - CHECK制約はアプリケーション層とDBの両方で保証する
 */

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// users テーブル
// 教員（teacher）・職員（staff）・管理者（admin）のアカウントを管理する
// 学生はアカウントを持たない（ログイン不要）
// ============================================================
export const users = sqliteTable('users', {
  /** 主キー（UUID v4） */
  id: text('id').primaryKey(),

  /** ユーザー名（一意） */
  username: text('username').notNull().unique(),

  /** bcryptjsでハッシュ化されたパスワード */
  password_hash: text('password_hash').notNull(),

  /**
   * ユーザーロール
   * 許可値：'teacher' | 'staff' | 'admin'
   * CHECK制約はアプリケーション層（Zodバリデーション）で保証する
   * ※ SQLiteのCHECK制約はDrizzle ORMのsqliteTableでも定義可能だが、
   *   PostgreSQL移行時の互換性を優先しアプリケーション層で保証する
   */
  role: text('role', { enum: ['teacher', 'staff', 'admin'] }).notNull(),

  /** 表示名（氏名。任意） */
  display_name: text('display_name'),

  /** メールアドレス（任意） */
  email: text('email'),

  /** 役職（任意。例：「3年担任」「進路指導主任」） */
  job_title: text('job_title'),

  /** 作成日時（ISO 8601 UTC 例：2026-04-01T09:00:00.000Z） */
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),

  /** 更新日時（ISO 8601 UTC） */
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ============================================================
// apps テーブル
// 管理者が登録するAIアプリのプリセット情報を管理する
// APIキーはAES-256で暗号化して保存する
// ============================================================
export const apps = sqliteTable('apps', {
  /** 主キー（UUID v4） */
  id: text('id').primaryKey(),

  /** アプリ名（ホーム画面・アプリ切り替えパネルに表示） */
  name: text('name').notNull(),

  /** アプリの説明文（アプリカードに表示。任意） */
  description: text('description'),

  /**
   * アイコン画像のURL
   * サーバー内ファイルシステムへのパス（例：/icons/app-uuid.png）
   * フロントエンドは next/image または <img> で参照する
   */
  icon_url: text('icon_url').notNull(),

  /**
   * バックエンド種別
   * 許可値：'dify' | 'langflow'
   * この値に応じてアダプター（src/lib/backends/）を切り替える
   */
  backend_type: text('backend_type', { enum: ['dify', 'langflow'] }).notNull(),

  /**
   * バックエンドのエンドポイントURL
   * Dify例：http://localhost/v1
   * Langflow例：http://localhost:7860
   */
  backend_endpoint: text('backend_endpoint').notNull(),

  /**
   * バックエンドのAPIキー（AES-256で暗号化済み）
   * 復号はサーバーサイドのAPIルート内でのみ行う
   * ブラウザには渡さない
   */
  backend_api_key: text('backend_api_key').notNull(),

  /**
   * LangflowのFlow ID
   * Langflow使用時のみ値を持つ（例："abc123-def456"）
   * Difyの場合はNULL
   * エンドポイントURL構築：{backend_endpoint}/api/v1/run/{backend_flow_id}
   */
  backend_flow_id: text('backend_flow_id'),

  /**
   * 対象ユーザーロールのJSON文字列
   * 例：'["public","teacher"]'
   * 許可値の組み合わせ：'public' | 'teacher' | 'staff' | 'admin'
   * 'public' を含む場合：トップページ（/）に表示され、学生もログインなしで使用可能
   *
   * PostgreSQL移行時はTEXT[]またはARRAY型への変換が必要
   * 移行スクリプトでJSON.parse()→ARRAY変換を実施する
   */
  roles: text('roles').notNull().default('["public"]'),

  /** 作成日時（ISO 8601 UTC） */
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),

  /** 更新日時（ISO 8601 UTC） */
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ============================================================
// chat_histories テーブル
// ログインユーザー（教員・職員・管理者）のチャット履歴を保存する
// 学生（ログインなし）のチャットはこのテーブルに保存しない
// ============================================================
export const chat_histories = sqliteTable('chat_histories', {
  /** 主キー（UUID v4） */
  id: text('id').primaryKey(),

  /**
   * ユーザーID（users.id 外部キー）
   * ログインユーザーのIDを保存する
   */
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /**
   * アプリID（apps.id 外部キー）
   */
  app_id: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),

  /**
   * バックエンド側の会話ID
   * Dify：conversationId（Difyが発行するUUID）
   * Langflow：sessionId
   * アダプター内で統一して扱い、フロントエンドは共通のconversationIdとして参照する
   */
  conversation_id: text('conversation_id').notNull(),

  /**
   * メッセージの送信者
   * 'user'：ユーザーが送信したメッセージ
   * 'assistant'：AIが返答したメッセージ
   */
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),

  /** メッセージ本文 */
  content: text('content').notNull(),

  /** 送受信日時（ISO 8601 UTC） */
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ============================================================
// audit_logs テーブル
// ユーザー管理操作（追加・削除・ロール変更・パスワードリセット）の操作ログ
// ============================================================
export const audit_logs = sqliteTable('audit_logs', {
  /** 主キー（UUID v4） */
  id: text('id').primaryKey(),

  /**
   * 操作者のユーザーID（users.id）
   * 操作者が削除されてもログは残すためにREFERENCESは設定しない
   */
  operator_id: text('operator_id').notNull(),

  /**
   * 操作種別
   * 'create'          : ユーザー新規作成
   * 'delete'          : ユーザー削除
   * 'update_role'     : ロール変更
   * 'reset_password'  : パスワードリセット
   */
  action: text('action', {
    enum: ['create', 'delete', 'update_role', 'reset_password'],
  }).notNull(),

  /**
   * 操作対象のユーザーID（users.id）
   * 対象ユーザーが削除されてもログは残すためREFERENCESは設定しない
   */
  target_user_id: text('target_user_id').notNull(),

  /** 操作日時（ISO 8601 UTC） */
  created_at: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

// ============================================================
// 型エクスポート（Drizzle inferredTypes）
// ============================================================

/** usersテーブルのSELECT結果の型 */
export type User = typeof users.$inferSelect;

/** usersテーブルのINSERT入力の型 */
export type NewUser = typeof users.$inferInsert;

/** appsテーブルのSELECT結果の型 */
export type AppRecord = typeof apps.$inferSelect;

/** appsテーブルのINSERT入力の型 */
export type NewApp = typeof apps.$inferInsert;

/** chat_historiesテーブルのSELECT結果の型 */
export type ChatHistory = typeof chat_histories.$inferSelect;

/** chat_historiesテーブルのINSERT入力の型 */
export type NewChatHistory = typeof chat_histories.$inferInsert;

/** audit_logsテーブルのSELECT結果の型 */
export type AuditLog = typeof audit_logs.$inferSelect;

/** audit_logsテーブルのINSERT入力の型 */
export type NewAuditLog = typeof audit_logs.$inferInsert;