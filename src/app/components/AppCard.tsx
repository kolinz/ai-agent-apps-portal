'use client';

/**
 * src/app/components/AppCard.tsx
 *
 * アプリカードコンポーネント（共有）
 * トップページ（/）とホーム画面（/home）の両方で使用する
 */

import Link from 'next/link';
import Image from 'next/image';

type AppCardProps = {
  id: string;
  name: string;
  description?: string | null;
  icon_url: string;
};

export default function AppCard({ id, name, description, icon_url }: AppCardProps) {
  return (
    <Link
      href={`/chat/${id}`}
      className="
        group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white
        p-5 shadow-sm transition-all duration-200
        hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
      "
    >
      {/* アイコン */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
          <Image
            src={icon_url}
            alt={`${name} のアイコン`}
            fill
            className="object-cover"
            sizes="44px"
            onError={(e) => {
              // アイコン読み込み失敗時はフォールバック表示
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* フォールバック（画像なし時） */}
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>

        {/* アプリ名 */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-sm font-semibold text-slate-800 leading-snug truncate group-hover:text-sky-700 transition-colors">
            {name}
          </h3>
        </div>

        {/* 矢印アイコン */}
        <svg
          className="shrink-0 w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors mt-0.5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* 説明文 */}
      {description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-0.5">
          {description}
        </p>
      )}
    </Link>
  );
}