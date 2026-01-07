import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokensFromCookies } from '@/lib/auth-cookies';
import { getEnvConfig } from '@/lib/env';

// Cloudflare Pages用にEdge Runtimeを指定
export const runtime = 'edge';

/**
 * コンテンツ取得API
 * サーバーサイドで外部APIにリクエストを送信します
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> | { contentId: string } }
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
      console.error('認証トークンが取得できませんでした');
      const allCookies = request.cookies.getAll();
      console.error('利用可能なCookie:', allCookies.map(c => c.name));
      return NextResponse.json(
        { success: false, error: '認証トークンがありません' },
        { status: 401 }
      );
    }

    // トークンのペイロードを確認（デバッグ用）
    try {
      const tokenParts = idToken.split('.');
      if (tokenParts.length === 3) {
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = atob(base64);
        const payload = JSON.parse(jsonPayload);
        
        const config = getEnvConfig();
        console.log('使用するIDトークンのペイロード:', {
          aud: payload.aud,
          client_id: payload.aud,
          token_use: payload.token_use,
          exp: payload.exp,
          expDate: new Date(payload.exp * 1000).toISOString(),
          iss: payload.iss,
          sub: payload.sub,
          userPoolId: config.userPoolId,
          serverClientId: config.serverClientId,
        });
      }
    } catch (e) {
      console.error('トークンの解析エラー:', e);
    }

    console.log('IDトークン取得成功:', {
      idTokenLength: idToken.length,
      idTokenPrefix: idToken.substring(0, 20) + '...',
    });

    // 外部APIにリクエストを送信
    const apiUrl = `https://tq6jjrlyuf.execute-api.ap-northeast-1.amazonaws.com/content/${contentId}.md`;
    console.log('外部APIにリクエスト送信:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('外部APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
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
      
      console.error('外部APIエラー:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        errorJson,
      });
      
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
    console.error('コンテンツ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'コンテンツの取得に失敗しました' },
      { status: 500 }
    );
  }
}

