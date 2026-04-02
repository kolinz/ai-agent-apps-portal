/**
 * src/app/api/public/apps/route.ts
 *
 * 公開アプリ一覧取得API（認証不要）
 *
 * GET /api/public/apps
 * Response: SafeApp[]（backend_endpoint・backend_api_key は含まない）
 */

import { NextResponse } from 'next/server';
import { findPublicApps } from '@/lib/db/repositories';

export async function GET() {
  try {
    const apps = await findPublicApps();
    return NextResponse.json(apps);
  } catch (error) {
    console.error('[/api/public/apps] エラー:', error);
    return NextResponse.json(
      { error: 'アプリ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}