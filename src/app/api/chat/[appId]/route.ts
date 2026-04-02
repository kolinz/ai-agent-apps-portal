/**
 * src/app/api/chat/[appId]/route.ts
 *
 * バックエンドへの中継APIルート
 *
 * POST /api/chat/[appId]
 * Request:  { query: string, conversationId: string | null }
 * Response: SSE（text/event-stream）
 *
 * SSEフォーマット（正規化済み）：
 *   data: {"type":"token","content":"..."}\n\n
 *   data: {"type":"done","conversationId":"..."}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 *
 * セキュリティ：
 * - APIキーはこのルート内でのみ復号・使用する（ブラウザに渡さない）
 * - ログインユーザーのチャットはDB保存。匿名（学生）は保存しない
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { findAppWithSecretById } from '@/lib/db/repositories/apps';
import { saveChatMessage } from '@/lib/db/repositories/chat-histories';
import { getAdapter, sseError } from '@/lib/backends';
import type { BackendType } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  // ── 1. リクエストボディのパース ──────────────────────────
  let query: string;
  let conversationId: string | null;

  try {
    const body = await request.json() as { query?: unknown; conversationId?: unknown };
    query = typeof body.query === 'string' ? body.query.trim() : '';
    conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 });
  }

  // ── 2. セッション確認（任意）────────────────────────────
  // 未ログイン（学生）でも使用できるため、認証失敗は弾かない
  const session = await getSession().catch(() => null);
  const isLoggedIn = session !== null;
  const userIdentifier = isLoggedIn ? session!.user_id : 'anonymous';

  // ── 3. アプリ情報の取得（APIキー復号済み）──────────────
  const app = await findAppWithSecretById(appId);
  if (!app) {
    return NextResponse.json({ error: 'アプリが見つかりません' }, { status: 404 });
  }

  // ── 4. アダプターの取得 ──────────────────────────────────
  let adapter;
  try {
    adapter = await getAdapter(app.backend_type as BackendType);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  // ── 5. バックエンドへ問い合わせ・SSEストリームを取得 ────
  let backendStream: ReadableStream<Uint8Array>;
  try {
    backendStream = await adapter.chat({
      endpoint: app.backend_endpoint,
      apiKey: app.backend_api_key,
      flowId: app.backend_flow_id,
      query,
      conversationId,
      user: userIdentifier,
    });
  } catch (e) {
    const errStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sseError((e as Error).message));
        controller.close();
      },
    });
    return new Response(errStream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  // ── 6. SSEを中継しながらDB保存用にバッファリング ────────
  let fullContent = '';
  let finalConversationId = conversationId ?? '';

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      // クライアントへそのまま転送
      controller.enqueue(chunk);

      // DB保存のためにバッファリング
      if (isLoggedIn) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as {
              type: string;
              content?: string;
              conversationId?: string;
            };
            if (parsed.type === 'token' && parsed.content) {
              fullContent += parsed.content;
            } else if (parsed.type === 'done' && parsed.conversationId) {
              finalConversationId = parsed.conversationId;
            }
          } catch { /* ignore */ }
        }
      }
    },
    async flush() {
      // ストリーム完了後にDB保存
      if (isLoggedIn && session && fullContent) {
        try {
          // ユーザーの送信メッセージを保存
          await saveChatMessage({
            user_id: session.user_id,
            app_id: appId,
            conversation_id: finalConversationId || `${appId}-${Date.now()}`,
            role: 'user',
            content: query,
          });
          // AIの返答を保存
          await saveChatMessage({
            user_id: session.user_id,
            app_id: appId,
            conversation_id: finalConversationId || `${appId}-${Date.now()}`,
            role: 'assistant',
            content: fullContent,
          });
        } catch (e) {
          console.error('[chat relay] DB保存エラー:', e);
          // DB保存失敗はストリーミング自体に影響させない
        }
      }
    },
  });

  const outputStream = backendStream.pipeThrough(transformStream);

  return new Response(outputStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', // Nginx経由のバッファリング無効化
    },
  });
}