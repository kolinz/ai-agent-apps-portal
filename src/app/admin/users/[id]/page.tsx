'use client';

/**
 * src/app/admin/users/[id]/page.tsx
 *
 * ユーザー詳細・編集ページ
 *
 * 機能：
 * - ユーザー情報の表示（ユーザー名・ロール・作成日時・更新日時）
 * - ロール変更
 * - パスワードリセット
 * - ユーザー削除
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { UserRole } from '@/types';

type UserRecord = {
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

export default function UserDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [user, setUser]           = useState<UserRecord | null>(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{ message: string; error?: boolean } | null>(null);

  // ロール編集
  const [editingRole, setEditingRole]   = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [roleLoading, setRoleLoading]   = useState(false);

  // プロフィール編集
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    email: '',
    job_title: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // パスワードリセット
  const [showPwForm, setShowPwForm]   = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading]     = useState(false);

  // 削除確認
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ユーザー情報取得
  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const users = await res.json() as UserRecord[];
      const found = users.find((u) => u.id === id) ?? null;
      setUser(found);
      if (found) {
        setSelectedRole(found.role);
        setProfileForm({
          display_name: found.display_name ?? '',
          email:        found.email        ?? '',
          job_title:    found.job_title    ?? '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadUser(); }, [loadUser]);

  // ── ロール変更 ──────────────────────────────────────────────
  async function handleRoleSave() {
    if (!user || selectedRole === user.role) { setEditingRole(false); return; }
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', role: selectedRole }),
      });
      if (res.ok) {
        setUser((u) => u ? { ...u, role: selectedRole, updated_at: new Date().toISOString() } : u);
        setEditingRole(false);
        showToast('ロールを変更しました');
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? 'ロールの変更に失敗しました', true);
      }
    } finally { setRoleLoading(false); }
  }

  // ── プロフィール更新 ────────────────────────────────────────
  async function handleProfileSave() {
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', ...profileForm }),
      });
      if (res.ok) {
        const updated = await res.json() as UserRecord;
        setUser(updated);
        setEditingProfile(false);
        showToast('プロフィールを更新しました');
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? 'プロフィールの更新に失敗しました', true);
      }
    } finally { setProfileLoading(false); }
  }

  // ── パスワードリセット ──────────────────────────────────────
  async function handlePasswordReset() {
    if (newPassword.length < 8) { showToast('パスワードは8文字以上にしてください', true); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', password: newPassword }),
      });
      if (res.ok) {
        setNewPassword('');
        setShowPwForm(false);
        showToast('パスワードをリセットしました');
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? 'パスワードのリセットに失敗しました', true);
      }
    } finally { setPwLoading(false); }
  }

  // ── 削除 ────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/users');
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? '削除に失敗しました', true);
        setShowDelete(false);
      }
    } finally { setDeleteLoading(false); }
  }

  // ── ローディング ────────────────────────────────────────────
  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中...</div>;
  }
  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-slate-500 mb-4">ユーザーが見つかりません</p>
        <Link href="/admin/users" className="text-sm text-sky-600 hover:underline">
          ユーザー一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* トースト */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg text-white
          ${toast.error ? 'bg-red-600' : 'bg-slate-800'}`}>
          {toast.message}
        </div>
      )}

      {/* ページタイトル */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{user.username}</h1>
          <p className="text-sm text-slate-500">ユーザー詳細・編集</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── 基本情報カード ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">基本情報</h2>
          </div>
          <div className="divide-y divide-slate-100">

            {/* ユーザー名 */}
            <Row label="ユーザー名">
              <span className="text-sm font-medium text-slate-800">{user.username}</span>
            </Row>

            {/* ロール */}
            <Row label="種別">
              {editingRole ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-sky-500"
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <button onClick={handleRoleSave} disabled={roleLoading}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition">
                    {roleLoading ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => { setEditingRole(false); setSelectedRole(user.role); }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                  <button onClick={() => setEditingRole(true)}
                    className="text-xs text-sky-600 hover:text-sky-700 hover:underline">
                    変更
                  </button>
                </div>
              )}
            </Row>

            {/* 作成日時 */}
            <Row label="作成日時">
              <span className="text-sm text-slate-600">{formatDate(user.created_at)}</span>
            </Row>

            {/* 更新日時 */}
            <Row label="更新日時">
              <span className="text-sm text-slate-600">{formatDate(user.updated_at)}</span>
            </Row>
          </div>
        </div>

        {/* ── プロフィールカード ───────────────────────────────── */}
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
            <div className="px-5 py-4 space-y-3">
              {[
                { key: 'display_name', label: '名前',         placeholder: '例：山田 太郎',          type: 'text' },
                { key: 'email',        label: 'メールアドレス', placeholder: '例：yamada@bandai.ed.jp', type: 'email' },
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
                    display_name: user.display_name ?? '',
                    email:        user.email        ?? '',
                    job_title:    user.job_title    ?? '',
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
                <span className="text-sm text-slate-700">{user.display_name || <Unset />}</span>
              </Row>
              <Row label="メール">
                <span className="text-sm text-slate-700">
                  {user.email
                    ? <a href={`mailto:${user.email}`} className="text-sky-600 hover:underline">{user.email}</a>
                    : <Unset />}
                </span>
              </Row>
              <Row label="役職">
                <span className="text-sm text-slate-700">{user.job_title || <Unset />}</span>
              </Row>
            </div>
          )}
        </div>

        {/* ── パスワードリセットカード ────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">パスワード</h2>
            {!showPwForm && (
              <button onClick={() => setShowPwForm(true)}
                className="text-xs text-sky-600 hover:text-sky-700 hover:underline">
                リセット
              </button>
            )}
          </div>
          {showPwForm ? (
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  新しいパスワード（8文字以上）
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handlePasswordReset} disabled={pwLoading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition">
                  {pwLoading ? '処理中...' : '変更する'}
                </button>
                <button onClick={() => { setShowPwForm(false); setNewPassword(''); }}
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

        {/* ── 危険操作カード ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 bg-red-50">
            <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide">危険な操作</h2>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">アカウントを削除</p>
              <p className="text-xs text-slate-400 mt-0.5">この操作は取り消せません</p>
            </div>
            <button onClick={() => setShowDelete(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition">
              削除する
            </button>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl px-6 py-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">ユーザー削除の確認</h2>
            <p className="text-sm text-slate-600 mb-5">
              <span className="font-semibold text-slate-800">{user.username}</span> を削除しますか？
              この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                キャンセル
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50">
                {deleteLoading ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 小コンポーネント ──────────────────────────────────────────
function Unset() {
  return <span className="text-slate-400 italic">未設定</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span className="w-24 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}