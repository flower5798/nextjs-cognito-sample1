'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserInfo, logout, checkEmailVerified } from '@/lib/cognito';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const fetchUserData = async () => {
      const result = await getCurrentUserInfo();
      if (result.success && result.user) {
        setUser(result.user);
        
        // メール確認状態をチェック
        const emailStatus = await checkEmailVerified();
        setEmailVerified(emailStatus.verified);
        if (emailStatus.email) {
          setEmail(emailStatus.email);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    };

    fetchUserData();
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
          
          {/* メール未確認の警告 */}
          {emailVerified === false && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <div>
                  <strong style={{ color: '#856404' }}>メールアドレスが確認されていません</strong>
                  <p style={{ margin: '0.5rem 0 0', color: '#856404', fontSize: '0.9rem' }}>
                    パスワードリセットなどの機能を利用するには、メールアドレスの確認が必要です。
                    {email && <><br />対象: <strong>{email}</strong></>}
                  </p>
                  <Link 
                    href="/login/verify-email?redirect=/profile"
                    className="btn btn-primary"
                    style={{ 
                      display: 'inline-block', 
                      marginTop: '0.75rem',
                      backgroundColor: '#ffc107',
                      borderColor: '#ffc107',
                      color: '#212529'
                    }}
                  >
                    メールアドレスを確認する
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {user && (
            <div style={{ marginTop: '1.5rem' }}>
              <h2>ユーザー情報</h2>
              <p>
                <strong>ユーザー名:</strong> {user.username}
              </p>
              <p>
                <strong>ユーザーID:</strong> {user.userId}
              </p>
              {email && (
                <p>
                  <strong>メールアドレス:</strong> {email}
                  {emailVerified === true && (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      color: '#28a745', 
                      fontSize: '0.875rem' 
                    }}>
                      ✓ 確認済み
                    </span>
                  )}
                  {emailVerified === false && (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      color: '#dc3545', 
                      fontSize: '0.875rem' 
                    }}>
                      ✗ 未確認
                    </span>
                  )}
                </p>
              )}
              
              <div style={{ marginTop: '2rem' }}>
                <h2>セキュリティ設定</h2>
                <Link 
                  href="/profile/change-password"
                  className="btn btn-primary"
                  style={{ display: 'inline-block', marginTop: '0.5rem' }}
                >
                  パスワードを変更
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}



