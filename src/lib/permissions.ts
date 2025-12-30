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
 * ユーザーが複数の権限のいずれかを持っているかチェック
 */
export const hasAnyPermission = async (permissions: Permission[]): Promise<boolean> => {
  for (const permission of permissions) {
    if (await hasPermission(permission)) {
      return true;
    }
  }
  return false;
};

/**
 * ユーザーがすべての権限を持っているかチェック
 */
export const hasAllPermissions = async (permissions: Permission[]): Promise<boolean> => {
  for (const permission of permissions) {
    if (!(await hasPermission(permission))) {
      return false;
    }
  }
  return true;
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

