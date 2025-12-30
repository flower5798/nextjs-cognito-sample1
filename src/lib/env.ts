interface EnvConfig {
  userPoolId: string;
  userPoolClientId: string; // クライアントサイド用（Public Client）
  serverClientId?: string; // サーバーサイド用（Confidential Client）
  region: string;
  clientSecret?: string; // サーバーサイドでのみ使用
}

/**
 * 環境変数から設定を取得する
 * 
 * Next.jsでは、.envファイルは自動的に読み込まれ、process.envに設定されます。
 * Edge Runtimeでも環境変数は利用可能です（Cloudflare Pagesでは環境変数として設定）。
 * 
 * 注意: CLIENT_SECRETは機密情報のため、NEXT_PUBLIC_プレフィックスを付けないでください。
 * CLIENT_SECRETはサーバーサイドでのみ使用されます。
 */
export const getEnvConfig = (): EnvConfig => {
  // 環境変数から値を取得
  // Next.jsでは、process.envに既に.envファイルの値が読み込まれている
  // Cloudflare Pagesでは、環境変数が直接設定される
  
  // クライアントサイドでも使用可能な環境変数（NEXT_PUBLIC_プレフィックス付き）
  const userPoolId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    '';

  // クライアントサイド用のClient ID（Public Client - シークレットなし）
  const userPoolClientId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ||
    '';

  const region =
    process.env.NEXT_PUBLIC_COGNITO_REGION ||
    'ap-northeast-1';

  // サーバーサイドでのみ使用可能な環境変数（NEXT_PUBLIC_プレフィックスなし）
  // サーバーサイド用のClient ID（Confidential Client - シークレットあり）
  const serverClientId =
    process.env.COGNITO_USER_POOL_CLIENT_ID_SERVER ||
    undefined;

  // CLIENT_SECRETは機密情報のため、クライアントサイドに公開されません
  const clientSecret =
    process.env.COGNITO_USER_POOL_CLIENT_SECRET ||
    undefined;

  return {
    userPoolId,
    userPoolClientId, // クライアントサイド用（Public Client）
    serverClientId, // サーバーサイド用（Confidential Client）
    region,
    clientSecret, // サーバーサイドでのみ使用
  };
};

