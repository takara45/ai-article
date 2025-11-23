import { Article, PlanType } from '../types';
import { getPlanByType } from '../plans';
import { getSupabaseClient } from './supabaseClient';

type ArticleRow = {
  id: string;
  title: string;
  content: string;
  html_content: string;
  meta_description: string;
  status: string;
  plan_type: PlanType;
  created_at: string;
  sources: any[];
  eyecatch_image?: string;
  heading_images: any[];
  user_id?: string | null;
};

const toArticle = (row: ArticleRow): Article => ({
  id: row.id,
  title: row.title,
  content: row.content,
  htmlContent: row.html_content,
  metaDescription: row.meta_description,
  status: row.status as Article['status'],
  plan: getPlanByType(row.plan_type),
  createdAt: new Date(row.created_at),
  sources: row.sources ?? [],
  eyecatchImage: row.eyecatch_image,
  headingImages: row.heading_images ?? [],
  userId: row.user_id ?? undefined,
});

export const fetchArticles = async (userId?: string, limit = 50): Promise<Article[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  let query = client
    .from<ArticleRow>('articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (userId) {
    // 以前に保存した user_id なしの履歴も一緒に返す（後方互換）
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabaseから記事を取得できませんでした:', error);
    return [];
  }

  return (data ?? []).map(toArticle);
};

export const saveArticle = async (article: Article, userId?: string): Promise<{ ok: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Supabaseが未設定です' };
  }

  const { error } = await client.from('articles').upsert({
    id: article.id,
    title: article.title,
    content: article.content,
    html_content: article.htmlContent,
    meta_description: article.metaDescription,
    status: article.status,
    plan_type: article.plan.type,
    created_at: article.createdAt.toISOString(),
    sources: article.sources,
    eyecatch_image: article.eyecatchImage,
    heading_images: article.headingImages,
    user_id: userId ?? null,
  });

  if (error) {
    console.error('Supabaseへの記事保存に失敗しました:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
};
