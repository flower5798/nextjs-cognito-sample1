# カスタム権限の付与方法

このドキュメントでは、AWS Cognito User Groupsを使用してユーザーにカスタム権限を付与する方法を説明します。

## 概要

カスタム権限を付与するには、以下の手順を実行します：

1. AWS Cognito User Poolで新しいUser Groupを作成
2. ユーザーをそのグループに追加
3. アプリケーションでカスタム権限名を使用して権限チェック

## 手順1: User Groupの作成

### AWSコンソールでの操作

1. **AWSコンソールにログイン**
   - https://console.aws.amazon.com/cognito/ にアクセス

2. **User Poolを選択**
   - 使用しているUser Poolを選択

3. **「ユーザーグループ」タブを開く**
   - 左側のメニューから「ユーザーグループ」をクリック

4. **「グループを作成」をクリック**

5. **グループ情報を入力**
   - **グループ名**: カスタム権限名を入力（例: `content-manager`, `moderator`, `analyst`）
   - **説明**: グループの説明を入力（任意）
   - **優先順位**: 数値を入力（任意、このサンプルでは使用していません）
   - **IAMロール**: 必要に応じて設定（このサンプルでは不要）

6. **「グループを作成」をクリック**

### グループ名の命名規則

- **推奨**: `kebab-case`（例: `content-manager`, `data-analyst`）
- **避けるべき**: スペース、特殊文字（`_`は使用可能）
- **大文字小文字**: グループ名は大文字小文字を区別しますが、権限チェックでは小文字に変換されます

## 手順2: ユーザーをグループに追加

### 方法1: AWSコンソールから追加

1. **User Poolの「ユーザー」タブを開く**
2. **ユーザーを選択**
3. **「グループに追加」をクリック**
4. **グループを選択して追加**

### 方法2: 複数のユーザーを一度に追加

1. **User Poolの「ユーザーグループ」タブを開く**
2. **グループを選択**
3. **「ユーザーを追加」をクリック**
4. **ユーザーを選択して追加**

### 方法3: AWS CLIを使用（オプション）

```bash
# ユーザーをグループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <USER_POOL_ID> \
  --username <USERNAME> \
  --group-name <GROUP_NAME>
```

## 手順3: アプリケーションでの使用

### カスタム権限名で権限チェック

カスタム権限名を使用して権限チェックを行うには、以下の関数を使用します：

```typescript
import {
  hasPermissionNameOrHigher,
  hasGroupOrHigher,
  hasAnyPermissionNameOrHigher,
} from '@/lib/permissions';

// カスタム権限名でチェック
const canManageContent = await hasPermissionNameOrHigher('content-manager');

// グループ名でチェック（同じ結果）
const canManageContent2 = await hasGroupOrHigher('content-manager');

// 複数のカスタム権限名のいずれかでチェック
const canModerate = await hasAnyPermissionNameOrHigher(['moderator', 'admin']);
```

### ProtectedContentコンポーネントでの使用

```tsx
import ProtectedContent from '@/components/ProtectedContent';

// カスタム権限名を使用
<ProtectedContent requiredPermissionName="content-manager">
  <div>コンテンツ管理画面</div>
</ProtectedContent>

// グループ名を使用（同じ結果）
<ProtectedContent requiredGroupName="content-manager">
  <div>コンテンツ管理画面</div>
</ProtectedContent>

// 複数のカスタム権限名のいずれか
<ProtectedContent anyPermissionNames={['moderator', 'admin']}>
  <div>モデレーション画面</div>
</ProtectedContent>
```

### PermissionButtonコンポーネントでの使用

```tsx
import PermissionButton from '@/components/PermissionButton';

// カスタム権限名を使用
<PermissionButton
  requiredPermissionName="content-manager"
  onClick={handleManageContent}
  disabledMessage="content-manager権限が必要です"
>
  コンテンツ管理
</PermissionButton>
```

## カスタム権限の階層化

### 定義済みの権限タイプとの統合

カスタム権限名が定義済みの権限タイプ（`admin`, `editor`, `viewer`, `user`）として認識される場合、階層的なチェックが行われます。

例：
- グループ名が`editor`の場合 → `editor`または`admin`グループに属している場合に`true`
- グループ名が`custom-group`の場合（定義済みの権限タイプではない） → `custom-group`グループに属している場合のみ`true`

### カスタム権限にレベルを設定する

カスタム権限にレベルを設定して階層化するには、`src/lib/permissions.ts`を編集します：

```typescript
// 権限の種類を定義
export type Permission = 'admin' | 'editor' | 'viewer' | 'user' | 'content-manager' | 'moderator';

// 権限の階層（数値が大きいほど高い権限）
const PERMISSION_LEVELS: Record<Permission, number> = {
  admin: 100,
  editor: 50,
  'content-manager': 40,  // カスタム権限を追加
  moderator: 30,          // カスタム権限を追加
  viewer: 10,
  user: 1,
};
```

これにより、`content-manager`権限を持つユーザーは、`moderator`、`viewer`、`user`の操作も実行できます。

## 実装例

### 例1: コンテンツ管理権限

1. **User Groupを作成**
   - グループ名: `content-manager`
   - 説明: コンテンツ管理権限

2. **ユーザーを追加**
   - コンテンツ管理を行うユーザーを`content-manager`グループに追加

3. **アプリケーションで使用**
   ```tsx
   <ProtectedContent requiredPermissionName="content-manager">
     <ContentManagementPanel />
   </ProtectedContent>
   ```

### 例2: モデレーション権限

1. **User Groupを作成**
   - グループ名: `moderator`
   - 説明: モデレーション権限

2. **ユーザーを追加**
   - モデレーションを行うユーザーを`moderator`グループに追加

3. **アプリケーションで使用**
   ```tsx
   <PermissionButton
     requiredPermissionName="moderator"
     onClick={handleModerate}
   >
     モデレート
   </PermissionButton>
   ```

### 例3: 複数の権限の組み合わせ

1. **複数のUser Groupを作成**
   - `analyst`: データ分析権限
   - `reporter`: レポート作成権限

2. **ユーザーを複数のグループに追加**
   - 1人のユーザーを複数のグループに追加可能

3. **アプリケーションで使用**
   ```tsx
   <ProtectedContent anyPermissionNames={['analyst', 'reporter']}>
     <AnalyticsDashboard />
   </ProtectedContent>
   ```

## 権限の確認方法

### ダッシュボードページで確認

ダッシュボードページにアクセスすると、現在のユーザーのグループ情報が表示されます。

### コードで確認

```typescript
import { getUserGroups, getUserPermissions } from '@/lib/permissions';

// ユーザーのグループ一覧を取得
const groups = await getUserGroups();
console.log('所属グループ:', groups);

// 権限情報を取得
const permissions = await getUserPermissions();
console.log('権限情報:', permissions);
```

## よくある質問

### Q1: 1人のユーザーを複数のグループに追加できますか？

**A**: はい、可能です。1人のユーザーは複数のグループに所属できます。その場合、最も高い権限レベルが適用されます。

### Q2: カスタム権限名は大文字小文字を区別しますか？

**A**: グループ名自体は大文字小文字を区別しますが、権限チェックでは小文字に変換して比較します。グループ名は`ContentManager`でも、権限チェックでは`content-manager`として認識されます。

### Q3: カスタム権限に階層を設定できますか？

**A**: はい、`src/lib/permissions.ts`の`PERMISSION_LEVELS`にカスタム権限を追加することで、階層的なチェックが可能になります。

### Q4: グループを削除するとどうなりますか？

**A**: グループを削除すると、そのグループに所属していたユーザーは自動的にグループから削除されます。ユーザー自体は削除されません。

### Q5: 権限情報が反映されない場合は？

**A**: IDトークンにグループ情報が含まれるまで、ログアウト→ログインが必要な場合があります。または、ダッシュボードページの「権限情報を更新」ボタンを使用してトークンをリフレッシュしてください。

## ベストプラクティス

1. **グループ名の命名規則を統一**
   - チーム全体で一貫した命名規則を使用
   - `kebab-case`を推奨

2. **権限の粒度を適切に設定**
   - 細かすぎる権限は管理が複雑になる
   - 粗すぎる権限はセキュリティリスクが高くなる

3. **ドキュメント化**
   - 各グループの役割と権限をドキュメント化
   - 新しいメンバーが理解しやすいようにする

4. **定期的な見直し**
   - 権限の使用状況を定期的に確認
   - 不要な権限は削除

## トラブルシューティング

### 問題1: カスタム権限が認識されない

**原因**: グループ名が正しく設定されていない、またはユーザーがグループに追加されていない

**解決方法**:
- AWSコンソールでグループ名を確認
- ユーザーがグループに追加されているか確認
- トークンをリフレッシュ（「権限情報を更新」ボタン）

### 問題2: 階層的なチェックが動作しない

**原因**: カスタム権限が`PERMISSION_LEVELS`に定義されていない

**解決方法**:
- `src/lib/permissions.ts`の`PERMISSION_LEVELS`にカスタム権限を追加
- または、直接的なマッチのみを使用

## 参考

- [PERMISSIONS_SETUP.md](./PERMISSIONS_SETUP.md) - 基本的な権限管理機能の設定
- [PERMISSIONS_ADVANCED.md](./PERMISSIONS_ADVANCED.md) - 高度な権限管理機能
- [AWS Cognito User Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)

