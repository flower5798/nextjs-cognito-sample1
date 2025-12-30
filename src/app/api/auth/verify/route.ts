import { NextRequest, NextResponse } from 'next/server';
import { verifyCognitoToken } from '@/lib/jwt-verify';

// Cloudflare Pages用にEdge Runtimeを指定
export const runtime = 'edge';

/**
 * トークン検証API
 * Cookieからトークンを取得し、署名を検証します
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;
    const idToken = request.cookies.get('idToken')?.value;
    
    if (!accessToken || !idToken) {
      return NextResponse.json(
        { valid: false, error: '認証トークンがありません' },
        { status: 401 }
      );
    }
    
    // アクセストークンを検証
    const accessResult = await verifyCognitoToken(accessToken, 'access');
    if (!accessResult.valid) {
      return NextResponse.json(
        { valid: false, error: accessResult.error },
        { status: 401 }
      );
    }
    
    // IDトークンを検証
    const idResult = await verifyCognitoToken(idToken, 'id');
    if (!idResult.valid) {
      return NextResponse.json(
        { valid: false, error: idResult.error },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      user: {
        sub: accessResult.payload?.sub,
        groups: idResult.payload?.['cognito:groups'] || [],
      },
    });
  } catch (error) {
    console.error('トークン検証エラー:', error);
    return NextResponse.json(
      { valid: false, error: 'トークンの検証に失敗しました' },
      { status: 500 }
    );
  }
}

