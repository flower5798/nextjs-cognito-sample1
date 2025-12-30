# Next.js Cognito 認証サンプル

このプロジェクトは、Next.jsとAWS Cognitoを使用した認証機能のサンプルアプリケーションです。

## 機能

- メールアドレスとパスワードによるログイン
- 保護されたページ（ダッシュボード、プロフィール）
- ログアウト機能
- 認証状態の管理
- **権限管理機能（AWS Cognito User Groupsを使用）**
  - ユーザーごとの権限設定
  - 階層的な権限チェック（レベル別）
  - 特定の権限名を明示的にチェック（カスタム権限名、グループ名対応）
  - 「この権限以上」の判定機能
  - 複数の権限名のいずれかをチェック
  - 権限に基づいた操作の制限
  - 権限に基づいたコンテンツの表示/非表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. AWS Cognitoの設定

1. AWSコンソールでCognito User Poolを作成します
2. User Pool Clientを作成します（Public ClientとConfidential Clientの両方を作成可能）
3. `.env.local`ファイルを作成し、実際のCognito設定値を入力します

詳細な設定手順は以下を参照してください：
- [COGNITO_SETUP.md](./COGNITO_SETUP.md) - User Poolの基本設定
- [COGNITO_DUAL_CLIENT_SETUP.md](./COGNITO_DUAL_CLIENT_SETUP.md) - Public ClientとConfidential Clientの併用設定
- [ENV_SETUP.md](./ENV_SETUP.md) - 環境変数の設定方法
- [PERMISSIONS_SETUP.md](./PERMISSIONS_SETUP.md) - 権限管理機能の設定方法
- [PERMISSIONS_ADVANCED.md](./PERMISSIONS_ADVANCED.md) - 高度な権限管理機能（カスタム権限名、グループ名対応）
- [TOKEN_REFRESH.md](./TOKEN_REFRESH.md) - トークンリフレッシュと権限情報の更新

`.env.local`の例：

**Public Clientのみを使用する場合:**
```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

**Public ClientとConfidential Clientを併用する場合:**
```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_USER_POOL_CLIENT_ID_SERVER=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
COGNITO_USER_POOL_CLIENT_SECRET=your-secret-key-here
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## プロジェクト構造

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ
│   │   ├── login/              # ログインページ
│   │   ├── dashboard/          # ダッシュボード（保護されたページ）
│   │   └── profile/            # プロフィール（保護されたページ）
│   ├── components/             # Reactコンポーネント
│   │   ├── AmplifyProvider.tsx # Amplify設定プロバイダー
│   │   └── Navbar.tsx         # ナビゲーションバー
│   ├── lib/                    # ユーティリティ
│   │   └── cognito.ts          # Cognito認証関数
│   └── middleware.ts           # Next.jsミドルウェア
├── .env.local.example          # 環境変数のサンプル
└── package.json
```

## 使用方法

### ログイン

1. ホームページから「ログイン」をクリック
2. メールアドレスとパスワードを入力
3. 「ログイン」ボタンをクリック

### 保護されたページへのアクセス

- `/dashboard` - ダッシュボードページ
- `/profile` - プロフィールページ

これらのページは、ログインしていない場合、自動的にログインページにリダイレクトされます。

### ログアウト

ナビゲーションバーの「ログアウト」ボタンをクリックするか、各ページのログアウトボタンを使用します。

## AWS Cognito User Poolの設定

詳細な設定手順は`COGNITO_SETUP.md`を参照してください。

### 必須設定

1. **User Poolの作成**:
   - サインインオプション: **メールアドレス** を選択
   - ユーザー名: **メールアドレス** を選択
   - 必須属性: **メールアドレス** を選択

2. **User Pool Clientの設定**:
   - **認証フロー**: `ALLOW_USER_PASSWORD_AUTH`を有効にする（必須）
   - **認証フロー**: `ALLOW_REFRESH_TOKEN_AUTH`を有効にする（推奨）
   - **クライアントシークレット**: 
     - Public Client（推奨）: シークレットなし
     - Confidential Client: シークレットあり（`.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`を設定）

### 推奨設定

1. **パスワードポリシー**: 強力なパスワードポリシーを設定
2. **MFA**: 本番環境では有効にすることを推奨
3. **メール検証**: 必要に応じて設定

#### CLIENT_SECRETに関する重要な注意

**エラー「Client is configured with secret but SECRET_HASH was not received」が発生した場合:**

このエラーは、User Pool Clientがシークレット付き（Confidential Client）で設定されている場合に発生します。

**解決方法は2つあります:**

1. **推奨: User Pool ClientをPublic Client（シークレットなし）に変更**
   - AWSコンソールでUser Pool Clientの設定を変更
   - 「Generate client secret」のチェックを外す
   - これにより、クライアントサイドで直接認証できます

2. **CLIENT_SECRETを使用する場合（Confidential Client）**
   - `.env.local`に`COGNITO_USER_POOL_CLIENT_SECRET`を設定
   - この場合、自動的にサーバーサイドAPI経由でログインされます
   - 注意: CLIENT_SECRETは`NEXT_PUBLIC_`プレフィックスを付けないでください

3. **同じUser PoolでPublic ClientとConfidential Clientを併用する場合**
   - User Pool Clientを2つ作成（Public ClientとConfidential Client）
   - `.env.local`に両方のClient IDを設定
   - 詳細は`COGNITO_DUAL_CLIENT_SETUP.md`を参照してください

## 技術スタック

- **Next.js 14** - Reactフレームワーク
- **TypeScript** - 型安全性
- **AWS Amplify** - Cognito認証ライブラリ
- **AWS Cognito** - 認証サービス

## セキュリティに関する重要な注意事項

### CLIENT_SECRETの扱い

**CLIENT_SECRETは機密情報であり、クライアントサイドに公開してはいけません。**

- ✅ **Public Client（推奨）**: CLIENT_SECRETは不要。現在の実装はこの方式です。
- 🔒 **Confidential Client**: CLIENT_SECRETが必要な場合は、サーバーサイドAPI経由で認証してください。

#### 環境変数の命名規則

- **クライアントサイドで使用**: `NEXT_PUBLIC_`プレフィックスを付ける
- **サーバーサイドでのみ使用**: `NEXT_PUBLIC_`プレフィックスを**付けない**

**例:**
```env
# ✅ クライアントサイドで使用可能
NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=...

# 🔒 サーバーサイドでのみ使用（CLIENT_SECRETが必要な場合）
COGNITO_USER_POOL_CLIENT_SECRET=...
```

詳細は`SECURITY.md`を参照してください。

## 注意事項

- このサンプルは開発・学習目的で作成されています
- 本番環境で使用する場合は、セキュリティのベストプラクティスに従ってください
- 環境変数は`.env.local`に保存され、Gitにコミットしないでください
- CLIENT_SECRETを使用する場合は、必ずサーバーサイドAPI経由で認証してください

## ライセンス

MIT

