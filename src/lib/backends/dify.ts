/**
 * src/lib/backends/dify.ts
 *
 * Dify バックエンドアダプター
 *
 * Dify SSEイベント仕様：
 *   event: message        → { answer: string, conversation_id: string }
 *   event: message_end    → { conversation_id: string }
 *   event: error          → { message: string }
 *
 * 正規化SSEに変換して返す（BackendAdapterインターフェース準拠）
 */

import type { BackendAdapter, ChatParams } from './index';
import { sseToken, sseDone, sseError } from './index';

export class DifyAdapter implements BackendAdapter {
  async chat(params: ChatParams): Promise<ReadableStream<Uint8Array>> {
    const { endpoint, apiKey, query, conversationId, user } = params;

    // ── Dify APIへリクエスト ────────────────────────────────
    const difyRes = await fetch(`${endpoint}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: 'streaming',
        conversation_id: conversationId ?? '',
        user,
      }),
    });

    if (!difyRes.ok || !difyRes.body) {
      const errText = await difyRes.text().catch(() => 'unknown error');
      return new ReadableStream({
        start(controller) {
          controller.enqueue(sseError(`Dify APIエラー: ${difyRes.status} ${errText}`));
          controller.close();
        },
      });
    }

    // ── Dify SSE → 正規化SSE に変換 ─────────────────────────
    const reader = difyRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentConversationId = conversationId ?? '';

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // ストリーム終了時に conversationId を送信
            controller.enqueue(sseDone(currentConversationId));
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // 最後の不完全な行はバッファに残す
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const event = JSON.parse(jsonStr) as {
                event: string;
                answer?: string;
                conversation_id?: string;
                message?: string;
              };

              if (event.conversation_id) {
                currentConversationId = event.conversation_id;
              }

              if (event.event === 'message' && event.answer) {
                controller.enqueue(sseToken(event.answer));
              } else if (event.event === 'message_end') {
                controller.enqueue(sseDone(currentConversationId));
                controller.close();
                return;
              } else if (event.event === 'error') {
                controller.enqueue(sseError(event.message ?? 'Dify APIエラー'));
                controller.close();
                return;
              }
            } catch {
              // JSON パースエラーは無視して続行
            }
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }
}