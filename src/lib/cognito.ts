import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { getEnvConfig } from './env';

// Amplifyの設定
// クライアントサイドでPublic Clientを使用して認証を行います
export const configureAmplify = () => {
  if (typeof window === 'undefined') {
    // サーバーサイドでは設定しない
    return;
  }

  // .envファイルが存在する場合はそこから、存在しない場合は環境変数から値を取得
  const config = getEnvConfig();

  // Amplify v6では、regionはuserPoolIdから自動的に推測されます
  // Public Client（シークレットなし）を使用してクライアントサイドで直接認証
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId, // Public Client ID
        loginWith: {
          email: true,
        },
      }
    }
  }, { 
    ssr: true,
  });
};

// サーバーサイドAPI経由でログインする関数
const loginViaServerAPI = async (email: string, password: string) => {
  console.log('サーバーサイドAPI経由でログインを試みます...');
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    
    if (result.success && result.tokens) {
      // トークンをlocalStorageに保存（Amplifyが自動的に読み込む）
      if (typeof window !== 'undefined') {
        try {
          const config = getEnvConfig();
          // Amplify v6では、トークンは自動的に管理されますが、
          // サーバーサイドAPI経由の場合は手動で設定する必要があります
          const storageKey = `CognitoIdentityServiceProvider.${config.userPoolClientId}`;
          localStorage.setItem(`${storageKey}.LastAuthUser`, email);
          localStorage.setItem(`${storageKey}.${email}.accessToken`, result.tokens.accessToken);
          localStorage.setItem(`${storageKey}.${email}.idToken`, result.tokens.idToken);
          localStorage.setItem(`${storageKey}.${email}.refreshToken`, result.tokens.refreshToken);
          
          // トークンの有効期限を保存
          if (result.tokens.expiresIn) {
            const expiresAt = Date.now() + (result.tokens.expiresIn * 1000);
            localStorage.setItem(`${storageKey}.${email}.clockDrift`, '0');
            localStorage.setItem(`${storageKey}.${email}.tokenExpiration`, expiresAt.toString());
          }
          
          // 少し待ってからAmplifyのセッションを再取得して認証状態を更新
          setTimeout(async () => {
            try {
              await fetchAuthSession({ forceRefresh: true });
            } catch (sessionError) {
              console.error('セッションの更新に失敗しました:', sessionError);
            }
          }, 100);
        } catch (storageError) {
          console.error('トークンの保存に失敗しました:', storageError);
        }
      }
      return { success: true, tokens: result.tokens };
    }
    
    return { success: false, error: result.error || 'ログインに失敗しました' };
  } catch (apiError: any) {
    console.error('サーバーサイドAPI経由のログインに失敗:', apiError);
    return { 
      success: false, 
      error: 'CLIENT_SECRETが設定されているため、サーバーサイドAPI経由でログインする必要があります。.env.localにCOGNITO_USER_POOL_CLIENT_SECRETを設定してください。または、User Pool ClientをPublic Client（シークレットなし）に変更してください。' 
    };
  }
};

// ログイン関数
// まずPublic Clientを使用してクライアントサイドで直接ログインを試みます
// 失敗した場合（SECRET_HASHエラーなど）は、自動的にサーバーサイドAPI経由でログインします
export const login = async (email: string, password: string) => {
  try {
    // Public Client（シークレットなし）を使用してクライアントサイドで直接ログインを試みる
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password: password,
    });
    
    if (isSignedIn) {
      return { success: true };
    }
    
    // MFAなどの追加ステップが必要な場合
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' || 
        nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE' ||
        nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      return { success: false, error: '追加の認証が必要です', nextStep };
    }
    
    return { success: false, error: 'ログインに失敗しました' };
  } catch (error: any) {
    console.error('ログインエラー:', error);
    
    // エラーメッセージ全体を取得（ネストされたエラーも含む）
    const errorMessage = error.message || error.toString() || '';
    const errorName = error.name || '';
    const errorStack = error.stack || '';
    const fullErrorText = `${errorName} ${errorMessage} ${errorStack}`.toLowerCase();
    
    // SECRET_HASHエラーまたはNotAuthorizedException（シークレット設定エラー）の場合、
    // Confidential Clientを使用してサーバーサイドAPI経由でログインを試みる
    const isSecretHashError = 
      fullErrorText.includes('secret_hash') ||
      fullErrorText.includes('secret') ||
      fullErrorText.includes('notauthorizedexception') ||
      fullErrorText.includes('configured with secret') ||
      fullErrorText.includes('was not received') ||
      fullErrorText.includes('client') && fullErrorText.includes('secret');
    
    if (isSecretHashError) {
      console.log('CLIENT_SECRETが必要なエラーを検出。Confidential Clientを使用してサーバーサイドAPI経由でログインを試みます...');
      console.log('エラー詳細:', { name: errorName, message: errorMessage });
      
      return await loginViaServerAPI(email, password);
    }
    
    // その他のエラーも、Confidential Clientが設定されている場合はサーバーサイドAPI経由で試してみる
    const config = getEnvConfig();
    if (config.serverClientId && config.clientSecret) {
      console.log('クライアントサイドログインに失敗。Confidential Clientを使用してサーバーサイドAPI経由でログインを試みます...');
      const serverResult = await loginViaServerAPI(email, password);
      
      // サーバーサイドAPI経由でも失敗した場合は、元のエラーメッセージを返す
      if (!serverResult.success) {
        const finalErrorMessage = errorMessage || 'ログインに失敗しました';
        return { success: false, error: finalErrorMessage };
      }
      
      return serverResult;
    }
    
    // Confidential Clientが設定されていない場合は、元のエラーメッセージを返す
    const finalErrorMessage = errorMessage || 'ログインに失敗しました';
    return { success: false, error: finalErrorMessage };
  }
};

// ログアウト関数
export const logout = async () => {
  try {
    // Amplifyのログアウトを実行
    await signOut();
    
    // localStorageからもトークンを削除（念のため）
    if (typeof window !== 'undefined') {
      try {
        const config = getEnvConfig();
        const storageKey = `CognitoIdentityServiceProvider.${config.userPoolClientId}`;
        const lastAuthUser = localStorage.getItem(`${storageKey}.LastAuthUser`);
        
        if (lastAuthUser) {
          localStorage.removeItem(`${storageKey}.LastAuthUser`);
          localStorage.removeItem(`${storageKey}.${lastAuthUser}.accessToken`);
          localStorage.removeItem(`${storageKey}.${lastAuthUser}.idToken`);
          localStorage.removeItem(`${storageKey}.${lastAuthUser}.refreshToken`);
          localStorage.removeItem(`${storageKey}.${lastAuthUser}.clockDrift`);
          localStorage.removeItem(`${storageKey}.${lastAuthUser}.tokenExpiration`);
        }
        
        // すべてのCognito関連のキーを削除
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(storageKey)) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.error('ストレージのクリアに失敗しました:', storageError);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('ログアウトエラー:', error);
    return { success: false, error: error.message || 'ログアウトに失敗しました' };
  }
};

// 現在のユーザーを取得
export const getCurrentUserInfo = async () => {
  try {
    const user = await getCurrentUser();
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// 認証セッションを取得
export const getAuthSession = async () => {
  try {
    const session = await fetchAuthSession();
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// 認証状態をチェック
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await fetchAuthSession();
    return session.tokens !== undefined;
  } catch {
    return false;
  }
};

