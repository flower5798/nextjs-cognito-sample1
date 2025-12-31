'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword, getCurrentUserInfo, logout } from '@/lib/cognito';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 認証状態をチェック
  useEffect(() => {
    const checkAuth = async () => {
      const result = await getCurrentUserInfo();
      if (!result.success) {
        router.push('/login?redirect=/profile/change-password');
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'パスワードは8文字以上である必要があります';
    }
    if (!/[a-z]/.test(password)) {
      return 'パスワードには小文字を含める必要があります';
    }
    if (!/[A-Z]/.test(password)) {
      return 'パスワードには大文字を含める必要があります';
    }
    if (!/[0-9]/.test(password)) {
      return 'パスワードには数字を含める必要があります';
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return 'パスワードには記号を含める必要があります';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // パスワード確認
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    // 現在のパスワードと新しいパスワードが同じ場合
    if (currentPassword === newPassword) {
      setError('新しいパスワードは現在のパスワードと異なる必要があります');
      return;
    }

    // パスワードポリシーチェック
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // 3秒後にプロフィールページにリダイレクト
      setTimeout(() => {
        router.push('/profile');
      }, 3000);
    } else {
      setError(result.error || 'パスワードの変更に失敗しました');
    }
    setLoading(false);
  };

  if (checkingAuth) {
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
        <div style={{ maxWidth: '450px', margin: '0 auto' }}>
          <div className="card">
            <h1>パスワードの変更</h1>
            
            {success ? (
              <div style={{
                padding: '1rem',
                backgroundColor: '#d4edda',
                borderRadius: '4px',
                color: '#155724',
                marginBottom: '1rem'
              }}>
                <strong>パスワードを変更しました！</strong>
                <p style={{ margin: '0.5rem 0 0' }}>
                  3秒後にプロフィールページに移動します...
                </p>
              </div>
            ) : (
              <>
                <div style={{ 
                  marginBottom: '1.5rem', 
                  padding: '1rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}>
                  <strong>パスワード要件:</strong>
                  <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                    <li>8文字以上</li>
                    <li>大文字を含む</li>
                    <li>小文字を含む</li>
                    <li>数字を含む</li>
                    <li>記号を含む（例: !@#$%^&*）</li>
                  </ul>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="currentPassword">現在のパスワード</label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="現在のパスワードを入力"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newPassword">新しいパスワード</label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="新しいパスワードを入力"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">新しいパスワードの確認</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="新しいパスワードを再入力"
                      autoComplete="new-password"
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: '100%' }}
                  >
                    {loading ? '変更中...' : 'パスワードを変更'}
                  </button>
                </form>
              </>
            )}
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Link href="/profile">プロフィールに戻る</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

