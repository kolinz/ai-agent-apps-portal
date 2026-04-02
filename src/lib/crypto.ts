/**
 * src/lib/crypto.ts
 *
 * AES-256-GCM 暗号化・復号ユーティリティ
 *
 * 用途：
 * - appsテーブルの backend_api_key カラムへの保存前暗号化
 * - DBから取得したAPIキーの復号（サーバーサイドのAPIルートのみ）
 *
 * アルゴリズム選定理由：
 * - AES-256-CBC ではなく AES-256-GCM を採用する
 * - GCMは認証付き暗号化（AEAD）であり、改ざん検知が可能
 * - 同じ平文でも暗号化のたびに異なる暗号文が生成される（IVのランダム生成）
 * - Node.js標準の `crypto` モジュールのみ使用し、外部依存ゼロ
 *
 * セキュリティ要件：
 * - AES_SECRET_KEY は .env.local で管理し、コードにハードコードしない
 * - AES_SECRET_KEY は 32バイト（64文字の16進数）を想定する
 * - 暗号化されたAPIキーはサーバーサイドでのみ復号し、ブラウザには渡さない
 *
 * 保存フォーマット：
 * `iv:authTag:encryptedData`（すべてBase64エンコード、コロン区切り）
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ============================================================
// 定数
// ============================================================
const ALGORITHM = 'aes-256-gcm' as const;

/** GCMのIVは96bit（12バイト）が推奨値 */
const IV_LENGTH = 12;

/** GCMの認証タグは128bit（16バイト）が標準 */
const AUTH_TAG_LENGTH = 16;

// ============================================================
// キーの取得と検証
// ============================================================

/**
 * 環境変数からAES秘密鍵を取得し、Bufferとして返す
 * - 64文字の16進数文字列（32バイト）を想定する
 * - 不正な形式の場合は起動時にエラーをthrowし、問題を早期検出する
 */
function getSecretKey(): Buffer {
  const keyHex = process.env.AES_SECRET_KEY;

  if (!keyHex) {
    throw new Error(
      '[crypto] AES_SECRET_KEY が .env.local に設定されていません。\n' +
        '以下のコマンドで生成してください：\n' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      '[crypto] AES_SECRET_KEY は64文字の16進数（32バイト）である必要があります。\n' +
        `現在の値の長さ：${keyHex.length}文字`
    );
  }

  return Buffer.from(keyHex, 'hex');
}

// ============================================================
// 暗号化
// ============================================================

/**
 * 平文文字列をAES-256-GCMで暗号化する
 *
 * @param plaintext - 暗号化する平文（例：DifyのAPIキー）
 * @returns 暗号化文字列（フォーマット：`iv:authTag:encryptedData`）
 *
 * @example
 * ```typescript
 * const encrypted = encrypt('app-xxxxxxxxxxxx');
 * // → "abc123...:def456...:ghi789..."（Base64コロン区切り）
 * ```
 */
export function encrypt(plaintext: string): string {
  const key = getSecretKey();

  // IVをランダム生成（暗号化のたびに異なる値を生成）
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // 認証タグを取得（GCM固有・改ざん検知に使用）
  const authTag = cipher.getAuthTag();

  // iv:authTag:encryptedData の形式でBase64エンコードして結合
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

// ============================================================
// 復号
// ============================================================

/**
 * AES-256-GCMで暗号化された文字列を復号する
 *
 * @param ciphertext - 暗号化文字列（フォーマット：`iv:authTag:encryptedData`）
 * @returns 復号された平文
 * @throws {Error} フォーマット不正・認証タグ検証失敗（改ざん検知）時にthrow
 *
 * @example
 * ```typescript
 * const apiKey = decrypt(app.backend_api_key);
 * // → "app-xxxxxxxxxxxx"
 * ```
 */
export function decrypt(ciphertext: string): string {
  const key = getSecretKey();

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error(
      '[crypto] 暗号化文字列のフォーマットが不正です。' +
        '`iv:authTag:encryptedData` 形式の文字列が必要です。'
    );
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encryptedData = Buffer.from(encryptedBase64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // 認証タグをセット（改ざんがあった場合はfinal()でエラーをthrow）
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error(
      '[crypto] 復号に失敗しました。' +
        'AES_SECRET_KEY が正しくないか、暗号化データが改ざんされている可能性があります。'
    );
  }
}

// ============================================================
// 動作確認用（開発時のみ使用）
// ============================================================

/**
 * 暗号化→復号のラウンドトリップテスト
 * 開発時に動作確認する際に使用する
 *
 * 使用例（コマンドプロンプトから直接実行）：
 * ```cmd
 * npx tsx src/lib/crypto.ts
 * ```
 */
if (require.main === module) {
  const testValue = 'app-test-api-key-1234567890';
  console.log('=== AES-256-GCM 暗号化テスト ===');
  console.log('平文          :', testValue);

  const encrypted = encrypt(testValue);
  console.log('暗号化後      :', encrypted);

  const decrypted = decrypt(encrypted);
  console.log('復号後        :', decrypted);
  console.log('一致確認      :', testValue === decrypted ? '✅ OK' : '❌ NG');

  // 改ざん検知テスト
  console.log('\n=== 改ざん検知テスト ===');
  try {
    const parts = encrypted.split(':');
    parts[2] = Buffer.from('tampered').toString('base64');
    decrypt(parts.join(':'));
    console.log('❌ 改ざん検知失敗（問題あり）');
  } catch (e) {
    console.log('✅ 改ざん検知成功:', (e as Error).message);
  }
}
