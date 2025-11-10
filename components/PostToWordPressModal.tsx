
import React, { useState } from 'react';
import { XMarkIcon } from './icons/Icons';
import type { ArticleStatus } from '../types';

interface PostToWordPressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (status: ArticleStatus) => void;
  articleTitle: string;
}

const PostToWordPressModal: React.FC<PostToWordPressModalProps> = ({ isOpen, onClose, onPost, articleTitle }) => {
  const [status, setStatus] = useState<ArticleStatus>('下書き');
  const [categories, setCategories] = useState('');
  const [tags, setTags] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePost = () => {
    setIsPosting(true);
    // NOTE: This is a mock posting process. In a real application, this would
    // make an API call to the WordPress site to create a new post with the
    // article content, title, status, categories, and tags.
    // This requires a backend proxy to avoid CORS issues and to secure credentials.
    setTimeout(() => {
        setIsPosting(false);
        setPostSuccess(true);
        setTimeout(() => {
            onPost(status);
        }, 1500); // Wait a bit before closing modal to show success message
    }, 2000);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4" onClick={e => e.stopPropagation()}>
        {!postSuccess ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">WordPressに投稿</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-2">タイトル: <span className="font-semibold">{articleTitle}</span></p>

            <div className="space-y-4 mt-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">投稿ステータス</label>
                    <div className="flex space-x-4">
                        <button onClick={() => setStatus('下書き')} className={`px-4 py-2 rounded-md text-sm w-full ${status === '下書き' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-800'}`}>下書きとして保存</button>
                        <button onClick={() => setStatus('投稿済み')} className={`px-4 py-2 rounded-md text-sm w-full ${status === '投稿済み' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-800'}`}>すぐに公開</button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">カテゴリ (カンマ区切り)</label>
                    <input
                    type="text"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    placeholder="例: 法律, 相続"
                    className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">タグ (カンマ区切り)</label>
                    <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="例: 弁護士, 税金"
                    className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                    />
                </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handlePost}
                disabled={isPosting}
                className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-green-700 transition-colors disabled:bg-slate-400"
              >
                {isPosting ? '投稿中...' : '投稿を実行'}
              </button>
            </div>
          </>
        ) : (
            <div className="text-center py-10">
                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-slate-900">投稿が完了しました！</h3>
                <p className="mt-2 text-sm text-slate-500">
                    WordPressサイトでご確認ください。ダッシュボードに戻ります...
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PostToWordPressModal;