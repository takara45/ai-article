import React, { useState } from 'react';
import type { Article, WordPressCredentials, ArticleStatus } from '../types';
import { XMarkIcon, DocumentTextIcon, PhotoIcon } from './icons/Icons';
import { postToWordPress, isWpProxyConfigured } from '../services/wordpressService';

interface ArticlePreviewModalProps {
  article: Article;
  onClose: () => void;
  wpCredentials: WordPressCredentials;
  onPostStatusUpdate: (status: ArticleStatus) => void;
  userId?: string;
}

const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({ article, onClose, wpCredentials, onPostStatusUpdate }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [postMessage, setPostMessage] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<ArticleStatus>('投稿済み');
  const wpProxyEnabled = isWpProxyConfigured();

  const canPost =
    wpProxyEnabled ||
    (wpCredentials.url && wpCredentials.username && wpCredentials.appPassword);

  const handlePost = async () => {
    if (!canPost) {
      setPostError('WordPress連携設定が未入力です。');
      return;
    }
    setIsPosting(true);
    setPostMessage(null);
    setPostError(null);
    try {
      const status = postStatus === '投稿済み' ? 'publish' : 'draft';
      await postToWordPress({
        credentials: wpCredentials,
        title: article.title,
        contentHtml: article.htmlContent,
        status,
        excerpt: article.metaDescription,
      });
      setPostMessage('投稿に成功しました');
      onPostStatusUpdate(postStatus);
    } catch (err: any) {
      setPostError(err?.message ?? '投稿に失敗しました');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">{article.plan.name} • {new Date(article.createdAt).toLocaleString('ja-JP')}</p>
            <h3 className="text-lg font-semibold text-slate-800">{article.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100"
            aria-label="閉じる"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-4 py-4 space-y-4">
          {article.eyecatchImage ? (
            <img
              src={`data:image/jpeg;base64,${article.eyecatchImage}`}
              alt="アイキャッチ"
              className="w-full rounded-lg object-cover aspect-video"
            />
          ) : (
            <div className="w-full rounded-lg bg-slate-100 aspect-video flex items-center justify-center text-slate-500">
              <PhotoIcon className="w-10 h-10" />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-1">メタディスクリプション</h4>
            <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-3">{article.metaDescription}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">本文</h4>
            <div
              className="prose max-w-none border border-slate-200 rounded-md p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: article.htmlContent || `<p class="text-slate-500">本文が空です</p>` }}
            />
          </div>

          {article.headingImages?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">H2見出し画像</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {article.headingImages.map(({ heading, imageBase64 }) => (
                  <div key={heading}>
                    <img
                      src={`data:image/jpeg;base64,${imageBase64}`}
                      alt={heading}
                      className="w-full h-auto object-cover rounded-lg aspect-[16/9] border"
                    />
                    <p className="text-xs text-slate-600 mt-1">{heading}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">参照元</h4>
            {article.sources && article.sources.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {article.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                      {s.title || s.uri}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 flex items-center space-x-2">
                <DocumentTextIcon className="w-4 h-4" />
                <span>参照元情報はありません</span>
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">WordPressに投稿</h4>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <select
                value={postStatus}
                onChange={(e) => setPostStatus(e.target.value as ArticleStatus)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="下書き">下書きとして保存</option>
                <option value="投稿済み">すぐに公開</option>
              </select>
              <div className="flex-1 text-xs text-slate-500">
                {wpProxyEnabled
                  ? 'WPプロキシ経由で投稿します（CORS設定不要）。'
                  : 'サイトURL/ユーザー名/APP-PASS を入力してください。'}
              </div>
              <button
                onClick={handlePost}
                disabled={isPosting || !canPost}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-slate-400"
              >
                {isPosting ? '投稿中...' : '投稿する'}
              </button>
            </div>
            {postMessage && <p className="text-sm text-green-600 mt-2">{postMessage}</p>}
            {postError && <p className="text-sm text-red-600 mt-2">{postError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlePreviewModal;
