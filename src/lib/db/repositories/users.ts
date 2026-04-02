/**
 * src/lib/db/repositories/users.ts
 *
 * usersテーブルのリポジトリ
 *
 * 設計方針：
 * - DBへの直接アクセスはリポジトリに集約し、アプリケーションコードに漏らさない
 * - 将来のPostgreSQL移行時はこのファイル内のSQLiteアダプターを差し替えるだけで済む
 * - password_hashを誤ってAPIレスポンスに含めないよう、SELECTカラムを明示する
 */

import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, users } from '../index';
import type { UserRole } from '@/types';

// ============================================================
// 型定義
// ============================================================

/** APIレスポンス向けユーザー情報（password_hash除外） */
export type SafeUser = {
  id: string;
  username: string;
  role: UserRole;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  created_at: string;
  updated_at: string;
};

/** ユーザー作成パラメータ */
export type CreateUserParams = {
  username: string;
  password_hash: string;
  role: UserRole;
};

/** ユーザー更新パラメータ */
export type UpdateUserParams = Partial<{
  password_hash: string;
  role: UserRole;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  updated_at: string;
}>;

// ============================================================
// リポジトリ関数
// ============================================================

/**
 * usernameでユーザーを検索する（認証用・password_hashを含む）
 * ※ このメソッドの戻り値は認証処理以外で使用しないこと
 */
export async function findUserByUsername(username: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return result[0] ?? null;
}

/**
 * IDでユーザーを検索する（password_hash除外）
 */
export async function findUserById(id: string): Promise<SafeUser | null> {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      display_name: users.display_name,
      email: users.email,
      job_title: users.job_title,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return (result[0] as SafeUser) ?? null;
}

/**
 * 全ユーザーを取得する（password_hash除外・管理者画面用）
 */
export async function findAllUsers(): Promise<SafeUser[]> {
  return db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      display_name: users.display_name,
      email: users.email,
      job_title: users.job_title,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(users) as Promise<SafeUser[]>;
}

/**
 * ユーザーを新規作成する
 */
export async function createUser(params: CreateUserParams): Promise<SafeUser> {
  const now = new Date().toISOString();
  const newUser = {
    id: uuidv4(),
    username: params.username,
    password_hash: params.password_hash,
    role: params.role,
    created_at: now,
    updated_at: now,
  };

  await db.insert(users).values(newUser);

  return {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  };
}

/**
 * ユーザー情報を更新する（パスワードリセット・ロール変更）
 */
export async function updateUser(
  id: string,
  params: UpdateUserParams
): Promise<SafeUser | null> {
  const now = new Date().toISOString();

  await db
    .update(users)
    .set({ ...params, updated_at: now })
    .where(eq(users.id, id));

  return findUserById(id);
}

/**
 * ユーザーを削除する
 */
export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}