// ユーザーロール
export type UserRole = 'teacher' | 'staff' | 'admin';

// アプリロール（publicを含む）
export type AppRole = 'public' | 'teacher' | 'staff' | 'admin';

// バックエンド種別
export type BackendType = 'dify' | 'langflow';

// JWTペイロード
export interface JWTPayload {
  user_id: string;
  username: string;
  role: UserRole;
  exp: number;
}

// ユーザー
export interface User {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// アプリ（フロントエンド向け・APIキー含まず）
export interface App {
  id: string;
  name: string;
  description: string | null;
  icon_url: string;
  backend_type: BackendType;
  roles: AppRole[];
}

// アプリ（サーバーサイド向け・APIキー含む）
export interface AppWithSecret extends App {
  backend_endpoint: string;
  backend_api_key: string;        // 復号済み
  backend_flow_id: string | null; // Langflow用
}

// チャットメッセージ
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// 監査ログアクション種別
export type AuditAction = 'create' | 'delete' | 'update_role' | 'reset_password';