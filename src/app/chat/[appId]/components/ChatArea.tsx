'use client';

/**
 * src/app/chat/[appId]/components/ChatArea.tsx
 *
 * チャット履歴表示エリア
 * - ユーザー / アシスタントのメッセージを交互に表示
 * - AI応答待ち中はタイピングアニメーションを表示
 * - 新しいメッセージが来たら自動スクロール
 */

import { useEffect, useRef } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ChatAreaProps = {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  appName: string;
};

export default function ChatArea({
  messages,
  isStreaming,
  streamingContent,
  appName,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージ・ストリーミング中は常に最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

      {/* 初期表示（メッセージなし） */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">{appName}</p>
          <p className="mt-1.5 text-xs text-slate-400">
            メッセージを入力して会話を始めてください
          </p>
        </div>
      )}

      {/* メッセージ一覧 */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* ストリーミング中のAI応答 */}
      {isStreaming && (
        <div className="flex gap-3 justify-start">
          <AssistantAvatar />
          <div className="max-w-[75%]">
            {streamingContent ? (
              <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 shadow-sm">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {streamingContent}
                  {/* ストリーミング中のカーソル */}
                  <span className="inline-block w-0.5 h-4 bg-sky-500 ml-0.5 align-text-bottom animate-pulse" />
                </p>
              </div>
            ) : (
              /* タイピングアニメーション（最初のトークンが来るまで） */
              <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3.5 shadow-sm">
                <TypingIndicator />
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

// ── サブコンポーネント ─────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <AssistantAvatar />}

      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'bg-sky-600 text-white rounded-tr-sm shadow-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
            }
          `}
        >
          {message.content}
        </div>
      </div>

      {isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center self-end">
          <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
      )}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center self-end">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}