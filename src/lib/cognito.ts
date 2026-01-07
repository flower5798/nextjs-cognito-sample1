import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn, updatePassword, resetPassword, confirmResetPassword, sendUserAttributeVerificationCode, confirmUserAttribute, fetchUserAttributes } from 'aws-amplify/auth';
import { getEnvConfig } from './env';

// Amplifyの設定
// クライアントサイドでPublic Clientを使用して認証を行います
// Amplifyが既に設定されているかチェック
let isAmplifyConfigured = false;

export const configureAmplify = () => {
  if (typeof window === 'undefined') {
    // サーバーサイドでは設定しない
    return;
  }

  // 既に設定されている場合はスキップ
  if (isAmplifyConfigured) {
    return;
  }

  // .envファイルが存在する場合はそこから、存在しない場合は環境変数から値を取得
  const config = getEnvConfig();

  // 設定値の検証
  if (!config.userPoolId || !config.userPoolClientId) {
    console.error('❌ configureAmplify: 設定値が不足しています', config);
    return;
  }

  // Amplify v6では、regionはuserPoolIdから自動的に推測されます
  // Public Client（シークレットなし）を使用してクライアントサイドで直接認証
  try {
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
    
    isAmplifyConfigured = true;
  } catch (error) {
    console.error('❌ configureAmplify: 設定に失敗しました', error);
  }
};

// 認証エラーかどうかを判定する関数
const isAuthenticationError = (errorName: string, errorMessage: string): boolean => {
  const authErrorNames = [
    'NotAuthorizedException',
    'UserNotFoundException', 
    'InvalidPasswordException',
    'UserNotConfirmedException'
  ];
  
  const authErrorMessages = [
    'incorrect username or password',
    'user does not exist',
    'password attempts exceeded',
    'user is not confirmed'
  ];
  
  const lowerMessage = errorMessage.toLowerCase();
  
  return authErrorNames.includes(errorName) ||
         authErrorMessages.some(msg => lowerMessage.includes(msg));
};

// 汎用的な認証エラーメッセージ（セキュリティのため）
const GENERIC_AUTH_ERROR = 'メールアドレスまたはパスワードが違います';

// サーバーサイドAPI経由でログインする関数
// トークンはHttpOnly Cookieとレスポンスの両方で返される
// Amplifyのセッション管理との互換性のため、localStorageにも保存する
const loginViaServerAPI = async (email: string, password: string) => {
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Cookieを受け取るために必要
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    
    if (result.success && result.tokens) {
      // サーバーサイドAPIは既にCookieにConfidential Clientのトークンを設定している
      // Public Clientのトークンは既にlocalStorageに保存されている（Amplifyの機能用）
      // 両方のトークンを保持することで、用途に応じて使い分けできる
      return { success: true };
    }
    
    // サーバーからのエラーをそのまま返す（サーバー側で既にサニタイズ済み）
    return { success: false, error: result.error || 'ログインに失敗しました' };
  } catch (fetchError) {
    // ネットワークエラーなどの場合
    console.error('ログインAPIエラー:', fetchError);
    return { 
      success: false, 
      error: 'ログインに失敗しました。ネットワーク接続を確認してください。' 
    };
  }
};

// ログイン結果の型定義
export interface LoginResult {
  success: boolean;
  error?: string;
  requiresNewPassword?: boolean;
  requiresMFA?: boolean;
  mfaType?: 'SMS' | 'TOTP';
  nextStep?: any;
}

/**
 * Amplifyログイン成功後にHttpOnly Cookieを設定する
 * ミドルウェアでの認証に必要
 */
const setCookiesAfterAmplifyLogin = async (): Promise<boolean> => {
  try {
    const session = await fetchAuthSession();
    if (!session.tokens) {
      return false;
    }

    const accessToken = session.tokens.accessToken?.toString();
    const idToken = session.tokens.idToken?.toString();

    if (!accessToken || !idToken) {
      return false;
    }

    const response = await fetch('/api/auth/set-cookies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        accessToken,
        idToken,
        expiresIn: 3600, // 1時間
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Cookie設定エラー:', error);
    return false;
  }
};

// ログイン関数
// Public ClientとConfidential Clientの両方のトークンを取得します
// - Public Clientのトークン: Amplifyの機能（メール確認チェックなど）に使用
// - Confidential Clientのトークン: API Gatewayへのリクエストに使用
export const login = async (email: string, password: string): Promise<LoginResult> => {
  try {
    // Amplifyの設定を確認（既に設定されている可能性があるため、再設定はスキップされる）
    if (typeof window !== 'undefined') {
      configureAmplify();
    }
    
    // ログイン前に既存のセッションをクリア（ログアウト直後の再ログイン問題を回避）
    try {
      await signOut();
    } catch {
      // サインアウトに失敗しても続行（セッションがない場合など）
    }
    
    // まずPublic Client（シークレットなし）を使用してクライアントサイドで直接ログインを試みる
    // これにより、Amplifyの機能（メール確認チェックなど）が正常に動作する
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password: password,
    });
    
    if (isSignedIn) {
      // Public Clientのトークンは既にlocalStorageに保存されている（Amplifyが自動的に保存）
      // 次に、サーバーサイドAPI経由でConfidential Clientのトークンも取得してCookieに保存
      // これにより、API Gatewayへのリクエストで使用できる
      const serverResult = await loginViaServerAPI(email, password);
      
      if (serverResult.success) {
        // 両方のトークンが取得できた
        return { success: true };
      } else {
        // Public Clientのログインは成功したが、Confidential Clientのトークン取得に失敗
        // Public Clientのトークンは使用可能なので、成功として扱う
        // （API Gatewayへのリクエストは失敗する可能性があるが、Amplifyの機能は使用可能）
        return { success: true };
      }
    }
    
    // 初回ログイン時のパスワード変更が必要な場合
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return { 
        success: false, 
        requiresNewPassword: true,
        nextStep 
      };
    }
    
    // MFAが必要な場合
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
      return { 
        success: false, 
        requiresMFA: true,
        mfaType: 'SMS',
        error: 'SMSで送信された確認コードを入力してください',
        nextStep 
      };
    }
    
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      return { 
        success: false, 
        requiresMFA: true,
        mfaType: 'TOTP',
        error: '認証アプリのコードを入力してください',
        nextStep 
      };
    }
    
    return { success: false, error: 'ログインに失敗しました' };
  } catch (error: any) {
    // エラーメッセージ全体を取得（ネストされたエラーも含む）
    const errorMessage = error.message || error.toString() || '';
    const errorName = error.name || '';
    const errorStack = error.stack || '';
    const fullErrorText = `${errorName} ${errorMessage} ${errorStack}`.toLowerCase();
    
    // 認証エラー（パスワード間違い、ユーザー不存在など）の場合は汎用メッセージを返す
    if (isAuthenticationError(errorName, errorMessage)) {
      return { success: false, error: GENERIC_AUTH_ERROR };
    }
    
    // SECRET_HASHエラー、ネットワークエラー、CSPエラーなど、
    // クライアントサイドで解決できないエラーの場合はサーバーサイドAPI経由でログインを試みる
    const isClientSideError = 
      fullErrorText.includes('secret_hash') ||
      fullErrorText.includes('configured with secret') ||
      fullErrorText.includes('was not received') ||
      fullErrorText.includes('network') ||
      fullErrorText.includes('failed to fetch') ||
      fullErrorText.includes('csp') ||
      fullErrorText.includes('content security policy') ||
      fullErrorText.includes('refused to connect') ||
      (fullErrorText.includes('client') && fullErrorText.includes('secret') && !fullErrorText.includes('incorrect'));
    
    if (isClientSideError) {
      // サーバーサイドAPI経由でログインを試みる
      // この場合、Confidential Clientのトークンのみが取得される
      return await loginViaServerAPI(email, password);
    }
    
    // その他のエラーもサーバーサイドAPI経由で試してみる
    const serverResult = await loginViaServerAPI(email, password);
    
    if (serverResult.success) {
      return serverResult;
    }
    
    // サーバーサイドAPI経由でも失敗した場合は、エラーメッセージを返す
    return serverResult;
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
      
      // サーバーサイドのCookieも削除（HttpOnly Cookie対応）
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (apiError) {
        console.error('ログアウトAPIエラー:', apiError);
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

// ユーザー情報と権限情報を取得
// @param forceRefresh - trueの場合、トークンを強制的にリフレッシュして最新の情報を取得
export const getUserInfoWithPermissions = async (forceRefresh: boolean = false) => {
  try {
    // Amplifyの設定を確認（既に設定されている可能性があるため、再設定はスキップされる）
    if (typeof window !== 'undefined') {
      configureAmplify();
    }
    
    // fetchAuthSession()を最初に試す（Amplifyが正常に動作している場合は即座に完了する）
    let idToken: any = null;
    let accessToken: any = null;
    
    try {
      const session = await fetchAuthSession({ forceRefresh });
      
      if (session.tokens?.idToken) {
        idToken = session.tokens.idToken;
        accessToken = session.tokens.accessToken;
      }
    } catch (sessionError: any) {
      // fetchAuthSession()が失敗した場合、localStorageから取得（フォールバック）
      if (typeof window !== 'undefined') {
        const config = getEnvConfig();
        const storageKey = `CognitoIdentityServiceProvider.${config.userPoolClientId}`;
        const lastAuthUser = localStorage.getItem(`${storageKey}.LastAuthUser`);
        
        if (lastAuthUser) {
          const storedIdToken = localStorage.getItem(`${storageKey}.${lastAuthUser}.idToken`);
          const storedAccessToken = localStorage.getItem(`${storageKey}.${lastAuthUser}.accessToken`);
          
          if (storedIdToken && storedAccessToken) {
            idToken = storedIdToken;
            accessToken = storedAccessToken;
          }
        }
      }
    }
    
    if (!idToken) {
      return { success: false, error: 'トークンが取得できませんでした', groups: [] };
    }
    
    // IDトークンからユーザー情報を取得
    let user: any = null;
    let groups: string[] = [];
    
    try {
      const tokenParts = idToken.toString().split('.');
      if (tokenParts.length === 3) {
        // ブラウザ環境でも動作するようにbase64デコード
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        
        // ユーザー情報をトークンから取得
        user = {
          username: payload['cognito:username'] || payload.email || payload.sub,
          userId: payload.sub,
          email: payload.email,
        };
        
        groups = payload['cognito:groups'] || [];
        groups = Array.isArray(groups) ? groups : [];
      }
    } catch (tokenError) {
      console.error('❌ トークンの解析に失敗しました:', tokenError);
      return { success: false, error: 'トークンの解析に失敗しました', groups: [] };
    }
    
    // getCurrentUser()も試してみる（オプション）
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('getCurrentUser()がタイムアウトしました')), 3000);
      });
      
      const amplifyUser = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ]) as any;
      
      // getCurrentUser()が成功した場合は、その情報を優先
      if (amplifyUser) {
        user = amplifyUser;
      }
    } catch (getUserError: any) {
      // getCurrentUser()が失敗しても、トークンから情報を取得できているので続行
    }
    return {
      success: true,
      user,
      groups,
    };
  } catch (error: any) {
    console.error('getUserInfoWithPermissionsエラー:', error);
    return { success: false, error: error.message, groups: [] };
  }
};

// 認証セッションを取得
export const getAuthSession = async (forceRefresh: boolean = false) => {
  try {
    const session = await fetchAuthSession({ forceRefresh });
    return { success: true, session };
  } catch (error: any) {
    // fetchAuthSession()が失敗した場合、localStorageから取得（フォールバック）
    if (typeof window !== 'undefined') {
      try {
        const config = getEnvConfig();
        const storageKey = `CognitoIdentityServiceProvider.${config.userPoolClientId}`;
        const lastAuthUser = localStorage.getItem(`${storageKey}.LastAuthUser`);
        
        if (lastAuthUser) {
          const storedIdToken = localStorage.getItem(`${storageKey}.${lastAuthUser}.idToken`);
          const storedAccessToken = localStorage.getItem(`${storageKey}.${lastAuthUser}.accessToken`);
          const storedRefreshToken = localStorage.getItem(`${storageKey}.${lastAuthUser}.refreshToken`);
          
          if (storedIdToken && storedAccessToken) {
            // セッションオブジェクトを模擬
            const session = {
              tokens: {
                idToken: storedIdToken,
                accessToken: storedAccessToken,
                refreshToken: storedRefreshToken,
              }
            };
            return { success: true, session };
          }
        }
      } catch (storageError) {
        console.error('localStorageからの取得に失敗しました:', storageError);
      }
    }
    
    return { success: false, error: error.message };
  }
};

// トークンをリフレッシュして、最新の権限情報を取得
export const refreshTokens = async () => {
  try {
    // トークンを強制的にリフレッシュ
    const session = await fetchAuthSession({ forceRefresh: true });
    return { success: true, session };
  } catch (error: any) {
    console.error('トークンのリフレッシュに失敗しました:', error);
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

/**
 * 新しいパスワードを設定して認証を完了する
 * 初回ログイン時のパスワード変更に使用
 * @param newPassword - 新しいパスワード
 * @returns success, emailVerified（メールアドレスが確認済みかどうか）を含むオブジェクト
 */
export const completeNewPassword = async (newPassword: string): Promise<{
  success: boolean;
  error?: string;
  emailVerified?: boolean;
  nextStep?: any;
}> => {
  try {
    // confirmSignInを使用して新しいパスワードを設定
    const { isSignedIn, nextStep } = await confirmSignIn({
      challengeResponse: newPassword,
    });

    if (isSignedIn) {
      // パスワード変更成功後、HttpOnly Cookieを設定（ミドルウェアでの認証用）
      await setCookiesAfterAmplifyLogin();
      
      // メールアドレスが確認済みかチェック
      let emailVerified = false;
      try {
        const attributes = await fetchUserAttributes();
        emailVerified = attributes.email_verified === 'true';
      } catch (attrError) {
        console.error('ユーザー属性の取得エラー:', attrError);
        // 属性取得に失敗した場合は未確認として扱う
        emailVerified = false;
      }
      
      return { success: true, emailVerified };
    }

    // 追加のステップが必要な場合
    if (nextStep) {
      return { 
        success: false, 
        error: '追加の認証が必要です',
        nextStep 
      };
    }

    return { success: false, error: 'パスワードの変更に失敗しました' };
  } catch (error: any) {
    console.error('パスワード変更エラー:', error);
    
    // パスワードポリシーエラーの場合
    if (error.name === 'InvalidPasswordException') {
      return { 
        success: false, 
        error: 'パスワードがポリシーを満たしていません。8文字以上で、大文字・小文字・数字・記号を含めてください。' 
      };
    }
    
    // その他のエラー
    return { 
      success: false, 
      error: error.message || 'パスワードの変更に失敗しました' 
    };
  }
};

/**
 * ログイン済みユーザーのパスワードを変更する
 * @param oldPassword - 現在のパスワード
 * @param newPassword - 新しいパスワード
 */
export const changePassword = async (oldPassword: string, newPassword: string) => {
  try {
    await updatePassword({ oldPassword, newPassword });
    return { success: true };
  } catch (error: any) {
    console.error('パスワード変更エラー:', error);
    
    // 現在のパスワードが間違っている場合
    if (error.name === 'NotAuthorizedException') {
      return { 
        success: false, 
        error: '現在のパスワードが正しくありません' 
      };
    }
    
    // パスワードポリシーエラーの場合
    if (error.name === 'InvalidPasswordException') {
      return { 
        success: false, 
        error: 'パスワードがポリシーを満たしていません。8文字以上で、大文字・小文字・数字・記号を含めてください。' 
      };
    }
    
    // セッションが切れている場合
    if (error.name === 'UserUnAuthenticatedException' || error.message?.includes('not authenticated')) {
      return { 
        success: false, 
        error: 'セッションが切れています。再度ログインしてください。' 
      };
    }
    
    // パスワード試行回数制限
    if (error.name === 'LimitExceededException') {
      return { 
        success: false, 
        error: 'パスワード変更の試行回数が制限を超えました。しばらくしてから再度お試しください。' 
      };
    }
    
    // その他のエラー
    return { 
      success: false, 
      error: error.message || 'パスワードの変更に失敗しました' 
    };
  }
};

/**
 * パスワードリセットを開始する（確認コードをメールで送信）
 * @param email - ユーザーのメールアドレス
 */
export const initiatePasswordReset = async (email: string) => {
  try {
    const output = await resetPassword({ username: email });
    
    return { 
      success: true, 
      nextStep: output.nextStep,
      codeDeliveryDetails: output.nextStep.codeDeliveryDetails
    };
  } catch (error: any) {
    console.error('パスワードリセット開始エラー:', error);
    
    // ユーザーが存在しない場合でも、セキュリティのため同じメッセージを返す
    if (error.name === 'UserNotFoundException') {
      return { 
        success: true, 
        message: '登録されているメールアドレスに確認コードを送信しました'
      };
    }
    
    // ユーザーが確認されていない場合
    if (error.name === 'InvalidParameterException' && error.message?.includes('confirmed')) {
      return { 
        success: false, 
        error: 'このアカウントはまだ確認されていません。管理者にお問い合わせください。' 
      };
    }
    
    // 試行回数制限
    if (error.name === 'LimitExceededException') {
      return { 
        success: false, 
        error: 'リセットの試行回数が制限を超えました。しばらくしてから再度お試しください。' 
      };
    }
    
    // その他のエラー
    return { 
      success: false, 
      error: error.message || 'パスワードリセットの開始に失敗しました' 
    };
  }
};

/**
 * パスワードリセットを完了する（確認コードと新しいパスワードで）
 * @param email - ユーザーのメールアドレス
 * @param confirmationCode - メールで受け取った確認コード
 * @param newPassword - 新しいパスワード
 */
export const completePasswordReset = async (
  email: string, 
  confirmationCode: string, 
  newPassword: string
) => {
  try {
    await confirmResetPassword({ 
      username: email, 
      confirmationCode, 
      newPassword 
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('パスワードリセット完了エラー:', error);
    
    // 確認コードが無効または期限切れ
    if (error.name === 'CodeMismatchException') {
      return { 
        success: false, 
        error: '確認コードが正しくありません。再度ご確認ください。' 
      };
    }
    
    if (error.name === 'ExpiredCodeException') {
      return { 
        success: false, 
        error: '確認コードの有効期限が切れています。再度リセットを開始してください。' 
      };
    }
    
    // パスワードポリシーエラー
    if (error.name === 'InvalidPasswordException') {
      return { 
        success: false, 
        error: 'パスワードがポリシーを満たしていません。8文字以上で、大文字・小文字・数字・記号を含めてください。' 
      };
    }
    
    // 試行回数制限
    if (error.name === 'LimitExceededException') {
      return { 
        success: false, 
        error: 'リセットの試行回数が制限を超えました。しばらくしてから再度お試しください。' 
      };
    }
    
    // ユーザーが存在しない
    if (error.name === 'UserNotFoundException') {
      return { 
        success: false, 
        error: 'ユーザーが見つかりません。メールアドレスを確認してください。' 
      };
    }
    
    // その他のエラー
    return { 
      success: false, 
      error: error.message || 'パスワードのリセットに失敗しました' 
    };
  }
};

/**
 * メールアドレスが確認済みかどうかをチェック
 * @returns email_verified属性の状態
 */
export const checkEmailVerified = async (): Promise<{ verified: boolean; email?: string; error?: string }> => {
  try {
    const attributes = await fetchUserAttributes();
    const email = attributes.email;
    const emailVerified = attributes.email_verified === 'true';
    
    return { 
      verified: emailVerified, 
      email 
    };
  } catch (error: any) {
    console.error('メール確認状態の取得エラー:', error);
    return { 
      verified: false, 
      error: error.message || 'メール確認状態の取得に失敗しました' 
    };
  }
};

/**
 * メールアドレス確認コードを送信
 */
export const sendEmailVerificationCode = async () => {
  try {
    await sendUserAttributeVerificationCode({ userAttributeKey: 'email' });
    return { success: true };
  } catch (error: any) {
    console.error('確認コード送信エラー:', error);
    
    // 試行回数制限
    if (error.name === 'LimitExceededException') {
      return { 
        success: false, 
        error: '確認コード送信の試行回数が制限を超えました。しばらくしてから再度お試しください。' 
      };
    }
    
    // その他のエラー
    return { 
      success: false, 
      error: error.message || '確認コードの送信に失敗しました' 
    };
  }
};

/**
 * メールアドレス確認コードを検証
 * @param confirmationCode - メールで受け取った確認コード
 */
export const verifyEmailCode = async (confirmationCode: string) => {
  try {
    await confirmUserAttribute({ 
      userAttributeKey: 'email', 
      confirmationCode 
    });
    return { success: true };
  } catch (error: any) {
    console.error('メール確認エラー:', error);
    
    // 確認コードが無効
    if (error.name === 'CodeMismatchException') {
      return { 
        success: false, 
        error: '確認コードが正しくありません。再度ご確認ください。' 
      };
    }
    
    // 確認コードの有効期限切れ
    if (error.name === 'ExpiredCodeException') {
      return { 
        success: false, 
        error: '確認コードの有効期限が切れています。再送信してください。' 
      };
    }
    
    // 試行回数制限
    if (error.name === 'LimitExceededException') {
      return { 
        success: false, 
        error: '試行回数が制限を超えました。しばらくしてから再度お試しください。' 
      };
    }
    
    // その他のエラー
    return { 
      success: false, 
      error: error.message || 'メールアドレスの確認に失敗しました' 
    };
  }
};

