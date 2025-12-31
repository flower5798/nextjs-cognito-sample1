# 権限管理機能の設定ガイド

このドキュメントでは、AWS Cognito User Groupsを使用した権限管理機能の設定方法を説明します。

## 概要

このアプリケーションでは、AWS Cognito User Groupsを使用してユーザーの権限を管理します。各ユーザーは1つ以上のグループに所属でき、グループに基づいて操作の許可/拒否が決定されます。

## 権限の種類

以下の権限が定義されています：

| 権限 | レベル | 説明 |
|------|--------|------|
| `admin` | 100 | 管理者権限（すべての操作が可能） |
| `editor` | 50 | 編集権限（コンテンツの作成・編集が可能） |
| `viewer` | 10 | 閲覧権限（閲覧のみ可能） |
| `user` | 1 | 一般ユーザー権限（基本的な操作のみ） |

権限は階層的になっており、より高い権限を持つユーザーは、低い権限の操作も実行できます。

## AWS Cognito User Groupsの設定

### 1. User Groupの作成

1. AWSコンソールでCognito User Poolの詳細ページを開く
2. **「ユーザーグループ」** タブを開く
3. **「グループを作成」** をクリック

### 2. 各グループの設定

#### Adminグループ（管理者）

- **グループ名**: `admin`
- **説明**: 管理者グループ
- **優先順位**: 1（任意）
- **IAMロール**: 必要に応じて設定（このサンプルでは不要）

#### Editorグループ（編集者）

- **グループ名**: `editor`
- **説明**: 編集者グループ
- **優先順位**: 2（任意）
- **IAMロール**: 必要に応じて設定（このサンプルでは不要）

#### Viewerグループ（閲覧者）

- **グループ名**: `viewer`
- **説明**: 閲覧者グループ
- **優先順位**: 3（任意）
- **IAMロール**: 必要に応じて設定（このサンプルでは不要）

### 3. ユーザーをグループに追加

1. User Poolの **「ユーザー」** タブを開く
2. ユーザーを選択
3. **「グループに追加」** をクリック
4. グループを選択して追加

**注意**: 1人のユーザーは複数のグループに所属できます。その場合、最も高い権限レベルが適用されます。

## IDトークンにグループ情報を含める設定

User Groupsの情報をIDトークンに含めるには、User Pool Clientの設定が必要です。

### 設定手順

1. User Poolの **「アプリの統合」** タブを開く
2. User Pool Clientを選択
3. **「属性の読み取りと書き込みのアクセス許可」** セクションで以下を確認：
   - ✅ **「cognito:groups」** が読み取り可能になっていること
4. **「属性の読み取りと書き込みのアクセス許可」** で、必要に応じて設定を変更

**注意**: デフォルトでは、`cognito:groups`はIDトークンに自動的に含まれます。特別な設定は通常不要です。

## 使用方法

### 1. 権限チェック関数の使用

```typescript
import { hasPermission, hasGroup, getUserPermissions } from '@/lib/permissions';

// 特定の権限を持っているかチェック
const canEdit = await hasPermission('editor');

// 特定のグループに属しているかチェック
const isAdmin = await hasGroup('admin');

// ユーザーの権限情報を取得
const permissions = await getUserPermissions();
console.log(permissions.groups); // ['admin', 'editor']
console.log(permissions.permissions); // ['admin', 'editor']
console.log(permissions.maxLevel); // 100
```

### 2. ProtectedContentコンポーネントの使用

権限に基づいてコンテンツの表示/非表示を制御：

```tsx
import ProtectedContent from '@/components/ProtectedContent';

<ProtectedContent
  requiredPermission="admin"
  fallback={<p>管理者権限が必要です</p>}
>
  <div>管理者専用コンテンツ</div>
</ProtectedContent>
```

### 3. PermissionButtonコンポーネントの使用

権限に基づいてボタンの有効/無効を制御：

```tsx
import PermissionButton from '@/components/PermissionButton';

<PermissionButton
  requiredPermission="editor"
  onClick={handleEdit}
  disabledMessage="編集権限が必要です"
>
  編集
</PermissionButton>
```

## 実装例

### ダッシュボードページでの使用例

`src/app/dashboard/page.tsx`では、以下のように権限管理機能を使用しています：

1. **権限情報の表示**: ユーザーのグループと権限レベルを表示
2. **権限に基づいたボタン**: 管理者専用、編集者専用のボタン
3. **権限に基づいたコンテンツ**: 管理者専用、編集者専用のコンテンツセクション

## カスタム権限の追加

新しい権限を追加する場合は、`src/lib/permissions.ts`を編集します：

```typescript
export type Permission = 'admin' | 'editor' | 'viewer' | 'user' | 'custom';

const PERMISSION_LEVELS: Record<Permission, number> = {
  admin: 100,
  editor: 50,
  viewer: 10,
  user: 1,
  custom: 25, // 新しい権限を追加
};
```

## トラブルシューティング

### 問題1: グループ情報が取得できない

**原因**: IDトークンにグループ情報が含まれていない

**解決方法**:
- User Pool Clientの設定で、`cognito:groups`が読み取り可能になっているか確認
- ユーザーがグループに追加されているか確認
- トークンを再取得（ログアウト→ログイン）

### 問題2: 権限チェックが常にfalseを返す

**原因**: グループ名が権限名と一致していない

**解決方法**:
- グループ名が小文字で、権限名と一致しているか確認
- 例: グループ名が`Admin`の場合、`admin`として認識されません（大文字小文字を区別）

### 問題3: 複数のグループに所属しているが、権限が正しく適用されない

**原因**: 権限レベルの計算に問題がある可能性

**解決方法**:
- `getUserPermissions()`で取得される`maxLevel`を確認
- グループ名が正しく権限として認識されているか確認

## セキュリティの注意事項

1. **クライアントサイドの権限チェックは参考程度に**:
   - クライアントサイドの権限チェックは、UX向上のためのものです
   - 重要な操作は必ずサーバーサイドでも権限チェックを行ってください

2. **IDトークンの検証**:
   - 本番環境では、サーバーサイドでIDトークンの署名を検証してください

3. **グループ名の管理**:
   - グループ名は機密情報ではないため、IDトークンに含まれます
   - グループ名から推測できる情報を公開しないように注意してください

## 参考

- [AWS Cognito User Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [IDトークンのクレーム](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)



