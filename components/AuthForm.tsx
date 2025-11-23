import React, { useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';

type Mode = 'login' | 'signup';

const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabaseが未設定です。環境変数を確認してください。');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setMessage('ログインしました。');
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setMessage('サインアップしました。確認メールをチェックしてください。');
      }
    } catch (err: any) {
      setError(err?.message ?? '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{mode === 'login' ? 'ログイン' : 'サインアップ'}</h2>
        <p className="text-sm text-slate-600 mb-4">Supabaseのメール/パスワード認証を利用します。</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-3 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-3 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">{error}</div>}
          {message && <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">{message}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition disabled:bg-slate-400"
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'サインアップ'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-sky-600 hover:underline"
          >
            {mode === 'login' ? 'アカウントをお持ちでない場合はこちら' : 'すでにアカウントをお持ちの場合はこちら'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
