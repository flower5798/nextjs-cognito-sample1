import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getEnvConfig } from '@/lib/env';
import { setAuthCookies } from '@/lib/auth-cookies';

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
      // 設定エラーの詳細はログにのみ記録（レスポンスには含めない）
      console.error('設定エラー: CLIENT_SECRETが未設定');
      return NextResponse.json(
        { success: false, error: 'ログインに失敗しました' },
        { status: 500 }
      );
    }

    if (!serverClientId) {
      // 設定エラーの詳細はログにのみ記録（レスポンスには含めない）
      console.error('設定エラー: Server Client IDが未設定');
      return NextResponse.json(
        { success: false, error: 'ログインに失敗しました' },
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
      const tokens = {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        idToken: response.AuthenticationResult.IdToken!,
        expiresIn: response.AuthenticationResult.ExpiresIn,
      };
      
      // レスポンスを作成
      // トークンはHttpOnly Cookieで管理されるが、
      // Amplifyのセッション管理との互換性のためにレスポンスにもトークンを含める
      const jsonResponse = NextResponse.json({
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          expiresIn: tokens.expiresIn,
        },
      });
      
      // HttpOnly Cookieにもトークンを設定（ミドルウェアでの認証用）
      setAuthCookies(jsonResponse, tokens);
      
      return jsonResponse;
    } else {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    // セキュリティ上の理由から、認証エラーは汎用的なメッセージに置き換える
    // 具体的なエラー（パスワード間違い、ユーザー不存在など）を隠す
    const errorName = error.name || '';
    const isAuthError = 
      errorName === 'NotAuthorizedException' ||
      errorName === 'UserNotFoundException' ||
      errorName === 'InvalidPasswordException' ||
      errorName === 'UserNotConfirmedException';
    
    if (isAuthError) {
      // 認証エラーはログに詳細を残さない（ユーザー列挙攻撃対策）
      console.error('ログインAPIエラー: 認証失敗');
      return NextResponse.json(
        { success: false, error: 'メールアドレスまたはパスワードが違います' },
        { status: 401 }
      );
    }
    
    // 認証以外のエラー（設定エラーなど）はエラー名のみログに記録
    console.error('ログインAPIエラー:', errorName || 'UnknownError');
    
    return NextResponse.json(
      { success: false, error: 'ログインに失敗しました' },
      { status: 500 }
    );
  }
}

