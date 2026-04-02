/**
 * src/app/page.tsx
 *
 * トップページ（公開アプリ一覧）
 *
 * - 認証不要。学生を含む全員がアクセス可能
 * - publicロールのアプリを一覧表示する
 * - Server Component としてサーバー側でアプリ一覧を取得する
 *   （APIルート経由ではなくリポジトリを直接呼び出してレンダリングを高速化）
 */

import Link from 'next/link';
import { findPublicApps } from '@/lib/db/repositories';
import AppCard from './components/AppCard';

export const metadata = {
  title: '紫竹山ハイスクール 生成AIポータル',
  description: '紫竹山ハイスクール 生成AIポータル',
};

// サーバー側でアプリ一覧を取得（キャッシュなし・常に最新を表示）
export const dynamic = 'force-dynamic';

export default async function TopPage() {
  let apps: Awaited<ReturnType<typeof findPublicApps>> = [];
  let fetchError = false;

  try {
    apps = await findPublicApps();
  } catch {
    fetchError = true;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* システム名 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-800 truncate">
              紫竹山ハイスクール 生成AIポータル
            </span>
          </div>

          {/* ログインリンク */}
          <Link
            href="/login"
            className="
              shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300
              px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-white transition
              hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
            "
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            教職員ログイン
          </Link>
        </div>
      </header>

      {/* ── メインコンテンツ ──────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* ページタイトル */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800">
            AIアプリ一覧
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            使いたいAIアプリを選んでください
          </p>
        </div>

        {/* エラー表示 */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            アプリ一覧の読み込みに失敗しました。ページを再読み込みしてください。
          </div>
        )}

        {/* アプリなし */}
        {!fetchError && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">公開中のアプリはありません</p>
            <p className="mt-1 text-xs text-slate-400">管理者がアプリを公開すると、ここに表示されます</p>
          </div>
        )}

        {/* アプリカードグリッド */}
        {!fetchError && apps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                id={app.id}
                name={app.name}
                description={app.description}
                icon_url={app.icon_url}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── フッター ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center">
          <p className="text-xs text-slate-400">
            © 紫竹山ハイスクール
          </p>
        </div>
      </footer>
    </div>
  );
}