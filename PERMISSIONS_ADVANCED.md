# 高度な権限管理機能

このドキュメントでは、レベル別の権限判定に加えて、特定の権限名を明示的にチェックする機能について説明します。

## 概要

権限チェックには以下の方法があります：

1. **定義済みの権限タイプ** (`Permission`型): `admin`, `editor`, `viewer`, `user`
2. **カスタム権限名** (文字列): 任意の権限名を指定
3. **グループ名** (文字列): Cognito User Groupsのグループ名を直接指定
4. **複数の権限名のいずれか**: 複数の権限名のいずれかを持っているかチェック

## 権限チェック関数

### 1. `hasPermissionOrHigher(requiredPermission, forceRefresh?)`

定義済みの権限タイプを使用して、その権限以上を持っているかチェックします。

```typescript
import { hasPermissionOrHigher } from '@/lib/permissions';

// editor権限以上（editorまたはadmin）を持っているかチェック
const canEdit = await hasPermissionOrHigher('editor');
```

### 2. `hasPermissionNameOrHigher(permissionName, forceRefresh?)`

カスタム権限名（文字列）を使用して、その権限以上を持っているかチェックします。

```typescript
import { hasPermissionNameOrHigher } from '@/lib/permissions';

// 'content-manager'権限以上を持っているかチェック
const canManageContent = await hasPermissionNameOrHigher('content-manager');

// 定義済みの権限名も使用可能
const canEdit = await hasPermissionNameOrHigher('editor');
```

### 3. `hasGroupOrHigher(groupName, forceRefresh?)`

グループ名を直接指定して、そのグループに属しているか、またはより高い権限を持っているかチェックします。

```typescript
import { hasGroupOrHigher } from '@/lib/permissions';

// 'editors'グループに属しているか、またはより高い権限を持っているかチェック
const isEditor = await hasGroupOrHigher('editors');
```

### 4. `hasAnyPermissionNameOrHigher(permissionNames, forceRefresh?)`

複数の権限名のいずれかを持っているか、またはより高い権限を持っているかチェックします。

```typescript
import { hasAnyPermissionNameOrHigher } from '@/lib/permissions';

// 'editor'または'admin'権限のいずれかを持っているかチェック
const canEditOrAdmin = await hasAnyPermissionNameOrHigher(['editor', 'admin']);
```

## コンポーネントでの使用

### ProtectedContentコンポーネント

権限に基づいてコンテンツの表示/非表示を制御します。

#### 方法1: 定義済みの権限タイプを使用

```tsx
import ProtectedContent from '@/components/ProtectedContent';

<ProtectedContent requiredPermission="editor">
  <div>編集者以上が閲覧できるコンテンツ</div>
</ProtectedContent>
```

#### 方法2: カスタム権限名を使用

```tsx
<ProtectedContent requiredPermissionName="content-manager">
  <div>content-manager権限以上が閲覧できるコンテンツ</div>
</ProtectedContent>
```

#### 方法3: グループ名を使用

```tsx
<ProtectedContent requiredGroupName="editors">
  <div>editorsグループ以上が閲覧できるコンテンツ</div>
</ProtectedContent>
```

#### 方法4: 複数の権限名のいずれか

```tsx
<ProtectedContent anyPermissionNames={['editor', 'admin']}>
  <div>editorまたはadmin権限が閲覧できるコンテンツ</div>
</ProtectedContent>
```

### PermissionButtonコンポーネント

権限に基づいてボタンの有効/無効を制御します。

#### 方法1: 定義済みの権限タイプを使用

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

#### 方法2: カスタム権限名を使用

```tsx
<PermissionButton
  requiredPermissionName="content-manager"
  onClick={handleManageContent}
  disabledMessage="content-manager権限（またはそれ以上の権限）が必要です"
>
  コンテンツ管理
</PermissionButton>
```

#### 方法3: グループ名を使用

```tsx
<PermissionButton
  requiredGroupName="editors"
  onClick={handleEdit}
  disabledMessage="editorsグループ（またはそれ以上の権限）が必要です"
>
  編集
</PermissionButton>
```

## 権限の階層と「以上」の概念

### 定義済みの権限タイプの場合

権限は階層的になっており、より高い権限を持つユーザーは、低い権限の操作も実行できます：

- `admin` (レベル 100): すべての操作が可能
- `editor` (レベル 50): 編集操作が可能
- `viewer` (レベル 10): 閲覧のみ
- `user` (レベル 1): 基本的な操作のみ

例：
- `hasPermissionOrHigher('editor')` → `editor`または`admin`権限を持っている場合に`true`
- `hasPermissionOrHigher('viewer')` → `viewer`、`editor`、または`admin`権限を持っている場合に`true`

### カスタム権限名の場合

カスタム権限名が定義済みの権限タイプとして認識される場合、階層的なチェックが行われます。

認識されない場合（完全にカスタムな権限名）は、直接的なマッチのみがチェックされます。

### グループ名の場合

グループ名が定義済みの権限タイプとして認識される場合、階層的なチェックが行われます。

例：
- グループ名が`editor`の場合 → `editor`または`admin`グループに属している場合に`true`
- グループ名が`custom-group`の場合（定義済みの権限タイプではない） → `custom-group`グループに属している場合のみ`true`

## 使用例

### 例1: 特定の権限名をチェック

```typescript
import { hasPermissionNameOrHigher } from '@/lib/permissions';

// 'content-manager'権限を持っているかチェック
const canManageContent = await hasPermissionNameOrHigher('content-manager');

if (canManageContent) {
  // コンテンツ管理操作を実行
}
```

### 例2: 複数の権限のいずれかをチェック

```typescript
import { hasAnyPermissionNameOrHigher } from '@/lib/permissions';

// 'editor'または'admin'権限のいずれかを持っているかチェック
const canEdit = await hasAnyPermissionNameOrHigher(['editor', 'admin']);

if (canEdit) {
  // 編集操作を実行
}
```

### 例3: コンポーネントでの使用

```tsx
import ProtectedContent from '@/components/ProtectedContent';

// カスタム権限名を使用
<ProtectedContent
  requiredPermissionName="content-manager"
  fallback={<p>content-manager権限が必要です</p>}
>
  <div>コンテンツ管理画面</div>
</ProtectedContent>

// 複数の権限名のいずれか
<ProtectedContent
  anyPermissionNames={['editor', 'admin', 'content-manager']}
  fallback={<p>editor、admin、またはcontent-manager権限が必要です</p>}
>
  <div>編集可能なコンテンツ</div>
</ProtectedContent>
```

## ベストプラクティス

1. **権限名の命名規則**: 
   - 一貫性のある命名規則を使用（例: `kebab-case`）
   - 権限名は明確で理解しやすいものにする

2. **階層的な権限の活用**:
   - 定義済みの権限タイプ（`admin`, `editor`, `viewer`, `user`）を優先的に使用
   - カスタム権限が必要な場合のみ、カスタム権限名を使用

3. **パフォーマンス**:
   - `forceRefresh`パラメータは必要な場合のみ使用
   - 権限チェックは必要に応じてキャッシュを活用

4. **エラーハンドリング**:
   - 権限チェックが失敗した場合の適切な処理を実装
   - ユーザーに分かりやすいエラーメッセージを表示

## トラブルシューティング

### 問題1: カスタム権限名が認識されない

**原因**: カスタム権限名が定義済みの権限タイプとして認識されていない

**解決方法**: 
- グループ名が正しいか確認（大文字小文字を区別）
- カスタム権限名がCognito User Groupsに存在するか確認

### 問題2: 階層的なチェックが動作しない

**原因**: カスタム権限名が定義済みの権限タイプとして認識されていない

**解決方法**: 
- 定義済みの権限タイプ（`admin`, `editor`, `viewer`, `user`）を使用する
- または、カスタム権限名を`PERMISSION_LEVELS`に追加する

## 参考

- [PERMISSIONS_SETUP.md](./PERMISSIONS_SETUP.md) - 基本的な権限管理機能の設定
- [TOKEN_REFRESH.md](./TOKEN_REFRESH.md) - トークンリフレッシュと権限情報の更新

