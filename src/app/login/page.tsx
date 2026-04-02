/**
 * src/app/login/page.tsx
 *
 * ログインページ（Server Component）
 * 認証済みユーザーのリダイレクトはmiddleware.tsで処理する
 */

import LoginForm from './components/LoginForm';

export const metadata = {
  title: 'ログイン | 紫竹山ハイスクール 生成AIポータル',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm px-4">

        {/* ロゴ・タイトル */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 mb-5 shadow-md">
            {/* AIアイコン（SVG） */}
            <svg
              className="w-7 h-7 text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
              <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
            紫竹山ハイスクール 生成AIポータル
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            教職員ログイン
          </p>
        </div>

        {/* ログインフォームカード */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          学生の方はログイン不要です。
          <a href="/" className="text-sky-600 hover:underline ml-1">
            トップページへ
          </a>
        </p>
      </div>
    </div>
  );
}