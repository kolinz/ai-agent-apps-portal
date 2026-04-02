/**
 * src/app/home/page.tsx
 *
 * ホーム画面（ログイン後・権限別アプリ一覧）
 *
 * Server Component としてセッション取得・アプリ一覧取得を行い、
 * AppGrid（Client Component）にプロップスとして渡す。
 * DBアクセスはリポジトリを直接呼び出す（APIルート経由なし）。
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { findAppsByRole } from '@/lib/db/repositories';
import AppGrid from './components/AppGrid';

export const metadata = {
  title: 'ホーム | 紫竹山ハイスクール 生成AIポータル',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // ── セッション取得（middleware で保護済みだが念のため確認） ──
  const session = await getSession();
  if (!session) redirect('/login');

  // ── アプリ一覧取得 ────────────────────────────────────────
  let apps: Awaited<ReturnType<typeof findAppsByRole>> = [];
  try {
    apps = await findAppsByRole(session.role);
  } catch (error) {
    console.error('[/home] アプリ一覧取得エラー:', error);
    // エラー時は空配列のまま AppGrid に渡す
  }

  return (
    <AppGrid
      apps={apps}
      username={session.username}
      role={session.role}
    />
  );
}