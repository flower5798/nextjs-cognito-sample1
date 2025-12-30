import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getEnvConfig } from '@/lib/env';
import { getUserIdFromToken } from '@/lib/token-utils';

/**
 * 購入完了時にユーザーに権限を自動付与するAPI
 * 
 * 使用例: 学習サービスのコース購入完了時など
 * 
 * リクエスト例:
 * POST /api/purchase/complete
 * Headers:
 *   Authorization: Bearer <ID_TOKEN>
 * Body:
 * {
 *   "courseIds": ["basic-math", "programming"],
 *   "membershipType": "premium" // オプション
 * }
 * 
 * 注意: ユーザーIDはAuthorizationヘッダーからIDトークンを検証して取得します。
 * リクエストボディにuserIdを含める必要はありません。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseIds, membershipType } = body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'courseIds（配列）が必要です' },
        { status: 400 }
      );
    }

    // 1. AuthorizationヘッダーからIDトークンを取得
    const authHeader = request.headers.get('authorization');
    console.log('Authorizationヘッダー:', authHeader ? '存在します' : '存在しません');
    
    // 2. トークンを検証し、ユーザーID（subクレーム）を取得
    const userId = getUserIdFromToken(authHeader);
    console.log('取得したユーザーID:', userId);
    
    if (!userId) {
      console.error('ユーザーIDの取得に失敗しました');
      return NextResponse.json(
        { success: false, error: '認証が必要です。有効なIDトークンをAuthorizationヘッダーに含めてください。' },
        { status: 401 }
      );
    }

    const config = getEnvConfig();
    console.log('環境設定:', {
      userPoolId: config.userPoolId,
      region: config.region,
    });

    const client = new CognitoIdentityProviderClient({
      region: config.region,
    });

    const results = [];
    const errors = [];

    // 会員タイプのグループに追加（オプション）
    if (membershipType) {
      try {
        const membershipGroupName = `member-${membershipType}`;
        const membershipCommand = new AdminAddUserToGroupCommand({
          UserPoolId: config.userPoolId,
          Username: userId,
          GroupName: membershipGroupName,
        });
        await client.send(membershipCommand);
        results.push(membershipGroupName);
      } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
          errors.push(`グループ member-${membershipType} が存在しません。先にAWSコンソールでグループを作成してください。`);
        } else {
          errors.push(`会員タイプグループへの追加に失敗: ${error.message}`);
        }
      }
    }

    // 各コースのグループに追加
    for (const courseId of courseIds) {
      const groupName = `course-${courseId}`;
      try {
        console.log(`グループ ${groupName} にユーザー ${userId} を追加しようとしています...`);
        const command = new AdminAddUserToGroupCommand({
          UserPoolId: config.userPoolId,
          Username: userId,
          GroupName: groupName,
        });
        await client.send(command);
        console.log(`グループ ${groupName} への追加に成功しました`);
        results.push(groupName);
      } catch (error: any) {
        console.error(`グループ ${groupName} への追加エラー:`, {
          name: error.name,
          message: error.message,
          code: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
        });
        if (error.name === 'ResourceNotFoundException') {
          errors.push(`グループ ${groupName} が存在しません。先にAWSコンソールでグループを作成してください。`);
        } else if (error.name === 'AccessDeniedException' || error.name === 'UnauthorizedException') {
          errors.push(`グループ ${groupName} への追加が拒否されました。AWS認証情報を確認してください。エラー: ${error.message}`);
        } else {
          errors.push(`コースグループ ${groupName} への追加に失敗: ${error.message || error.name}`);
        }
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'すべてのグループへの追加に失敗しました',
          errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      groups: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `${results.length}個のグループにユーザーを追加しました`,
    });
  } catch (error: any) {
    console.error('権限付与エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || '権限付与に失敗しました' },
      { status: 500 }
    );
  }
}

