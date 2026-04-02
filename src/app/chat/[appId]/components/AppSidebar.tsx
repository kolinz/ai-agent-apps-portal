'use client';

/**
 * src/app/chat/[appId]/components/AppSidebar.tsx
 *
 * 右側縦型アプリ切り替えパネル
 * - 利用可能なアプリのアイコンを縦に並べる
 * - 現在選択中のアプリをハイライト
 * - クリックでアプリを切り替え（conversationId をリセット）
 */

import Image from 'next/image';
import type { SafeApp } from '@/lib/db/repositories';

type AppSidebarProps = {
  apps: SafeApp[];
  currentAppId: string;
  onAppChange: (appId: string) => void;
};

export default function AppSidebar({ apps, currentAppId, onAppChange }: AppSidebarProps) {
  return (
    <aside className="
      w-14 shrink-0 border-l border-slate-200 bg-white
      flex flex-col items-center py-3 gap-2 overflow-y-auto
    ">
      {apps.map((app) => {
        const isActive = app.id === currentAppId;
        return (
          <button
            key={app.id}
            onClick={() => onAppChange(app.id)}
            title={app.name}
            aria-label={app.name}
            aria-current={isActive ? 'page' : undefined}
            className={`
              relative w-10 h-10 rounded-xl overflow-hidden transition
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
              ${isActive
                ? 'ring-2 ring-sky-500 ring-offset-1 shadow-md'
                : 'hover:ring-2 hover:ring-slate-300 hover:ring-offset-1 opacity-70 hover:opacity-100'
              }
            `}
          >
            <div className="relative w-full h-full bg-slate-100">
              <Image
                src={app.icon_url}
                alt={app.name}
                fill
                className="object-cover"
                sizes="40px"
              />
              {/* フォールバック */}
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
          </button>
        );
      })}
    </aside>
  );
}