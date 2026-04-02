/**
 * src/app/api/admin/users/[id]/route.ts
 *
 * DELETE /api/admin/users/[id]  → ユーザー削除
 * PATCH  /api/admin/users/[id]  → パスワードリセット / ロール変更
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { getSession } from '@/lib/session';
import {
  findUserById,
  updateUser,
  deleteUser,
} from '@/lib/db/repositories/users';
import { createAuditLog } from '@/lib/db/repositories/audit-logs';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['teacher', 'staff', 'admin'];

type RouteContext = { params: Promise<{ id: string }> };

// ── DELETE：ユーザー削除 ──────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // 自分自身の削除は禁止
  if (id === session.user_id) {
    return NextResponse.json(
      { error: '自分自身のアカウントは削除できません' },
      { status: 400 }
    );
  }

  const target = await findUserById(id);
  if (!target) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  }

  try {
    await deleteUser(id);
    await createAuditLog({
      operator_id: session.user_id,
      action: 'delete',
      target_user_id: id,
    });
    return NextResponse.json({ message: 'ユーザーを削除しました' });
  } catch (e) {
    console.error('[DELETE /api/admin/users/[id]]', e);
    return NextResponse.json({ error: 'ユーザーの削除に失敗しました' }, { status: 500 });
  }
}

// ── PATCH：パスワードリセット / ロール変更 ────────────────────
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const target = await findUserById(id);
  if (!target) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const { action, password, role } = body as Record<string, unknown>;

  // ── プロフィール更新 ────────────────────────────────────────
  if (action === 'update_profile') {
    const { display_name, email, job_title } = body as Record<string, unknown>;
    try {
      const updated = await updateUser(id, {
        display_name: typeof display_name === 'string' ? display_name.trim() || null : undefined,
        email:        typeof email        === 'string' ? email.trim()        || null : undefined,
        job_title:    typeof job_title    === 'string' ? job_title.trim()    || null : undefined,
      });
      return NextResponse.json(updated);
    } catch (e) {
      console.error('[PATCH update_profile]', e);
      return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 });
    }
  }


  if (action === 'reset_password') {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上にしてください' },
        { status: 400 }
      );
    }
    try {
      const password_hash = hashSync(password, 12);
      await updateUser(id, { password_hash });
      await createAuditLog({
        operator_id: session.user_id,
        action: 'reset_password',
        target_user_id: id,
      });
      return NextResponse.json({ message: 'パスワードをリセットしました' });
    } catch (e) {
      console.error('[PATCH reset_password]', e);
      return NextResponse.json({ error: 'パスワードのリセットに失敗しました' }, { status: 500 });
    }
  }

  // ── ロール変更 ─────────────────────────────────────────────
  if (action === 'update_role') {
    if (!VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: '無効なロールです' }, { status: 400 });
    }
    // 自分自身のロール変更は禁止（ロックアウト防止）
    if (id === session.user_id) {
      return NextResponse.json(
        { error: '自分自身のロールは変更できません' },
        { status: 400 }
      );
    }
    try {
      const updated = await updateUser(id, { role: role as UserRole });
      await createAuditLog({
        operator_id: session.user_id,
        action: 'update_role',
        target_user_id: id,
      });
      return NextResponse.json(updated);
    } catch (e) {
      console.error('[PATCH update_role]', e);
      return NextResponse.json({ error: 'ロールの変更に失敗しました' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
}