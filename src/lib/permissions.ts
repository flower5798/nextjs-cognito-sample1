/**
 * 権限管理ユーティリティ
 * AWS Cognito User Groupsを使用して権限を管理します
 */

// 権限の種類を定義
export type Permission = 'admin' | 'editor' | 'viewer' | 'user';

// 権限の階層（数値が大きいほど高い権限）
const PERMISSION_LEVELS: Record<Permission, number> = {
  admin: 100,
  editor: 50,
  viewer: 10,
  user: 1,
};

/**
 * IDトークンからユーザーのグループ（権限）を取得
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const getUserGroups = async (forceRefresh: boolean = false): Promise<string[]> => {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession({ forceRefresh });
    
    if (!session.tokens?.idToken) {
      return [];
    }

    // IDトークンからクレームを取得
    const idToken = session.tokens.idToken;
    const tokenParts = idToken.toString().split('.');
    if (tokenParts.length !== 3) {
      return [];
    }
    
    // ブラウザ環境でも動作するようにbase64デコード
    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);

    // Cognito User Groupsは 'cognito:groups' クレームに含まれる
    const groups = payload['cognito:groups'] || [];
    return Array.isArray(groups) ? groups : [];
  } catch (error) {
    console.error('ユーザーグループの取得に失敗しました:', error);
    return [];
  }
};

/**
 * ユーザーが指定された権限を持っているかチェック
 * @param requiredPermission - 必要な権限
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasPermission = async (
  requiredPermission: Permission,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    const groups = await getUserGroups(forceRefresh);
    
    // グループ名を権限として扱う（例: 'admin' グループ = 'admin' 権限）
    const userPermissions = groups.map(group => group.toLowerCase()) as Permission[];
    
    // 直接的な権限チェック
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // 階層的な権限チェック（より高い権限を持っている場合も許可）
    const requiredLevel = PERMISSION_LEVELS[requiredPermission];
    const userMaxLevel = Math.max(
      ...userPermissions.map(perm => PERMISSION_LEVELS[perm] || 0),
      0
    );

    return userMaxLevel >= requiredLevel;
  } catch (error) {
    console.error('権限チェックに失敗しました:', error);
    return false;
  }
};

/**
 * ユーザーが指定されたグループに属しているかチェック
 * @param groupName - グループ名
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasGroup = async (
  groupName: string,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    const groups = await getUserGroups(forceRefresh);
    return groups.some(group => group.toLowerCase() === groupName.toLowerCase());
  } catch (error) {
    console.error('グループチェックに失敗しました:', error);
    return false;
  }
};

/**
 * ユーザーが指定された権限以上を持っているかチェック
 * 例: hasPermissionOrHigher('editor') → editorまたはadmin権限を持っている場合にtrue
 * @param requiredPermission - 必要な権限（この権限以上が必要）
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasPermissionOrHigher = async (
  requiredPermission: Permission,
  forceRefresh: boolean = false
): Promise<boolean> => {
  // hasPermissionは既に階層的なチェックを行っているので、そのまま使用
  return await hasPermission(requiredPermission, forceRefresh);
};

/**
 * ユーザーが特定のグループ名を持っているか、またはより高い権限を持っているかチェック
 * 例: hasGroupOrHigher('editor') → 'editor'グループに属しているか、'admin'グループに属している場合にtrue
 * @param groupName - グループ名（権限名として扱われる）
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasGroupOrHigher = async (
  groupName: string,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    const groups = await getUserGroups(forceRefresh);
    const normalizedGroupName = groupName.toLowerCase();
    
    // グループ名を権限として扱う
    const groupAsPermission = normalizedGroupName as Permission;
    
    // 直接的なグループチェック
    if (groups.some(group => group.toLowerCase() === normalizedGroupName)) {
      return true;
    }
    
    // 階層的な権限チェック（より高い権限を持っている場合も許可）
    if (PERMISSION_LEVELS[groupAsPermission] !== undefined) {
      const requiredLevel = PERMISSION_LEVELS[groupAsPermission];
      const userPermissions = groups.map(group => group.toLowerCase()) as Permission[];
      const userMaxLevel = Math.max(
        ...userPermissions.map(perm => PERMISSION_LEVELS[perm] || 0),
        0
      );
      
      return userMaxLevel >= requiredLevel;
    }
    
    // 権限として認識されないグループ名の場合は、直接的なマッチのみ
    return false;
  } catch (error) {
    console.error('グループ/権限チェックに失敗しました:', error);
    return false;
  }
};

/**
 * ユーザーが特定の権限名（文字列）を持っているか、またはより高い権限を持っているかチェック
 * カスタム権限名にも対応
 * 
 * カスタム権限名を使用する場合の手順:
 * 1. AWS Cognito User Poolで新しいUser Groupを作成（グループ名 = カスタム権限名）
 * 2. ユーザーをそのグループに追加
 * 3. この関数でカスタム権限名を指定してチェック
 * 
 * @param permissionName - 権限名（文字列）。Cognito User Groupsのグループ名と一致させる
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasPermissionNameOrHigher = async (
  permissionName: string,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    const groups = await getUserGroups(forceRefresh);
    const normalizedPermissionName = permissionName.toLowerCase();
    
    // 直接的な権限名チェック（グループ名と一致するか）
    if (groups.some(group => group.toLowerCase() === normalizedPermissionName)) {
      return true;
    }
    
    // 定義済みの権限としてチェック（階層的なチェック）
    const permission = normalizedPermissionName as Permission;
    if (PERMISSION_LEVELS[permission] !== undefined) {
      return await hasPermission(permission, forceRefresh);
    }
    
    // カスタム権限名の場合、直接的なマッチのみ
    // 注意: カスタム権限名に階層を設定する場合は、PERMISSION_LEVELSに追加してください
    return false;
  } catch (error) {
    console.error('権限名チェックに失敗しました:', error);
    return false;
  }
};

/**
 * ユーザーが複数の権限のいずれかを持っているかチェック
 * @param permissions - チェックする権限の配列
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasAnyPermission = async (
  permissions: Permission[],
  forceRefresh: boolean = false
): Promise<boolean> => {
  for (const permission of permissions) {
    if (await hasPermission(permission, forceRefresh)) {
      return true;
    }
  }
  return false;
};

/**
 * ユーザーがすべての権限を持っているかチェック
 * @param permissions - チェックする権限の配列
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasAllPermissions = async (
  permissions: Permission[],
  forceRefresh: boolean = false
): Promise<boolean> => {
  for (const permission of permissions) {
    if (!(await hasPermission(permission, forceRefresh))) {
      return false;
    }
  }
  return true;
};

/**
 * ユーザーが特定の権限名のいずれかを持っているか、またはより高い権限を持っているかチェック
 * @param permissionNames - チェックする権限名の配列（文字列）
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasAnyPermissionNameOrHigher = async (
  permissionNames: string[],
  forceRefresh: boolean = false
): Promise<boolean> => {
  for (const permissionName of permissionNames) {
    if (await hasPermissionNameOrHigher(permissionName, forceRefresh)) {
      return true;
    }
  }
  return false;
};

/**
 * ユーザーが複数の権限名をすべて持っているか、またはより高い権限を持っているかチェック
 * 例: hasAllPermissionNamesOrHigher(['editor', 'content-manager']) 
 *     → editor権限 AND content-managerグループに属している、またはadmin権限を持っている
 * 
 * @param permissionNames - チェックする権限名の配列（文字列）
 * @param higherPermission - より高い権限（この権限を持っている場合はすべての権限を持っているとみなす）
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const hasAllPermissionNamesOrHigher = async (
  permissionNames: string[],
  higherPermission?: Permission,
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    // より高い権限を持っている場合は、すべての権限を持っているとみなす
    if (higherPermission) {
      const hasHigher = await hasPermission(higherPermission, forceRefresh);
      if (hasHigher) {
        return true;
      }
    }

    // すべての権限名を持っているかチェック
    const groups = await getUserGroups(forceRefresh);
    const normalizedGroups = groups.map(g => g.toLowerCase());
    
    for (const permissionName of permissionNames) {
      const normalizedPermissionName = permissionName.toLowerCase();
      
      // 直接的なグループチェック
      if (!normalizedGroups.includes(normalizedPermissionName)) {
        // 定義済みの権限タイプとしてチェック
        const permission = normalizedPermissionName as Permission;
        if (PERMISSION_LEVELS[permission] !== undefined) {
          // 階層的なチェック（より高い権限を持っている場合も許可）
          const requiredLevel = PERMISSION_LEVELS[permission];
          const userMaxLevel = Math.max(
            ...normalizedGroups.map(perm => PERMISSION_LEVELS[perm as Permission] || 0),
            0
          );
          
          if (userMaxLevel < requiredLevel) {
            return false;
          }
        } else {
          // カスタム権限名の場合、直接的なマッチが必要
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('権限チェックに失敗しました:', error);
    return false;
  }
};

/**
 * 現在のユーザーの権限情報を取得
 * @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
 */
export const getUserPermissions = async (
  forceRefresh: boolean = false
): Promise<{
  groups: string[];
  permissions: Permission[];
  maxLevel: number;
}> => {
  try {
    const groups = await getUserGroups(forceRefresh);
    const permissions = groups.map(group => group.toLowerCase()) as Permission[];
    const maxLevel = Math.max(
      ...permissions.map(perm => PERMISSION_LEVELS[perm] || 0),
      0
    );

    return {
      groups,
      permissions,
      maxLevel,
    };
  } catch (error) {
    console.error('権限情報の取得に失敗しました:', error);
    return {
      groups: [],
      permissions: [],
      maxLevel: 0,
    };
  }
};

