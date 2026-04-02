'use client';

/**
 * src/app/admin/apps/page.tsx
 *
 * アプリ管理画面（Client Component）
 *
 * 機能：
 * - アプリ一覧表示（アイコン・名前・対象種別・エンドポイント）
 * - アプリ新規登録（スライドインパネル）
 * - アプリ編集（スライドインパネル）
 * - アプリ削除（確認モーダル）
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AppForm, { type AppFormData } from './components/AppForm';
import type { SafeApp } from '@/lib/db/repositories';
import type { AppRole } from '@/types';

// ── ロール表示 ────────────────────────────────────────────────
const ROLE_LABELS: Record<AppRole, string> = {
  public:  '公開',
  teacher: '教員',
  staff:   '職員',
  admin:   '管理者',
};
const ROLE_COLORS: Record<AppRole, string> = {
  public:  'bg-sky-50 text-sky-700 border-sky-200',
  teacher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  staff:   'bg-amber-50 text-amber-700 border-amber-200',
  admin:   'bg-violet-50 text-violet-700 border-violet-200',
};

type PanelState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; app: SafeApp };

// ── メインコンポーネント ──────────────────────────────────────
export default function AppsPage() {
  const [apps, setApps]           = useState<SafeApp[]>([]);
  const [loading, setLoading]     = useState(true);
  const [panel, setPanel]         = useState<PanelState>({ type: 'none' });
  const [submitting, setSubmit]   = useState(false);
  const [deleteTarget, setDelete] = useState<SafeApp | null>(null);
  const [toast, setToast]         = useState<{ message: string; error?: boolean } | null>(null);

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/apps');
      if (res.ok) setApps(await res.json() as SafeApp[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApps(); }, [loadApps]);

  // ── フォーム送信（新規 / 編集） ─────────────────────────────
  async function handleSubmit(data: AppFormData) {
    setSubmit(true);
    try {
      const form = buildFormData(data);
      const isEdit = panel.type === 'edit';
      const url = isEdit ? `/api/admin/apps/${panel.app.id}` : '/api/admin/apps';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, body: form });
      if (res.ok) {
        await loadApps();
        setPanel({ type: 'none' });
        showToast(isEdit ? 'アプリを更新しました' : 'アプリを登録しました');
      } else {
        const err = await res.json() as { error?: string };
        showToast(err.error ?? '操作に失敗しました', true);
      }
    } finally {
      setSubmit(false);
    }
  }

  // ── 削除 ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/apps/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadApps();
      showToast('アプリを削除しました');
    } else {
      const err = await res.json() as { error?: string };
      showToast(err.error ?? '削除に失敗しました', true);
    }
    setDelete(null);
  }

  return (
    <div className="relative">

      {/* トースト */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg text-white
          ${toast.error ? 'bg-red-600' : 'bg-slate-800'}`}>
          {toast.message}
        </div>
      )}

      {/* ページタイトル */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">アプリ管理</h1>
          <p className="mt-1 text-sm text-slate-500">AIアプリの登録・編集・削除</p>
        </div>
        <button
          onClick={() => setPanel({ type: 'create' })}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          アプリ追加
        </button>
      </div>

      {/* アプリ一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">読み込み中...</div>
        ) : apps.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            登録済みのアプリはありません
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {apps.map((app) => (
              <div key={app.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">

                {/* アイコン */}
                <div className="relative shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <Image src={app.icon_url} alt={app.name} fill className="object-cover" sizes="40px" />
                </div>

                {/* アプリ情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 truncate">{app.name}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                      {app.backend_type}
                    </span>
                  </div>
                  {/* ロールバッジ */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {app.roles.map((role) => (
                      <span key={role}
                        className={`text-xs font-medium border rounded-full px-2 py-0.5 ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 操作ボタン */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <button
                    onClick={() => setPanel({ type: 'edit', app })}
                    className="text-xs text-slate-500 hover:text-sky-600 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setDelete(app)}
                    className="text-xs text-slate-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* スライドインパネル（新規登録 / 編集） */}
      {panel.type !== 'none' && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
            onClick={() => !submitting && setPanel({ type: 'none' })}
          />
          {/* パネル本体 */}
          <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* パネルヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">
                {panel.type === 'create' ? 'アプリ追加' : 'アプリ編集'}
              </h2>
              <button
                onClick={() => !submitting && setPanel({ type: 'none' })}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* フォーム */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AppForm
                mode={panel.type === 'create' ? 'create' : 'edit'}
                initial={panel.type === 'edit' ? {
                  name: panel.app.name,
                  description: panel.app.description ?? '',
                  backend_type: panel.app.backend_type,
                  roles: panel.app.roles,
                  icon_url: panel.app.icon_url,
                } : undefined}
                onSubmit={handleSubmit}
                onCancel={() => setPanel({ type: 'none' })}
                loading={submitting}
              />
            </div>
          </aside>
        </>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl px-6 py-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">アプリ削除の確認</h2>
            <p className="text-sm text-slate-600 mb-5">
              <span className="font-semibold text-slate-800">{deleteTarget.name}</span> を削除しますか？
              このアプリのチャット履歴もすべて削除されます。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelete(null)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                キャンセル
              </button>
              <button onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FormData 構築ヘルパー ─────────────────────────────────────
function buildFormData(data: AppFormData): FormData {
  const form = new FormData();
  form.append('name', data.name);
  form.append('description', data.description);
  form.append('backend_type', data.backend_type);
  form.append('backend_endpoint', data.backend_endpoint);
  if (data.backend_api_key) form.append('backend_api_key', data.backend_api_key);
  if (data.backend_flow_id) form.append('backend_flow_id', data.backend_flow_id);
  form.append('roles', JSON.stringify(data.roles));
  if (data.iconFile) form.append('icon', data.iconFile);
  return form;
}