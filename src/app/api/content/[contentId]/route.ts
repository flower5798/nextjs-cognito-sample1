import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokensFromCookies } from '@/lib/auth-cookies';

// Cloudflare Pages用にEdge Runtimeを指定
export const runtime = 'edge';

/**
 * コンテンツ取得API
 * サーバーサイドで外部APIにリクエストを送信します
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { contentId } = resolvedParams;

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'contentIdが必要です' },
        { status: 400 }
      );
    }

    // CookieからIDトークンを取得
    // ログイン時にサーバーサイドAPIで取得したConfidential ClientのIDトークンを使用
    let idToken: string | undefined;
    
    // まずrequest.cookiesから取得を試す
    idToken = request.cookies.get('idToken')?.value;
    
    // request.cookiesから取得できなかった場合、getAuthTokensFromCookies()を試す
    if (!idToken) {
      const tokens = await getAuthTokensFromCookies();
      idToken = tokens?.idToken;
    }
    
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: '認証トークンがありません' },
        { status: 401 }
      );
    }

    // 外部APIにリクエストを送信
    const apiUrl = `https://tq6jjrlyuf.execute-api.ap-northeast-1.amazonaws.com/content/${contentId}.md`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'エラーレスポンスの読み取りに失敗');
      const errorJson = (() => {
        try {
          return JSON.parse(errorText);
        } catch {
          return { message: errorText };
        }
      })();
      
      return NextResponse.json(
        { 
          success: false, 
          error: `APIリクエストに失敗しました: ${response.status} ${response.statusText}`,
          details: errorJson,
        },
        { status: response.status }
      );
    }

    const data = await response.text();
    
    return NextResponse.json({
      success: true,
      data: data,
      statusCode: response.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'コンテンツの取得に失敗しました' },
      { status: 500 }
    );
  }
}

