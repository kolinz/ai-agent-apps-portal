/**
 * src/lib/db/repositories/chat-histories.ts
 *
 * chat_historiesテーブルのリポジトリ
 * ログインユーザーのチャットのみ保存する（学生は保存しない）
 */

import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, chat_histories } from '../index';

export type SaveMessageParams = {
  user_id: string;
  app_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
};

/** メッセージを1件保存する */
export async function saveChatMessage(params: SaveMessageParams): Promise<void> {
  await db.insert(chat_histories).values({
    id: uuidv4(),
    user_id: params.user_id,
    app_id: params.app_id,
    conversation_id: params.conversation_id,
    role: params.role,
    content: params.content,
    created_at: new Date().toISOString(),
  });
}

/** 特定の会話のメッセージ履歴を取得する（時系列順） */
export async function findMessagesByConversation(
  user_id: string,
  app_id: string,
  conversation_id: string
) {
  return db
    .select()
    .from(chat_histories)
    .where(
      and(
        eq(chat_histories.user_id, user_id),
        eq(chat_histories.app_id, app_id),
        eq(chat_histories.conversation_id, conversation_id)
      )
    )
    .orderBy(asc(chat_histories.created_at));
}