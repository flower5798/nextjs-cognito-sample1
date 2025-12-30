'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserInfoWithPermissions, logout, getAuthSession, refreshTokens } from '@/lib/cognito';
import { getUserPermissions } from '@/lib/permissions';
import Navbar from '@/components/Navbar';
import ProtectedContent from '@/components/ProtectedContent';
import PermissionButton from '@/components/PermissionButton';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      // 少し待ってから認証状態をチェック（トークンが設定されるのを待つ）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = await getUserInfoWithPermissions();
      if (result.success && result.user) {
        setUser(result.user);
        setGroups(result.groups || []);
        
        // 権限情報も取得
        const permInfo = await getUserPermissions();
        setPermissions(permInfo);
        
        setLoading(false);
      } else {
        // 認証セッションも確認してみる
        const sessionResult = await getAuthSession();
        if (sessionResult.success && sessionResult.session?.tokens) {
          // セッションはあるがユーザー情報が取得できない場合、再試行
          setTimeout(async () => {
            const retryResult = await getUserInfoWithPermissions();
            if (retryResult.success && retryResult.user) {
              setUser(retryResult.user);
              setGroups(retryResult.groups || []);
              const permInfo = await getUserPermissions();
              setPermissions(permInfo);
              setLoading(false);
            } else {
              router.push('/login');
              setLoading(false);
            }
          }, 500);
        } else {
          router.push('/login');
          setLoading(false);
        }
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleAdminAction = async () => {
    alert('管理者権限が必要な操作を実行しました');
  };

  const handleEditorAction = async () => {
    alert('編集権限が必要な操作を実行しました');
  };

  const handleDeleteAction = async () => {
    if (confirm('本当に削除しますか？')) {
      alert('削除操作を実行しました（実際の削除処理は実装されていません）');
    }
  };

  const handleRefreshPermissions = async () => {
    try {
      // トークンをリフレッシュして最新の権限情報を取得
      const refreshResult = await refreshTokens();
      if (refreshResult.success) {
        // 最新の権限情報を取得
        const result = await getUserInfoWithPermissions(true);
        if (result.success && result.user) {
          setUser(result.user);
          setGroups(result.groups || []);
          const permInfo = await getUserPermissions(true);
          setPermissions(permInfo);
          alert('権限情報を更新しました');
        }
      } else {
        alert('権限情報の更新に失敗しました: ' + refreshResult.error);
      }
    } catch (error: any) {
      console.error('権限情報の更新エラー:', error);
      alert('権限情報の更新に失敗しました');
    }
  };

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div className="container">
        <div className="card">
          <h1>ダッシュボード</h1>
          <p>ログインに成功しました！</p>
          {user && (
            <div style={{ marginTop: '1.5rem' }}>
              <h2>ユーザー情報</h2>
              <p>
                <strong>ユーザー名:</strong> {user.username}
              </p>
              <p>
                <strong>ユーザーID:</strong> {user.userId}
              </p>
              {groups.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h3>権限情報</h3>
                  <p>
                    <strong>グループ:</strong> {groups.join(', ') || 'なし'}
                  </p>
                  {permissions && (
                    <p>
                      <strong>権限レベル:</strong> {permissions.maxLevel}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 権限に基づいた操作例 */}
          <div style={{ marginTop: '2rem' }}>
            <h2>権限に基づいた操作</h2>
            
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {/* 管理者権限が必要な操作 */}
              <PermissionButton
                requiredPermission="admin"
                onClick={handleAdminAction}
                disabledMessage="この操作には管理者権限が必要です"
              >
                管理者専用操作
              </PermissionButton>

              {/* 編集権限が必要な操作 */}
              <PermissionButton
                requiredPermission="editor"
                onClick={handleEditorAction}
                disabledMessage="この操作には編集権限が必要です"
              >
                編集操作
              </PermissionButton>

              {/* 削除操作（管理者のみ） */}
              <PermissionButton
                requiredPermission="admin"
                onClick={handleDeleteAction}
                className="btn btn-secondary"
                disabledMessage="削除には管理者権限が必要です"
              >
                削除
              </PermissionButton>
            </div>

            {/* 権限に基づいたコンテンツ表示 */}
            <div style={{ marginTop: '2rem' }}>
              <ProtectedContent
                requiredPermission="admin"
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>管理者専用のコンテンツです。管理者権限が必要です。</p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#e7f3ff' }}>
                  <h3>管理者専用コンテンツ</h3>
                  <p>このコンテンツは管理者のみが閲覧できます。</p>
                  <ul>
                    <li>システム設定の変更</li>
                    <li>ユーザー管理</li>
                    <li>ログの確認</li>
                  </ul>
                </div>
              </ProtectedContent>

              <ProtectedContent
                requiredPermission="editor"
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>編集者専用のコンテンツです。編集権限が必要です。</p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#fff3cd' }}>
                  <h3>編集者専用コンテンツ</h3>
                  <p>このコンテンツは編集者以上が閲覧できます。</p>
                  <ul>
                    <li>コンテンツの作成・編集</li>
                    <li>公開設定の変更</li>
                  </ul>
                </div>
              </ProtectedContent>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={handleRefreshPermissions} className="btn btn-secondary">
                権限情報を更新
              </button>
              <button onClick={handleLogout} className="btn btn-secondary">
                ログアウト
              </button>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
              <p>
                💡 <strong>ヒント:</strong> User Poolの設定（グループの追加・削除など）が変更された場合、
                「権限情報を更新」ボタンをクリックして最新の情報を取得してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

