'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserInfoWithPermissions, logout } from '@/lib/cognito';
import { getUserGroups } from '@/lib/permissions';
import ProtectedContent from '@/components/ProtectedContent';
import Navbar from '@/components/Navbar';

/**
 * 管理者ページの例
 * カスタム権限の使用例を示します
 */
export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = await getUserInfoWithPermissions();
      if (result.success && result.user) {
        setUser(result.user);
        setGroups(result.groups || []);
        setLoading(false);
      } else {
        router.push('/login');
        setLoading(false);
      }
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
          <h1>管理者ページ</h1>
          <p>このページは管理者権限が必要です。</p>
          
          {user && (
            <div style={{ marginTop: '1.5rem' }}>
              <h2>ユーザー情報</h2>
              <p>
                <strong>ユーザー名:</strong> {user.username}
              </p>
              {groups.length > 0 && (
                <p>
                  <strong>所属グループ:</strong> {groups.join(', ') || 'なし'}
                </p>
              )}
            </div>
          )}

          {/* カスタム権限の使用例 */}
          <div style={{ marginTop: '2rem' }}>
            <h2>カスタム権限の使用例</h2>
            
            {/* 例1: カスタム権限名を使用 */}
            <ProtectedContent
              requiredPermissionName="content-manager"
              fallback={
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                  <p>content-manager権限が必要です。</p>
                  <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
                    💡 この権限を付与するには、AWS Cognito User Poolで「content-manager」という名前のグループを作成し、
                    ユーザーをそのグループに追加してください。
                  </p>
                </div>
              }
            >
              <div className="card" style={{ marginTop: '1rem', backgroundColor: '#e7f3ff' }}>
                <h3>コンテンツ管理機能</h3>
                <p>このコンテンツはcontent-manager権限を持つユーザーのみが閲覧できます。</p>
                <ul>
                  <li>コンテンツの作成・編集・削除</li>
                  <li>公開設定の変更</li>
                  <li>コンテンツの承認</li>
                </ul>
              </div>
            </ProtectedContent>

            {/* 例2: 複数のカスタム権限名のいずれか */}
            <ProtectedContent
              anyPermissionNames={['moderator', 'admin']}
              fallback={
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                  <p>moderatorまたはadmin権限が必要です。</p>
                  <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
                    💡 この権限を付与するには、AWS Cognito User Poolで「moderator」または「admin」という名前のグループを作成し、
                    ユーザーをそのグループに追加してください。
                  </p>
                </div>
              }
            >
              <div className="card" style={{ marginTop: '1rem', backgroundColor: '#fff3cd' }}>
                <h3>モデレーション機能</h3>
                <p>このコンテンツはmoderatorまたはadmin権限を持つユーザーのみが閲覧できます。</p>
                <ul>
                  <li>コメントの承認・削除</li>
                  <li>ユーザーの警告</li>
                  <li>コンテンツの報告処理</li>
                </ul>
              </div>
            </ProtectedContent>
          </div>
        </div>
      </div>
    </>
  );
}

