'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission, Permission } from '@/lib/permissions';

interface ProtectedContentProps {
  children: ReactNode;
  requiredPermission: Permission;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * 権限に基づいてコンテンツを表示/非表示するコンポーネント
 */
export default function ProtectedContent({
  children,
  requiredPermission,
  fallback,
  redirectTo,
}: ProtectedContentProps) {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      const hasPerm = await hasPermission(requiredPermission);
      setHasAccess(hasPerm);
      setLoading(false);

      if (!hasPerm && redirectTo) {
        router.push(redirectTo);
      }
    };

    checkPermission();
  }, [requiredPermission, redirectTo, router]);

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
    return (
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>アクセス権限がありません</h2>
        <p>この操作を実行するには、{requiredPermission}権限が必要です。</p>
      </div>
    );
  }

  return <>{children}</>;
}

