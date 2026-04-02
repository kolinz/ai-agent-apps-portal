import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  //開発者ツールをデフォルトオフ
  devIndicators: false,
  // アイコン画像の保存先（/public/icons）を許可
  // 外部画像ドメインが必要になった場合はremotePatternsを追加する
  images: {
    localPatterns: [
      {
        pathname: '/icons/**',
        search: '',
      },
    ],
  },
};

export default nextConfig;