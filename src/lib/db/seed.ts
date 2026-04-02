/**
 * src/lib/db/seed.ts
 *
 * 初期データ投入スクリプト（管理者ユーザーの初期登録）
 *
 * 実行方法：
 * ```cmd
 * npm run db:seed
 * ```
 *
 * 前提条件：
 * - npm run db:migrate が完了していること（テーブルが存在すること）
 * - .env.local に INITIAL_ADMIN_USERNAME・INITIAL_ADMIN_PASSWORD が設定されていること
 *
 * 冪等性：
 * - 同じusernameの管理者が既に存在する場合はスキップする（重複エラーにならない）
 * - 何度実行しても安全
 */

// tsx（TypeScript実行環境）でNode.jsのESM/CJS混在を処理するため
// dotenvを使用して .env.local を読み込む

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import { users } from './schema';

// ============================================================
// 設定値の取得と検証
// ============================================================

const DATABASE_URL = process.env.DATABASE_URL ?? './data/portal.db';
const ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;

function validateEnv() {
  const errors: string[] = [];

  if (!ADMIN_USERNAME) {
    errors.push('INITIAL_ADMIN_USERNAME が .env.local に設定されていません');
  }
  if (!ADMIN_PASSWORD) {
    errors.push('INITIAL_ADMIN_PASSWORD が .env.local に設定されていません');
  }
  if (ADMIN_PASSWORD && ADMIN_PASSWORD === 'change-me-immediately') {
    errors.push(
      'INITIAL_ADMIN_PASSWORD がデフォルト値（change-me-immediately）のままです。\n' +
        '安全なパスワードに変更してから実行してください。'
    );
  }
  if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 8) {
    errors.push('INITIAL_ADMIN_PASSWORD は8文字以上にしてください');
  }

  if (errors.length > 0) {
    console.error('\n❌ 環境変数エラー：');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

// ============================================================
// DBクライアント初期化（seed専用・シングルトン不要）
// ============================================================

function createSeedDb() {
  const dbPath = path.isAbsolute(DATABASE_URL)
    ? DATABASE_URL
    : path.resolve(process.cwd(), DATABASE_URL);

  if (!fs.existsSync(dbPath)) {
    console.error(
      `\n❌ DBファイルが見つかりません: ${dbPath}\n` +
        '先に npm run db:migrate を実行してテーブルを作成してください。'
    );
    process.exit(1);
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

// ============================================================
// メイン処理
// ============================================================

async function seed() {
  console.log('\n🌱 データベース初期データ投入を開始します...\n');

  // 環境変数の検証
  validateEnv();

  const db = createSeedDb();

  // ============================================================
  // 管理者ユーザーの投入
  // ============================================================
  console.log(`👤 管理者ユーザー "${ADMIN_USERNAME}" の登録を確認中...`);

  // 既存の管理者ユーザーを確認（冪等性の保証）
  const existingAdmin = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME!))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log(
      `ℹ️  管理者ユーザー "${ADMIN_USERNAME}" は既に存在します。スキップします。`
    );
    console.log(`   ユーザーID: ${existingAdmin[0].id}`);
  } else {
    // パスワードのハッシュ化
    // bcryptのコストファクター：12（セキュリティと処理速度のバランス）
    // 本番環境では12以上を推奨。テスト環境では速度重視で下げても良い
    const BCRYPT_COST = 12;
    console.log(`🔐 パスワードをハッシュ化中（cost: ${BCRYPT_COST}）...`);
    const password_hash = hashSync(ADMIN_PASSWORD!, BCRYPT_COST);

    const now = new Date().toISOString();
    const newAdmin = {
      id: uuidv4(),
      username: ADMIN_USERNAME!,
      password_hash,
      role: 'admin' as const,
      created_at: now,
      updated_at: now,
    };

    await db.insert(users).values(newAdmin);

    console.log(`✅ 管理者ユーザーを登録しました。`);
    console.log(`   ユーザー名: ${newAdmin.username}`);
    console.log(`   ロール    : ${newAdmin.role}`);
    console.log(`   ユーザーID: ${newAdmin.id}`);
  }

  // ============================================================
  // 完了メッセージ
  // ============================================================
  console.log('\n✅ 初期データ投入が完了しました。');
  console.log('\n⚠️  セキュリティ確認事項：');
  console.log(
    '   1. .env.local の INITIAL_ADMIN_PASSWORD を確認し、安全に保管してください'
  );
  console.log(
    '   2. 初回ログイン後、管理画面からパスワードを変更することを推奨します'
  );
  console.log(
    '   3. 本番環境では .env.local をサーバー外に漏洩させないよう管理してください\n'
  );

  process.exit(0);
}

seed().catch((error) => {
  console.error('\n❌ 初期データ投入中にエラーが発生しました：');
  console.error(error);
  process.exit(1);
});
