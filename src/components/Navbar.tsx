'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { checkEmailVerified } from '@/lib/cognito';

interface NavbarProps {
  onLogout: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkEmail = async () => {
      const result = await checkEmailVerified();
      setEmailVerified(result.verified);
    };
    checkEmail();
  }, []);

  return (
    <>
      <nav className="navbar">
        <div>
          <Link href="/dashboard">ダッシュボード</Link>
          <Link href="/profile">プロフィール</Link>
        </div>
        <div>
          <button onClick={onLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
            ログアウト
          </button>
        </div>
      </nav>
      
      {/* メール未確認の通知バナー */}
      {emailVerified === false && !dismissed && (
        <div style={{
          backgroundColor: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: '#856404',
            fontSize: '0.9rem'
          }}>
            <span>⚠️</span>
            <span>
              メールアドレスが確認されていません。
              <Link 
                href="/login/verify-email?redirect=/dashboard"
                style={{ 
                  marginLeft: '0.5rem',
                  color: '#856404',
                  fontWeight: 'bold',
                  textDecoration: 'underline'
                }}
              >
                今すぐ確認する
              </Link>
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: '#856404',
              padding: '0',
              lineHeight: '1'
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

