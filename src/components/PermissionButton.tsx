'use client';

import { ReactNode, useEffect, useState } from 'react';
import { hasPermission, Permission } from '@/lib/permissions';

interface PermissionButtonProps {
  children: ReactNode;
  requiredPermission: Permission;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * 権限に基づいてボタンの有効/無効を制御するコンポーネント
 */
export default function PermissionButton({
  children,
  requiredPermission,
  onClick,
  className = 'btn btn-primary',
  disabled: externalDisabled = false,
  disabledMessage,
}: PermissionButtonProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      const hasPerm = await hasPermission(requiredPermission);
      setHasAccess(hasPerm);
      setLoading(false);
    };

    checkPermission();
  }, [requiredPermission]);

  const isDisabled = externalDisabled || !hasAccess || loading;

  const handleClick = async () => {
    if (!isDisabled) {
      await onClick();
    }
  };

  if (loading) {
    return (
      <button className={className} disabled>
        読み込み中...
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={className}
        onClick={handleClick}
        disabled={isDisabled}
        title={
          !hasAccess
            ? disabledMessage || `この操作には${requiredPermission}権限が必要です`
            : undefined
        }
      >
        {children}
      </button>
      {!hasAccess && disabledMessage && (
        <div
          style={{
            fontSize: '0.875rem',
            color: '#dc3545',
            marginTop: '0.5rem',
          }}
        >
          {disabledMessage}
        </div>
      )}
    </div>
  );
}

