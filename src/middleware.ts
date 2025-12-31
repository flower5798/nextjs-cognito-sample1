import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 認証が必要なパスを定義
 */
const PROTECTED_PATHS = ['/dashboard', '/profile', '/admin'];

/**
 * 認証済みの場合にリダイレクトするパスを定義（ログインページなど）
 */
const AUTH_REDIRECT_PATHS = ['/login'];

/**
 * Base64URLをデコード（Edge Runtime対応）
 */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(base64 + padding);
}

/**
 * JWTペイロードを取得
 */
function getJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

/**
 * JWTの有効期限と基本的な検証を行う
 * 注意: 完全な署名検証はサーバーサイドAPIで行います
 */
function validateToken(token: string): { valid: boolean; payload?: Record<string, unknown>; error?: string } {
  try {
    const payload = getJwtPayload(token);
    if (!payload) {
      return { valid: false, error: '無効なトークン形式' };
    }
    
    // 有効期限をチェック
    const exp = payload.exp as number | undefined;
    if (exp) {
      const now = Math.floor(Date.now() / 1000);
      if (exp < now) {
        return { valid: false, error: 'トークンの有効期限切れ' };
      }
    }
    
    // issuerのフォーマットをチェック（Cognitoのissuerパターン）
    const iss = payload.iss as string | undefined;
    if (iss && !iss.includes('cognito-idp')) {
      return { valid: false, error: '無効な発行者' };
    }
    
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'トークン検証エラー' };
  }
}

/**
 * 認証ミドルウェア
 * 保護されたルートへのアクセスをサーバーサイドでチェックします
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 保護されたパスかどうかをチェック
  const isProtectedPath = PROTECTED_PATHS.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );
  
  // 認証済みの場合にリダイレクトするパスかどうかをチェック
  const isAuthRedirectPath = AUTH_REDIRECT_PATHS.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );
  
  // 認証済みの場合にログインページからダッシュボードにリダイレクト
  if (isAuthRedirectPath) {
    const accessToken = request.cookies.get('accessToken')?.value;
    const idToken = request.cookies.get('idToken')?.value;
    
    if (accessToken && idToken) {
      // トークンが存在する場合は有効性をチェック
      const accessValidation = validateToken(accessToken);
      const idValidation = validateToken(idToken);
      
      if (accessValidation.valid && idValidation.valid) {
        // 認証済みの場合はダッシュボードにリダイレクト
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    return NextResponse.next();
  }
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }
  
  // HttpOnly Cookieからアクセストークンを取得
  const accessToken = request.cookies.get('accessToken')?.value;
  const idToken = request.cookies.get('idToken')?.value;
  
  // トークンが存在しない場合はログインページにリダイレクト
  if (!accessToken || !idToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // トークンを検証
  const accessValidation = validateToken(accessToken);
  const idValidation = validateToken(idToken);
  
  if (!accessValidation.valid || !idValidation.valid) {
    // トークンが無効または期限切れの場合、Cookieを削除してログインページにリダイレクト
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('accessToken');
    response.cookies.delete('idToken');
    response.cookies.delete('refreshToken');
    return response;
  }
  
  // リクエストヘッダーにユーザー情報を追加（サーバーコンポーネントで使用可能）
  const requestHeaders = new Headers(request.headers);
  if (idValidation.payload) {
    const groups = idValidation.payload['cognito:groups'];
    if (Array.isArray(groups)) {
      requestHeaders.set('x-user-groups', JSON.stringify(groups));
    }
  }
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * ミドルウェアが適用されるパスを定義
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login/:path*',
    '/login',
  ],
};

