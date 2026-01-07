'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserInfoWithPermissions, logout, getAuthSession, refreshTokens } from '@/lib/cognito';
import { getUserPermissions } from '@/lib/permissions';
import Navbar from '@/components/Navbar';
import ProtectedContent from '@/components/ProtectedContent';
import PermissionButton from '@/components/PermissionButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 少し待ってから認証状態をチェック（トークンが設定されるのを待つ）
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const result = await getUserInfoWithPermissions();
        
        if (result.success && result.user) {
          setUser(result.user);
          setGroups(result.groups || []);
          
          // 権限情報も取得
          try {
            const permInfo = await getUserPermissions();
            setPermissions(permInfo);
          } catch (permError) {
            console.error('権限情報の取得に失敗しました:', permError);
            // 権限情報の取得に失敗しても続行
          }
          
          setLoading(false);
        } else {
          // 認証セッションも確認してみる
          const sessionResult = await getAuthSession();
          
          if (sessionResult.success && sessionResult.session?.tokens) {
            // セッションはあるがユーザー情報が取得できない場合、再試行
            setTimeout(async () => {
              try {
                const retryResult = await getUserInfoWithPermissions();
                
                if (retryResult.success && retryResult.user) {
                  setUser(retryResult.user);
                  setGroups(retryResult.groups || []);
                  try {
                    const permInfo = await getUserPermissions();
                    setPermissions(permInfo);
                  } catch (permError) {
                    console.error('権限情報の取得に失敗しました:', permError);
                  }
                  setLoading(false);
                } else {
                  router.push('/login');
                  setLoading(false);
                }
              } catch (retryError) {
                console.error('再試行エラー:', retryError);
                router.push('/login');
                setLoading(false);
              }
            }, 500);
          } else {
            router.push('/login');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('ユーザー情報の取得エラー:', error);
        router.push('/login');
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // ユーザー情報が取得できた後にAPIリクエストを送信
  useEffect(() => {
    const fetchContent = async () => {
      if (!user) {
        return;
      }

      setContentLoading(true);
      setContentError(null);

      try {
        const response = await fetch('/api/content/0', {
          method: 'GET',
          credentials: 'include', // Cookieを含めるために必要
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('APIレスポンス:', result.data);
          console.log('ステータスコード:', result.statusCode);
          setMarkdownContent(result.data);
        } else {
          console.error('APIリクエストエラー:', result.error);
          setContentError(result.error || 'コンテンツの取得に失敗しました');
        }
      } catch (error: any) {
        console.error('APIリクエストエラー:', error);
        setContentError(error.message || 'コンテンツの取得に失敗しました');
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, [user]);

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
            
            <div style={{ marginTop: '1rem' }}>
              <h4>権限チェック方法の例</h4>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {/* 例1: 定義済みの権限タイプを使用 */}
                <PermissionButton
                  requiredPermission="admin"
                  onClick={handleAdminAction}
                  disabledMessage="この操作には管理者権限が必要です"
                >
                  管理者専用操作
                </PermissionButton>

                {/* 例2: カスタム権限名を使用 */}
                <PermissionButton
                  requiredPermissionName="editor"
                  onClick={handleEditorAction}
                  disabledMessage="この操作にはeditor権限（またはそれ以上の権限）が必要です"
                >
                  編集操作（カスタム権限名）
                </PermissionButton>

                {/* 例3: グループ名を使用 */}
                <PermissionButton
                  requiredGroupName="admin"
                  onClick={handleDeleteAction}
                  className="btn btn-secondary"
                  disabledMessage="削除にはadminグループ（またはそれ以上の権限）が必要です"
                >
                  削除（グループ名）
                </PermissionButton>
              </div>
            </div>

            {/* 権限に基づいたコンテンツ表示 */}
            <div style={{ marginTop: '2rem' }}>
              <h3>権限チェックの例</h3>
              
              {/* 例1: 定義済みの権限タイプを使用 */}
              <ProtectedContent
                requiredPermission="admin"
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>管理者専用のコンテンツです。管理者権限が必要です。</p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#e7f3ff' }}>
                  <h3>管理者専用コンテンツ（定義済み権限）</h3>
                  <p>このコンテンツは管理者のみが閲覧できます。</p>
                  <ul>
                    <li>システム設定の変更</li>
                    <li>ユーザー管理</li>
                    <li>ログの確認</li>
                  </ul>
                </div>
              </ProtectedContent>

              {/* 例2: カスタム権限名を使用 */}
              <ProtectedContent
                requiredPermissionName="editor"
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>編集者専用のコンテンツです。editor権限（またはそれ以上の権限）が必要です。</p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#fff3cd' }}>
                  <h3>編集者専用コンテンツ（カスタム権限名）</h3>
                  <p>このコンテンツはeditor権限以上が閲覧できます。</p>
                  <ul>
                    <li>コンテンツの作成・編集</li>
                    <li>公開設定の変更</li>
                  </ul>
                </div>
              </ProtectedContent>

              {/* 例3: グループ名を使用 */}
              <ProtectedContent
                requiredGroupName="viewer"
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>閲覧者専用のコンテンツです。viewerグループ（またはそれ以上の権限）が必要です。</p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#d1ecf1' }}>
                  <h3>閲覧者専用コンテンツ（グループ名）</h3>
                  <p>このコンテンツはviewerグループ以上が閲覧できます。</p>
                  <ul>
                    <li>コンテンツの閲覧</li>
                    <li>レポートの確認</li>
                  </ul>
                </div>
              </ProtectedContent>

              {/* 例4: 複数の権限名のいずれか（OR条件） */}
              <ProtectedContent
                anyPermissionNames={['editor', 'admin']}
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>編集者または管理者専用のコンテンツです。editorまたはadmin権限が必要です。</p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#d4edda' }}>
                  <h3>編集者または管理者専用コンテンツ（複数権限 - OR条件）</h3>
                  <p>このコンテンツはeditorまたはadmin権限が閲覧できます。</p>
                  <ul>
                    <li>コンテンツ管理</li>
                    <li>設定変更</li>
                  </ul>
                </div>
              </ProtectedContent>

              {/* 例5: 複数の権限名をすべて持っている（AND条件）+ より高い権限も許可 */}
              <ProtectedContent
                allPermissionNames={['editor', 'content-manager']}
                higherPermission="admin"
                fallback={
                  <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                    <p>
                      editor権限<strong>かつ</strong>content-managerグループに属しているか、
                      またはadmin権限が必要です。
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
                      💡 この権限を付与するには、AWS Cognito User Poolで「content-manager」という名前のグループを作成し、
                      ユーザーを「editor」グループと「content-manager」グループの両方に追加してください。
                      または、admin権限を付与してください。
                    </p>
                  </div>
                }
              >
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f0e6ff' }}>
                  <h3>editorかつcontent-manager専用コンテンツ（複数権限 - AND条件）</h3>
                  <p>
                    このコンテンツは以下の条件を満たすユーザーのみが閲覧できます：
                  </p>
                  <ul>
                    <li>editor権限<strong>かつ</strong>content-managerグループに属している</li>
                    <li>または、admin権限を持っている（それより上の権限）</li>
                  </ul>
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ffffff', borderRadius: '4px' }}>
                    <h4>このコンテンツで実行できる操作</h4>
                    <ul>
                      <li>コンテンツの作成・編集・削除</li>
                      <li>コンテンツ管理機能の使用</li>
                      <li>高度な編集機能へのアクセス</li>
                    </ul>
                  </div>
                </div>
              </ProtectedContent>
            </div>
          </div>

          {/* Markdownコンテンツ表示 */}
          <div style={{ marginTop: '2rem' }}>
            <h2>コンテンツ</h2>
            {contentLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>コンテンツを読み込み中...</p>
              </div>
            )}
            {contentError && (
              <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8d7da', color: '#721c24' }}>
                <p><strong>エラー:</strong> {contentError}</p>
              </div>
            )}
            {!contentLoading && !contentError && markdownContent && (
              <div className="card" style={{ marginTop: '1rem' }}>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {!contentLoading && !contentError && !markdownContent && (
              <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
                <p>コンテンツがありません</p>
              </div>
            )}
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
              <p style={{ marginTop: '0.5rem' }}>
                📖 <strong>カスタム権限の付与方法:</strong>{' '}
                <a href="/admin" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                  管理者ページ
                </a>
                でカスタム権限の使用例を確認できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

