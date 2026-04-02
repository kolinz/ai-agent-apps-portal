/**
 * src/app/admin/layout.tsx
 *
 * 管理者レイアウト
 * - role が admin 以外の場合は /home へリダイレクト
 * - 全管理者ページ共通のヘッダーを提供する
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Link from 'next/link';

export const metadata = {
  title: '管理者ダッシュボード | 万代高校 生成AIポータル',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── ロールガード ──────────────────────────────────────────
  // middleware.ts でも保護済みだが、Server Component 側でも確認する
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/home');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── 共通ヘッダー ─────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* パンくず */}
          <nav className="flex items-center gap-2 text-sm min-w-0">
            <Link
              href="/home"
              className="shrink-0 flex items-center gap-1.5 text-slate-400 hover:text-sky-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              ホーム
            </Link>
            <svg className="shrink-0 w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <Link
              href="/admin"
              className="text-slate-500 hover:text-sky-600 transition-colors truncate"
            >
              管理者ダッシュボード
            </Link>
          </nav>

          {/* ユーザー名 */}
          <span className="shrink-0 text-xs text-slate-400">
            {session.username}
          </span>
        </div>
      </header>

      {/* ── ページコンテンツ ──────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        {children}
      </main>
    </div>
  );
}