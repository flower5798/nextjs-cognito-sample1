import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * 認証トークン用のCookie設定
 * HttpOnly, Secure, SameSite属性を設定してセキュリティを強化
 */
interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Cookie設定のデフォルト値
 */
const getCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAge || 3600, // デフォルト1時間
});

/**
 * 認証トークンをHttpOnly Cookieに設定
 * @param response - NextResponseオブジェクト
 * @param tokens - 認証トークン
 */
export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  const maxAge = tokens.expiresIn || 3600;
  
  // アクセストークン
  response.cookies.set('accessToken', tokens.accessToken, {
    ...getCookieOptions(maxAge),
  });
  
  // IDトークン
  response.cookies.set('idToken', tokens.idToken, {
    ...getCookieOptions(maxAge),
  });
  
  // リフレッシュトークン（より長い有効期限）
  if (tokens.refreshToken) {
    response.cookies.set('refreshToken', tokens.refreshToken, {
      ...getCookieOptions(30 * 24 * 3600), // 30日間
    });
  }
}

/**
 * 認証Cookieを削除
 * @param response - NextResponseオブジェクト
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete('accessToken');
  response.cookies.delete('idToken');
  response.cookies.delete('refreshToken');
}

/**
 * サーバーコンポーネントでCookieから認証トークンを取得
 */
export async function getAuthTokensFromCookies(): Promise<AuthTokens | null> {
  const cookieStore = await cookies();
  
  const accessToken = cookieStore.get('accessToken')?.value;
  const idToken = cookieStore.get('idToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;
  
  if (!accessToken || !idToken) {
    return null;
  }
  
  return {
    accessToken,
    idToken,
    refreshToken,
  };
}

/**
 * JWTからペイロードを抽出
 * 注意: これは署名検証を行いません。検証は別途行ってください。
 */
export function extractJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Node.js環境ではBufferを使用
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}



