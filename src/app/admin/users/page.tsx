'use client';

/**
 * src/app/admin/users/page.tsx
 *
 * ユーザー管理画面（Client Component）
 *
 * 機能：
 * - ユーザー一覧表示（ユーザー名・種別・作成日時）
 * - ユーザー追加モーダル
 * - パスワードリセットモーダル
 * - ロール変更（インライン）
 * - ユーザー削除
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { UserRole } from '@/types';

// ── 型定義 ───────────────────────────────────────────────────
type UserRecord = {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
};

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'reset_password'; user: UserRecord }
  | { type: 'delete'; user: UserRecord };

// ── 定数 ─────────────────────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  teacher: '教員',
  staff:   '職員',
  admin:   '管理者',
};

const ROLE_COLORS: Record<UserRole, string> = {
  teacher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  staff:   'bg-amber-50  text-amber-700  border-amber-200',
  admin:   'bg-sky-50    text-sky-700    border-sky-200',
};

// ── メインコンポーネント ──────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  // トースト表示
  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ユーザー一覧取得
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json() as UserRecord[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── ロール変更（インライン） ───────────────────────────────
  async function handleRoleChange(user: UserRecord, role: UserRole) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_role', role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
      showToast(`${user.username} のロールを変更しました`);
    } else {
      const data = await res.json() as { error?: string };
      showToast(data.error ?? 'ロールの変更に失敗しました', true);
    }
  }

  return (
    <div>
      {/* トースト */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg text-white transition-all
          ${toast.error ? 'bg-red-600' : 'bg-slate-800'}`}>
          {toast.message}
        </div>
      )}

      {/* ページタイトル */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">ユーザー管理</h1>
          <p className="mt-1 text-sm text-slate-500">教職員アカウントの管理</p>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          ユーザー追加
        </button>
      </div>

      {/* ユーザー一覧テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">読み込み中...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">ユーザーが登録されていません</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">ユーザー名</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">種別</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden sm:table-cell">作成日時</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  {/* ユーザー名（詳細ページへのリンク） */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-slate-800 hover:text-sky-600 hover:underline transition-colors"
                    >
                      {user.username}
                    </Link>
                  </td>

                  {/* ロール（インライン変更） */}
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                      className={`text-xs font-medium rounded-full border px-2.5 py-1 outline-none cursor-pointer transition ${ROLE_COLORS[user.role]}`}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>

                  {/* 作成日時 */}
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                    {new Date(user.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>

                  {/* 操作ボタン */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setModal({ type: 'reset_password', user })}
                        className="text-xs text-slate-500 hover:text-sky-600 px-2 py-1 rounded-lg hover:bg-sky-50 transition"
                        title="パスワードリセット"
                      >
                        PW変更
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', user })}
                        className="text-xs text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* モーダル群 */}
      {modal.type === 'add' && (
        <AddUserModal
          onClose={() => setModal({ type: 'none' })}
          onSuccess={() => { loadUsers(); showToast('ユーザーを追加しました'); }}
          onError={(msg) => showToast(msg, true)}
        />
      )}
      {modal.type === 'reset_password' && (
        <ResetPasswordModal
          user={modal.user}
          onClose={() => setModal({ type: 'none' })}
          onSuccess={() => showToast('パスワードをリセットしました')}
          onError={(msg) => showToast(msg, true)}
        />
      )}
      {modal.type === 'delete' && (
        <DeleteUserModal
          user={modal.user}
          onClose={() => setModal({ type: 'none' })}
          onSuccess={() => { loadUsers(); showToast('ユーザーを削除しました'); }}
          onError={(msg) => showToast(msg, true)}
        />
      )}
    </div>
  );
}

// ── モーダル共通ラッパー ──────────────────────────────────────
function Modal({ title, children, onClose }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── ユーザー追加モーダル ──────────────────────────────────────
function AddUserModal({ onClose, onSuccess, onError }: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim()) return onError('ユーザー名を入力してください');
    if (password.length < 8) return onError('パスワードは8文字以上にしてください');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else {
        const data = await res.json() as { error?: string };
        onError(data.error ?? 'ユーザーの追加に失敗しました');
      }
    } finally { setLoading(false); }
  }

  return (
    <Modal title="ユーザー追加" onClose={onClose}>
      <div className="space-y-4">
        <Field label="ユーザー名">
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="例：yamada_taro"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </Field>
        <Field label="パスワード（8文字以上）">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </Field>
        <Field label="種別">
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </Field>
        <SubmitButton loading={loading} onClick={handleSubmit} label="追加する" />
      </div>
    </Modal>
  );
}

// ── パスワードリセットモーダル ────────────────────────────────
function ResetPasswordModal({ user, onClose, onSuccess, onError }: {
  user: UserRecord;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) return onError('パスワードは8文字以上にしてください');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', password }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else {
        const data = await res.json() as { error?: string };
        onError(data.error ?? 'パスワードのリセットに失敗しました');
      }
    } finally { setLoading(false); }
  }

  return (
    <Modal title={`パスワード変更：${user.username}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="新しいパスワード（8文字以上）">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </Field>
        <SubmitButton loading={loading} onClick={handleSubmit} label="変更する" />
      </div>
    </Modal>
  );
}

// ── ユーザー削除確認モーダル ──────────────────────────────────
function DeleteUserModal({ user, onClose, onSuccess, onError }: {
  user: UserRecord;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) { onSuccess(); onClose(); }
      else {
        const data = await res.json() as { error?: string };
        onError(data.error ?? '削除に失敗しました');
      }
    } finally { setLoading(false); }
  }

  return (
    <Modal title="ユーザー削除の確認" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-5">
        <span className="font-semibold text-slate-800">{user.username}</span> を削除しますか？
        この操作は取り消せません。
      </p>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
          キャンセル
        </button>
        <button onClick={handleDelete} disabled={loading}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50">
          {loading ? '削除中...' : '削除する'}
        </button>
      </div>
    </Modal>
  );
}

// ── 小コンポーネント ──────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, onClick, label }: {
  loading: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition disabled:opacity-50 mt-1">
      {loading ? '処理中...' : label}
    </button>
  );
}