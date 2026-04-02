/**
 * src/app/api/auth/login/route.ts
 *
 * ログインAPI
 *
 * POST /api/auth/login
 * Request:  { username: string, password: string }
 * Response: { token: string, user: { id, username, role } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { findUserByUsername } from '@/lib/db/repositories';
import { createSession } from '@/lib/session';
import { signJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {

  // ── 1. リクエストボディのパース ──────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'リクエストの形式が正しくありません' },
      { status: 400 }
    );
  }

  const { username, password } = body as Record<string, unknown>;

  // ── 2. 入力バリデーション ────────────────────────────────
  if (typeof username !== 'string' || username.trim() === '') {
    return NextResponse.json(
      { error: 'ユーザー名を入力してください' },
      { status: 400 }
    );
  }
  if (typeof password !== 'string' || password === '') {
    return NextResponse.json(
      { error: 'パスワードを入力してください' },
      { status: 400 }
    );
  }

  // ── 3. ユーザーの存在確認 ────────────────────────────────
  const user = await findUserByUsername(username.trim());

  // ユーザーが存在しない場合・パスワードが一致しない場合は
  // 同一のエラーメッセージを返す（ユーザー名の存在有無を隠蔽）
  if (!user) {
    return NextResponse.json(
      { error: 'ユーザー名またはパスワードが正しくありません' },
      { status: 401 }
    );
  }

  // ── 4. パスワード検証 ────────────────────────────────────
  const isValid = await compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json(
      { error: 'ユーザー名またはパスワードが正しくありません' },
      { status: 401 }
    );
  }

  // ── 5. JWT発行・Cookie セット ────────────────────────────
  //   createSession() が signJWT() + cookieStore.set() を行う
  const token = await createSession({
    user_id: user.id,
    username: user.username,
    role: user.role,
  });

  // ── 6. レスポンス返却 ────────────────────────────────────
  return NextResponse.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}
