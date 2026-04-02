/**
 * src/lib/session.ts
 *
 * httpOnly Cookie を介したセッション管理ユーティリティ
 *
 * 役割の分担：
 * - auth.ts   → JWT の発行・検証（トークン文字列の操作）
 * - session.ts → Cookie の読み書き・削除（HTTPレイヤーの操作）
 *
 * 使用場所：
 * - APIルート（Route Handlers）：NextRequest / NextResponse を使用
 * - Server Components：next/headers の cookies() を使用
 * - middleware.ts：NextRequest.cookies を使用（別途 middleware で直接処理）
 */

import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyJWT, SESSION_COOKIE_NAME, type AppJWTPayload } from './auth';
import type { UserRole } from '@/types';

// ============================================================
// Cookie オプション
// ============================================================

/** セッションCookieの共通オプション */
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,       // JS からアクセス不可（XSS対策）
  secure: process.env.NODE_ENV === 'production',  // 本番はHTTPSのみ
  sameSite: 'lax',      // CSRF対策（'strict'にするとOAuthリダイレクト後にCookieが送られないケースがある）
  path: '/',
  maxAge: 60 * 60 * 8,  // 8時間（秒単位）
} as const;

// ============================================================
// Server Components / Route Handlers 向け
// ============================================================

/**
 * ログイン成功時にセッションCookieを発行する
 * Route Handler（ログインAPI）から呼び出す
 *
 * @example
 * ```typescript
 * // app/api/auth/login/route.ts
 * const token = await createSession({ user_id, username, role });
 * ```
 */
export async function createSession(payload: {
  user_id: string;
  username: string;
  role: UserRole;
}): Promise<string> {
  const token = await signJWT(payload);

  // next/headers の cookies() を使って Cookie をセット
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  return token;
}

/**
 * セッションCookieを削除する（ログアウト）
 * Route Handler（ログアウトAPI）から呼び出す
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * 現在のセッションからJWTペイロードを取得する
 * Server Components・Route Handlers から呼び出す
 *
 * @returns 認証済みの場合はペイロード、未認証・期限切れの場合は null
 *
 * @example
 * ```typescript
 * // app/api/apps/route.ts
 * const session = await getSession();
 * if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * const { role } = session;
 * ```
 */
export async function getSession(): Promise<AppJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

// ============================================================
// Route Handler 向け：NextResponse に Cookie をセットする
// ============================================================

/**
 * NextResponse に直接セッションCookieをセットする
 * リダイレクトと同時に Cookie をセットする必要がある場合に使用する
 *
 * @example
 * ```typescript
 * const response = NextResponse.redirect(new URL('/home', request.url));
 * await setSessionCookie(response, { user_id, username, role });
 * return response;
 * ```
 */
export async function setSessionCookie(
  response: NextResponse,
  payload: { user_id: string; username: string; role: UserRole }
): Promise<NextResponse> {
  const token = await signJWT(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}

// ============================================================
// middleware.ts 向け：NextRequest から直接トークンを取得する
// ============================================================

/**
 * NextRequest の Cookie からJWTペイロードを取得する
 * next/headers の cookies() は middleware で使えないため、
 * middleware 専用にこのユーティリティを提供する
 *
 * @example
 * ```typescript
 * // middleware.ts
 * const payload = await getSessionFromRequest(request);
 * ```
 */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<AppJWTPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}
