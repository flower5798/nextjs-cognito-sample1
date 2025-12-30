'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { completePurchase } from '@/lib/purchase-api';
import { refreshTokens } from '@/lib/cognito';
import { getCourseById } from '@/lib/courses';

/**
 * コース購入ページ
 * 学習サービスでのコース購入処理を行います
 */

export default function PurchasePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const course = getCourseById(courseId) || {
    id: courseId,
    name: 'コース',
    description: 'コースの説明',
    price: 0,
    category: 'その他',
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);

    try {
      // 実際の実装では、決済処理（Stripe、PayPalなど）をここで行います
      // ここでは、決済が完了したと仮定して権限を付与します

      const result = await completePurchase({
        courseIds: [courseId],
      });

      if (result.success) {
        // トークンをリフレッシュして最新の権限を取得
        await refreshTokens();
        
        // コースページにリダイレクト
        router.push(`/courses/${courseId}`);
      } else {
        setError(result.error || '購入処理に失敗しました');
      }
    } catch (err: any) {
      console.error('購入処理エラー:', err);
      setError(err.message || '購入処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1>コース購入</h1>
        
        <div style={{ marginTop: '2rem' }}>
          <h2>{course.name}</h2>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>{course.description}</p>
          
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem' }}>価格</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                ¥{course.price.toLocaleString()}
              </span>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#ffe0e0',
                borderRadius: '8px',
                color: '#cc0000',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handlePurchase}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '処理中...' : '購入する'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              キャンセル
            </button>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '8px', fontSize: '0.875rem' }}>
            <p style={{ margin: 0 }}>
              <strong>注意:</strong> 実際の実装では、決済処理（Stripe、PayPalなど）を実装してください。
              このサンプルでは、購入ボタンをクリックすると自動的に権限が付与されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

