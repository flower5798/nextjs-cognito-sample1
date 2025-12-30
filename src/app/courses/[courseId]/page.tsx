'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import CourseAccess from '@/components/CourseAccess';
import { getCourseById } from '@/lib/courses';

/**
 * コースページ
 * 学習サービスでのコース詳細ページです
 */
export default function CoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const course = getCourseById(courseId);

  if (!course) {
    return (
      <div className="container">
        <div className="card">
          <h1>コースが見つかりません</h1>
          <p>指定されたコースは存在しません。</p>
          <Link href="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            コース一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/courses" style={{ color: '#666', textDecoration: 'none' }}>
          ← コース一覧に戻る
        </Link>
      </div>

      <CourseAccess courseId={courseId} courseName={course.name}>
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
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
          
          <h1>{course.name}</h1>
          <p style={{ color: '#666', fontSize: '1.125rem', marginTop: '0.5rem' }}>
            {course.description}
          </p>
          
          {course.detailedDescription && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h2>コースについて</h2>
              <p>{course.detailedDescription}</p>
            </div>
          )}
          
          <div style={{ marginTop: '2rem' }}>
            <h2>コースコンテンツ</h2>
            <p>このコースのコンテンツがここに表示されます。</p>
            <ul style={{ marginTop: '1rem' }}>
              <li>レッスン1: 基礎知識</li>
              <li>レッスン2: 実践演習</li>
              <li>レッスン3: 応用問題</li>
              <li>レッスン4: 総合演習</li>
            </ul>
          </div>
        </div>
      </CourseAccess>
    </div>
  );
}

