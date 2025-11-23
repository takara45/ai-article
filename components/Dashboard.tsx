import React, { useState } from 'react';
import type { Plan, Article, WordPressCredentials, ArticleStatus } from '../types';
import { plans } from '../plans';
import { DocumentTextIcon } from './icons/Icons';
import ArticlePreviewModal from './ArticlePreviewModal';

interface DashboardProps {
  onSelectPlan: (plan: Plan) => void;
  articles: Article[];
  wpCredentials: WordPressCredentials;
  onUpdateArticle: (article: Article) => void;
  userId?: string;
  isLoading?: boolean;
}

const PlanCard: React.FC<{ plan: Plan; onSelect: () => void }> = ({ plan, onSelect }) => (
  <div
    onClick={onSelect}
    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-slate-200 flex flex-col items-center text-center"
  >
    <div className="bg-sky-100 p-4 rounded-full mb-4">
      <plan.icon className="w-8 h-8 text-sky-600" />
    </div>
    <h3 className="text-lg font-semibold text-slate-800 mb-2">{plan.name}</h3>
    <p className="text-sm text-slate-500">{plan.description}</p>
  </div>
);

const ArticleHistoryItem: React.FC<{ article: Article; onClick: () => void }> = ({ article, onClick }) => (
    <li
      className="bg-white p-4 rounded-md shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-sky-400 transition"
      onClick={onClick}
    >
      <div className='flex items-center space-x-4'>
          {article.eyecatchImage ? (
              <img src={`data:image/jpeg;base64,${article.eyecatchImage}`} alt={article.title} className="w-16 h-10 rounded object-cover bg-slate-100" />
          ) : (
              <div className="w-16 h-10 flex items-center justify-center bg-slate-100 rounded">
                  <DocumentTextIcon className="w-6 h-6 text-slate-400" />
              </div>
          )}
          <div>
              <p className="font-medium text-slate-700">{article.title}</p>
              <p className="text-xs text-slate-500">
                  {article.plan.name} • {article.createdAt.toLocaleString('ja-JP')}
              </p>
          </div>
      </div>
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        article.status === '投稿済み' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}>{article.status}</span>
    </li>
  );


const Dashboard: React.FC<DashboardProps> = ({ onSelectPlan, articles, wpCredentials, onUpdateArticle, userId, isLoading }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const handlePostStatusUpdate = (status: ArticleStatus) => {
    if (!selectedArticle) return;
    const updated = { ...selectedArticle, status };
    setSelectedArticle(updated);
    onUpdateArticle(updated);
  };

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">ようこそ！</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">どのプランで記事を生成しますか？プランを選択して、高品質なSEO記事の作成を始めましょう。</p>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map(plan => (
            <PlanCard key={plan.type} plan={plan} onSelect={() => onSelectPlan(plan)} />
          ))}
        </div>
      </section>
      
      {isLoading && (
        <section>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">記事生成履歴</h3>
          <p className="text-sm text-slate-500">履歴を読み込み中です...</p>
        </section>
      )}

      {!isLoading && articles.length > 0 && (
        <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">記事生成履歴</h3>
            <ul className="space-y-3">
                {articles.map(article => (
                    <ArticleHistoryItem key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
                ))}
            </ul>
        </section>
      )}

      {selectedArticle && (
        <ArticlePreviewModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          wpCredentials={wpCredentials}
          onPostStatusUpdate={handlePostStatusUpdate}
          userId={userId}
        />
      )}
    </div>
  );
};

export default Dashboard;
