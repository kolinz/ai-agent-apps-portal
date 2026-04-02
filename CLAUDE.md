# CLAUDE.md — 生成AIアプリポータル

Claude Code がこのプロジェクトで作業する際に必ず参照するコンテキストファイル。
実装・修正・レビューのすべての場面でこのファイルの内容に従うこと。

---

## プロジェクト概要

学校・企業・医療・行政など様々な組織で使える **セルフホスト型の生成AIアプリポータル**。
Dify / Langflow で作成したAIアプリを、組織のメンバーが一画面から手軽に使えるようにする。

- ゲスト（ログイン不要）は公開アプリのみ使用可能
- ログインユーザーはロールに応じたアプリを使用でき、チャット履歴はDBに保存される
- 管理者はユーザー・AIアプリの登録・編集をGUI上で行える

---

## 技術スタック

| 項目 | 技術 |
|---|---|
| 実行環境 | Node.js 24以上 |
| フレームワーク | Next.js（App Router） |
| 言語 | TypeScript（`any`型禁止） |
| スタイリング | Tailwind CSS |
| 認証 | JWT / jose / httpOnly Cookie |
| DB | SQLite（better-sqlite3）+ Drizzle ORM |
| 暗号化 | AES-256-GCM（Node.js標準 crypto） |
| バックエンド連携 | Dify REST API / Langflow REST API |

---

## ユーザーロールとアクセス権限

| ロール識別子 | 説明 | ログイン | チャット保存 |
|---|---|---|---|
| `teacher` | ロールA（例：教員・一般社員） | 必要 | あり |
| `staff` | ロールB（例：職員・管理部門） | 必要 | あり |
| `admin` | 管理者 | 必要 | あり |
| ゲスト | ログイン不要ユーザー | 不要 | なし |

ロール名はコード上の識別子。導入組織に合わせて読み替えて使用する。

---

## ディレクトリ構成

```
src/
├── middleware.ts                    # ルートアクセス制御（Edge Runtime）
├── types/index.ts                   # 共通型定義
├── lib/
│   ├── auth.ts                      # JWT発行・検証（jose）
│   ├── session.ts                   # Cookieセッション管理
│   ├── crypto.ts                    # AES-256-GCM 暗号化・復号
│   ├── backends/
│   │   ├── index.ts                 # アダプターI/F・SSEヘルパー・ファクトリ
│   │   ├── dify.ts                  # Dify用アダプター
│   │   └── langflow.ts              # Langflow用アダプター
│   └── db/
│       ├── index.ts                 # DBクライアント（シングルトン）
│       ├── schema.ts                # Drizzle ORMスキーマ
│       ├── migrate.ts               # マイグレーション実行
│       ├── seed.ts                  # 初期データ投入
│       └── repositories/
│           ├── index.ts             # まとめexport
│           ├── users.ts
│           ├── apps.ts              # 暗号化/復号もここで処理
│           ├── chat-histories.ts
│           └── audit-logs.ts
└── app/
    ├── page.tsx                     # トップページ（/）
    ├── components/AppCard.tsx       # 共有アプリカード（'use client'）
    ├── login/
    ├── home/
    ├── mypage/
    ├── chat/[appId]/
    │   └── components/
    │       ├── ChatContainer.tsx    # チャット状態管理（'use client'）
    │       ├── ChatArea.tsx
    │       ├── MessageInput.tsx
    │       └── AppSidebar.tsx
    ├── admin/
    │   ├── layout.tsx               # adminロールガード
    │   ├── users/[id]/
    │   └── apps/components/AppForm.tsx
    └── api/
        ├── public/apps/route.ts
        ├── auth/{login,logout}/route.ts
        ├── apps/route.ts
        ├── chat/[appId]/route.ts
        ├── mypage/route.ts
        └── admin/{users,apps}/route.ts
```

---

## 画面構成とルーティング

```
/                    トップページ（公開アプリ一覧・認証不要）
/login               ログイン画面
/home                ホーム画面（JWT必須）
/mypage              マイページ（JWT必須）
/chat/[appId]        Chat UI（認証任意・ゲスト可）
/admin               管理者ダッシュボード（admin限定）
/admin/users         ユーザー管理一覧
/admin/users/[id]    ユーザー詳細・編集
/admin/apps          アプリ管理
```

---

## APIルートとアクセス制御

middleware（Edge Runtime）で制御。`next/headers`は使えないため`request.cookies`を直接参照。

| パターン | 制御 |
|---|---|
| `/api/public/*` | 認証不要 |
| `/api/auth/*` | 認証不要 |
| `/api/apps` | JWT必須 |
| `/api/chat/*` | **middleware保護なし**（ゲスト対応。APIルート内で`getSession()`判定） |
| `/api/mypage` | JWT必須 |
| `/api/admin/*` | JWT必須 + `role=admin`のみ |

> ⚠️ `/api/chat/*` を middleware で保護しないのは意図的な設計。変更しないこと。

---

## セキュリティ上の絶対ルール

以下は変更・回避を禁止する。

1. **APIキーをブラウザに渡さない**
   - `backend_api_key` は `/api/chat/[appId]/route.ts` 内でのみ復号する
   - レスポンスJSONに `backend_api_key` / `backend_endpoint` を含めない
   - `SafeApp` 型（APIキーなし）と `AppWithSecret` 型（APIキーあり）を使い分ける

2. **JWTはhttpOnly Cookieに保存する**
   - `localStorage` / `sessionStorage` には保存しない
   - Cookie属性：`httpOnly: true`, `secure: true`（本番）, `sameSite: lax`

3. **APIキーの暗号化はAES-256-GCM**
   - 保存フォーマット：`base64(iv):base64(authTag):base64(encryptedData)`
   - `src/lib/crypto.ts` の `encrypt()` / `decrypt()` を必ず使う

4. **パスワードはbcryptjs（コストファクター12）でハッシュ化**
   - 平文で保存・ログ出力・レスポンスに含めることを禁止

5. **自己削除・自己ロール変更の禁止**
   - `DELETE /api/admin/users/[id]`：`id === session.user_id` なら403
   - `PATCH /api/admin/users/[id]`（action: update_role）：同上

---

## データベース設計の重要ルール

### PostgreSQL移行を意識した制約

- SQLite固有の型・関数に**依存しない**
- ARRAY型は**JSON文字列で代替**（例：`roles`カラム = `'["public","teacher"]'`）
- 日時は**ISO 8601 UTC文字列**（例：`2026-04-01T09:00:00.000Z`）
- 主キーは**UUID v4（TEXT型）**

### DBアクセスのルール

- DBへの直接アクセスは**リポジトリ層（`src/lib/db/repositories/`）に集約する**
- APIルートからは必ずリポジトリ関数を呼ぶ（Drizzleクエリを直接書かない）
- `password_hash` はSELECTカラムに含めない（`findUserByUsername`のみ例外）

### スキーマ変更時の手順

```cmd
npm run db:generate   # マイグレーションファイル生成
npm run db:migrate    # DBへ適用
```

---

## バックエンドアダプターパターン

### アーキテクチャ

```
APIルート → getAdapter(backend_type) → DifyAdapter | LangflowAdapter
                                        ↓
                               正規化SSE（共通フォーマット）
                                        ↓
                               TransformStream → クライアント
```

### 正規化SSEフォーマット（必ず守ること）

アダプターはバックエンド固有のSSEを受け取り、以下の形式に変換して返す。

```
data: {"type":"token","content":"..."}\n\n
data: {"type":"done","conversationId":"..."}\n\n
data: {"type":"error","message":"..."}\n\n
```

### Dify エンドポイントの形式

`backend_endpoint` に `/v1` まで含める（例：`http://localhost/v1`）。
アダプターは `{endpoint}/chat-messages` でfetchする（`/v1/chat-messages` ではない）。

### 新しいバックエンドを追加する場合

1. `src/lib/backends/` に `新バックエンド名.ts` を追加
2. `BackendAdapter` インターフェースを実装
3. `src/lib/backends/index.ts` の `getAdapter()` に `case` を追加
4. `src/types/index.ts` の `BackendType` に値を追加

---

## Server Component / Client Component の使い分け

| 場所 | 種別 | 理由 |
|---|---|---|
| `app/page.tsx` | Server Component | DBを直接呼ぶ。`export const dynamic = 'force-dynamic'` |
| `app/home/page.tsx` | Server Component | セッション取得・DB呼び出し |
| `app/home/components/AppGrid.tsx` | `'use client'` | ログアウトボタン（fetch必要） |
| `app/components/AppCard.tsx` | `'use client'` | `onError`イベントハンドラあり |
| `app/chat/[appId]/page.tsx` | Server Component | 初期データ取得 |
| `app/chat/[appId]/components/ChatContainer.tsx` | `'use client'` | チャット状態・SSE読み取り |
| `app/mypage/page.tsx` | `'use client'` | プロフィール編集・fetch |
| `app/admin/users/[id]/page.tsx` | `'use client'` | 編集操作・fetch |

**ルール：** `useState`・`useEffect`・イベントハンドラが必要なコンポーネントのみ `'use client'` にする。データ取得はできる限りServer Componentで行う。

---

## コーディング規約

- **TypeScript**：`any`型は使用しない。型推論が難しい場合も明示的な型アノテーションを書く
- **命名**：コンポーネントはPascalCase、関数・変数はcamelCase、定数はUPPER_SNAKE_CASE
- **エラーハンドリング**：try-catch を必ず実装。エラーログは `console.error('[ファイル名] メッセージ:', error)` 形式
- **環境変数**：コードにハードコードしない。必ず `.env.local` で管理
- **コメント**：日本語で記述する
- **Tailwind CSS**：インラインスタイル（`style=`）は使わない

---

## よくあるミスと注意点

### middleware でやってはいけないこと

```typescript
// ❌ Edge Runtime では next/headers は使えない
import { cookies } from 'next/headers';

// ✅ request.cookies を直接参照する
const token = request.cookies.get('session')?.value;
```

### チャット中継APIでAPIキーを漏洩させないこと

```typescript
// ❌ フロントエンドへのレスポンスにAPIキーを含めない
return NextResponse.json({ ...app }); // AppWithSecretをそのまま返すのは禁止

// ✅ SafeApp（APIキーなし）を返す
return NextResponse.json(toSafeApp(app));
```

### Dify のエンドポイント二重化

```typescript
// ❌ /v1 が二重になる
fetch(`${endpoint}/v1/chat-messages`) // endpoint が http://localhost/v1 の場合

// ✅ エンドポイントには /v1 まで含まれている前提
fetch(`${endpoint}/chat-messages`)
```

### SQLite の roles カラムはJSON文字列

```typescript
// ❌ 配列をそのまま保存しない
roles: ['public', 'teacher'] // SQLite は配列型を持たない

// ✅ JSON文字列に変換して保存
roles: JSON.stringify(['public', 'teacher'])

// 取得時は必ずパース
const roles = JSON.parse(record.roles) as AppRole[]
```

---

## npm スクリプト

```cmd
npm run dev           # 開発サーバー起動
npm run build         # 本番ビルド
npm run start         # 本番サーバー起動
npm run db:generate   # Drizzleマイグレーションファイル生成
npm run db:migrate    # マイグレーション適用
npm run db:seed       # 管理者ユーザーの初期登録
npm run db:push       # スキーマをDBに直接push（開発時のみ）
npm run db:studio     # Drizzle Studio（DBブラウザ）
```

作業環境はWindows（コマンドプロンプト）。コマンド例はWindows向けに記述する。

---

## 環境変数（.env.local）

```env
JWT_SECRET=          # HS256署名用（32バイト以上）
AES_SECRET_KEY=      # AES-256-GCM用（64文字の16進数・32バイト）
DATABASE_URL=        # SQLiteファイルパス（例：./data/portal.db）
INITIAL_ADMIN_USERNAME=
INITIAL_ADMIN_PASSWORD=
NEXT_PUBLIC_APP_NAME=
```

シークレットキー生成：
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```