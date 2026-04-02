'use client';

/**
 * src/app/mypage/page.tsx
 *
 * マイページ（ログインユーザー自身のプロフィール閲覧・編集）
 *
 * 機能：
 * - プロフィール表示（名前・メールアドレス・役職・ロール）
 * - プロフィール編集（名前・メールアドレス・役職）
 * - パスワード変更（現在のパスワード確認あり）
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { UserRole } from '@/types';

type Profile = {
  id: string;
  username: string;
  role: UserRole;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  created_at: string;
  updated_at: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  teacher: '教員',
  staff:   '職員',
  admin:   '管理者',
};

const ROLE_COLORS: Record<UserRole, string> = {
  teacher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  staff:   'bg-amber-50 text-amber-700 border-amber-200',
  admin:   'bg-sky-50 text-sky-700 border-sky-200',
};

export default function MyPage() {
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [loading, setLoading]             = useState(true);
  const [toast, setToast]                 = useState<{ message: string; error?: boolean } | null>(null);

  // プロフィール編集
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm]       = useState({ display_name: '', email: '', job_title: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // パスワード変更
  const [showPwForm, setShowPwForm]         = useState(false);
  const [pwForm, setPwForm]                 = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading]           = useState(false);

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // プロフィール取得
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mypage');
      if (res.ok) {
        const data = await res.json() as Profile;
        setProfile(data);
        setProfileForm({
          display_name: data.display_name ?? '',
          email:        data.email        ?? '',
          job_title:    data.job_title    ?? '',
        });
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── プロフィール保存 ────────────────────────────────────────
  async function handleProfileSave() {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/mypage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', ...profileForm }),
      });
      if (res.ok) {
        const updated = await res.json() as Profile;
        setProfile(updated);
        setEditingProfile(false);
        showToast('プロフィールを更新しました');
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? '更新に失敗しました', true);
      }
    } finally { setProfileLoading(false); }
  }

  // ── パスワード変更 ──────────────────────────────────────────
  async function handlePasswordChange() {
    if (!pwForm.current) return showToast('現在のパスワードを入力してください', true);
    if (pwForm.next.length < 8) return showToast('新しいパスワードは8文字以上にしてください', true);
    if (pwForm.next !== pwForm.confirm) return showToast('新しいパスワードが一致しません', true);

    setPwLoading(true);
    try {
      const res = await fetch('/api/mypage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          current_password: pwForm.current,
          new_password: pwForm.next,
        }),
      });
      if (res.ok) {
        setPwForm({ current: '', next: '', confirm: '' });
        setShowPwForm(false);
        showToast('パスワードを変更しました');
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? 'パスワードの変更に失敗しました', true);
      }
    } finally { setPwLoading(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">プロフィールを取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* トースト */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg text-white transition-all
          ${toast.error ? 'bg-red-600' : 'bg-slate-800'}`}>
          {toast.message}
        </div>
      )}

      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/home"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-sm font-semibold text-slate-800">マイページ</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* ── アカウント情報 ────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">アカウント情報</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <Row label="ユーザー名">
              <span className="text-sm font-medium text-slate-800">{profile.username}</span>
            </Row>
            <Row label="種別">
              <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${ROLE_COLORS[profile.role]}`}>
                {ROLE_LABELS[profile.role]}
              </span>
            </Row>
            <Row label="登録日">
              <span className="text-sm text-slate-600">{formatDate(profile.created_at)}</span>
            </Row>
          </div>
        </div>

        {/* ── プロフィール ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">プロフィール</h2>
            {!editingProfile && (
              <button onClick={() => setEditingProfile(true)}
                className="text-xs text-sky-600 hover:text-sky-700 hover:underline">
                編集
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="px-5 py-4 space-y-4">
              {[
                { key: 'display_name', label: '名前',         placeholder: '例：山田 太郎',           type: 'text' },
                { key: 'email',        label: 'メールアドレス', placeholder: '例：yamada@bandai.ed.jp',  type: 'email' },
                { key: 'job_title',    label: '役職',          placeholder: '例：3年担任・進路指導主任', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={profileForm[key as keyof typeof profileForm]}
                    onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={handleProfileSave} disabled={profileLoading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition">
                  {profileLoading ? '保存中...' : '保存する'}
                </button>
                <button onClick={() => {
                  setEditingProfile(false);
                  setProfileForm({
                    display_name: profile.display_name ?? '',
                    email:        profile.email        ?? '',
                    job_title:    profile.job_title    ?? '',
                  });
                }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <Row label="名前">
                <span className="text-sm text-slate-700">{profile.display_name || <Unset />}</span>
              </Row>
              <Row label="メール">
                {profile.email
                  ? <a href={`mailto:${profile.email}`} className="text-sm text-sky-600 hover:underline">{profile.email}</a>
                  : <Unset />}
              </Row>
              <Row label="役職">
                <span className="text-sm text-slate-700">{profile.job_title || <Unset />}</span>
              </Row>
            </div>
          )}
        </div>

        {/* ── パスワード変更 ────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">パスワード</h2>
            {!showPwForm && (
              <button onClick={() => setShowPwForm(true)}
                className="text-xs text-sky-600 hover:text-sky-700 hover:underline">
                変更
              </button>
            )}
          </div>

          {showPwForm ? (
            <div className="px-5 py-4 space-y-4">
              {[
                { key: 'current', label: '現在のパスワード', placeholder: '••••••••' },
                { key: 'next',    label: '新しいパスワード（8文字以上）', placeholder: '••••••••' },
                { key: 'confirm', label: '新しいパスワード（確認）', placeholder: '••••••••' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
                  <input
                    type="password"
                    value={pwForm[key as keyof typeof pwForm]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={handlePasswordChange} disabled={pwLoading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition">
                  {pwLoading ? '変更中...' : '変更する'}
                </button>
                <button onClick={() => { setShowPwForm(false); setPwForm({ current: '', next: '', confirm: '' }); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="text-sm text-slate-400">パスワードはハッシュ化されており表示できません</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

// ── 小コンポーネント ──────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span className="w-28 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Unset() {
  return <span className="text-slate-400 italic text-sm">未設定</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}