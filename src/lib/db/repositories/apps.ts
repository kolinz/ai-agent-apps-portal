/**
 * src/lib/db/repositories/apps.ts
 *
 * appsテーブルのリポジトリ
 *
 * 設計方針：
 * - backend_api_keyの暗号化・復号はこのリポジトリ内で完結させる
 * - フロントエンド向け（APIキーなし）とサーバーサイド向け（APIキーあり）を型で分離する
 * - rolesカラムはJSON文字列⇔配列の変換をリポジトリ内で処理する
 */

import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, apps } from '../index';
import { encrypt, decrypt } from '@/lib/crypto';
import type { AppRole, BackendType } from '@/types';

// ============================================================
// 型定義
// ============================================================

/** フロントエンド向けアプリ情報（APIキー・エンドポイントなし） */
export type SafeApp = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string;
  backend_type: BackendType;
  roles: AppRole[];
};

/** サーバーサイド向けアプリ情報（APIキー・エンドポイント含む） */
export type AppWithSecret = SafeApp & {
  backend_endpoint: string;
  backend_api_key: string;       // 復号済み平文
  backend_flow_id: string | null;
};

/** アプリ作成パラメータ */
export type CreateAppParams = {
  name: string;
  description?: string | null;
  icon_url: string;
  backend_type: BackendType;
  backend_endpoint: string;
  backend_api_key: string;       // 平文（保存時に暗号化）
  backend_flow_id?: string | null;
  roles: AppRole[];
};

/** アプリ更新パラメータ */
export type UpdateAppParams = Partial<CreateAppParams>;

// ============================================================
// ヘルパー関数
// ============================================================

/** DBレコードのroles（JSON文字列）を配列に変換 */
function parseRoles(rolesJson: string): AppRole[] {
  try {
    return JSON.parse(rolesJson) as AppRole[];
  } catch {
    return ['public'];
  }
}

/** DBレコードをSafeApp型に変換（APIキー除外） */
function toSafeApp(record: typeof apps.$inferSelect): SafeApp {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    icon_url: record.icon_url,
    backend_type: record.backend_type as BackendType,
    roles: parseRoles(record.roles),
  };
}

/** DBレコードをAppWithSecret型に変換（APIキー復号） */
function toAppWithSecret(record: typeof apps.$inferSelect): AppWithSecret {
  return {
    ...toSafeApp(record),
    backend_endpoint: record.backend_endpoint,
    backend_api_key: decrypt(record.backend_api_key),
    backend_flow_id: record.backend_flow_id,
  };
}

// ============================================================
// リポジトリ関数
// ============================================================

/**
 * publicロールを含むアプリを取得する（トップページ・認証不要）
 * APIキー・エンドポイントはレスポンスに含めない
 */
export async function findPublicApps(): Promise<SafeApp[]> {
  const records = await db.select().from(apps);

  return records
    .filter((r) => parseRoles(r.roles).includes('public'))
    .map(toSafeApp);
}

/**
 * ロールに応じたアプリを取得する（ホーム画面・認証必須）
 * APIキー・エンドポイントはレスポンスに含めない
 *
 * @param role - ログインユーザーのロール
 *   - 'teacher': public + teacher のアプリを返す
 *   - 'staff':   public + staff のアプリを返す
 *   - 'admin':   全アプリを返す
 */
export async function findAppsByRole(
  role: 'teacher' | 'staff' | 'admin'
): Promise<SafeApp[]> {
  const records = await db.select().from(apps);

  if (role === 'admin') {
    return records.map(toSafeApp);
  }

  // public または ロールに一致するアプリをフィルタリング
  const allowedRoles: AppRole[] = ['public', role];
  return records
    .filter((r) => {
      const appRoles = parseRoles(r.roles);
      return allowedRoles.some((ar) => appRoles.includes(ar));
    })
    .map(toSafeApp);
}

/**
 * IDでアプリを取得する（チャット中継API用・APIキーを含む）
 * ⚠️ サーバーサイドのAPIルートのみで使用すること
 */
export async function findAppWithSecretById(
  id: string
): Promise<AppWithSecret | null> {
  const result = await db.select().from(apps).where(eq(apps.id, id)).limit(1);

  if (!result[0]) return null;
  return toAppWithSecret(result[0]);
}

/**
 * 全アプリを取得する（管理者画面用・APIキー含まず）
 */
export async function findAllApps(): Promise<SafeApp[]> {
  const records = await db.select().from(apps);
  return records.map(toSafeApp);
}

/**
 * アプリを新規登録する
 * APIキーは保存前にAES-256-GCMで暗号化する
 */
export async function createApp(params: CreateAppParams): Promise<SafeApp> {
  const now = new Date().toISOString();
  const newApp = {
    id: uuidv4(),
    name: params.name,
    description: params.description ?? null,
    icon_url: params.icon_url,
    backend_type: params.backend_type,
    backend_endpoint: params.backend_endpoint,
    backend_api_key: encrypt(params.backend_api_key),  // 暗号化して保存
    backend_flow_id: params.backend_flow_id ?? null,
    roles: JSON.stringify(params.roles),
    created_at: now,
    updated_at: now,
  };

  await db.insert(apps).values(newApp);

  return {
    id: newApp.id,
    name: newApp.name,
    description: newApp.description,
    icon_url: newApp.icon_url,
    backend_type: newApp.backend_type as BackendType,
    roles: params.roles,
  };
}

/**
 * アプリ情報を更新する
 * APIキーが更新される場合は再暗号化する
 */
export async function updateApp(
  id: string,
  params: UpdateAppParams
): Promise<SafeApp | null> {
  const now = new Date().toISOString();

  const updateData: Partial<typeof apps.$inferInsert> = {
    updated_at: now,
  };

  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.icon_url !== undefined) updateData.icon_url = params.icon_url;
  if (params.backend_type !== undefined) updateData.backend_type = params.backend_type;
  if (params.backend_endpoint !== undefined) updateData.backend_endpoint = params.backend_endpoint;
  if (params.backend_api_key !== undefined) {
    // APIキーが更新される場合は再暗号化
    updateData.backend_api_key = encrypt(params.backend_api_key);
  }
  if (params.backend_flow_id !== undefined) updateData.backend_flow_id = params.backend_flow_id;
  if (params.roles !== undefined) updateData.roles = JSON.stringify(params.roles);

  await db.update(apps).set(updateData).where(eq(apps.id, id));

  const updated = await db.select().from(apps).where(eq(apps.id, id)).limit(1);
  if (!updated[0]) return null;

  return toSafeApp(updated[0]);
}

/**
 * アプリを削除する
 * 関連するchat_historiesはON DELETE CASCADEで自動削除される
 */
export async function deleteApp(id: string): Promise<void> {
  await db.delete(apps).where(eq(apps.id, id));
}
