import type { WordPressCredentials } from '../types';

export type WordPressStatus = 'draft' | 'publish';

export interface PostToWordPressParams {
  credentials: WordPressCredentials;
  title: string;
  contentHtml: string;
  status: WordPressStatus;
  excerpt?: string;
}

const getEnv = (name: string): string | undefined => {
  return (import.meta as any).env?.[name] ?? process.env?.[name];
};

export const isWpProxyConfigured = (): boolean => {
  return Boolean(getEnv('VITE_WP_PROXY_URL'));
};

export const testWordPressConnection = async (credentials: WordPressCredentials): Promise<{ ok: boolean; message?: string }> => {
  const proxyUrl = getEnv('VITE_WP_PROXY_URL');
  const proxyKey = getEnv('VITE_WP_PROXY_KEY');

  // プロキシ経由が推奨。直接はCORSで失敗する可能性が高い。
  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(proxyKey ? { 'x-wp-proxy-key': proxyKey } : {}),
      },
      body: JSON.stringify({
        test: true,
        credentials,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: text || `Proxy error ${res.status}` };
    }
    const json = await res.json();
    return { ok: true, message: `接続成功: ${json?.user?.name ?? 'OK'}` };
  }

  // 直接テスト（CORS許可が必要）
  const { url, username, appPassword } = credentials;
  if (!url || !username || !appPassword) {
    return { ok: false, message: 'URL / ユーザー名 / APP-PASS を入力してください' };
  }
  try {
    const endpoint = `${url.replace(/\/+$/, '')}/wp-json/wp/v2/users/me`;
    const auth = btoa(`${username}:${appPassword}`);
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: text || `WP error ${res.status}` };
    }
    return { ok: true, message: '接続成功' };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? '接続に失敗しました' };
  }
};

export const postToWordPress = async ({
  credentials,
  title,
  contentHtml,
  status,
  excerpt,
}: PostToWordPressParams): Promise<{ id: number; link: string }> => {
  const proxyUrl = getEnv('VITE_WP_PROXY_URL');
  const proxyKey = getEnv('VITE_WP_PROXY_KEY');

  // プロキシ経由（Supabase Edge Functions 等）で投稿する場合
  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(proxyKey ? { 'x-wp-proxy-key': proxyKey } : {}),
      },
      body: JSON.stringify({
        title,
        contentHtml,
        status,
        excerpt,
        credentials, // プロキシ側が環境変数を使う場合は無視される想定
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WordPressプロキシへの投稿に失敗しました (${res.status}): ${text}`);
    }
    const json = await res.json();
    return { id: json.id, link: json.link };
  }

  // 直接 WordPress REST API に投稿する場合（CORS許可が必要）
  const { url, username, appPassword } = credentials;
  if (!url || !username || !appPassword) {
    throw new Error('WordPressの接続情報が不足しています。設定を確認してください。');
  }

  const endpoint = `${url.replace(/\/+$/, '')}/wp-json/wp/v2/posts`;
  const auth = btoa(`${username}:${appPassword}`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      title,
      content: contentHtml,
      status,
      excerpt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPressへの投稿に失敗しました (${res.status}): ${text}`);
  }

  const json = await res.json();
  return { id: json.id, link: json.link };
};
