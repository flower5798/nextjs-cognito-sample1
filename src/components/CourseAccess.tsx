'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedContent from '@/components/ProtectedContent';

interface CourseAccessProps {
  courseId: string;
  courseName: string;
  children: ReactNode;
  premiumMembershipGroup?: string; // プレミアム会員のグループ名（デフォルト: 'member-premium'）
}

/**
 * コースへのアクセスを制御するコンポーネント
 * 
 * 使用例:
 * <CourseAccess courseId="basic-math" courseName="基礎数学">
 *   <CourseContent />
 * </CourseAccess>
 */
export default function CourseAccess({
  courseId,
  courseName,
  children,
  premiumMembershipGroup = 'member-premium',
}: CourseAccessProps) {
  const router = useRouter();
  const groupName = `course-${courseId}`;

  return (
    <ProtectedContent
      anyPermissionNames={[groupName, premiumMembershipGroup]} // コースグループまたはプレミアム会員グループのいずれかに属している
      fallback={
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2>{courseName}にアクセスする権限がありません</h2>
          <p>
            このコースを閲覧するには、以下のいずれかの条件を満たす必要があります：
          </p>
          <ul style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <li>
              <strong>{courseName}</strong>を購入している
            </li>
            <li>
              <strong>プレミアム会員</strong>である
            </li>
          </ul>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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

