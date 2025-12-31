'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { initiatePasswordReset, completePasswordReset } from '@/lib/cognito';
import Link from 'next/link';

type Step = 'request' | 'confirm';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  // ステップ1: パスワードリセットをリクエスト
  const handleRequestReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await initiatePasswordReset(email);

    if (result.success) {
      setMessage('確認コードをメールで送信しました。メールを確認してください。');
      setStep('confirm');
    } else {
      setError(result.error || 'パスワードリセットの開始に失敗しました');
    }
    setLoading(false);
  };

  // ステップ2: 確認コードと新しいパスワードでリセットを完了
  const handleConfirmReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

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

    const result = await completePasswordReset(email, confirmationCode, newPassword);

    if (result.success) {
      setSuccess(true);
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      setError(result.error || 'パスワードのリセットに失敗しました');
    }
    setLoading(false);
  };

  // リセット成功後の表示
  if (success) {
    return (
      <div className="container">
        <div style={{ maxWidth: '450px', margin: '0 auto' }}>
          <div className="card">
            <h1>パスワードをリセットしました</h1>
            <div style={{
              padding: '1rem',
              backgroundColor: '#d4edda',
              borderRadius: '4px',
              color: '#155724',
              marginBottom: '1rem'
            }}>
              <strong>パスワードが正常にリセットされました！</strong>
              <p style={{ margin: '0.5rem 0 0' }}>
                3秒後にログインページに移動します...
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link href="/login">今すぐログインページに移動</Link>
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
          <h1>パスワードのリセット</h1>
          
          {step === 'request' ? (
            // ステップ1: メールアドレス入力
            <>
              <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                登録されているメールアドレスを入力してください。パスワードリセット用の確認コードをお送りします。
              </p>
              
              <form onSubmit={handleRequestReset}>
                <div className="form-group">
                  <label htmlFor="email">メールアドレス</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="example@email.com"
                    autoComplete="email"
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  {loading ? '送信中...' : '確認コードを送信'}
                </button>
              </form>
            </>
          ) : (
            // ステップ2: 確認コードと新しいパスワード入力
            <>
              {message && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#d1ecf1',
                  borderRadius: '4px',
                  color: '#0c5460',
                  marginBottom: '1.5rem'
                }}>
                  {message}
                </div>
              )}
              
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                <strong>{email}</strong> に送信された確認コードと、新しいパスワードを入力してください。
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

              <form onSubmit={handleConfirmReset}>
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
                  {loading ? 'リセット中...' : 'パスワードをリセット'}
                </button>
              </form>
              
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setError('');
                    setMessage('');
                    setConfirmationCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  確認コードを再送信する
                </button>
              </div>
            </>
          )}
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href="/login">ログインに戻る</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

