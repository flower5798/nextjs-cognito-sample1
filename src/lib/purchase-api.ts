/**
 * 購入完了APIを呼び出すためのクライアントサイドユーティリティ
 */

import { fetchAuthSession } from 'aws-amplify/auth';

interface PurchaseCompleteRequest {
  courseIds: string[];
  membershipType?: 'premium' | 'basic';
}

interface PurchaseCompleteResponse {
  success: boolean;
  groups?: string[];
  errors?: string[];
  message?: string;
  error?: string;
}

/**
 * 購入完了時にユーザーに権限を自動付与するAPIを呼び出す
 * 
 * @param request - 購入完了リクエスト
 * @returns 購入完了レスポンス
 */
export async function completePurchase(
  request: PurchaseCompleteRequest
): Promise<PurchaseCompleteResponse> {
  try {
    // AmplifyからIDトークンを取得
    const session = await fetchAuthSession({ forceRefresh: false });
    
    if (!session.tokens?.idToken) {
      return {
        success: false,
        error: '認証されていません。ログインしてください。',
      };
    }

    const idToken = session.tokens.idToken.toString();

    // APIを呼び出す
    const response = await fetch('/api/purchase/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        courseIds: request.courseIds,
        membershipType: request.membershipType,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || '購入完了処理に失敗しました',
      };
    }

    return result;
  } catch (error: any) {
    console.error('購入完了API呼び出しエラー:', error);
    return {
      success: false,
      error: error.message || '購入完了処理に失敗しました',
    };
  }
}

