# トラブルシューティングガイド

## 購入APIで「すべてのグループへの追加に失敗しました」エラーが発生する場合

### 原因1: AWS認証情報が設定されていない

`AdminAddUserToGroupCommand`を使用するには、AWS認証情報が必要です。

**解決方法:**

1. **環境変数にAWS認証情報を設定**
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key-id
   export AWS_SECRET_ACCESS_KEY=your-secret-access-key
   export AWS_REGION=ap-northeast-1
   ```

2. **または、`.env.local`ファイルに追加**
   ```
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=ap-northeast-1
   ```

3. **IAMロールを使用する場合（推奨）**
   - AWS LambdaやECSなどの環境で実行する場合、IAMロールを使用できます
   - ローカル開発環境では、AWS CLIの認証情報を使用します

### 原因2: Cognitoグループが存在しない

コースグループ（例: `course-basic-math`）がCognito User Poolに存在しない場合、エラーが発生します。

**解決方法:**

1. **AWSコンソールでグループを作成**
   - Cognito User Pool → ユーザーグループ → グループを作成
   - グループ名: `course-basic-math`（コースIDに応じて）

2. **または、APIでグループを自動作成する機能を追加**

### 原因3: IAM権限が不足している

`AdminAddUserToGroupCommand`を実行するには、以下のIAM権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminAddUserToGroup"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    }
  ]
}
```

**解決方法:**

1. **IAMユーザーまたはロールに権限を追加**
   - IAMコンソールで、使用しているユーザーまたはロールを選択
   - 上記のポリシーを追加

### 原因4: ユーザーIDの取得に失敗している

トークンからユーザーID（subクレーム）が正しく取得できていない場合。

**確認方法:**

サーバーログで以下を確認：
- `取得したユーザーID:` のログが出力されているか
- ユーザーIDが正しい形式か（UUID形式）

**解決方法:**

1. **トークンが正しく送信されているか確認**
   - ブラウザの開発者ツール → Networkタブ → `/api/purchase/complete` のリクエスト
   - Authorizationヘッダーが含まれているか確認

2. **トークンの有効期限を確認**
   - IDトークンが有効期限内か確認

### 原因5: User Pool IDが正しく設定されていない

環境変数の`NEXT_PUBLIC_COGNITO_USER_POOL_ID`が正しく設定されていない場合。

**確認方法:**

サーバーログで以下を確認：
- `環境設定:` のログで`userPoolId`が正しく表示されているか

**解決方法:**

1. **`.env.local`ファイルを確認**
   ```
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
   ```

2. **環境変数が正しく読み込まれているか確認**
   - `src/lib/env.ts`の`getEnvConfig`関数を確認

## デバッグ方法

### 1. サーバーログを確認

Next.jsの開発サーバーのコンソールで、以下のログを確認：
- `Authorizationヘッダー:` 
- `取得したユーザーID:`
- `環境設定:`
- `グループ XXX にユーザー XXX を追加しようとしています...`
- `グループ XXX への追加エラー:`

### 2. ブラウザの開発者ツールで確認

1. **Networkタブ**
   - `/api/purchase/complete`のリクエストを確認
   - ステータスコードとレスポンスボディを確認

2. **Consoleタブ**
   - クライアントサイドのエラーログを確認

### 3. AWS CloudWatch Logsで確認

本番環境では、AWS CloudWatch Logsでエラーログを確認できます。

## よくあるエラーメッセージと対処法

### `AccessDeniedException`
- **原因**: IAM権限が不足している
- **対処**: IAMポリシーに`cognito-idp:AdminAddUserToGroup`を追加

### `ResourceNotFoundException`
- **原因**: User Poolまたはグループが存在しない
- **対処**: User Pool IDを確認、またはグループを作成

### `UnauthorizedException`
- **原因**: AWS認証情報が無効または設定されていない
- **対処**: AWS認証情報を設定

### `InvalidParameterException`
- **原因**: パラメータが不正（例: ユーザーIDが空）
- **対処**: リクエストパラメータを確認

