import React, { useState, useCallback } from 'react';
import type { Plan, Article, WordPressCredentials } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ArticleGenerator from './components/ArticleGenerator';
import WordPressSettingsModal from './components/WordPressSettingsModal';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'generator'>('dashboard');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wpCredentials, setWpCredentials] = useState<WordPressCredentials>({
    url: '',
    username: '',
    appPassword: '',
  });

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} onHomeClick={handleBackToDashboard} />
      <main className="container mx-auto p-4 md:p-8">
        {currentView === 'dashboard' && (
          <Dashboard onSelectPlan={handleSelectPlan} articles={articles} />
        )}
        {currentView === 'generator' && selectedPlan && (
          <ArticleGenerator
            plan={selectedPlan}
            onBack={handleBackToDashboard}
            onArticleGenerated={addArticleToHistory}
            wpCredentials={wpCredentials}
          />
        )}
      </main>
      <WordPressSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        credentials={wpCredentials}
        onSave={setWpCredentials}
      />
    </div>
  );
};

export default App;
