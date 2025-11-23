import { Plan, PlanType } from './types';
import { GlobeAltIcon, AcademicCapIcon, CurrencyYenIcon } from './components/icons/Icons';

export const plans: Plan[] = [
  { type: PlanType.Normal, name: '普通プラン', description: '【オウンドメディア向け】Web上の最新情報を参照し、読者に価値を提供するSEO記事を生成します。', icon: GlobeAltIcon },
  { type: PlanType.Expert, name: '専門プラン', description: '【オウンドメディア向け】専門資料に基づき、権威性と信頼性の高い解説記事を生成します。', icon: AcademicCapIcon },
  { type: PlanType.Affiliate, name: 'アフィリエイト記事プラン', description: '商品の魅力を伝え、読者の購買意欲を高めるレビュー記事や比較記事を生成します。', icon: CurrencyYenIcon },
  { type: PlanType.ForeignLanguage, name: '外国語プラン', description: '英語、中国語、韓国語でオウンドメディア向けの記事を生成します。', icon: GlobeAltIcon },
];

const planByType: Record<PlanType, Plan> = plans.reduce((acc, plan) => {
  acc[plan.type] = plan;
  return acc;
}, {} as Record<PlanType, Plan>);

export const getPlanByType = (type: PlanType): Plan => {
  return planByType[type];
};
