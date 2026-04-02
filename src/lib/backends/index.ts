/**
 * src/lib/backends/index.ts
 *
 * バックエンドアダプターのインターフェース定義とファクトリ関数
 *
 * アダプターパターンの目的：
 * - Chat UI はバックエンドの差異（Dify / Langflow）を意識しない
 * - backend_type の切り替えはこのファクトリ関数のみで行う
 * - 新しいバックエンドの追加は新しいアダプターファイルの追加だけで済む
 */

import type { BackendType } from '@/types';

// ============================================================
// アダプターインターフェース
// ============================================================

export interface ChatParams {
  /** バックエンドのエンドポイントURL */
  endpoint: string;
  /** 復号済みAPIキー */
  apiKey: string;
  /** Langflow用のFlow ID。Difyの場合はnull */
  flowId: string | null;
  /** ユーザーのメッセージ */
  query: string;
  /**
   * 会話ID（続きの会話を送る際に使用）
   * - Dify：conversationId
   * - Langflow：sessionId
   * どちらもフロントエンドでは共通の conversationId として扱う
   */
  conversationId: string | null;
  /** ユーザー識別子（ログインユーザーのIDまたは 'anonymous'） */
  user: string;
}

/**
 * バックエンドアダプターのインターフェース
 *
 * chat() はバックエンドからのSSEをそのまま中継するのではなく、
 * 正規化したSSE形式（下記）で ReadableStream を返す。
 *
 * 正規化SSEフォーマット：
 *   data: {"type":"token","content":"..."}\n\n   ← トークン逐次配信
 *   data: {"type":"done","conversationId":"..."}\n\n ← 完了（会話ID更新）
 *   data: {"type":"error","message":"..."}\n\n   ← エラー
 */
export interface BackendAdapter {
  chat(params: ChatParams): Promise<ReadableStream<Uint8Array>>;
}

// ============================================================
// SSEメッセージのヘルパー
// ============================================================

const encoder = new TextEncoder();

export function sseToken(content: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`);
}

export function sseDone(conversationId: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId })}\n\n`);
}

export function sseError(message: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
}

// ============================================================
// アダプターファクトリ
// ============================================================

/**
 * backend_type に応じたアダプターを返す
 * 新しいバックエンドを追加する場合はここに case を追加する
 */
export async function getAdapter(backendType: BackendType): Promise<BackendAdapter> {
  switch (backendType) {
    case 'dify': {
      const { DifyAdapter } = await import('./dify');
      return new DifyAdapter();
    }
    case 'langflow': {
      const { LangflowAdapter } = await import('./langflow');
      return new LangflowAdapter();
    }
    default:
      throw new Error(`未対応のバックエンド種別: ${backendType}`);
  }
}