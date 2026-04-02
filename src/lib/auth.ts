/**
 * src/lib/auth.ts
 *
 * JWT 発行・検証ユーティリティ
 *
 * - ライブラリ：jose（Web Crypto API準拠・Next.js Edge Runtimeで動作）
 * - アルゴリズム：HS256
 * - 有効期限：8時間
 * - 保存場所：httpOnly Cookie（このファイルでは発行のみ。Cookie操作はsession.tsで行う）
 */

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import type { UserRole } from '@/types';

// ============================================================
// 定数
// ============================================================

const ALGORITHM = 'HS256';
const EXPIRES_IN = '8h';

/** Cookieの名前（session.tsと共有） */
export const SESSION_COOKIE_NAME = 'session';

// ============================================================
// ペイロード型定義
// ============================================================

/** JWTペイロード（jose の JWTPayload を拡張） */
export interface AppJWTPayload extends JoseJWTPayload {
  user_id: string;
  username: string;
  role: UserRole;
}

// ============================================================
// 秘密鍵の取得
// ============================================================

/**
 * JWT_SECRET 環境変数を取得し、jose が要求する Uint8Array に変換する
 * Edge Runtime（TextEncoder）と Node.js Runtime（Buffer）の両方で動作する
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      '[auth] JWT_SECRET が .env.local に設定されていません。\n' +
        '以下のコマンドで生成してください：\n' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return new TextEncoder().encode(secret);
}

// ============================================================
// JWT 発行
// ============================================================

/**
 * JWTを発行する
 *
 * @param payload - ユーザー情報（user_id, username, role）
 * @returns 署名済みJWT文字列
 *
 * @example
 * ```typescript
 * const token = await signJWT({ user_id: 'xxx', username: 'admin', role: 'admin' });
 * ```
 */
export async function signJWT(payload: Omit<AppJWTPayload, 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecretKey());
}

// ============================================================
// JWT 検証
// ============================================================

/**
 * JWTを検証し、ペイロードを返す
 * 検証失敗（署名不正・期限切れ等）の場合は null を返す（throwしない）
 *
 * @param token - 検証するJWT文字列
 * @returns 検証成功時はペイロード、失敗時は null
 */
export async function verifyJWT(token: string): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: [ALGORITHM],
    });
    return payload as AppJWTPayload;
  } catch {
    // 期限切れ・署名不正・形式不正はすべて null で統一
    return null;
  }
}
