'use client';

import Link from 'next/link';

interface NavbarProps {
  onLogout: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  return (
    <nav className="navbar">
      <div>
        <Link href="/dashboard">ダッシュボード</Link>
        <Link href="/courses">コース一覧</Link>
        <Link href="/profile">プロフィール</Link>
      </div>
      <div>
        <button onClick={onLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
          ログアウト
        </button>
      </div>
    </nav>
  );
}

