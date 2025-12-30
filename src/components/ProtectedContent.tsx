'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  hasPermission,
  hasPermissionNameOrHigher,
  hasGroupOrHigher,
  hasAnyPermissionNameOrHigher,
  hasAllPermissionNamesOrHigher,
  Permission,
} from '@/lib/permissions';

interface ProtectedContentProps {
  children: ReactNode;
  // 権限チェック方法1: 定義済みの権限タイプを使用
  requiredPermission?: Permission;
  // 権限チェック方法2: カスタム権限名（文字列）を使用
  requiredPermissionName?: string;
  // 権限チェック方法3: グループ名を使用
  requiredGroupName?: string;
  // 権限チェック方法4: 複数の権限名のいずれか（OR条件）
  anyPermissionNames?: string[];
  // 権限チェック方法5: 複数の権限名をすべて持っている（AND条件）+ より高い権限も許可
  allPermissionNames?: string[];
  // allPermissionNamesと組み合わせて使用: より高い権限（この権限を持っている場合はすべての権限を持っているとみなす）
  higherPermission?: Permission;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * 権限に基づいてコンテンツを表示/非表示するコンポーネント
 * 
 * 使用例:
 * - 定義済みの権限: <ProtectedContent requiredPermission="editor">...</ProtectedContent>
 * - カスタム権限名: <ProtectedContent requiredPermissionName="content-manager">...</ProtectedContent>
 * - グループ名: <ProtectedContent requiredGroupName="editors">...</ProtectedContent>
 * - 複数の権限のいずれか（OR）: <ProtectedContent anyPermissionNames={['editor', 'admin']}>...</ProtectedContent>
 * - 複数の権限をすべて持っている（AND）: <ProtectedContent allPermissionNames={['editor', 'content-manager']} higherPermission="admin">...</ProtectedContent>
 */
export default function ProtectedContent({
  children,
  requiredPermission,
  requiredPermissionName,
  requiredGroupName,
  anyPermissionNames,
  allPermissionNames,
  higherPermission,
  fallback,
  redirectTo,
}: ProtectedContentProps) {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      let hasPerm = false;

      // 権限チェック方法1: 定義済みの権限タイプ
      if (requiredPermission) {
        hasPerm = await hasPermission(requiredPermission);
      }
      // 権限チェック方法2: カスタム権限名（文字列）
      else if (requiredPermissionName) {
        hasPerm = await hasPermissionNameOrHigher(requiredPermissionName);
      }
      // 権限チェック方法3: グループ名
      else if (requiredGroupName) {
        hasPerm = await hasGroupOrHigher(requiredGroupName);
      }
      // 権限チェック方法4: 複数の権限名のいずれか（OR条件）
      else if (anyPermissionNames && anyPermissionNames.length > 0) {
        hasPerm = await hasAnyPermissionNameOrHigher(anyPermissionNames);
      }
      // 権限チェック方法5: 複数の権限名をすべて持っている（AND条件）+ より高い権限も許可
      else if (allPermissionNames && allPermissionNames.length > 0) {
        hasPerm = await hasAllPermissionNamesOrHigher(
          allPermissionNames,
          higherPermission
        );
      }
      // いずれも指定されていない場合はエラー
      else {
        console.error(
          'ProtectedContent: requiredPermission, requiredPermissionName, requiredGroupName, anyPermissionNames, または allPermissionNames のいずれかを指定してください'
        );
        hasPerm = false;
      }

      setHasAccess(hasPerm);
      setLoading(false);

      if (!hasPerm && redirectTo) {
        router.push(redirectTo);
      }
    };

    checkPermission();
  }, [
    requiredPermission,
    requiredPermissionName,
    requiredGroupName,
    anyPermissionNames,
    allPermissionNames,
    higherPermission,
    redirectTo,
    router,
  ]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>権限を確認中...</p>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // 必要な権限名を取得して表示
    const permissionDisplayName =
      requiredPermission ||
      requiredPermissionName ||
      requiredGroupName ||
      (anyPermissionNames && anyPermissionNames.join(' または ')) ||
      (allPermissionNames &&
        `${allPermissionNames.join(' かつ ')}${
          higherPermission ? ` または ${higherPermission}` : ''
        }`) ||
      '指定された権限';

    return (
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>アクセス権限がありません</h2>
        <p>この操作を実行するには、{permissionDisplayName}権限（またはそれ以上の権限）が必要です。</p>
      </div>
    );
  }

  return <>{children}</>;
}

