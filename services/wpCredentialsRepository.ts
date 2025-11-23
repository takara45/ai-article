import type { WordPressCredentials } from '../types';
import { getSupabaseClient } from './supabaseClient';

export const fetchWpCredentials = async (userId?: string): Promise<WordPressCredentials | null> => {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  const { data, error } = await client
    .from('wp_credentials')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('SupabaseからWP設定を取得できませんでした:', error);
    return null;
  }

  if (!data) return null;

  return {
    siteName: data.site_name ?? '',
    url: data.url ?? '',
    username: data.username ?? '',
    appPassword: data.app_password ?? '',
  };
};

export const saveWpCredentials = async (userId: string, creds: WordPressCredentials): Promise<{ ok: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase未設定' };

  const { error } = await client.from('wp_credentials').upsert({
    user_id: userId,
    site_name: creds.siteName ?? '',
    url: creds.url,
    username: creds.username,
    app_password: creds.appPassword,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('SupabaseへのWP設定保存に失敗しました:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
};
