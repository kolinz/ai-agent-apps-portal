'use client';

/**
 * src/app/chat/[appId]/components/ChatContainer.tsx
 *
 * チャット画面全体を管理する Client Component
 *
 * 責務：
 * - チャット状態（メッセージ・ストリーミング）の管理
 * - SSEストリームの読み取り
 * - アプリ切り替え時の conversationId リセット
 * - ChatArea / MessageInput / AppSidebar を統合するレイアウト
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ChatArea, { type Message } from './ChatArea';
import MessageInput from './MessageInput';
import AppSidebar from './AppSidebar';
import type { SafeApp } from '@/lib/db/repositories';
import { v4 as uuidv4 } from 'uuid';

type ChatContainerProps = {
  initialAppId: string;
  apps: SafeApp[];
  currentApp: SafeApp;
  isLoggedIn: boolean;
};

export default function ChatContainer({
  initialAppId,
  apps,
  currentApp,
  isLoggedIn,
}: ChatContainerProps) {
  const router = useRouter();

  // ── チャット状態 ───────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState(initialAppId);
  const [activeApp, setActiveApp] = useState(currentApp);

  // ── メッセージ送信 ─────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const query = inputValue.trim();
    if (!query || isStreaming) return;

    // ユーザーメッセージをUIに追加
    const userMessage: Message = { id: uuidv4(), role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch(`/api/chat/${activeAppId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, conversationId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      // ── SSEストリームを読み取る ────────────────────────────
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let newConversationId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as {
              type: string;
              content?: string;
              conversationId?: string;
              message?: string;
            };

            if (parsed.type === 'token' && parsed.content) {
              accumulated += parsed.content;
              setStreamingContent(accumulated);
            } else if (parsed.type === 'done') {
              if (parsed.conversationId) {
                newConversationId = parsed.conversationId;
              }
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message ?? 'エラーが発生しました');
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // JSONパースエラーは無視
            throw e;
          }
        }
      }

      // ストリーミング完了 → メッセージ確定
      setConversationId(newConversationId);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'assistant', content: accumulated },
      ]);

    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: `エラーが発生しました: ${(e as Error).message}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [inputValue, isStreaming, activeAppId, conversationId]);

  // ── アプリ切り替え ─────────────────────────────────────────
  const handleAppChange = useCallback((appId: string) => {
    if (appId === activeAppId) return;
    const nextApp = apps.find((a) => a.id === appId);
    if (!nextApp) return;

    // 会話をリセットして新しいアプリへ切り替え
    setActiveAppId(appId);
    setActiveApp(nextApp);
    setMessages([]);
    setConversationId(null);         // conversationId をリセット
    setStreamingContent('');
    setInputValue('');

    // URLをアプリに合わせて更新（ブラウザ履歴に追加）
    router.push(`/chat/${appId}`);
  }, [activeAppId, apps, router]);

  // ── 戻るリンク先 ───────────────────────────────────────────
  const backHref = isLoggedIn ? '/home' : '/';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── 左側：チャットエリア ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-slate-50">

        {/* ヘッダー */}
        <header className="shrink-0 flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-200 shadow-sm">
          {/* 戻るボタン */}
          <a
            href={backHref}
            className="
              shrink-0 flex items-center justify-center w-8 h-8 rounded-lg
              text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition
            "
            aria-label="一覧に戻る"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </a>

          {/* アイコン + アプリ名 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0 w-7 h-7 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              <Image
                src={activeApp.icon_url}
                alt={activeApp.name}
                fill
                className="object-cover"
                sizes="28px"
              />
            </div>
            <h1 className="text-sm font-semibold text-slate-800 truncate">
              {activeApp.name}
            </h1>
          </div>

          {/* 新しい会話ボタン */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setConversationId(null);
                setInputValue('');
              }}
              className="
                ml-auto shrink-0 flex items-center gap-1.5
                text-xs text-slate-400 hover:text-sky-600 transition
                px-2.5 py-1.5 rounded-lg hover:bg-sky-50
              "
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              新しい会話
            </button>
          )}
        </header>

        {/* チャット履歴エリア */}
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          appName={activeApp.name}
        />

        {/* メッセージ入力欄 */}
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isStreaming={isStreaming}
        />
      </div>

      {/* ── 右側：アプリ切り替えパネル ───────────────────────── */}
      {apps.length > 1 && (
        <AppSidebar
          apps={apps}
          currentAppId={activeAppId}
          onAppChange={handleAppChange}
        />
      )}
    </div>
  );
}