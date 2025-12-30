# 同じUser PoolでPublic ClientとConfidential Clientを併用する設定

このドキュメントでは、同じUser Poolで、クライアントサイド用のPublic Clientとサーバーサイド用のConfidential Clientの両方を使用する設定方法を説明します。

## 概要

- **User Pool**: 1つ（共通）
- **User Pool Client**: 2つ作成
  - **Public Client（シークレットなし）**: クライアントサイドで直接認証
  - **Confidential Client（シークレットあり）**: サーバーサイドAPI経由で認証

## 設定手順

### 1. User Poolの作成

1. AWSコンソールでCognito User Poolを作成
2. 設定は通常通り（メールアドレスをサインインオプションとして選択）

### 2. User Pool Clientの作成（2つ）

#### Client 1: Public Client（クライアントサイド用）

1. User Poolの詳細ページで **「アプリの統合」** タブを開く
2. **「アプリクライアントを作成」** をクリック
3. 以下の設定を行う：
   - **アプリクライアント名**: `nextjs-client-public`（任意）
   - **クライアントシークレットを生成する**: ❌ **チェックを外す**（重要）
   - **認証フロー**:
     - ✅ `ALLOW_USER_PASSWORD_AUTH`
     - ✅ `ALLOW_REFRESH_TOKEN_AUTH`
   - **OAuth 2.0設定**: 必要に応じて設定
4. **「アプリクライアントを作成」** をクリック
5. **Client ID**をコピー（後で使用）

#### Client 2: Confidential Client（サーバーサイド用）

1. 同じUser Poolで、再度 **「アプリクライアントを作成」** をクリック
2. 以下の設定を行う：
   - **アプリクライアント名**: `nextjs-client-server`（任意）
   - **クライアントシークレットを生成する**: ✅ **チェックを入れる**（重要）
   - **認証フロー**:
     - ✅ `ALLOW_USER_PASSWORD_AUTH`
     - ✅ `ALLOW_REFRESH_TOKEN_AUTH`
   - **OAuth 2.0設定**: 必要に応じて設定
3. **「アプリクライアントを作成」** をクリック
4. **Client ID**と**Client Secret**をコピー（後で使用）
   - ⚠️ **注意**: Client Secretは作成時にのみ表示されます。必ずコピーしてください。

## 3. 環境変数の設定

`.env.local`ファイルに以下の環境変数を設定します：

```env
# User Pool ID（共通）
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx

# クライアントサイド用のClient ID（Public Client - シークレットなし）
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# サーバーサイド用のClient ID（Confidential Client - シークレットあり）
COGNITO_USER_POOL_CLIENT_ID_SERVER=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# サーバーサイド用のClient Secret（Confidential Client）
COGNITO_USER_POOL_CLIENT_SECRET=your-secret-key-here

# リージョン
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

### 環境変数の説明

| 環境変数 | 用途 | プレフィックス | 説明 |
|---------|------|---------------|------|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | 共通 | `NEXT_PUBLIC_` | User Pool ID（両方のClientで共通） |
| `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | クライアントサイド | `NEXT_PUBLIC_` | Public ClientのID |
| `COGNITO_USER_POOL_CLIENT_ID_SERVER` | サーバーサイド | なし | Confidential ClientのID |
| `COGNITO_USER_POOL_CLIENT_SECRET` | サーバーサイド | なし | Confidential ClientのSecret |
| `NEXT_PUBLIC_COGNITO_REGION` | 共通 | `NEXT_PUBLIC_` | AWSリージョン |

## 4. 動作の流れ

### クライアントサイドでのログイン

1. ユーザーがログインフォームに入力
2. `login()`関数が呼ばれる
3. Amplifyが`NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`（Public Client）を使用して認証
4. 成功したら、トークンが保存され、ダッシュボードにリダイレクト

### サーバーサイドAPI経由でのログイン

1. クライアントサイドでのログインが失敗（SECRET_HASHエラーなど）
2. 自動的に`/api/auth/login`にリクエストが送信される
3. サーバーサイドで`COGNITO_USER_POOL_CLIENT_ID_SERVER`と`COGNITO_USER_POOL_CLIENT_SECRET`を使用して認証
4. SECRET_HASHを計算してCognitoに認証リクエスト
5. 成功したら、トークンがクライアントに返され、localStorageに保存

## 5. メリット

### 同じUser Poolを使用する利点

1. **ユーザー管理の一元化**: すべてのユーザーが同じUser Poolに存在
2. **設定の統一**: User Poolの設定（パスワードポリシー、MFAなど）が統一される
3. **柔軟性**: 用途に応じて適切なClientを使用できる

### Public ClientとConfidential Clientの使い分け

- **Public Client**: 
  - クライアントサイドで直接認証
  - シンプルで高速
  - CLIENT_SECRETの管理が不要

- **Confidential Client**: 
  - サーバーサイド経由で認証
  - より高いセキュリティ
  - CLIENT_SECRETがクライアントに公開されない

## 6. トラブルシューティング

### 問題1: サーバーサイドAPIで「CLIENT_SECRETが設定されていません」エラー

**原因**: `.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`が設定されていない

**解決方法**: 
- `.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`を追加
- 開発サーバーを再起動

### 問題2: サーバーサイドAPIで「Client IDが設定されていません」エラー

**原因**: `.env.local`に`COGNITO_USER_POOL_CLIENT_ID_SERVER`が設定されていない

**解決方法**: 
- `.env.local`に`COGNITO_USER_POOL_CLIENT_ID_SERVER`を追加
- 開発サーバーを再起動

### 問題3: クライアントサイドで「SECRET_HASH」エラー

**原因**: Public Clientではなく、Confidential ClientのIDが設定されている可能性

**解決方法**: 
- `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`がPublic Client（シークレットなし）のIDであることを確認

## 7. セキュリティの注意事項

1. **CLIENT_SECRETの管理**:
   - `.env.local`はGitにコミットしない
   - 本番環境では適切なシークレット管理サービスを使用

2. **環境変数の命名規則**:
   - クライアントサイドで使用するもの: `NEXT_PUBLIC_`プレフィックス
   - サーバーサイドでのみ使用するもの: `NEXT_PUBLIC_`プレフィックスなし

3. **Client IDの使い分け**:
   - Public ClientのIDはクライアントサイドで使用
   - Confidential ClientのIDはサーバーサイドでのみ使用

## 8. 参考

- [AWS Cognito User Pool Clients](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html)
- [COGNITO_SETUP.md](./COGNITO_SETUP.md) - 基本的な設定手順

