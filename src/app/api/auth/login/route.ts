import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getEnvConfig } from '@/lib/env';
import crypto from 'crypto';

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

    // CLIENT_SECRETを使用してHMAC-SHA256でシークレットハッシュを計算
    const message = email + serverClientId;
    const hmac = crypto.createHmac('sha256', config.clientSecret);
    hmac.update(message);
    const secretHash = hmac.digest('base64');

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

