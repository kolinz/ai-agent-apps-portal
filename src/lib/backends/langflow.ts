/**
 * src/lib/backends/langflow.ts
 *
 * Langflow バックエンドアダプター
 *
 * Langflow SSEイベント仕様：
 *   event: token   data: { chunk: string }
 *   event: end     data: { result: { session_id: string, message: string } }
 *   event: error   data: { message: string }
 *
 * 正規化SSEに変換して返す（BackendAdapterインターフェース準拠）
 */

import type { BackendAdapter, ChatParams } from './index';
import { sseToken, sseDone, sseError } from './index';

export class LangflowAdapter implements BackendAdapter {
  async chat(params: ChatParams): Promise<ReadableStream<Uint8Array>> {
    const { endpoint, apiKey, flowId, query, conversationId, user: _user } = params;

    if (!flowId) {
      return new ReadableStream({
        start(controller) {
          controller.enqueue(sseError('Langflow の Flow ID が設定されていません'));
          controller.close();
        },
      });
    }

    // ── Langflow APIへリクエスト ────────────────────────────
    const langflowRes = await fetch(
      `${endpoint}/api/v1/run/${flowId}?stream=true`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_value: query,
          input_type: 'chat',
          output_type: 'chat',
          // Langflow の session_id は Dify の conversation_id に相当する
          session_id: conversationId ?? '',
        }),
      }
    );

    if (!langflowRes.ok || !langflowRes.body) {
      const errText = await langflowRes.text().catch(() => 'unknown error');
      return new ReadableStream({
        start(controller) {
          controller.enqueue(sseError(`Langflow APIエラー: ${langflowRes.status} ${errText}`));
          controller.close();
        },
      });
    }

    // ── Langflow SSE → 正規化SSE に変換 ──────────────────────
    const reader = langflowRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType = '';

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('event: ')) {
              currentEventType = trimmed.slice(7).trim();
              continue;
            }

            if (!trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr) as {
                chunk?: string;
                result?: { session_id?: string; message?: string };
                message?: string;
              };

              if (currentEventType === 'token' && data.chunk) {
                controller.enqueue(sseToken(data.chunk));
              } else if (currentEventType === 'end' && data.result) {
                // session_id を conversationId として返す
                const newSessionId = data.result.session_id ?? conversationId ?? '';
                controller.enqueue(sseDone(newSessionId));
                controller.close();
                return;
              } else if (currentEventType === 'error') {
                controller.enqueue(sseError(data.message ?? 'Langflow APIエラー'));
                controller.close();
                return;
              }
            } catch {
              // JSON パースエラーは無視
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