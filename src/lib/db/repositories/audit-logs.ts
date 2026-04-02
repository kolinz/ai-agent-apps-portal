/**
 * src/lib/db/repositories/audit-logs.ts
 *
 * audit_logsテーブルのリポジトリ
 *
 * 設計方針：
 * - ユーザー管理操作（作成・削除・ロール変更・パスワードリセット）のログを記録する
 * - ログは削除不可とする（操作者・対象ユーザーが削除されてもログは残す）
 * - ログ取得はユーザー管理画面でのみ使用する（管理者のみアクセス可能）
 */

import { desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, audit_logs } from '../index';
import type { AuditAction } from '@/types';

// ============================================================
// 型定義
// ============================================================

export type CreateAuditLogParams = {
  operator_id: string;
  action: AuditAction;
  target_user_id: string;
};

// ============================================================
// リポジトリ関数
// ============================================================

/**
 * 操作ログを記録する
 * ユーザー管理APIルートから呼び出す
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<void> {
  await db.insert(audit_logs).values({
    id: uuidv4(),
    operator_id: params.operator_id,
    action: params.action,
    target_user_id: params.target_user_id,
    created_at: new Date().toISOString(),
  });
}

/**
 * 操作ログを全件取得する（新しい順）
 * 管理者画面でのみ使用する
 */
export async function findAllAuditLogs() {
  return db.select().from(audit_logs).orderBy(desc(audit_logs.created_at));
}
