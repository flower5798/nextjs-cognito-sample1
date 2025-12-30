import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getEnvConfig } from '@/lib/env';

// Cloudflare Pages用にEdge Runtimeを指定
export const runtime = 'edge';

/**
 * HMAC-SHA256を計算する（Edge Runtime対応）
 */
async function createHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return hashBase64;
}

/**
 * サーバーサイドAPI経由でのログイン
 * Confidential Client（CLIENT_SECRETあり）を使用して認証を行います
 * 
 * このAPIは以下の場合に使用されます：
 * 1. クライアントサイドでのPublic Client認証が失敗した場合（SECRET_HASHエラーなど）
 * 2. Confidential Clientが設定されている場合のフォールバック
 * 
 * 注意: このAPIはサーバーサイドでのみ実行され、CLIENT_SECRETはクライアントに公開されません
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードが必要です' },
        { status: 400 }
      );
    }

    const config = getEnvConfig();

    // サーバーサイド用のClient IDとSecretを使用
    const serverClientId = config.serverClientId || config.userPoolClientId;
    
    if (!config.clientSecret) {
      return NextResponse.json(
        { success: false, error: 'CLIENT_SECRETが設定されていません。サーバーサイド用のConfidential Clientを設定してください。' },
        { status: 500 }
      );
    }

    if (!serverClientId) {
      return NextResponse.json(
        { success: false, error: 'サーバーサイド用のClient IDが設定されていません。COGNITO_USER_POOL_CLIENT_ID_SERVERを設定してください。' },
        { status: 500 }
      );
    }

    // CLIENT_SECRETを使用してHMAC-SHA256でシークレットハッシュを計算（Edge Runtime対応）
    const message = email + serverClientId;
    const secretHash = await createHmacSha256(config.clientSecret, message);

    // Cognito Identity Provider Clientを作成
    const client = new CognitoIdentityProviderClient({
      region: config.region,
    });

    // 認証を開始（サーバーサイド用のConfidential Clientを使用）
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: serverClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash,
      },
    });

    const response = await client.send(command);

    if (response.AuthenticationResult) {
      return NextResponse.json({
        success: true,
        tokens: {
          accessToken: response.AuthenticationResult.AccessToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
          idToken: response.AuthenticationResult.IdToken,
          expiresIn: response.AuthenticationResult.ExpiresIn,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('ログインAPIエラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ログインに失敗しました' },
      { status: 500 }
    );
  }
}

