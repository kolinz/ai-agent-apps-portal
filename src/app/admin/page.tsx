/**
 * src/app/admin/page.tsx
 *
 * 管理者ダッシュボード
 * ユーザー管理・アプリ管理へのナビゲーションカードを配置する
 */

import Link from 'next/link';

type NavCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
};

const NAV_CARDS: NavCard[] = [
  {
    href: '/admin/users',
    title: 'ユーザー管理',
    description: '教員・職員・管理者アカウントの追加・削除・ロール変更・パスワードリセットを行います。',
    badge: '教職員',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/apps',
    title: 'アプリ管理',
    description: 'AIアプリのエンドポイント・APIキー・アイコン・公開設定を登録・編集・削除します。',
    badge: 'Dify / Langflow',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  return (
    <div>
      {/* ページタイトル */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-800">管理者ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">
          ユーザーとAIアプリの管理を行います
        </p>
      </div>

      {/* ナビゲーションカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="
              group flex flex-col gap-4 rounded-xl border border-slate-200
              bg-white p-6 shadow-sm transition-all duration-200
              hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
            "
          >
            {/* アイコン + バッジ */}
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 group-hover:bg-sky-100 transition-colors">
                {card.icon}
              </div>
              {card.badge && (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">
                  {card.badge}
                </span>
              )}
            </div>

            {/* テキスト */}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 group-hover:text-sky-700 transition-colors flex items-center gap-1.5">
                {card.title}
                <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-400 transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}