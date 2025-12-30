'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeNewPassword } from '@/lib/cognito';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string>('/dashboard');

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

    // パスワード確認
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    // パスワードポリシーチェック
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const result = await completeNewPassword(newPassword);

    if (result.success) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(result.error || 'パスワードの変更に失敗しました');
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <div className="card">
          <h1>パスワードの変更</h1>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            初回ログインのため、新しいパスワードを設定してください。
          </p>
          
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
              <label htmlFor="confirmPassword">パスワードの確認</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="パスワードを再入力"
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
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link href="/login">ログインに戻る</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

