import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

const getEnv = (name: string): string | undefined => {
  // Vite exposes env vars via import.meta.env on the client
  // Fallback to process.env for tooling contexts
  return (import.meta as any).env?.[name] ?? process.env?.[name];
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabase) return supabase;

  const url = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    console.warn('Supabaseクライアントは未設定です。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。');
    return null;
  }

  supabase = createClient(url, anonKey);
  return supabase;
};

export const isSupabaseConfigured = (): boolean => {
  const url = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  return Boolean(url && anonKey);
};
