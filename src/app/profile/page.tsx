'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserInfo, logout } from '@/lib/cognito';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const result = await getCurrentUserInfo();
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    };

    fetchUser();
  }, [router]);

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
      <Navbar onLogout={async () => {
        await logout();
        router.push('/');
        router.refresh();
      }} />
      <div className="container">
        <div className="card">
          <h1>プロフィール</h1>
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
        </div>
      </div>
    </>
  );
}

