/**
 * src/middleware.ts
 * ※ Next.js の規約により、src/ を使う場合は src/middleware.ts に配置する
 *
 * ルートレベルのアクセス制御ミドルウェア
 *
 * 保護ルール：
 * ┌─────────────────────┬──────────────────────────────────┐
 * │ パターン             │ アクセス制御                      │
 * ├─────────────────────┼──────────────────────────────────┤
 * │ /api/public/*       │ 認証不要（誰でもアクセス可能）      │
 * │ /api/auth/*         │ 認証不要（ログイン・ログアウト）     │
 * │ /api/apps           │ JWT検証必須                       │
 * │ /api/chat/*         │ JWT検証必須                       │
 * │ /api/admin/*        │ JWT検証必須 + role=admin のみ     │
 * │ /login              │ 認証不要                          │
 * │ /home               │ JWT検証必須（ページ保護）           │
 * │ /admin/*            │ JWT検証必須 + role=admin のみ     │
 * │ /                   │ 認証不要（公開トップページ）         │
 * └─────────────────────┴──────────────────────────────────┘
 *
 * Edge Runtime で動作するため、以下の制約がある：
 * - Node.js 固有のAPI（fs, crypto 等）は使用不可
 * - jose は Edge Runtime 対応済み（Web Crypto APIを使用）
 * - better-sqlite3 は使用不可（DBアクセスはAPIルート内で行う）
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

// ============================================================
// ルート分類の定義
// ============================================================

/** 認証不要のAPIルート（前方一致） */
const PUBLIC_API_PREFIXES = [
  '/api/public/',
  '/api/auth/',
] as const;

/** JWT検証必須のAPIルート（前方一致） */
const PROTECTED_API_PREFIXES = [
  '/api/apps',
  // '/api/chat/',
] as const;

/** admin ロールのみ許可するAPIルート（前方一致） */
const ADMIN_API_PREFIXES = [
  '/api/admin/',
] as const;

/** JWT検証必須のページルート（前方一致） */
const PROTECTED_PAGE_PREFIXES = [
  '/home',
] as const;

/** admin ロールのみ許可するページルート（前方一致） */
const ADMIN_PAGE_PREFIXES = [
  '/admin',
] as const;

// ============================================================
// ヘルパー関数
// ============================================================

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

/** JSON形式の401レスポンスを返す */
function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** JSON形式の403レスポンスを返す */
function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ============================================================
// ミドルウェア本体
// ============================================================

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ──────────────────────────────────────────────────────────
  // 1. APIルートの保護
  // ──────────────────────────────────────────────────────────

  if (pathname.startsWith('/api/')) {

    // 1-a. 認証不要のAPIルート → そのまま通過
    if (matchesPrefix(pathname, PUBLIC_API_PREFIXES)) {
      return NextResponse.next();
    }

    // 1-b. admin専用APIルート → JWT検証 + adminロール検証
    if (matchesPrefix(pathname, ADMIN_API_PREFIXES)) {
      const session = await getSessionFromRequest(request);
      if (!session) return unauthorized();
      if (session.role !== 'admin') return forbidden();
      return NextResponse.next();
    }

    // 1-c. JWT検証必須のAPIルート → JWT検証のみ
    if (matchesPrefix(pathname, PROTECTED_API_PREFIXES)) {
      const session = await getSessionFromRequest(request);
      if (!session) return unauthorized();
      return NextResponse.next();
    }

    // 1-d. 上記以外のAPIルート → 未定義ルートとして通過
    //      （Next.jsが404を返す）
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────
  // 2. ページルートの保護
  // ──────────────────────────────────────────────────────────

  // 2-a. admin専用ページ → JWT検証 + adminロール検証
  if (matchesPrefix(pathname, ADMIN_PAGE_PREFIXES)) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      // 未認証 → ログインページへリダイレクト
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== 'admin') {
      // admin以外 → ホームへリダイレクト
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // 2-b. 要認証ページ → JWT検証
  if (matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES)) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2-c. ログインページ → 認証済みなら /home へリダイレクト
  if (pathname === '/login') {
    const session = await getSessionFromRequest(request);
    if (session) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // 2-d. その他（/ 等の公開ページ） → そのまま通過
  return NextResponse.next();
}

// ============================================================
// matcher：ミドルウェアを適用するルートの指定
// ============================================================

export const config = {
  matcher: [
    /*
     * 以下のパスにミドルウェアを適用する：
     * - /api/* （すべてのAPIルート）
     * - /home, /home/* （ホーム画面）
     * - /admin, /admin/* （管理者画面）
     * - /login （ログイン画面）
     *
     * 除外（Next.js の内部処理・静的ファイル）：
     * - _next/static（静的アセット）
     * - _next/image（画像最適化）
     * - favicon.ico
     * - /icons/* （アプリアイコン画像）
     */
    '/api/:path*',
    '/home/:path*',
    '/home',
    '/admin/:path*',
    '/admin',
    '/login',
  ],
};
