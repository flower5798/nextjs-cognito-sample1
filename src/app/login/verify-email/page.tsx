'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendEmailVerificationCode, verifyEmailCode, checkEmailVerified, logout } from '@/lib/cognito';
import Link from 'next/link';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [codeSent, setCodeSent] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string>('/dashboard');
  const [checking, setChecking] = useState(true);

  // URLパラメータからリダイレクト先を取得
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      const allowedPaths = ['/dashboard', '/profile', '/admin'];
      const isAllowed = allowedPaths.some(path => redirect === path || redirect.startsWith(path + '/'));
      if (isAllowed) {
        setRedirectTo(redirect);
      }
    }
  }, [searchParams]);

  // メール確認状態をチェックし、未確認なら確認コードを送信
  useEffect(() => {
    const initVerification = async () => {
      const result = await checkEmailVerified();
      
      if (result.verified) {
        // すでに確認済みの場合はリダイレクト
        window.location.href = redirectTo;
        return;
      }
      
      if (result.email) {
        setEmail(result.email);
      }
      
      if (result.error) {
        setError(result.error);
        setChecking(false);
        return;
      }
      
      // 確認コードを自動送信
      const sendResult = await sendEmailVerificationCode();
      
      if (sendResult.success) {
        setCodeSent(true);
        setMessage('確認コードをメールで送信しました。');
      } else {
        setError(sendResult.error || '確認コードの送信に失敗しました');
      }
      
      setChecking(false);
    };
    
    initVerification();
  }, [redirectTo]);

  // 確認コードを再送信
  const handleResendCode = async () => {
    setError('');
    setMessage('');
    setSendingCode(true);
    
    const result = await sendEmailVerificationCode();
    
    if (result.success) {
      setMessage('確認コードを再送信しました。メールを確認してください。');
      setCodeSent(true);
    } else {
      setError(result.error || '確認コードの送信に失敗しました');
    }
    
    setSendingCode(false);
  };

  // 確認コードを検証
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await verifyEmailCode(confirmationCode);

    if (result.success) {
      setMessage('メールアドレスが確認されました！');
      // 少し待ってからリダイレクト
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1500);
    } else {
      setError(result.error || 'メールアドレスの確認に失敗しました');
      setLoading(false);
    }
  };

  // スキップしてログアウト
  const handleSkip = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  if (checking) {
    return (
      <div className="container">
        <div style={{ maxWidth: '450px', margin: '0 auto' }}>
          <div className="card">
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>確認中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <div className="card">
          <h1>メールアドレスの確認</h1>
          
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            セキュリティのため、メールアドレスの確認が必要です。
            {email && (
              <>
                <br />
                <strong>{email}</strong> に確認コードを送信しました。
              </>
            )}
          </p>
          
          {message && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#d4edda',
              borderRadius: '4px',
              color: '#155724',
              marginBottom: '1rem'
            }}>
              {message}
            </div>
          )}
          
          {codeSent && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="confirmationCode">確認コード</label>
                <input
                  id="confirmationCode"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                  placeholder="メールで受け取った6桁のコード"
                  autoComplete="one-time-code"
                  disabled={loading}
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? '確認中...' : 'メールアドレスを確認'}
              </button>
            </form>
          )}
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={sendingCode}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: sendingCode ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                opacity: sendingCode ? 0.6 : 1
              }}
            >
              {sendingCode ? '送信中...' : '確認コードを再送信する'}
            </button>
          </div>
          
          <div style={{ 
            marginTop: '2rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid #eee',
            textAlign: 'center' 
          }}>
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              後で確認する場合は、一度ログアウトしてください。
            </p>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#6c757d',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.875rem'
              }}
            >
              スキップしてログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ローディング表示コンポーネント
function LoadingFallback() {
  return (
    <div className="container">
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// メインページコンポーネント（Suspenseでラップ）
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailForm />
    </Suspense>
  );
}

