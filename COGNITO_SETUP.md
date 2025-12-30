# AWS Cognito User Pool 設定ガイド

このドキュメントでは、このサンプルアプリケーションで使用するAWS Cognito User Poolの設定手順を説明します。

## 1. User Poolの作成

### ステップ1: User Poolの基本設定

1. AWSコンソールにログインし、**Amazon Cognito**サービスに移動
2. **「ユーザープールを作成」**をクリック
3. **「ステップ 1: サインインエクスペリエンスを設定」**
   - **サインインオプション**: 
     - ✅ **メールアドレス** を選択（必須）
     - その他のオプションは必要に応じて選択
   - **ユーザー名**: 
     - **メールアドレス** を選択（推奨）
   - **パスワードポリシー**: 
     - 必要に応じて設定（デフォルトでも動作します）
   - **多要素認証**: 
     - **オプション** または **必須** を選択（このサンプルではオプション）

### ステップ2: セキュリティ設定

1. **パスワードポリシー**:
   - 最小長: 8文字以上（推奨）
   - 大文字、小文字、数字、特殊文字の要件を設定

2. **多要素認証（MFA）**:
   - **オプション** を推奨（このサンプルではMFAは実装していません）
   - 必要に応じて **必須** に設定可能

3. **ユーザーアカウントの復旧**:
   - **メールのみ** を選択（推奨）

### ステップ3: サインアップエクスペリエンス

1. **必須属性**:
   - ✅ **メールアドレス** を選択（必須）
   - その他の属性は必要に応じて選択

2. **検証メッセージのカスタマイズ**:
   - 必要に応じてカスタマイズ（デフォルトでも動作します）

### ステップ4: メッセージのカスタマイズ

1. **メールメッセージ**:
   - 必要に応じてカスタマイズ（デフォルトでも動作します）

### ステップ5: 統合アプリの設定

1. **アプリクライアント名**: 
   - 任意の名前を入力（例: `nextjs-cognito-app`）

2. **クライアントシークレット**:
   - **オプション1（推奨）: Public Client（シークレットなし）**
     - ✅ **「クライアントシークレットを生成する」のチェックを外す**
     - クライアントサイドで直接認証できます
   
   - **オプション2: Confidential Client（シークレットあり）**
     - ✅ **「クライアントシークレットを生成する」にチェックを入れる**
     - `.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`を設定する必要があります

3. **認証フロー設定**:
   - ✅ **ALLOW_USER_PASSWORD_AUTH** を有効にする（必須）
   - ✅ **ALLOW_REFRESH_TOKEN_AUTH** を有効にする（推奨）
   - その他の認証フローは必要に応じて選択

4. **OAuth 2.0設定**:
   - このサンプルでは使用していませんが、必要に応じて設定可能

### ステップ6: 確認と作成

1. 設定を確認
2. **「ユーザープールを作成」**をクリック

## 2. User Pool Clientの設定確認

### 必要な設定

1. **認証フロー**:
   - ✅ **ALLOW_USER_PASSWORD_AUTH** が有効になっていること
   - ✅ **ALLOW_REFRESH_TOKEN_AUTH** が有効になっていること（推奨）

2. **クライアントシークレット**:
   - Public Clientの場合: シークレットなし
   - Confidential Clientの場合: シークレットが生成されていること

## 3. 環境変数の設定

### 必要な情報の取得

1. **User Pool ID**: 
   - User Poolの詳細ページで確認
   - 形式: `ap-northeast-1_xxxxxxxxx`

2. **User Pool Client ID**: 
   - 「アプリの統合」タブ → 「アプリクライアント」セクションで確認
   - 形式: `xxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **リージョン**: 
   - User Poolを作成したリージョン（例: `ap-northeast-1`）

4. **Client Secret**（Confidential Clientの場合のみ）:
   - 「アプリの統合」タブ → 「アプリクライアント」セクションで確認
   - ⚠️ **注意**: Client Secretは作成時にのみ表示されます。表示されない場合は、新しいClientを作成する必要があります。

### .env.localファイルの設定

プロジェクトルートに`.env.local`ファイルを作成し、以下の内容を設定します：

#### Public Client（シークレットなし）の場合

```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

#### Confidential Client（シークレットあり）の場合

```env
# クライアントサイドで使用可能
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# サーバーサイドでのみ使用（NEXT_PUBLIC_プレフィックスなし）
COGNITO_USER_POOL_CLIENT_SECRET=your-secret-key-here
```

## 4. テストユーザーの作成

### AWSコンソールから作成

1. User Poolの詳細ページで **「ユーザー」** タブを開く
2. **「ユーザーを作成」** をクリック
3. メールアドレスとパスワードを入力
4. **「ユーザーを作成」** をクリック

### 注意事項

- メールアドレスは有効な形式である必要があります
- パスワードはUser Poolのパスワードポリシーに準拠する必要があります
- メール検証が必要な場合、メールアドレスを確認する必要があります

## 5. よくある問題と解決方法

### 問題1: 「Client is configured with secret but SECRET_HASH was not received」エラー

**原因**: User Pool Clientがシークレット付きで設定されているが、クライアントサイドから直接ログインしようとしている

**解決方法**:
1. **オプション1**: User Pool ClientをPublic Client（シークレットなし）に変更
2. **オプション2**: `.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`を設定（自動的にサーバーサイドAPI経由でログインされます）

### 問題2: 「NotAuthorizedException」エラー

**原因**: 認証フローが正しく設定されていない

**解決方法**:
- User Pool Clientの設定で **ALLOW_USER_PASSWORD_AUTH** が有効になっているか確認

### 問題3: メールアドレスが検証されていない

**原因**: User Poolでメール検証が必須になっている

**解決方法**:
- AWSコンソールからユーザーのメールアドレスを確認済みにする
- または、メール検証をオプションに変更

### 問題4: パスワードが弱すぎる

**原因**: User Poolのパスワードポリシーに準拠していない

**解決方法**:
- User Poolのパスワードポリシーを確認
- パスワードポリシーに準拠したパスワードを使用

## 6. セキュリティのベストプラクティス

### 推奨設定

1. **Public Client（シークレットなし）を使用**:
   - クライアントサイドで直接認証できるため、シンプルで安全
   - CLIENT_SECRETを管理する必要がない

2. **HTTPSを使用**:
   - 本番環境では必ずHTTPSを使用してください

3. **パスワードポリシー**:
   - 強力なパスワードポリシーを設定
   - 定期的なパスワード変更を推奨

4. **MFA（多要素認証）**:
   - 本番環境ではMFAを有効にすることを推奨

5. **環境変数の管理**:
   - `.env.local`はGitにコミットしない
   - 本番環境では適切なシークレット管理サービスを使用

## 7. 参考リンク

- [AWS Cognito User Pools ドキュメント](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [AWS Amplify Authentication ドキュメント](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Next.js Environment Variables ドキュメント](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

