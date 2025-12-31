import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth-cookies';

// Cloudflare Pages用にEdge Runtimeを指定
export const runtime = 'edge';

/**
 * Amplify認証成功後にHttpOnly Cookieを設定するAPI
 * クライアントサイドでAmplifyのsignInが成功した場合に呼び出され、
 * ミドルウェアでの認証用にHttpOnly Cookieを設定します
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, idToken, refreshToken, expiresIn } = await request.json();

    if (!accessToken || !idToken) {
      return NextResponse.json(
        { success: false, error: 'トークンが必要です' },
        { status: 400 }
      );
    }

    const tokens = {
      accessToken,
      idToken,
      refreshToken,
      expiresIn,
    };

    const response = NextResponse.json({ success: true });
    
    // HttpOnly Cookieにトークンを設定
    setAuthCookies(response, tokens);

    return response;
  } catch (error) {
    console.error('Cookie設定エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Cookieの設定に失敗しました' },
      { status: 500 }
    );
  }
}

