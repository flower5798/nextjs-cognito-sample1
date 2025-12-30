# コンテンツビジネスでの権限管理の活用

このドキュメントでは、AWS Cognito User Groupsを使用した権限管理システムが、学習サービスなどのコンテンツビジネスにどのように活用できるかを説明します。

## 概要

カスタム権限を使ったパーミッションシステムは、**学習サービスなどのコンテンツビジネスに非常に適しています**。

### 主な利点

1. **柔軟な権限管理**: コースごと、コンテンツごとに権限を設定可能
2. **自動的な権限付与**: 購入完了時に自動的にグループに追加
3. **階層的な権限**: プレミアム会員、ベーシック会員などの階層管理
4. **スケーラビリティ**: 新しいコースやコンテンツを追加しても、既存のシステムを変更する必要がない

## 使用例: 学習サービス

### 権限設計の例

```
コース別の権限:
- course-basic-math: 基礎数学コース
- course-advanced-math: 応用数学コース
- course-programming: プログラミングコース
- course-data-science: データサイエンスコース

会員タイプ別の権限:
- member-premium: プレミアム会員（すべてのコースにアクセス可能）
- member-basic: ベーシック会員（限定コースのみ）
- member-trial: トライアル会員（無料コースのみ）
```

### 実装例

#### 1. コース購入完了時の自動権限付与

```typescript
// src/app/api/purchase/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getEnvConfig } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const { userId, courseId } = await request.json();

    // コースIDからグループ名を決定
    const groupName = `course-${courseId}`; // 例: course-basic-math

    const config = getEnvConfig();
    const client = new CognitoIdentityProviderClient({
      region: config.region,
    });

    // ユーザーをグループに追加
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: config.userPoolId,
      Username: userId,
      GroupName: groupName,
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: `ユーザーを${groupName}グループに追加しました`,
    });
  } catch (error: any) {
    console.error('権限付与エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### 2. コースへのアクセス制御

```tsx
// src/app/courses/[courseId]/page.tsx
import ProtectedContent from '@/components/ProtectedContent';

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const courseId = params.courseId;
  const groupName = `course-${courseId}`;

  return (
    <ProtectedContent
      allPermissionNames={[groupName]}
      higherPermission="member-premium" // プレミアム会員はすべてのコースにアクセス可能
      fallback={
        <div>
          <h2>このコースにアクセスする権限がありません</h2>
          <p>このコースを購入するか、プレミアム会員にアップグレードしてください。</p>
          <button onClick={() => {/* 購入ページへ */}}>
            コースを購入
          </button>
        </div>
      }
    >
      <CourseContent courseId={courseId} />
    </ProtectedContent>
  );
}
```

## 実装パターン

### パターン1: コース別の権限

各コースごとにグループを作成し、購入完了時にユーザーをそのグループに追加します。

**利点**:
- シンプルで理解しやすい
- コースごとに細かく制御可能

**欠点**:
- コース数が多い場合、グループ数が増える

### パターン2: 会員タイプ + コース別の権限

会員タイプ（premium, basic）とコース別の権限を組み合わせます。

**利点**:
- プレミアム会員はすべてのコースにアクセス可能
- 柔軟な料金プランに対応

**実装例**:
```tsx
<ProtectedContent
  allPermissionNames={['course-basic-math']}
  higherPermission="member-premium"
>
  <CourseContent />
</ProtectedContent>
```

### パターン3: カテゴリ別の権限

コースをカテゴリに分類し、カテゴリごとに権限を設定します。

**例**:
- `category-programming`: プログラミングカテゴリ全体
- `category-data-science`: データサイエンスカテゴリ全体

## 購入完了時の自動権限付与の実装

### 1. 決済完了後の処理フロー

```
1. 決済完了（Stripe、PayPalなど）
2. WebhookまたはAPIで決済完了を通知
3. サーバーサイドAPIでユーザーをグループに追加
4. ユーザーに通知（メール、通知など）
5. ユーザーがトークンをリフレッシュして権限を取得
```

### 2. 実装例

#### 決済完了API

```typescript
// src/app/api/purchase/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getEnvConfig } from '@/lib/env';
import { getUserIdFromToken } from '@/lib/token-utils';

interface PurchaseCompleteRequest {
  courseIds: string[]; // 購入したコースIDの配列
  membershipType?: 'premium' | 'basic'; // 会員タイプ（オプション）
}

export async function POST(request: NextRequest) {
  try {
    const { courseIds, membershipType }: PurchaseCompleteRequest = await request.json();

    if (!courseIds || courseIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'courseIdsが必要です' },
        { status: 400 }
      );
    }

    // AuthorizationヘッダーからIDトークンを取得し、ユーザーIDを取得
    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromToken(authHeader);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '認証が必要です。有効なIDトークンをAuthorizationヘッダーに含めてください。' },
        { status: 401 }
      );
    }

    const config = getEnvConfig();
    const client = new CognitoIdentityProviderClient({
      region: config.region,
    });

    const results = [];

    // 会員タイプのグループに追加（オプション）
    if (membershipType) {
      try {
        const membershipCommand = new AdminAddUserToGroupCommand({
          UserPoolId: config.userPoolId,
          Username: userId,
          GroupName: `member-${membershipType}`,
        });
        await client.send(membershipCommand);
        results.push(`member-${membershipType}`);
      } catch (error: any) {
        console.error(`会員タイプグループへの追加に失敗:`, error);
      }
    }

    // 各コースのグループに追加
    for (const courseId of courseIds) {
      try {
        const groupName = `course-${courseId}`;
        const command = new AdminAddUserToGroupCommand({
          UserPoolId: config.userPoolId,
          Username: userId,
          GroupName: groupName,
        });
        await client.send(command);
        results.push(groupName);
      } catch (error: any) {
        // グループが存在しない場合は作成が必要
        if (error.name === 'ResourceNotFoundException') {
          console.error(`グループ ${groupName} が存在しません。先にグループを作成してください。`);
        } else {
          console.error(`コースグループへの追加に失敗:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      groups: results,
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
```

#### クライアントサイドでの使用

**推奨方法: ユーティリティ関数を使用**

```typescript
import { completePurchase } from '@/lib/purchase-api';
import { refreshTokens } from '@/lib/cognito';

// 購入完了後の処理
const handlePurchaseComplete = async (courseIds: string[], membershipType?: string) => {
  try {
    const result = await completePurchase({
      courseIds,
      membershipType,
    });
    
    if (result.success) {
      // トークンをリフレッシュして最新の権限を取得
      await refreshTokens();
      alert('購入が完了しました。コースにアクセスできるようになりました。');
    } else {
      alert(`エラー: ${result.error}`);
    }
  } catch (error) {
    console.error('購入完了処理エラー:', error);
  }
};
```

**手動でAPIを呼び出す場合**

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';
import { refreshTokens } from '@/lib/cognito';

// 購入完了後の処理
const handlePurchaseComplete = async (courseIds: string[], membershipType?: string) => {
  try {
    // AmplifyからIDトークンを取得
    const session = await fetchAuthSession({ forceRefresh: false });
    
    if (!session.tokens?.idToken) {
      alert('認証されていません。ログインしてください。');
      return;
    }

    const idToken = session.tokens.idToken.toString();

    const response = await fetch('/api/purchase/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`, // IDトークンをAuthorizationヘッダーに含める
      },
      body: JSON.stringify({
        courseIds,
        membershipType,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // トークンをリフレッシュして最新の権限を取得
      await refreshTokens();
      alert('購入が完了しました。コースにアクセスできるようになりました。');
    } else {
      alert(`エラー: ${result.error}`);
    }
  } catch (error) {
    console.error('購入完了処理エラー:', error);
  }
};
```

**注意**: ユーザーIDは認証トークンから自動的に取得されるため、リクエストボディに`userId`を含める必要はありません。

## ベストプラクティス

### 1. グループ名の命名規則

一貫性のある命名規則を使用：

```
コース: course-{course-id}
会員タイプ: member-{type}
カテゴリ: category-{category-name}
```

### 2. 権限の階層化

プレミアム会員はすべてのコースにアクセス可能にする：

```typescript
// プレミアム会員はすべてのコースにアクセス可能
<ProtectedContent
  allPermissionNames={['course-basic-math']}
  higherPermission="member-premium"
>
  <CourseContent />
</ProtectedContent>
```

### 3. トークンのリフレッシュ

購入完了後は必ずトークンをリフレッシュ：

```typescript
import { refreshTokens } from '@/lib/cognito';

// 購入完了後
await refreshTokens();
```

### 4. エラーハンドリング

グループが存在しない場合の処理：

```typescript
// グループが存在しない場合は作成
// AWS SDKまたはAWS CLIを使用してグループを作成
```

## 制限事項と考慮点

### 1. グループ数の制限

- Cognito User Poolあたりのグループ数に制限がある可能性
- コース数が非常に多い場合は、別のアプローチを検討

### 2. パフォーマンス

- ユーザーが多数のグループに所属している場合、IDトークンが大きくなる可能性
- 必要に応じて、グループを統合する

### 3. セキュリティ

- クライアントサイドの権限チェックは参考程度に
- 重要な操作は必ずサーバーサイドでも権限チェック

## 代替案

### 1. データベースベースの権限管理

コース数が非常に多い場合、データベースで権限を管理する方法も検討できます。

### 2. ハイブリッドアプローチ

- 会員タイプ: Cognito User Groups
- コース別の権限: データベース

## 実装例: 学習サービス用のコンポーネント

```tsx
// src/components/CourseAccess.tsx
'use client';

import ProtectedContent from '@/components/ProtectedContent';
import { useRouter } from 'next/navigation';

interface CourseAccessProps {
  courseId: string;
  courseName: string;
  children: React.ReactNode;
}

export default function CourseAccess({ courseId, courseName, children }: CourseAccessProps) {
  const router = useRouter();
  const groupName = `course-${courseId}`;

  return (
    <ProtectedContent
      allPermissionNames={[groupName]}
      higherPermission="member-premium"
      fallback={
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2>{courseName}にアクセスする権限がありません</h2>
          <p>このコースを購入するか、プレミアム会員にアップグレードしてください。</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/courses/${courseId}/purchase`)}
            >
              コースを購入
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => router.push('/membership/premium')}
            >
              プレミアム会員になる
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ProtectedContent>
  );
}
```

## まとめ

**AWS Cognito User Groupsを使用した権限管理は、学習サービスなどのコンテンツビジネスに非常に適しています。**

### 主な利点

1. ✅ **柔軟性**: コースごと、会員タイプごとに権限を設定可能
2. ✅ **自動化**: 購入完了時に自動的に権限を付与
3. ✅ **スケーラビリティ**: 新しいコースを追加しても既存システムを変更する必要がない
4. ✅ **セキュリティ**: AWS Cognitoの堅牢なセキュリティ機能を活用

### 実装のポイント

1. 購入完了時にサーバーサイドAPIでユーザーをグループに追加
2. トークンをリフレッシュして最新の権限を取得
3. プレミアム会員などの階層的な権限を活用
4. 適切なエラーハンドリングとフォールバック処理

このアプローチにより、学習サービスなどのコンテンツビジネスで効果的な権限管理が実現できます。

