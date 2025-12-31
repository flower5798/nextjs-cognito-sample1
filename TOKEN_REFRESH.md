# トークンリフレッシュと権限情報の更新

このドキュメントでは、ログイン中にUser Poolの設定が変更された場合の権限情報の更新方法を説明します。

## 重要なポイント

**ログイン中にUser Poolの設定（グループの追加・削除など）が変更されても、既存のIDトークンには反映されません。**

IDトークンは発行時に固定されるため、以下の変更は既存のトークンには含まれません：

- ユーザーが新しいグループに追加された
- ユーザーがグループから削除された
- グループの設定が変更された
- ユーザーの属性が変更された

## 解決方法

最新の権限情報を取得するには、**トークンをリフレッシュ**する必要があります。

### 1. 自動リフレッシュ

Amplifyは、アクセストークンの有効期限が切れる前に自動的にリフレッシュしますが、IDトークンは通常リフレッシュされません。

### 2. 手動リフレッシュ

最新の権限情報が必要な場合は、手動でトークンをリフレッシュできます。

#### コードでの使用例

```typescript
import { refreshTokens, getUserInfoWithPermissions } from '@/lib/cognito';
import { getUserPermissions } from '@/lib/permissions';

// トークンをリフレッシュ
const refreshResult = await refreshTokens();
if (refreshResult.success) {
  // 最新の権限情報を取得
  const userInfo = await getUserInfoWithPermissions(true);
  const permissions = await getUserPermissions(true);
}
```

#### ダッシュボードページでの使用

ダッシュボードページには「権限情報を更新」ボタンが追加されています。このボタンをクリックすると、最新の権限情報が取得されます。

### 3. 関数のパラメータ

以下の関数は`forceRefresh`パラメータをサポートしています：

- `getUserGroups(forceRefresh?: boolean)`
- `hasPermission(requiredPermission, forceRefresh?: boolean)`
- `hasGroup(groupName, forceRefresh?: boolean)`
- `getUserPermissions(forceRefresh?: boolean)`
- `getUserInfoWithPermissions(forceRefresh?: boolean)`
- `getAuthSession(forceRefresh?: boolean)`

`forceRefresh`を`true`に設定すると、トークンを強制的にリフレッシュして最新の情報を取得します。

## 使用例

### 例1: 権限チェック時に最新情報を取得

```typescript
import { hasPermission } from '@/lib/permissions';

// 最新の権限情報でチェック
const canEdit = await hasPermission('editor', true);
```

### 例2: 定期的な権限情報の更新

```typescript
import { refreshTokens, getUserInfoWithPermissions } from '@/lib/cognito';

// 5分ごとに権限情報を更新
setInterval(async () => {
  await refreshTokens();
  const userInfo = await getUserInfoWithPermissions(true);
  console.log('最新のグループ:', userInfo.groups);
}, 5 * 60 * 1000);
```

### 例3: 特定の操作前に権限を再確認

```typescript
import { hasPermission } from '@/lib/permissions';

const handleAdminAction = async () => {
  // 操作前に最新の権限を確認
  const isAdmin = await hasPermission('admin', true);
  
  if (!isAdmin) {
    alert('管理者権限が必要です');
    return;
  }
  
  // 管理者操作を実行
  // ...
};
```

## パフォーマンスへの影響

トークンのリフレッシュは、CognitoへのAPIリクエストを発生させるため、以下の点に注意してください：

1. **頻繁なリフレッシュは避ける**: 必要に応じてのみリフレッシュしてください
2. **キャッシュを活用**: 権限情報は頻繁に変更されないため、キャッシュを活用できます
3. **ユーザー操作に基づくリフレッシュ**: ユーザーが明示的に「更新」ボタンをクリックした場合などにリフレッシュ

## ベストプラクティス

1. **重要な操作前の確認**: 重要な操作（削除、設定変更など）の前に、最新の権限を確認
2. **ユーザーへの通知**: 権限が変更された可能性がある場合、ユーザーに通知して更新を促す
3. **自動更新の実装**: 必要に応じて、定期的に権限情報を更新する機能を実装

## トラブルシューティング

### 問題1: リフレッシュしても権限が更新されない

**原因**: User Poolの設定が正しく変更されていない可能性

**解決方法**:
- AWSコンソールでユーザーがグループに追加されているか確認
- グループ名が正しいか確認（大文字小文字を区別）
- トークンの有効期限を確認（リフレッシュトークンが有効である必要がある）

### 問題2: リフレッシュに失敗する

**原因**: リフレッシュトークンが無効または期限切れ

**解決方法**:
- ユーザーに再ログインを促す
- エラーメッセージを確認して適切な処理を実装

## 参考

- [AWS Amplify Token Refresh](https://docs.amplify.aws/react/build-a-backend/auth/manage-user-session/)
- [Cognito ID Token Claims](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)



