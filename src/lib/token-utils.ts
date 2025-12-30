/**
 * トークン検証とデコードのユーティリティ
 * AWS Cognito IDトークンの検証とデコードを行います
 */

interface DecodedToken {
  sub: string; // ユーザーID
  email?: string;
  'cognito:groups'?: string[];
  exp?: number; // 有効期限（Unixタイムスタンプ）
  iat?: number; // 発行時刻（Unixタイムスタンプ）
  [key: string]: any;
}

/**
 * JWTトークンをデコード（検証なし）
 * 注意: 本番環境では完全なJWT検証（署名検証など）を推奨します
 * @param token - JWTトークン文字列
 * @returns デコードされたトークンのペイロード
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Base64URLデコード
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Node.js環境とブラウザ環境の両方に対応
    let jsonPayload: string;
    if (typeof Buffer !== 'undefined') {
      // Node.js環境
      jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    } else {
      // ブラウザ環境
      jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('トークンのデコードに失敗しました:', error);
    return null;
  }
}

/**
 * トークンの有効期限をチェック
 * @param decodedToken - デコードされたトークン
 * @returns トークンが有効な場合true
 */
export function isTokenValid(decodedToken: DecodedToken | null): boolean {
  if (!decodedToken) {
    return false;
  }

  // expクレームが存在する場合、有効期限をチェック
  if (decodedToken.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < now) {
      return false;
    }
  }

  // subクレーム（ユーザーID）が存在することを確認
  if (!decodedToken.sub) {
    return false;
  }

  return true;
}

/**
 * AuthorizationヘッダーからIDトークンを取得
 * @param authHeader - Authorizationヘッダーの値（例: "Bearer <token>"）
 * @returns IDトークン、またはnull
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Bearerトークンの形式をチェック
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * AuthorizationヘッダーからユーザーIDを取得
 * @param authHeader - Authorizationヘッダーの値
 * @returns ユーザーID（subクレーム）、またはnull
 */
export function getUserIdFromToken(authHeader: string | null): string | null {
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return null;
  }

  const decodedToken = decodeJWT(token);
  if (!isTokenValid(decodedToken)) {
    return null;
  }

  return decodedToken.sub || null;
}

