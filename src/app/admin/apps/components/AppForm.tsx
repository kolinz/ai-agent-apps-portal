'use client';

/**
 * src/app/admin/apps/components/AppForm.tsx
 *
 * アプリ登録・編集フォームコンポーネント
 *
 * - mode='create'：新規登録（アイコン必須・APIキー必須）
 * - mode='edit'  ：編集（アイコン任意・APIキー空欄で既存を維持）
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import type { AppRole, BackendType } from '@/types';

export type AppFormData = {
  name: string;
  description: string;
  backend_type: BackendType;
  backend_endpoint: string;
  backend_api_key: string;
  backend_flow_id: string;
  roles: AppRole[];
  iconFile: File | null;
};

type AppFormProps = {
  mode: 'create' | 'edit';
  initial?: Partial<AppFormData> & { icon_url?: string };
  onSubmit: (data: AppFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
};

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'public',  label: '公開（学生含む全員）' },
  { value: 'teacher', label: '教員' },
  { value: 'staff',   label: '職員' },
  { value: 'admin',   label: '管理者' },
];

export default function AppForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  loading,
}: AppFormProps) {
  const [name, setName]             = useState(initial?.name ?? '');
  const [description, setDesc]      = useState(initial?.description ?? '');
  const [backendType, setType]      = useState<BackendType>(initial?.backend_type ?? 'dify');
  const [endpoint, setEndpoint]     = useState(initial?.backend_endpoint ?? '');
  const [apiKey, setApiKey]         = useState('');
  const [flowId, setFlowId]         = useState(initial?.backend_flow_id ?? '');
  const [roles, setRoles]           = useState<AppRole[]>(initial?.roles ?? ['public']);
  const [iconFile, setIconFile]     = useState<File | null>(null);
  const [iconPreview, setPreview]   = useState<string | null>(initial?.icon_url ?? null);
  const [error, setError]           = useState<string | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // アイコン選択
  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('PNG / JPG / WebP 形式の画像を選択してください');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('画像サイズは2MB以下にしてください');
      return;
    }
    setIconFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  // ロール切り替え
  function toggleRole(role: AppRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  // 送信
  async function handleSubmit() {
    setError(null);

    // クライアント側バリデーション
    if (!name.trim()) return setError('アプリ名を入力してください');
    if (!endpoint.trim()) return setError('エンドポイントを入力してください');
    if (mode === 'create' && !apiKey.trim()) return setError('APIキーを入力してください');
    if (backendType === 'langflow' && !flowId.trim()) return setError('Flow ID を入力してください');
    if (roles.length === 0) return setError('対象ユーザー種別を1つ以上選択してください');
    if (mode === 'create' && !iconFile) return setError('アイコン画像を選択してください');

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      backend_type: backendType,
      backend_endpoint: endpoint.trim(),
      backend_api_key: apiKey.trim(),
      backend_flow_id: flowId.trim(),
      roles,
      iconFile,
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* アイコン画像 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          アイコン画像{mode === 'create' && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="flex items-center gap-4">
          {/* プレビュー */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 cursor-pointer hover:border-sky-400 transition flex items-center justify-center"
          >
            {iconPreview ? (
              <Image src={iconPreview} alt="プレビュー" fill className="object-cover" sizes="64px" />
            ) : (
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              {iconPreview ? '画像を変更' : '画像を選択'}
            </button>
            <p className="text-xs text-slate-400 mt-0.5">PNG / JPG・2MB以下</p>
            {mode === 'edit' && (
              <p className="text-xs text-slate-400">選択しない場合は既存の画像を維持</p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleIconChange}
          className="hidden"
        />
      </div>

      {/* アプリ名 */}
      <Field label="アプリ名" required>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="例：進路相談AI"
          className={inputClass} />
      </Field>

      {/* 説明文 */}
      <Field label="説明文">
        <textarea value={description} onChange={(e) => setDesc(e.target.value)}
          placeholder="アプリカードに表示される説明文（任意）"
          rows={2}
          className={`${inputClass} resize-none`} />
      </Field>

      {/* バックエンド種別 */}
      <Field label="バックエンド種別" required>
        <select value={backendType} onChange={(e) => setType(e.target.value as BackendType)}
          className={inputClass}>
          <option value="dify">Dify</option>
          <option value="langflow">Langflow</option>
        </select>
      </Field>

      {/* エンドポイント */}
      <Field label="エンドポイント" required>
        <input type="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
          placeholder={backendType === 'dify' ? 'http://localhost/v1' : 'http://localhost:7860'}
          className={inputClass} />
      </Field>

      {/* APIキー */}
      <Field
        label={mode === 'edit' ? 'APIキー（変更する場合のみ入力）' : 'APIキー'}
        required={mode === 'create'}
      >
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          placeholder={mode === 'edit' ? '変更しない場合は空欄のまま' : ''}
          className={inputClass} />
        <p className="mt-1 text-xs text-slate-400">AES-256で暗号化してDBに保存されます</p>
      </Field>

      {/* Flow ID（Langflow のみ） */}
      {backendType === 'langflow' && (
        <Field label="Flow ID" required>
          <input type="text" value={flowId} onChange={(e) => setFlowId(e.target.value)}
            placeholder="例：abc123-def456-..."
            className={inputClass} />
        </Field>
      )}

      {/* 対象ユーザー種別 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          対象ユーザー種別<span className="text-red-500 ml-0.5">*</span>
          <span className="text-slate-400 font-normal ml-1">（複数選択可）</span>
        </label>
        <div className="space-y-2">
          {ROLE_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={roles.includes(value)}
                onChange={() => toggleRole(value)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
          キャンセル
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition disabled:opacity-50">
          {loading ? '処理中...' : mode === 'create' ? '登録する' : '更新する'}
        </button>
      </div>
    </div>
  );
}

// ── 小コンポーネント ──────────────────────────────────────────
const inputClass = `
  w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm
  outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100
  placeholder:text-slate-400
`;

function Field({ label, required, children }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}