interface EnvConfig {
  userPoolId: string;
  userPoolClientId: string; // クライアントサイド用（Public Client）
  serverClientId?: string; // サーバーサイド用（Confidential Client）
  region: string;
  clientSecret?: string; // サーバーサイドでのみ使用
}

/**
 * .envファイルが存在する場合はそこから値を取得し、
 * 存在しない場合は環境変数から値を取得する
 * 
 * Next.jsでは、.envファイルは自動的に読み込まれ、process.envに設定されます。
 * この関数は、明示的に.envファイルの存在を確認し、存在する場合はそこから読み込みます。
 * 
 * 注意: CLIENT_SECRETは機密情報のため、NEXT_PUBLIC_プレフィックスを付けないでください。
 * CLIENT_SECRETはサーバーサイドでのみ使用されます。
 */
export const getEnvConfig = (): EnvConfig => {
  let envVars: Record<string, string> = {};

  // サーバーサイドの場合のみ、.envファイルを明示的に読み込む
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const envPath = path.join(process.cwd(), '.env');
      const envLocalPath = path.join(process.cwd(), '.env.local');

      // .env.localを優先的に読み込む（Next.jsの標準動作に合わせる）
      if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf-8');
        envVars = parseEnvFile(envContent);
      } else if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envVars = parseEnvFile(envContent);
      }
    } catch (error) {
      // fsモジュールが利用できない場合は環境変数から取得
      console.warn('環境変数ファイルの読み込みに失敗しました。環境変数から取得します。', error);
    }
  }

  // 環境変数から値を取得（.envファイルの値より優先）
  // Next.jsでは、process.envに既に.envファイルの値が読み込まれている
  // ただし、明示的に.envファイルから読み込んだ値もフォールバックとして使用
  
  // クライアントサイドでも使用可能な環境変数（NEXT_PUBLIC_プレフィックス付き）
  const userPoolId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    envVars.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    '';

  // クライアントサイド用のClient ID（Public Client - シークレットなし）
  const userPoolClientId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ||
    envVars.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ||
    '';

  const region =
    process.env.NEXT_PUBLIC_COGNITO_REGION ||
    envVars.NEXT_PUBLIC_COGNITO_REGION ||
    'ap-northeast-1';

  // サーバーサイドでのみ使用可能な環境変数（NEXT_PUBLIC_プレフィックスなし）
  // サーバーサイド用のClient ID（Confidential Client - シークレットあり）
  const serverClientId =
    process.env.COGNITO_USER_POOL_CLIENT_ID_SERVER ||
    envVars.COGNITO_USER_POOL_CLIENT_ID_SERVER ||
    undefined;

  // CLIENT_SECRETは機密情報のため、クライアントサイドに公開されません
  const clientSecret =
    process.env.COGNITO_USER_POOL_CLIENT_SECRET ||
    envVars.COGNITO_USER_POOL_CLIENT_SECRET ||
    undefined;

  return {
    userPoolId,
    userPoolClientId, // クライアントサイド用（Public Client）
    serverClientId, // サーバーサイド用（Confidential Client）
    region,
    clientSecret, // サーバーサイドでのみ使用
  };
};

/**
 * .envファイルの内容をパースする
 */
const parseEnvFile = (content: string): Record<string, string> => {
  const envVars: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 空行やコメント行をスキップ
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // KEY=VALUE形式をパース
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();

    // クォートを削除
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    envVars[key] = value;
  }

  return envVars;
};
