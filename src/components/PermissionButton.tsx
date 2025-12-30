'use client';

import { ReactNode, useEffect, useState } from 'react';
import {
  hasPermission,
  hasPermissionNameOrHigher,
  hasGroupOrHigher,
  Permission,
} from '@/lib/permissions';

interface PermissionButtonProps {
  children: ReactNode;
  // 権限チェック方法1: 定義済みの権限タイプを使用
  requiredPermission?: Permission;
  // 権限チェック方法2: カスタム権限名（文字列）を使用
  requiredPermissionName?: string;
  // 権限チェック方法3: グループ名を使用
  requiredGroupName?: string;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * 権限に基づいてボタンの有効/無効を制御するコンポーネント
 * 
 * 使用例:
 * - 定義済みの権限: <PermissionButton requiredPermission="editor">...</PermissionButton>
 * - カスタム権限名: <PermissionButton requiredPermissionName="content-manager">...</PermissionButton>
 * - グループ名: <PermissionButton requiredGroupName="editors">...</PermissionButton>
 */
export default function PermissionButton({
  children,
  requiredPermission,
  requiredPermissionName,
  requiredGroupName,
  onClick,
  className = 'btn btn-primary',
  disabled: externalDisabled = false,
  disabledMessage,
}: PermissionButtonProps) {
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
      // いずれも指定されていない場合はエラー
      else {
        console.error(
          'PermissionButton: requiredPermission, requiredPermissionName, または requiredGroupName のいずれかを指定してください'
        );
        hasPerm = false;
      }

      setHasAccess(hasPerm);
      setLoading(false);
    };

    checkPermission();
  }, [requiredPermission, requiredPermissionName, requiredGroupName]);

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
            ? disabledMessage ||
              `この操作には${
                requiredPermission ||
                requiredPermissionName ||
                requiredGroupName ||
                '指定された権限'
              }権限（またはそれ以上の権限）が必要です`
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

