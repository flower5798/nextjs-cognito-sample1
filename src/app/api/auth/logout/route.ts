import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookies';

// Cloudflare Pages用にEdge Runtimeを指定
export const runtime = 'edge';

/**
 * ログアウトAPI
 * HttpOnly Cookieから認証トークンを削除します
 */
export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    
    // HttpOnly Cookieを削除
    clearAuthCookies(response);
    
    return response;
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return NextResponse.json(
      { success: false, error: 'ログアウトに失敗しました' },
      { status: 500 }
    );
  }
}

