# セキュリティに関する重要な注意事項

## CLIENT_SECRETの扱いについて

### ⚠️ 重要な原則

**CLIENT_SECRETは機密情報であり、クライアントサイドに公開してはいけません。**

### 環境変数の命名規則

Next.jsでは、環境変数の命名規則が重要です：

#### ✅ クライアントサイドで使用可能（公開される）
- `NEXT_PUBLIC_`プレフィックスを付ける
- 例: `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- **注意**: これらの値はブラウザのバンドルに含まれ、誰でも見ることができます

#### 🔒 サーバーサイドでのみ使用（非公開）
- `NEXT_PUBLIC_`プレフィックスを**付けない**
- 例: `COGNITO_USER_POOL_CLIENT_SECRET`
- **重要**: これらの値はサーバーサイドでのみ利用可能で、クライアントに公開されません

### 推奨されるアプローチ

#### 1. Public Client（推奨 - 現在の実装）
- CLIENT_SECRETは不要
- クライアントサイドで直接認証
- シンプルで安全

**設定例（.env.local）:**
```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
# CLIENT_SECRETは不要
```

#### 2. Confidential Client（CLIENT_SECRETが必要な場合）
- サーバーサイドAPI経由で認証
- CLIENT_SECRETはサーバーサイドでのみ使用

**設定例（.env.local）:**
```env
# クライアントサイドで使用可能
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# サーバーサイドでのみ使用（NEXT_PUBLIC_プレフィックスなし）
COGNITO_USER_POOL_CLIENT_SECRET=your-secret-key-here
```

**使用例:**
- `/src/app/api/auth/login/route.ts` - サーバーサイドAPI経由でログイン

### セキュリティチェックリスト

- [ ] CLIENT_SECRETに`NEXT_PUBLIC_`プレフィックスを付けていないか確認
- [ ] `.env.local`が`.gitignore`に含まれているか確認
- [ ] 本番環境では環境変数を適切に設定しているか確認
- [ ] CLIENT_SECRETが必要な場合は、サーバーサイドAPI経由で認証しているか確認

### よくある間違い

❌ **間違い:**
```env
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_SECRET=secret-key
```
これは**絶対に避けてください**。CLIENT_SECRETがブラウザに公開されます。

✅ **正しい:**
```env
COGNITO_USER_POOL_CLIENT_SECRET=secret-key
```
サーバーサイドでのみ使用されます。

### 参考資料

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [AWS Cognito User Pool Clients](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html)

