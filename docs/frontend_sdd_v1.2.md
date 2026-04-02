# フロントエンド ソフトウェア設計仕様書（SDD）

**対象システム：** 学校および企業向け 生成AIアプリポータル  
**バックエンド前提：** Dify（セルフホスト）※Langflow等への切り替え・追加を想定した設計  
**作成日：** 2026年4月  
**ステータス：** 実装済み（MVP）

---

## 改訂履歴

| バージョン | 内容 |
|---|---|
| 1.0 | 初版（草稿） |
| 1.1 | 実装反映：usersテーブルにプロフィールカラム追加、ユーザー詳細画面・マイページ追加、APIルート保護ルール修正、暗号化方式をAES-256-GCMに明記、SSE正規化仕様追加 |
| 1.2 | 対象システムを汎用化：学校・企業どちらにも適用できる設計仕様に変更 |

---

## 1. 概要

本ドキュメントは、生成AIアプリポータルのフロントエンドアプリケーションに関するソフトウェア設計仕様を記述する。学校・企業・医療・行政など、様々な組織での導入を想定した汎用設計とする。

フロントエンドは Next.js / React で独自開発し、ログインしたユーザーの種別（ロールA / ロールB / 管理者）に応じて使用可能な生成AIアプリを出し分ける。ゲスト（ログイン不要）は、管理者が公開設定したアプリのみトップページから使用できる。

ロール名（`teacher` / `staff`）はコード上の識別子であり、導入組織に合わせて読み替えて使用する。

| コード上のロール識別子 | 学校での読み替え例 | 企業での読み替え例 |
|---|---|---|
| `teacher` | 教員 | 一般社員・現場担当者 |
| `staff` | 職員・事務 | 管理部門・バックオフィス |
| `admin` | システム管理者 | システム管理者 |
| ゲスト（ログインなし） | 学生 | 顧客・一般利用者 |

---

## 2. 技術スタック

| 項目 | 技術・ツール | 備考 |
|---|---|---|
| 実行環境 | Node.js 24以上 | |
| フレームワーク | Next.js（App Router） | |
| UIライブラリ | React | |
| 言語 | TypeScript | `any`型は使用しない |
| スタイリング | Tailwind CSS | |
| 認証 | JWT（jose ライブラリ・独自実装） | Edge Runtime対応 |
| ストレージ | SQLite（better-sqlite3） | MVPのみ。将来PostgreSQL移行予定 |
| ORM / マイグレーション | Drizzle ORM + drizzle-kit | |
| ナレッジ連携 | Dify ナレッジ（Google Drive連携） | セルフホスト環境ではOAuthアプリの事前登録が必要 |
| バックエンドAPI | Dify（セルフホスト）REST API | アダプターパターンで実装。Langflow等への追加を想定 |
| ネットワーク公開 | Cloudflare Tunnel | |
| 暗号化 | AES-256-GCM（Node.js標準 crypto） | APIキー暗号化に使用 |
| パスワードハッシュ | bcryptjs（コストファクター12） | |

---

## 3. ユーザー種別と権限

| 種別 | ロール識別子 | ログイン | 使えるアプリ | チャットログ |
|---|---|---|---|---|
| ロールA | `teacher` | 必要 | 公開アプリ＋ロールA向けアプリ | DBに保存 |
| ロールB | `staff` | 必要 | 公開アプリ＋ロールB向けアプリ | DBに保存 |
| 管理者 | `admin` | 必要 | 全アプリ | DBに保存 |
| ゲスト | —（なし） | 不要 | 公開アプリ（publicロール）のみ | 保存しない |

> 公開アプリ（`public`）＝全員向けアプリ。管理画面でアプリごとに公開設定する。ゲストはアカウント不要でトップページから使用できる。ロールA・ロールBの名称は導入組織に合わせて読み替える（例：教員／職員、一般社員／管理部門）。

---

## 4. 画面構成

```
/                         トップページ（公開アプリ一覧・ログインリンク）
/login                    ログイン画面
/home                     ホーム画面（ログイン後・権限別アプリ一覧）
/mypage                   マイページ（自分のプロフィール・パスワード変更）
/chat/[appId]             Chat UI画面
/admin                    管理者ダッシュボード
/admin/users              ユーザー管理一覧
/admin/users/[id]         ユーザー詳細・編集
/admin/apps               アプリ管理（プリセット登録）
```

---

## 5. 画面仕様

### 5.1 トップページ（/）

#### 概要

ログイン不要で表示されるページ。公開アプリ（`public`ロールが付いたアプリ）のカード一覧を表示する。ゲストはここから生成AIアプリを使用する。ヘッダーにログインリンクを配置し、ログインが必要なユーザーはここからログイン画面へ遷移する。

#### UI要素

| 要素 | 説明 |
|---|---|
| ヘッダー | システム名・ログインリンク |
| 公開アプリカードグリッド | 公開アプリのアイコン・アプリ名・説明文（NotebookLM風） |
| アプリカード | クリックで`/chat/[appId]`へ遷移 |
| フッター | 組織名表示 |

#### 表示ルール

- 認証不要。誰でもアクセスできる
- `roles`に`public`が含まれるアプリのみ表示する
- チャットログはDBに保存しない
- データ取得はServer Component内でリポジトリを直接呼び出す（APIルート経由なし）

#### 公開アプリ取得API

```
GET /api/public/apps
Response: SafeApp[]
  {
    id: string,
    name: string,
    description: string | null,
    icon_url: string,
    backend_type: string,
    roles: string[]
  }
```

---

### 5.2 ログイン画面（/login）

#### 概要

ロールA・ロールB・管理者がユーザー名とパスワードで認証する。認証成功後、`/home`へリダイレクトする。middleware が `?redirect=` クエリパラメータを付与した場合は元のページへ戻る。

#### UI要素

| 要素 | 種別 | 説明 |
|---|---|---|
| ユーザー名 | テキスト入力 | 必須 |
| パスワード | パスワード入力 | 必須 |
| ログインボタン | ボタン | 認証処理を実行。処理中はスピナー表示 |
| エラーメッセージ | インラインテキスト | 認証失敗時に表示 |

#### 処理フロー

1. ユーザーがユーザー名・パスワードを入力しログインボタンを押す
2. `POST /api/auth/login` を呼び出す
3. 認証成功時：JWTを`httpOnly Cookie`に保存し`/home`（または`redirect`先）へリダイレクト
4. 認証失敗時：「ユーザー名またはパスワードが正しくありません」を表示（ユーザー名の存在有無は隠蔽）

#### 認証API

```
POST /api/auth/login
Request:  { username: string, password: string }
Response: { token: string, user: { id, username, role } }
Error:    401 { error: string }

POST /api/auth/logout
Response: { message: string }
```

---

### 5.3 ホーム画面（/home）

#### 概要

ログイン後に表示されるアプリ一覧画面。NotebookLM風のカードレイアウトで、ユーザー種別に応じたアプリが表示される。

#### UI要素

| 要素 | 説明 |
|---|---|
| ヘッダー | システム名・ユーザー名（クリックで`/mypage`へ遷移）・ロールバッジ・ログアウトボタン |
| 管理画面リンク | adminロールの場合のみヘッダーに表示 |
| アプリカードグリッド | アイコン・アプリ名・説明文のカード一覧（NotebookLM風） |

#### 表示ルール

- JWTの`role`を取得し、そのロールと`public`に紐づくアプリをすべて表示する
- ロールが`teacher`（ロールA）：`public`＋`teacher`のアプリを表示
- ロールが`staff`（ロールB）：`public`＋`staff`のアプリを表示
- ロールが`admin`：全アプリを表示
- データ取得はServer Component内でリポジトリを直接呼び出す

#### アプリ情報取得API

```
GET /api/apps
Cookie: session=<JWT>
Response: SafeApp[]（backend_endpoint・backend_api_keyは含まない）
```

---

### 5.4 マイページ（/mypage）

#### 概要

ログインユーザーが自身のプロフィールを閲覧・編集できる画面。ホーム画面ヘッダーのユーザー名をクリックすると遷移する。JWT認証必須。

#### UI要素

| セクション | 内容 |
|---|---|
| アカウント情報 | ユーザー名・ロール・登録日（読み取り専用） |
| プロフィール | 名前・メールアドレス・役職の表示と編集 |
| パスワード変更 | 現在のパスワード確認つきでパスワードを変更 |

#### 処理フロー（パスワード変更）

1. 現在のパスワードを入力して確認（bcryptjs で検証）
2. 新しいパスワード（8文字以上）と確認を入力
3. 一致する場合のみ変更を受け付ける

#### マイページAPI

```
GET   /api/mypage
Cookie: session=<JWT>
Response: SafeUser（password_hash除外）

PATCH /api/mypage
Cookie: session=<JWT>
Request（プロフィール更新）:
  { action: "update_profile", display_name?, email?, job_title? }
Request（パスワード変更）:
  { action: "change_password", current_password: string, new_password: string }
Response: SafeUser | { message: string }
```

---

### 5.5 Chat UI画面（/chat/[appId]）

#### 概要

アプリカードをクリックすると遷移するChat UI画面。左側にチャット領域、右側に縦型のアプリ切り替えアイコン一覧を配置する。ログイン不要でも使用可能（ゲスト対応）。

#### レイアウト

```
+----------------------------------+--------+
|  ヘッダー（アプリ名・戻るボタン）         |        |
+----------------------------------+  ア    |
|                                  |  プ    |
|  チャット履歴表示エリア              |  リ    |
|                                  |  切    |
|                                  |  り    |
+----------------------------------+  替    |
|  メッセージ入力欄  [送信]           |  え    |
+----------------------------------+  一    |
                                    |  覧    |
                                    |  （縦）|
                                    +--------+
```

アプリが1件のみの場合、右側パネルは非表示。

#### UI要素

| 要素 | 説明 |
|---|---|
| チャット履歴エリア | ユーザーとAIのメッセージを交互に表示。スクロール可能 |
| メッセージ入力欄 | テキスト入力。Enterキーで送信・Shift+Enterで改行。入力に合わせて高さ自動調整 |
| 送信ボタン | メッセージをバックエンドAPIに送信 |
| タイピングアニメーション | AI応答待ち中（最初のトークン受信まで）に3点バウンスを表示 |
| ストリーミングカーソル | トークン受信中に点滅カーソルを表示 |
| アプリ切り替えパネル（右側縦列） | 利用可能なアプリ一覧をアイコンで縦に並べる。クリックでアプリ切り替え・会話リセット |
| 新しい会話ボタン | メッセージが存在する場合にヘッダーに表示。会話をリセット |

#### チャットログの保存ルール

| アクセス方法 | チャットログ |
|---|---|
| トップページ（ログインなし）からアクセス | DBに保存しない |
| ログイン後（ロールA・ロールB・管理者）からアクセス | DBに保存する（ユーザー発言・AI返答の両方） |

#### バックエンドとの通信

チャット中継APIルートは`backend_type`に応じてアダプターを切り替える設計とする。

```
src/lib/backends/
  index.ts         バックエンドアダプターのインターフェース定義・ファクトリ関数
  dify.ts          Dify用アダプター（実装済み）
  langflow.ts      Langflow用アダプター（実装済み）
```

**インターフェース定義**

```typescript
interface BackendAdapter {
  chat(params: {
    endpoint: string,
    apiKey: string,
    flowId: string | null,   // Langflow用。Difyの場合はnull
    query: string,
    conversationId: string | null,
    user: string             // ログインユーザーのIDまたは 'anonymous'
  }): Promise<ReadableStream<Uint8Array>>
}
```

**正規化SSEフォーマット（アダプターが出力する共通フォーマット）**

各アダプターはバックエンド固有のSSEを受け取り、以下の正規化フォーマットに変換してから中継APIルートへ返す。

```
data: {"type":"token","content":"..."}\n\n     ← トークン逐次配信
data: {"type":"done","conversationId":"..."}\n\n ← 完了・会話ID確定
data: {"type":"error","message":"..."}\n\n     ← エラー
```

**Dify APIリクエスト仕様**

```
POST {backend_endpoint}/chat-messages
  ※ backend_endpoint には /v1 まで含める（例：http://localhost/v1）
Headers:
  Authorization: Bearer {backend_api_key}
  Content-Type: application/json
Request:
  { inputs: {}, query, response_mode: "streaming", conversation_id, user }
Response: Server-Sent Events
  event: message      → { answer: string, conversation_id: string }
  event: message_end  → { conversation_id: string }
  event: error        → { message: string }
```

**Langflow APIリクエスト仕様**

```
POST {backend_endpoint}/api/v1/run/{backend_flow_id}?stream=true
Headers:
  x-api-key: {backend_api_key}
  Content-Type: application/json
Request:
  { input_value: string, input_type: "chat", output_type: "chat", session_id }
Response: Server-Sent Events
  event: token  → { data: { chunk: string } }
  event: end    → { data: { result: { session_id, message } } }
```

- `backend_flow_id`はappsテーブルの`backend_flow_id`カラムから取得する（Difyの場合はNULL）
- `session_id`（Langflow）と`conversation_id`（Dify）はアダプター内で吸収し、フロントエンドは共通の`conversationId`として扱う
- アプリ切り替え時は`conversationId`をリセットし新規会話を開始する
- バックエンドのAPIキーはブラウザに直接渡さない。Next.jsのAPIルートを経由し、サーバーサイドでAPIキーを付与してバックエンドに転送する

**チャット中継API**

```
POST /api/chat/[appId]
Cookie: session=<JWT>（任意。未ログインでも使用可能）
Request: { query: string, conversationId: string | null }
Response: text/event-stream（正規化SSEフォーマット）
```

---

### 5.6 管理者ダッシュボード（/admin）

#### 概要

管理者のみアクセス可能。ユーザー管理とアプリ管理へのナビゲーションカードを提供する。`/admin/layout.tsx` でロールガードを実装し、admin以外のロールは`/home`へリダイレクトする。middleware との二重保護。

---

### 5.7 ユーザー管理一覧（/admin/users）

#### 概要

フロントエンドアプリのユーザーアカウントを管理する。対象はロールA・ロールB・管理者のみ（ゲストはアカウント不要）。ユーザー名をクリックすると詳細画面へ遷移する。

#### 機能一覧

| 機能 | 説明 |
|---|---|
| ユーザー一覧表示 | ユーザー名（詳細ページリンク）・種別・作成日時の一覧 |
| ユーザー追加 | ユーザー名・パスワード・種別を入力して登録（モーダル） |
| ロール変更 | 一覧のセレクトボックスでインライン変更 |
| パスワードリセット | モーダルで新しいパスワードを入力（詳細画面でも可） |
| ユーザー削除 | 確認モーダルの後に削除（詳細画面でも可） |

#### ユーザー管理API

```
GET    /api/admin/users              ユーザー一覧取得
POST   /api/admin/users              ユーザー新規作成
DELETE /api/admin/users/[id]         ユーザー削除
PATCH  /api/admin/users/[id]         パスワードリセット・ロール変更・プロフィール更新
  action: "reset_password"  → { password: string }
  action: "update_role"     → { role: UserRole }
  action: "update_profile"  → { display_name?, email?, job_title? }
```

#### セキュリティ制約

- 自分自身の削除は禁止（API側で403を返す）
- 自分自身のロール変更は禁止（ロックアウト防止）

---

### 5.8 ユーザー詳細・編集（/admin/users/[id]）

#### 概要

個別ユーザーの詳細表示と編集を行う画面。ユーザー管理一覧のユーザー名リンクから遷移する。

#### 機能一覧

| セクション | 機能 |
|---|---|
| 基本情報 | ユーザー名（読み取り専用）・ロール表示と変更・作成日時・更新日時 |
| プロフィール | 名前・メールアドレス・役職の表示と編集 |
| パスワード | 管理者による強制リセット（現在のパスワード確認なし） |
| 危険な操作 | ユーザー削除（確認モーダルあり・削除後は一覧へ遷移） |

---

### 5.9 アプリ管理画面（/admin/apps）

#### 概要

管理者がバックエンドのエンドポイント・APIキー・アイコン画像をプリセットとして登録・管理する。対象ロールに`public`を指定するとトップページに表示される公開アプリになる。登録・編集はスライドインパネルで行う。

#### アプリ登録フォームの項目

| 項目 | 種別 | 必須 | 説明 |
|---|---|---|---|
| アプリ名 | テキスト | 必須 | ホーム画面に表示される名称 |
| 説明文 | テキスト | 任意 | アプリカードに表示される短い説明 |
| アイコン画像 | ファイルアップロード | 新規登録時必須 | PNG/JPG/WebP・2MB以下。`/public/icons/{uuid}.ext`に保存 |
| バックエンド種別 | セレクトボックス | 必須 | `dify` / `langflow` |
| エンドポイント | テキスト | 必須 | 例：`http://localhost/v1`（Dify）、`http://localhost:7860`（Langflow） |
| APIキー | テキスト | 新規登録時必須 | 編集時は空欄のまま送信すると既存を維持 |
| Flow ID | テキスト | Langflow時必須 | Langflow使用時のみ。Difyの場合はNULL |
| 対象ユーザー種別 | チェックボックス | 必須（1つ以上） | 公開（ゲスト含む全員）/ ロールA / ロールB / 管理者（複数選択可） |

#### アプリ管理API

```
GET    /api/admin/apps               アプリ一覧取得
POST   /api/admin/apps               アプリ新規登録（multipart/form-data）
PATCH  /api/admin/apps/[id]          アプリ編集（multipart/form-data）
DELETE /api/admin/apps/[id]          アプリ削除（関連チャット履歴もCASCADE削除）
```

---

## 6. 認証・セキュリティ設計

### 6.1 JWT設計

| 項目 | 内容 |
|---|---|
| ライブラリ | jose（Web Crypto API準拠・Edge Runtime対応） |
| 署名アルゴリズム | HS256 |
| ペイロード | `{ user_id, username, role, exp }` |
| 有効期限 | 8時間（1日の業務時間を想定） |
| 保存場所 | `httpOnly Cookie`（XSSリスク回避） |
| Cookie属性 | `httpOnly: true`, `secure: true`（本番）, `sameSite: lax` |

### 6.2 APIルートの保護

middlewareは Edge Runtime で動作する。`next/headers` は使用不可なため、`request.cookies` から直接JWTを取得する。

| パターン | アクセス制御 |
|---|---|
| `/api/public/*` | 認証不要 |
| `/api/auth/*` | 認証不要 |
| `/api/apps` | JWT検証必須 |
| `/api/chat/*` | 認証不要（ゲストも使用可能。ログイン状態はAPIルート内で判定） |
| `/api/mypage` | JWT検証必須 |
| `/api/admin/*` | JWT検証必須 + `role=admin`のみ許可 |
| `/home`, `/mypage` | JWT検証必須（未認証は`/login?redirect=`へ） |
| `/admin`, `/admin/*` | JWT検証必須 + `role=admin`のみ許可（非adminは`/home`へ） |
| `/login` | 認証済みの場合は`/home`へリダイレクト |

> `/api/chat/*` はmiddlewareでは保護しない。認証チェックはAPIルート内の`getSession()`で行い、未ログイン時は`anonymous`として処理する。

### 6.3 バックエンドAPIキーの保護

バックエンドのAPIキーはブラウザに直接渡さない。

```
ブラウザ → POST /api/chat/[appId]（JWT確認 or 公開）
         → Next.js APIルート内でDBからAPIキーを復号
         → バックエンドAPI（APIキー付与）
```

### 6.4 APIキーの暗号化

| 項目 | 内容 |
|---|---|
| アルゴリズム | AES-256-GCM（認証付き暗号化・改ざん検知可能） |
| 理由 | CBC方式と比較して改ざん検知が可能、同一平文でも毎回異なる暗号文（IVランダム生成） |
| 保存フォーマット | `base64(iv):base64(authTag):base64(encryptedData)` |
| 秘密鍵管理 | `AES_SECRET_KEY`（64文字の16進数・32バイト）を`.env.local`で管理 |

### 6.5 操作ログ

- ユーザー管理操作（追加・削除・ロール変更・パスワードリセット）は全件`audit_logs`テーブルに記録する
- ログには操作者・操作種別・対象ユーザーID・日時を含める
- 操作者・対象ユーザーが削除されてもログは残す（外部キー参照なし）

---

## 7. データモデル

> データベースはMVP段階ではSQLite（`better-sqlite3`）を使用する。DBファイルは導入先サーバーのローカルファイルシステムに配置する。将来的な利用者増加・冗長化・外部連携に備え、PostgreSQLへの移行を想定した設計とする。

### 移行方針

- SQLite固有の型・関数に依存しない設計とする（例：ARRAYはJSON文字列で代替）
- DBアクセスはリポジトリパターンで抽象化し、DB層の差し替えをアプリケーションコードに影響させない
- マイグレーション管理はDrizzle ORM（drizzle-kit）で行い、スキーマをコードで管理する
- PostgreSQL移行時の変更箇所：`db/index.ts`（ドライバ差し替え）・`drizzle.config.ts`（dialect変更）・`schema.ts`（`strftime`→`NOW()`）のみ

### 7.1 usersテーブル

| カラム | 型 | NULL | 説明 |
|---|---|---|---|
| id | TEXT | NOT NULL | 主キー（UUID v4） |
| username | TEXT | NOT NULL | ユーザー名（一意） |
| password_hash | TEXT | NOT NULL | bcryptjsハッシュ（コストファクター12） |
| role | TEXT | NOT NULL | ロール識別子：`teacher`（ロールA）/ `staff`（ロールB）/ `admin` |
| display_name | TEXT | NULL可 | 氏名（任意） |
| email | TEXT | NULL可 | メールアドレス（任意） |
| job_title | TEXT | NULL可 | 役職・肩書（任意。例：「営業部長」「3年担任」） |
| created_at | TEXT | NOT NULL | 作成日時（ISO 8601 UTC） |
| updated_at | TEXT | NOT NULL | 更新日時（ISO 8601 UTC） |

### 7.2 appsテーブル

| カラム | 型 | NULL | 説明 |
|---|---|---|---|
| id | TEXT | NOT NULL | 主キー（UUID v4） |
| name | TEXT | NOT NULL | アプリ名 |
| description | TEXT | NULL可 | 説明文 |
| icon_url | TEXT | NOT NULL | アイコン画像のパス（例：`/icons/{uuid}.png`） |
| backend_type | TEXT | NOT NULL | バックエンド種別（`dify` / `langflow`） |
| backend_endpoint | TEXT | NOT NULL | バックエンドのエンドポイントURL（`/v1`まで含む） |
| backend_api_key | TEXT | NOT NULL | APIキー（AES-256-GCM暗号化済み） |
| backend_flow_id | TEXT | NULL可 | LangflowのFlow ID（Difyの場合はNULL） |
| roles | TEXT | NOT NULL | 対象ロールのJSON文字列（例：`["public","teacher"]`） |
| created_at | TEXT | NOT NULL | 作成日時（ISO 8601 UTC） |
| updated_at | TEXT | NOT NULL | 更新日時（ISO 8601 UTC） |

### 7.3 chat_historiesテーブル

| カラム | 型 | NULL | 説明 |
|---|---|---|---|
| id | TEXT | NOT NULL | 主キー（UUID v4） |
| user_id | TEXT | NOT NULL | ユーザーID（users.id 外部キー・CASCADE） |
| app_id | TEXT | NOT NULL | アプリID（apps.id 外部キー・CASCADE） |
| conversation_id | TEXT | NOT NULL | バックエンド側の会話ID（Dify: conversationId / Langflow: sessionId） |
| role | TEXT | NOT NULL | `user` / `assistant` |
| content | TEXT | NOT NULL | メッセージ内容 |
| created_at | TEXT | NOT NULL | 送受信日時（ISO 8601 UTC） |

> ゲスト（ログインなし）のチャットはこのテーブルに保存しない。

### 7.4 audit_logsテーブル

| カラム | 型 | NULL | 説明 |
|---|---|---|---|
| id | TEXT | NOT NULL | 主キー（UUID v4） |
| operator_id | TEXT | NOT NULL | 操作者のユーザーID（外部キーなし） |
| action | TEXT | NOT NULL | `create` / `delete` / `update_role` / `reset_password` |
| target_user_id | TEXT | NOT NULL | 操作対象のユーザーID（外部キーなし） |
| created_at | TEXT | NOT NULL | 操作日時（ISO 8601 UTC） |

---

## 8. ディレクトリ構成

```
src/
├── middleware.ts                    # ルートレベルのアクセス制御（Edge Runtime）
├── types/
│   └── index.ts                     # 共通型定義（UserRole, AppRole, BackendType等）
├── lib/
│   ├── auth.ts                      # JWT発行・検証（jose）
│   ├── session.ts                   # Cookie操作・セッション取得
│   ├── crypto.ts                    # AES-256-GCM 暗号化・復号
│   ├── backends/
│   │   ├── index.ts                 # アダプターI/F・正規化SSEヘルパー・ファクトリ
│   │   ├── dify.ts                  # Dify用アダプター
│   │   └── langflow.ts              # Langflow用アダプター
│   └── db/
│       ├── index.ts                 # DBクライアント（シングルトン）
│       ├── schema.ts                # Drizzle ORMスキーマ定義
│       ├── migrate.ts               # マイグレーション実行スクリプト
│       ├── seed.ts                  # 初期データ投入（管理者ユーザー）
│       └── repositories/
│           ├── index.ts             # まとめexport
│           ├── users.ts             # usersテーブルのCRUD
│           ├── apps.ts              # appsテーブルのCRUD（暗号化含む）
│           ├── chat-histories.ts    # chat_historiesテーブルのCRUD
│           └── audit-logs.ts        # audit_logsテーブルのCRUD
└── app/
    ├── layout.tsx                   # ルートレイアウト
    ├── page.tsx                     # トップページ（/）
    ├── components/
    │   └── AppCard.tsx              # アプリカード（共有・Client Component）
    ├── login/
    │   ├── page.tsx
    │   └── components/LoginForm.tsx
    ├── home/
    │   ├── page.tsx
    │   └── components/AppGrid.tsx
    ├── mypage/
    │   └── page.tsx
    ├── chat/[appId]/
    │   ├── page.tsx
    │   └── components/
    │       ├── ChatContainer.tsx    # チャット状態管理（Client Component）
    │       ├── ChatArea.tsx
    │       ├── MessageInput.tsx
    │       └── AppSidebar.tsx
    ├── admin/
    │   ├── layout.tsx               # 管理者レイアウト（ロールガード）
    │   ├── page.tsx
    │   ├── users/
    │   │   ├── page.tsx             # ユーザー一覧
    │   │   ├── [id]/
    │   │   │   └── page.tsx         # ユーザー詳細・編集
    │   └── apps/
    │       ├── page.tsx
    │       └── components/AppForm.tsx
    └── api/
        ├── public/apps/route.ts
        ├── auth/login/route.ts
        ├── auth/logout/route.ts
        ├── apps/route.ts
        ├── chat/[appId]/route.ts
        ├── mypage/route.ts
        └── admin/
            ├── users/route.ts
            ├── users/[id]/route.ts
            ├── apps/route.ts
            └── apps/[id]/route.ts
```

---

## 9. 設計決定事項

| 項目 | 決定内容 |
|---|---|
| チャット履歴の保存 | ログインユーザーのみSQLiteに永続化。ゲスト（ログインなし）は保存しない |
| アイコン画像の保存先 | `/public/icons/{uuid}.ext`（サーバー内ファイルシステム） |
| APIキーの暗号化方式 | AES-256-GCM（改ざん検知・毎回異なる暗号文。Node.js標準cryptoのみ使用） |
| JWT保存場所 | `httpOnly Cookie`（XSSリスク回避） |
| `/api/chat/*`のmiddleware保護 | 保護しない（ゲストがログインなしで使用できるため。認証はAPIルート内で判定） |
| SSEの正規化 | アダプターがバックエンド固有のSSEを正規化フォーマットに変換。フロントエンドはバックエンドの差異を意識しない |
| Difyエンドポイントの形式 | `backend_endpoint`に`/v1`まで含める（例：`http://localhost/v1`）。アダプターは`{endpoint}/chat-messages`でfetchする |
| ロール識別子の設計 | コード上は`teacher`/`staff`/`admin`を使用。導入組織に合わせて読み替えて運用する。将来的にはロール名を管理画面から設定できる拡張を想定 |
| パスワードリセットの通知方法 | MVPでは管理者が口頭で伝える。通知処理はサービス層に分離し、将来のメール通知追加に備える |
| 自己削除・自己ロール変更の禁止 | API側で403を返す。管理者が自分自身のadmin権限を削除するロックアウトを防止 |
| マイページのパスワード変更 | 現在のパスワード確認あり（管理者によるリセットは確認なし） |
| DBクライアントのシングルトン | Next.jsのホットリロード時の複数インスタンス生成を防ぐため`global.__db`でシングルトン管理 |

---

## 10. 想定導入先とロール読み替え例

本システムは特定組織に依存しない汎用設計であり、以下のような組織への導入を想定する。

| 導入先 | ロールA（`teacher`） | ロールB（`staff`） | ゲスト |
|---|---|---|---|
| 学校 | 教員 | 事務職員 | 学生・保護者 |
| 企業 | 一般社員 | 管理部門 | 顧客・外部パートナー |
| 医療・福祉施設 | 医療従事者 | 事務・受付 | 患者・利用者 |
| 地方自治体 | 職員 | 窓口・補助員 | 住民 |
| 大学 | 教員・研究者 | 事務局員 | 学生 |

ロール名の変更はコードの `types/index.ts`（`UserRole`型）と `schema.ts`（`role`カラムの`enum`）を修正することで対応できる。MVPでは`teacher`/`staff`のままで運用し、将来的には管理画面からロール名をカスタマイズできる拡張を検討する。

---

## 11. 未決定事項

現時点での未決定事項はない。
