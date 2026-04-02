'use client';

/**
 * src/app/chat/[appId]/components/MessageInput.tsx
 *
 * メッセージ入力欄
 * - Enter で送信、Shift+Enter で改行
 * - ストリーミング中は送信不可
 * - テキストエリアは入力に合わせて自動リサイズ
 */

import { useRef, useEffect, type KeyboardEvent } from 'react';

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
};

export default function MessageInput({
  value,
  onChange,
  onSend,
  isStreaming,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを内容に合わせて自動調整
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`; // 最大160px
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSend();
    }
  }

  const canSend = !isStreaming && value.trim().length > 0;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-end gap-3 max-w-none">
        <div className="flex-1 rounded-xl border border-slate-300 bg-white transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AIが回答中です...' : 'メッセージを入力（Enterで送信・Shift+Enterで改行）'}
            disabled={isStreaming}
            rows={1}
            className="
              w-full resize-none rounded-xl bg-transparent px-4 py-3
              text-sm text-slate-800 placeholder:text-slate-400
              outline-none disabled:text-slate-400
              min-h-[44px] max-h-[160px] leading-relaxed
            "
          />
        </div>

        {/* 送信ボタン */}
        <button
          onClick={onSend}
          disabled={!canSend}
          className="
            shrink-0 flex items-center justify-center
            w-10 h-10 rounded-xl transition
            bg-sky-600 text-white shadow-sm
            hover:bg-sky-700 active:bg-sky-800
            disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
          "
          aria-label="送信"
        >
          {isStreaming ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}