/**
 * src/app/api/admin/apps/route.ts
 *
 * GET  /api/admin/apps  → アプリ一覧取得
 * POST /api/admin/apps  → アプリ新規登録（multipart/form-data）
 *
 * アイコン画像は /public/icons/{uuid}.{ext} に保存する
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/session';
import { findAllApps, createApp } from '@/lib/db/repositories/apps';
import type { AppRole, BackendType } from '@/types';

const VALID_ROLES: AppRole[] = ['public', 'teacher', 'staff', 'admin'];
const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

// ── GET：アプリ一覧 ───────────────────────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const apps = await findAllApps();
    return NextResponse.json(apps);
  } catch (e) {
    console.error('[GET /api/admin/apps]', e);
    return NextResponse.json({ error: 'アプリ一覧の取得に失敗しました' }, { status: 500 });
  }
}

// ── POST：アプリ新規登録 ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const name            = formData.get('name') as string | null;
  const description     = formData.get('description') as string | null;
  const backend_type    = formData.get('backend_type') as string | null;
  const backend_endpoint = formData.get('backend_endpoint') as string | null;
  const backend_api_key = formData.get('backend_api_key') as string | null;
  const backend_flow_id = formData.get('backend_flow_id') as string | null;
  const rolesJson       = formData.get('roles') as string | null;
  const iconFile        = formData.get('icon') as File | null;

  // バリデーション
  if (!name?.trim()) {
    return NextResponse.json({ error: 'アプリ名を入力してください' }, { status: 400 });
  }
  if (!backend_type || !['dify', 'langflow'].includes(backend_type)) {
    return NextResponse.json({ error: 'バックエンド種別を選択してください' }, { status: 400 });
  }
  if (!backend_endpoint?.trim()) {
    return NextResponse.json({ error: 'エンドポイントを入力してください' }, { status: 400 });
  }
  if (!backend_api_key?.trim()) {
    return NextResponse.json({ error: 'APIキーを入力してください' }, { status: 400 });
  }
  if (backend_type === 'langflow' && !backend_flow_id?.trim()) {
    return NextResponse.json({ error: 'Langflow の Flow ID を入力してください' }, { status: 400 });
  }

  let roles: AppRole[] = [];
  try {
    roles = JSON.parse(rolesJson ?? '[]') as AppRole[];
    if (!roles.length || !roles.every((r) => VALID_ROLES.includes(r))) {
      throw new Error();
    }
  } catch {
    return NextResponse.json({ error: '対象ユーザー種別を1つ以上選択してください' }, { status: 400 });
  }

  if (!iconFile || iconFile.size === 0) {
    return NextResponse.json({ error: 'アイコン画像を選択してください' }, { status: 400 });
  }

  // アイコン保存
  const iconUrl = await saveIcon(iconFile);
  if (!iconUrl) {
    return NextResponse.json({ error: 'アイコン画像の保存に失敗しました' }, { status: 500 });
  }

  try {
    const app = await createApp({
      name: name.trim(),
      description: description?.trim() || null,
      icon_url: iconUrl,
      backend_type: backend_type as BackendType,
      backend_endpoint: backend_endpoint.trim(),
      backend_api_key: backend_api_key.trim(),
      backend_flow_id: backend_flow_id?.trim() || null,
      roles,
    });
    return NextResponse.json(app, { status: 201 });
  } catch (e) {
    console.error('[POST /api/admin/apps]', e);
    return NextResponse.json({ error: 'アプリの登録に失敗しました' }, { status: 500 });
  }
}

// ── アイコン保存ヘルパー ──────────────────────────────────────
async function saveIcon(file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return null;

    await mkdir(ICONS_DIR, { recursive: true });
    const filename = `${uuidv4()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(ICONS_DIR, filename), buffer);
    return `/icons/${filename}`;
  } catch {
    return null;
  }
}