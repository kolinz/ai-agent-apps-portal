/**
 * src/app/api/apps/route.ts
 *
 * 権限別アプリ一覧取得API（JWT認証必須）
 *
 * GET /api/apps
 * Headers: Cookie: session=<JWT>
 * Response: SafeApp[]（roleに応じてフィルタリング済み）
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { findAppsByRole } from '@/lib/db/repositories';

export async function GET() {
  // ── 認証確認（middleware でも保護済みだが二重チェック） ──
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const apps = await findAppsByRole(session.role);
    return NextResponse.json(apps);
  } catch (error) {
    console.error('[/api/apps] エラー:', error);
    return NextResponse.json(
      { error: 'アプリ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}