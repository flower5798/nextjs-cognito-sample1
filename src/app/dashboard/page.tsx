'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserInfo, logout, getAuthSession } from '@/lib/cognito';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      // 少し待ってから認証状態をチェック（トークンが設定されるのを待つ）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = await getCurrentUserInfo();
      if (result.success && result.user) {
        setUser(result.user);
        setLoading(false);
      } else {
        // 認証セッションも確認してみる
        const sessionResult = await getAuthSession();
        if (sessionResult.success && sessionResult.session?.tokens) {
          // セッションはあるがユーザー情報が取得できない場合、再試行
          setTimeout(async () => {
            const retryResult = await getCurrentUserInfo();
            if (retryResult.success && retryResult.user) {
              setUser(retryResult.user);
              setLoading(false);
            } else {
              router.push('/login');
              setLoading(false);
            }
          }, 500);
        } else {
          router.push('/login');
          setLoading(false);
        }
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div className="container">
        <div className="card">
          <h1>ダッシュボード</h1>
          <p>ログインに成功しました！</p>
          {user && (
            <div style={{ marginTop: '1.5rem' }}>
              <h2>ユーザー情報</h2>
              <p>
                <strong>ユーザー名:</strong> {user.username}
              </p>
              <p>
                <strong>ユーザーID:</strong> {user.userId}
              </p>
            </div>
          )}
          <div style={{ marginTop: '2rem' }}>
            <button onClick={handleLogout} className="btn btn-secondary">
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

