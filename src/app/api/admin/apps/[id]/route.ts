/**
 * src/app/api/admin/apps/[id]/route.ts
 *
 * PATCH  /api/admin/apps/[id]  → アプリ編集
 * DELETE /api/admin/apps/[id]  → アプリ削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/session';
import { updateApp, deleteApp, findAllApps } from '@/lib/db/repositories/apps';
import type { AppRole, BackendType } from '@/types';

const VALID_ROLES: AppRole[] = ['public', 'teacher', 'staff', 'admin'];
const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

type RouteContext = { params: Promise<{ id: string }> };

// ── PATCH：アプリ編集 ─────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // 存在確認
  const existing = (await findAllApps()).find((a) => a.id === id);
  if (!existing) {
    return NextResponse.json({ error: 'アプリが見つかりません' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const name             = formData.get('name') as string | null;
  const description      = formData.get('description') as string | null;
  const backend_type     = formData.get('backend_type') as string | null;
  const backend_endpoint = formData.get('backend_endpoint') as string | null;
  const backend_api_key  = formData.get('backend_api_key') as string | null;
  const backend_flow_id  = formData.get('backend_flow_id') as string | null;
  const rolesJson        = formData.get('roles') as string | null;
  const iconFile         = formData.get('icon') as File | null;

  // バリデーション
  if (name !== null && !name.trim()) {
    return NextResponse.json({ error: 'アプリ名を入力してください' }, { status: 400 });
  }
  if (backend_type && !['dify', 'langflow'].includes(backend_type)) {
    return NextResponse.json({ error: '無効なバックエンド種別です' }, { status: 400 });
  }
  if (backend_type === 'langflow' && !backend_flow_id?.trim()) {
    return NextResponse.json({ error: 'Langflow の Flow ID を入力してください' }, { status: 400 });
  }

  let roles: AppRole[] | undefined;
  if (rolesJson) {
    try {
      roles = JSON.parse(rolesJson) as AppRole[];
      if (!roles.length || !roles.every((r) => VALID_ROLES.includes(r))) throw new Error();
    } catch {
      return NextResponse.json({ error: '対象ユーザー種別が無効です' }, { status: 400 });
    }
  }

  // 新しいアイコンがあれば保存
  let icon_url: string | undefined;
  if (iconFile && iconFile.size > 0) {
    const saved = await saveIcon(iconFile);
    if (!saved) {
      return NextResponse.json({ error: 'アイコン画像の保存に失敗しました' }, { status: 500 });
    }
    icon_url = saved;
  }

  try {
    const updated = await updateApp(id, {
      ...(name        ? { name: name.trim() } : {}),
      ...(description !== null ? { description: description.trim() || null } : {}),
      ...(backend_type ? { backend_type: backend_type as BackendType } : {}),
      ...(backend_endpoint ? { backend_endpoint: backend_endpoint.trim() } : {}),
      // APIキーは入力があった場合のみ更新（空欄は既存を維持）
      ...(backend_api_key?.trim() ? { backend_api_key: backend_api_key.trim() } : {}),
      ...(backend_flow_id !== null ? { backend_flow_id: backend_flow_id.trim() || null } : {}),
      ...(roles ? { roles } : {}),
      ...(icon_url ? { icon_url } : {}),
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[PATCH /api/admin/apps/[id]]', e);
    return NextResponse.json({ error: 'アプリの更新に失敗しました' }, { status: 500 });
  }
}

// ── DELETE：アプリ削除 ────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteApp(id);
    return NextResponse.json({ message: 'アプリを削除しました' });
  } catch (e) {
    console.error('[DELETE /api/admin/apps/[id]]', e);
    return NextResponse.json({ error: 'アプリの削除に失敗しました' }, { status: 500 });
  }
}

async function saveIcon(file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return null;
    await mkdir(ICONS_DIR, { recursive: true });
    const filename = `${uuidv4()}.${ext}`;
    await writeFile(path.join(ICONS_DIR, filename), Buffer.from(await file.arrayBuffer()));
    return `/icons/${filename}`;
  } catch {
    return null;
  }
}