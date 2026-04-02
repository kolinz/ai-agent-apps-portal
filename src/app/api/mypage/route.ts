/**
 * src/app/api/mypage/route.ts
 *
 * GET   /api/mypage  → ログイン中ユーザーのプロフィール取得
 * PATCH /api/mypage  → プロフィール更新 / パスワード変更
 */

import { NextRequest, NextResponse } from 'next/server';
import { compare, hashSync } from 'bcryptjs';
import { getSession } from '@/lib/session';
import { findUserById, findUserByUsername, updateUser } from '@/lib/db/repositories/users';

// ── GET：自分のプロフィール取得 ───────────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await findUserById(session.user_id);
  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });

  return NextResponse.json(user);
}

// ── PATCH：プロフィール更新 / パスワード変更 ──────────────────
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const { action } = body as Record<string, unknown>;

  // ── プロフィール更新 ────────────────────────────────────────
  if (action === 'update_profile') {
    const { display_name, email, job_title } = body as Record<string, unknown>;
    try {
      const updated = await updateUser(session.user_id, {
        display_name: typeof display_name === 'string' ? display_name.trim() || null : undefined,
        email:        typeof email        === 'string' ? email.trim()        || null : undefined,
        job_title:    typeof job_title    === 'string' ? job_title.trim()    || null : undefined,
      });
      return NextResponse.json(updated);
    } catch {
      return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 });
    }
  }

  // ── パスワード変更 ──────────────────────────────────────────
  if (action === 'change_password') {
    const { current_password, new_password } = body as Record<string, unknown>;

    if (typeof current_password !== 'string' || !current_password) {
      return NextResponse.json({ error: '現在のパスワードを入力してください' }, { status: 400 });
    }
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json({ error: '新しいパスワードは8文字以上にしてください' }, { status: 400 });
    }

    // 現在のパスワードを確認（password_hash が必要なため findUserByUsername を使用）
    const userWithHash = await findUserByUsername(session.username);
    if (!userWithHash) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const isValid = await compare(current_password, userWithHash.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 400 });
    }

    try {
      await updateUser(session.user_id, { password_hash: hashSync(new_password, 12) });
      return NextResponse.json({ message: 'パスワードを変更しました' });
    } catch {
      return NextResponse.json({ error: 'パスワードの変更に失敗しました' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
}