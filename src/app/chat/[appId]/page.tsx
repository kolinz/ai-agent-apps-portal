/**
 * src/app/chat/[appId]/page.tsx
 *
 * Chat UI ページ
 *
 * Server Component として初期データ（アプリ一覧・現在アプリ情報）を取得し、
 * ChatContainer（Client Component）に渡す。
 */

import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import { findPublicApps, findAppsByRole } from '@/lib/db/repositories';
import type { SafeApp } from '@/lib/db/repositories';
import ChatContainer from './components/ChatContainer';

type PageProps = {
  params: Promise<{ appId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: PageProps) {
  const { appId } = await params;

  // ── セッション確認（任意。未ログインの学生も使用可能） ──
  const session = await getSession().catch(() => null);
  const isLoggedIn = session !== null;

  // ── 利用可能なアプリ一覧を取得 ──────────────────────────
  let apps: SafeApp[] = [];
  try {
    apps = isLoggedIn
      ? await findAppsByRole(session!.role)
      : await findPublicApps();
  } catch {
    // アプリ一覧取得失敗は空配列で続行
  }

  // ── 現在のアプリが利用可能か確認 ─────────────────────────
  const currentApp = apps.find((a) => a.id === appId);
  if (!currentApp) {
    // ログインユーザーならホームへ、学生はトップへ
    if (apps.length === 0) notFound();
    redirect(isLoggedIn ? '/home' : '/');
  }

  return (
    <ChatContainer
      initialAppId={appId}
      apps={apps}
      currentApp={currentApp}
      isLoggedIn={isLoggedIn}
    />
  );
}