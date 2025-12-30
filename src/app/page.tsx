import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <h1>Next.js Cognito サンプル</h1>
      <p>このアプリケーションはAWS Cognitoを使用した認証サンプルです。</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/login" className="btn btn-primary">
          ログイン
        </Link>
      </div>
    </div>
  );
}

