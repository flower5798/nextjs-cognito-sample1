'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/cognito';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string>('/dashboard');

  // URLパラメータからリダイレクト先を取得（クライアントサイドでのみ実行）
  // オープンリダイレクト脆弱性対策: 内部パスのみ許可
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      // セキュリティ対策: 相対パスのみ許可、外部URLへのリダイレクトを防止
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('://')) {
        // 許可されたパスのホワイトリスト
        const allowedPaths = ['/dashboard', '/profile', '/admin'];
        const isAllowed = allowedPaths.some(path => redirect === path || redirect.startsWith(path + '/'));
        if (isAllowed) {
          setRedirectTo(redirect);
        }
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        // ログアウト直後の再ログイン時にキャッシュの問題を回避するため、
        // フルページリロードでリダイレクトする
        window.location.href = redirectTo;
        return;
      } else if (result.requiresNewPassword) {
        // 初回ログイン時のパスワード変更が必要な場合
        const changePasswordUrl = `/login/change-password?redirect=${encodeURIComponent(redirectTo)}`;
        router.push(changePasswordUrl);
      } else if (result.requiresMFA) {
        // MFAが必要な場合（将来的にMFAページを実装する場合はここで遷移）
        setError(result.error || 'MFA認証が必要です');
        setLoading(false);
      } else {
        setError(result.error || 'ログインに失敗しました');
        setLoading(false);
      }
    } catch (error: any) {
      // 予期しないエラーが発生した場合
      console.error('ログインエラー:', error);
      setError(error.message || 'ログインに失敗しました');
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="card">
          <h1>ログイン</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="パスワードを入力"
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link href="/login/reset-password">パスワードをお忘れの方</Link>
          </div>
          <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
            <Link href="/">ホームに戻る</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

