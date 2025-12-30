'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserGroups, hasGroupOrHigher } from '@/lib/permissions';
import { getAllCourses, Course } from '@/lib/courses';

/**
 * コース一覧ページ
 * 学習サービスでのコース一覧と購入状況を表示します
 */

const COURSES = getAllCourses();

export default function CoursesPage() {
  const router = useRouter();
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumMember, setPremiumMember] = useState(false);

  useEffect(() => {
    const loadUserGroups = async () => {
      try {
        const groups = await getUserGroups(false);
        setUserGroups(groups);
        setPremiumMember(groups.some(g => g.toLowerCase() === 'member-premium'));
        setLoading(false);
      } catch (error) {
        console.error('ユーザーグループの取得に失敗しました:', error);
        setLoading(false);
      }
    };

    loadUserGroups();
  }, []);

  const handlePurchase = (courseId: string) => {
    router.push(`/courses/${courseId}/purchase`);
  };

  const handleAccess = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>コース情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1>コース一覧</h1>
        <p>学習サービスで提供しているコース一覧です。</p>
        {premiumMember && (
          <div className="card" style={{ marginTop: '1rem', backgroundColor: '#e0ffe0' }}>
            <p>
              <strong>🎉 プレミアム会員</strong> - すべてのコースにアクセスできます！
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {COURSES.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            userGroups={userGroups}
            premiumMember={premiumMember}
            onPurchase={handlePurchase}
            onAccess={handleAccess}
          />
        ))}
      </div>
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  userGroups: string[];
  premiumMember: boolean;
  onPurchase: (courseId: string) => void;
  onAccess: (courseId: string) => void;
}

function CourseCard({ course, userGroups, premiumMember, onPurchase, onAccess }: CourseCardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // プレミアム会員はすべてのコースにアクセス可能
      if (premiumMember) {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // コースグループに属しているかチェック
      const groupName = `course-${course.id}`;
      const hasGroup = userGroups.some(g => g.toLowerCase() === groupName.toLowerCase());
      setHasAccess(hasGroup);
      setChecking(false);
    };

    checkAccess();
  }, [course.id, userGroups, premiumMember]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            {course.category}
          </span>
        </div>
        <h2 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>{course.name}</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>{course.description}</p>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              ¥{course.price.toLocaleString()}
            </span>
            {hasAccess && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#e0ffe0',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  color: '#006400',
                }}
              >
                ✓ 購入済み
              </span>
            )}
          </div>
          {checking ? (
            <button className="btn btn-primary" disabled style={{ width: '100%' }}>
              確認中...
            </button>
          ) : hasAccess ? (
            <button
              className="btn btn-primary"
              onClick={() => onAccess(course.id)}
              style={{ width: '100%' }}
            >
              コースにアクセス
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => onPurchase(course.id)}
              style={{ width: '100%' }}
            >
              購入する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

