import React from 'react';
import type { Plan, Article } from '../types';
import { PlanType } from '../types';
import { GlobeAltIcon, AcademicCapIcon, DocumentTextIcon, CurrencyYenIcon } from './icons/Icons';

const plans: Plan[] = [
  { type: PlanType.Normal, name: '普通プラン', description: '【オウンドメディア向け】Web上の最新情報を参照し、読者に価値を提供するSEO記事を生成します。', icon: GlobeAltIcon },
  { type: PlanType.Expert, name: '専門プラン', description: '【オウンドメディア向け】専門資料に基づき、権威性と信頼性の高い解説記事を生成します。', icon: AcademicCapIcon },
  { type: PlanType.Affiliate, name: 'アフィリエイト記事プラン', description: '商品の魅力を伝え、読者の購買意欲を高めるレビュー記事や比較記事を生成します。', icon: CurrencyYenIcon },
  { type: PlanType.ForeignLanguage, name: '外国語プラン', description: '英語、中国語、韓国語でオウンドメディア向けの記事を生成します。', icon: GlobeAltIcon },
];

interface DashboardProps {
  onSelectPlan: (plan: Plan) => void;
  articles: Article[];
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

const ArticleHistoryItem: React.FC<{ article: Article }> = ({ article }) => (
    <li className="bg-white p-4 rounded-md shadow-sm border border-slate-200 flex items-center justify-between">
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


const Dashboard: React.FC<DashboardProps> = ({ onSelectPlan, articles }) => {
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
      
      {articles.length > 0 && (
        <section>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">記事生成履歴</h3>
            <ul className="space-y-3">
                {articles.map(article => (
                    <ArticleHistoryItem key={article.id} article={article} />
                ))}
            </ul>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
