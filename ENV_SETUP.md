# 環境変数の設定ガイド

このドキュメントでは、`.env.local`ファイルの設定方法を説明します。

## 設定パターン1: Public Clientのみを使用する場合（推奨）

クライアントサイドで直接認証を行う場合の設定です。

```env
# User Pool ID（共通）
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx

# クライアントサイド用のClient ID（Public Client - シークレットなし）
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS リージョン
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

**特徴:**
- シンプルで高速
- CLIENT_SECRETの管理が不要
- クライアントサイドで直接認証

## 設定パターン2: Public ClientとConfidential Clientを併用する場合

クライアントサイドではPublic Client、サーバーサイドではConfidential Clientを使用する場合の設定です。

```env
# User Pool ID（共通）
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx

# クライアントサイド用のClient ID（Public Client - シークレットなし）
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# サーバーサイド用のClient ID（Confidential Client - シークレットあり）
# 注意: NEXT_PUBLIC_プレフィックスを付けないでください（サーバーサイドでのみ使用）
COGNITO_USER_POOL_CLIENT_ID_SERVER=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# サーバーサイド用のClient Secret（Confidential Client）
# 注意: NEXT_PUBLIC_プレフィックスを付けないでください（サーバーサイドでのみ使用）
COGNITO_USER_POOL_CLIENT_SECRET=your-secret-key-here

# AWS リージョン
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

**特徴:**
- クライアントサイド: Public Clientで直接認証（高速）
- サーバーサイド: Confidential Clientで認証（より高いセキュリティ）
- Public Client認証が失敗した場合の自動フォールバック

## 環境変数の説明

| 環境変数 | 用途 | プレフィックス | 必須 | 説明 |
|---------|------|---------------|------|------|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | 共通 | `NEXT_PUBLIC_` | ✅ | User Pool ID（両方のClientで共通） |
| `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | クライアントサイド | `NEXT_PUBLIC_` | ✅ | Public ClientのID（シークレットなし） |
| `COGNITO_USER_POOL_CLIENT_ID_SERVER` | サーバーサイド | なし | ⚠️ | Confidential ClientのID（シークレットあり）<br>設定パターン2の場合のみ必要 |
| `COGNITO_USER_POOL_CLIENT_SECRET` | サーバーサイド | なし | ⚠️ | Confidential ClientのSecret<br>設定パターン2の場合のみ必要 |
| `NEXT_PUBLIC_COGNITO_REGION` | 共通 | `NEXT_PUBLIC_` | ✅ | AWSリージョン（例: `ap-northeast-1`） |

## 設定手順

1. プロジェクトルートに`.env.local`ファイルを作成
2. 上記の設定パターンから選択して環境変数を設定
3. 実際のCognito設定値に置き換える
4. 開発サーバーを再起動（`npm run dev`）

## 重要な注意事項

### NEXT_PUBLIC_プレフィックスについて

- **`NEXT_PUBLIC_`プレフィックス付き**: クライアントサイドでも使用可能（ブラウザに公開される）
- **`NEXT_PUBLIC_`プレフィックスなし**: サーバーサイドでのみ使用（ブラウザに公開されない）

### CLIENT_SECRETのセキュリティ

- `COGNITO_USER_POOL_CLIENT_SECRET`は**絶対に**`NEXT_PUBLIC_`プレフィックスを付けないでください
- `.env.local`はGitにコミットしないでください（`.gitignore`に含まれています）
- 本番環境では適切なシークレット管理サービスを使用してください

## 動作の流れ

### 設定パターン1（Public Clientのみ）の場合

1. ユーザーがログインフォームに入力
2. `login()`関数が呼ばれる
3. Public Clientを使用してクライアントサイドで直接認証
4. 成功したら、トークンが保存され、ダッシュボードにリダイレクト

### 設定パターン2（Public Client + Confidential Client）の場合

1. ユーザーがログインフォームに入力
2. `login()`関数が呼ばれる
3. Public Clientを使用してクライアントサイドで直接認証を試みる
4. 成功したら、トークンが保存され、ダッシュボードにリダイレクト
5. 失敗した場合（SECRET_HASHエラーなど）、自動的に`/api/auth/login`にリクエスト
6. サーバーサイドでConfidential ClientとSecretを使用して認証
7. 成功したら、トークンがクライアントに返され、localStorageに保存

## トラブルシューティング

### 問題1: 「CLIENT_SECRETが設定されていません」エラー

**原因**: `.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`が設定されていない

**解決方法**: 
- 設定パターン2を使用する場合は、`.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`を追加
- 設定パターン1のみを使用する場合は、このエラーは無視して問題ありません

### 問題2: 「Client is configured with secret but SECRET_HASH was not received」エラー

**原因**: Public Clientではなく、Confidential ClientのIDが`NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`に設定されている

**解決方法**: 
- `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`がPublic Client（シークレットなし）のIDであることを確認
- AWSコンソールでUser Pool Clientの設定を確認

### 問題3: 環境変数が読み込まれない

**原因**: 開発サーバーを再起動していない

**解決方法**: 
- `.env.local`を変更した後は、必ず開発サーバーを再起動してください
- `Ctrl+C`で停止してから、再度`npm run dev`を実行

## 参考

- [COGNITO_SETUP.md](./COGNITO_SETUP.md) - User Poolの設定手順
- [COGNITO_DUAL_CLIENT_SETUP.md](./COGNITO_DUAL_CLIENT_SETUP.md) - Public ClientとConfidential Clientの併用設定



