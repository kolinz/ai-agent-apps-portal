# AGENTS.md — 生成AIアプリポータル

AI コーディングエージェント（Claude Code・Cursor・GitHub Copilot 等）向けの
プロジェクトコンテキストファイル。

---

## プロジェクト概要

学校・企業・医療・行政など様々な組織に導入できる、セルフホスト型の生成AIアプリポータル。
Dify / Langflow で作成したAIアプリを組織のメンバーが一画面から使用できる。

**技術スタック：** Next.js 15（App Router）/ TypeScript / Tailwind CSS / SQLite（Drizzle ORM）/ JWT（jose）

---

## ユーザーロール

| 識別子 | 説明 | ログイン | チャット保存 |
|---|---|---|---|
| `teacher` | ロールA | 必要 | あり |
| `staff` | ロールB | 必要 | あり |
| `admin` | 管理者（全権限） | 必要 | あり |
| ゲスト | ログイン不要 | 不要 | なし |

---

## 重要な設計原則

### 1. セキュリティ — 絶対に守ること

- **`backend_api_key` はブラウザに渡さない。** サーバーサイドの `/api/chat/[appId]/route.ts` 内でのみ復号する
- **JWTは `httpOnly Cookie` に保存する。** `localStorage` は使わない
- **APIキーの暗号化は `src/lib/crypto.ts` の `encrypt()`/`decrypt()` を使う**（AES-256-GCM）
- **パスワードは `bcryptjs`（コストファクター12）でハッシュ化する**
- **管理者の自己削除・自己ロール変更は禁止**（APIルートで403を返す）

### 2. `/api/chat/*` はmiddlewareで保護しない

ゲスト（ログインなし）でも使用可能にするため、意図的に保護していない。
認証チェックはAPIルート内の `getSession()` で行い、未ログイン時は `anonymous` として扱う。

### 3. DBアクセスはリポジトリ層に集約する

- `src/lib/db/repositories/` 内の関数のみを使う
- APIルートから Drizzle クエリを直接書かない
- `SafeApp`（APIキーなし）と `AppWithSecret`（APIキーあり）を型で使い分ける

### 4. PostgreSQL移行を意識したDB設計

- ARRAY型は JSON文字列で代替（例：`roles` カラム = `'["public","teacher"]'`）
- 日時は ISO 8601 UTC 文字列
- 主キーは UUID v4（TEXT型）

---

## バックエンドアダプター

Dify / Langflow の差異は `src/lib/backends/` のアダプターが吸収する。
フロントエンドは正規化SSE（`token`/`done`/`error`）だけを意識する。

Dify のエンドポイントは `/v1` まで含む（例：`http://localhost/v1`）。
アダプターは `{endpoint}/chat-messages` でfetchする（`/v1/chat-messages` と書くと二重になる）。

---

## Server / Client Component の使い分け

- データ取得（DBアクセス・セッション確認）は **Server Component** で行う
- `useState`・`useEffect`・イベントハンドラが必要な場合のみ `'use client'` を付ける
- `app/components/AppCard.tsx` は `onError` ハンドラがあるため **Client Component**

---

## スキーマ変更時の手順

```cmd
npm run db:generate   # マイグレーションファイル生成
npm run db:migrate    # DBへ適用
```

---

## 開発コマンド

```cmd
npm run dev           # 開発サーバー（ポート3000）
npm run build         # 本番ビルド
npm run db:studio     # DBブラウザ（Drizzle Studio）
```

---

詳細な設計仕様は `docs/frontend_sdd.md` を参照。