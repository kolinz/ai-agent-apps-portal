'use client';

/**
 * src/app/login/components/LoginForm.tsx
 *
 * ログインフォーム（Client Component）
 *
 * - バリデーション：両フィールド必須（クライアントサイド）
 * - 送信：POST /api/auth/login
 * - 成功時：/home へリダイレクト（redirect クエリパラメータがあればそちらへ）
 * - 失敗時：エラーメッセージをインライン表示
 */

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FieldErrors = {
  username?: string;
  password?: string;
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── バリデーション ────────────────────────────────────────
  function validate(): boolean {
    const errors: FieldErrors = {};
    if (username.trim() === '') errors.username = 'ユーザー名を入力してください';
    if (password === '') errors.password = 'パスワードを入力してください';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── 送信処理 ─────────────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        // middleware の redirect クエリパラメータを優先、なければ /home
        const redirect = searchParams.get('redirect') ?? '/home';
        router.push(redirect);
        router.refresh(); // Server Component のキャッシュをクリア
      } else {
        const data = await res.json() as { error?: string };
        setApiError(data.error ?? 'ログインに失敗しました');
      }
    } catch {
      setApiError('通信エラーが発生しました。しばらくしてから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  }

  // ── フィールド変更時にエラーをクリア ─────────────────────
  function handleUsernameChange(v: string) {
    setUsername(v);
    if (fieldErrors.username) setFieldErrors((e) => ({ ...e, username: undefined }));
  }

  function handlePasswordChange(v: string) {
    setPassword(v);
    if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
  }

  // ── UI ───────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* APIエラー（認証失敗等） */}
      {apiError && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <svg
            className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {/* ユーザー名 */}
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          ユーザー名
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="例：yamada_taro"
          disabled={isLoading}
          className={`
            w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900
            placeholder:text-slate-400 outline-none transition
            disabled:bg-slate-50 disabled:text-slate-400
            ${fieldErrors.username
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            }
          `}
        />
        {fieldErrors.username && (
          <p className="mt-1.5 text-xs text-red-600">{fieldErrors.username}</p>
        )}
      </div>

      {/* パスワード */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          パスワード
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder="パスワードを入力"
          disabled={isLoading}
          className={`
            w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900
            placeholder:text-slate-400 outline-none transition
            disabled:bg-slate-50 disabled:text-slate-400
            ${fieldErrors.password
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
            }
          `}
        />
        {fieldErrors.password && (
          <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      {/* ログインボタン */}
      <button
        type="submit"
        disabled={isLoading}
        className="
          w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold
          text-white shadow-sm transition
          hover:bg-sky-700 active:bg-sky-800
          focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
          disabled:opacity-60 disabled:cursor-not-allowed
          mt-1
        "
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            ログイン中...
          </span>
        ) : 'ログイン'}
      </button>
    </form>
  );
}