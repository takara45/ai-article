import React, { useState, useCallback, useEffect } from 'react';
import type { Plan, Article, WordPressCredentials } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ArticleGenerator from './components/ArticleGenerator';
import WordPressSettingsModal from './components/WordPressSettingsModal';
import { fetchArticles } from './services/articleRepository';
import { getSupabaseClient, isSupabaseConfigured } from './services/supabaseClient';
import AuthForm from './components/AuthForm';
import type { Session } from '@supabase/supabase-js';
import { saveArticle } from './services/articleRepository';
import { fetchWpCredentials, saveWpCredentials } from './services/wpCredentialsRepository';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'generator'>('dashboard');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wpCredentials, setWpCredentials] = useState<WordPressCredentials>({
    siteName: '',
    url: '',
    username: '',
    appPassword: '',
  });
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoadingWpCreds, setIsLoadingWpCreds] = useState(false);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  const handleSelectPlan = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentView('generator');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedPlan(null);
  }, []);

  const addArticleToHistory = useCallback((article: Article) => {
    setArticles(prev => [article, ...prev]);
  }, []);

  const updateArticle = useCallback((article: Article) => {
    setArticles(prev => {
      const exists = prev.findIndex(a => a.id === article.id);
      if (exists === -1) return [article, ...prev];
      const next = [...prev];
      next[exists] = article;
      return next;
    });
    saveArticle(article, session?.user.id).catch((err) => {
      console.error('Supabaseへの記事更新に失敗しました:', err);
    });
  }, [session?.user.id]);

  const handleSaveWpCreds = useCallback((creds: WordPressCredentials) => {
    setWpCredentials(creds);
    if (session?.user.id) {
      saveWpCredentials(session.user.id, creds).catch((err) => {
        console.error('SupabaseへのWP設定保存に失敗しました:', err);
      });
    }
  }, [session?.user.id]);

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
  };

  // 認証状態の初期化と購読
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true); // Supabase未設定なら認証フローをスキップ
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setAuthReady(true);
      return;
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthReady(true);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  // 記事の読み込み（ログインユーザーごと）
  useEffect(() => {
    let isMounted = true;
    setIsLoadingArticles(true);
    fetchArticles(session?.user.id, 50)
      .then((fetched) => {
        if (isMounted && fetched.length > 0) {
          setArticles(fetched);
        } else if (isMounted && fetched.length === 0) {
          setArticles([]);
        }
      })
      .catch((err) => {
        console.error('Supabaseからの記事取得に失敗しました:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingArticles(false);
      });
    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  // WordPress設定の読み込み
  useEffect(() => {
    let isMounted = true;
    if (!session?.user.id) {
      setWpCredentials({ siteName: '', url: '', username: '', appPassword: '' });
      return;
    }
    setIsLoadingWpCreds(true);
    fetchWpCredentials(session.user.id)
      .then((creds) => {
        if (isMounted && creds) {
          setWpCredentials(creds);
        }
      })
      .catch((err) => {
        console.error('SupabaseからWP設定取得に失敗しました:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingWpCreds(false);
      });
    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const requireAuth = isSupabaseConfigured();

  if (requireAuth && !authReady) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">読み込み中...</div>;
  }

  if (requireAuth && authReady && !session) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        onHomeClick={handleBackToDashboard}
        onSignOut={requireAuth ? handleSignOut : undefined}
        userEmail={session?.user.email ?? undefined}
      />
      <main className="container mx-auto p-4 md:p-8">
        {currentView === 'dashboard' && (
          <Dashboard
            onSelectPlan={handleSelectPlan}
            articles={articles}
            wpCredentials={wpCredentials}
            onUpdateArticle={updateArticle}
            userId={session?.user.id}
            isLoading={isLoadingArticles}
          />
        )}
        {currentView === 'generator' && selectedPlan && (
          <ArticleGenerator
            plan={selectedPlan}
            onBack={handleBackToDashboard}
            onArticleGenerated={addArticleToHistory}
            wpCredentials={wpCredentials}
            userId={session?.user.id}
          />
        )}
      </main>
      <WordPressSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        credentials={wpCredentials}
        onSave={handleSaveWpCreds}
      />
    </div>
  );
};

export default App;
