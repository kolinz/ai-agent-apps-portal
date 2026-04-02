/**
 * src/app/api/admin/users/route.ts
 *
 * GET  /api/admin/users  → ユーザー一覧取得
 * POST /api/admin/users  → ユーザー新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { getSession } from '@/lib/session';
import {
  findAllUsers,
  createUser,
} from '@/lib/db/repositories/users';
import { createAuditLog } from '@/lib/db/repositories/audit-logs';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['teacher', 'staff', 'admin'];

// ── GET：ユーザー一覧 ─────────────────────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await findAllUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error('[GET /api/admin/users]', e);
    return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました' }, { status: 500 });
  }
}

// ── POST：ユーザー新規作成 ────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const { username, password, role } = body as Record<string, unknown>;

  // バリデーション
  if (typeof username !== 'string' || username.trim() === '') {
    return NextResponse.json({ error: 'ユーザー名を入力してください' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: '無効なロールです' }, { status: 400 });
  }

  try {
    const password_hash = hashSync(password, 12);
    const newUser = await createUser({
      username: username.trim(),
      password_hash,
      role: role as UserRole,
    });

    await createAuditLog({
      operator_id: session.user_id,
      action: 'create',
      target_user_id: newUser.id,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (e: unknown) {
    // SQLite の UNIQUE 制約違反
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'そのユーザー名は既に使用されています' }, { status: 409 });
    }
    console.error('[POST /api/admin/users]', e);
    return NextResponse.json({ error: 'ユーザーの作成に失敗しました' }, { status: 500 });
  }
}