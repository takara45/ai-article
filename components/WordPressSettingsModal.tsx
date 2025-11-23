
import React, { useState, useEffect } from 'react';
import type { WordPressCredentials } from '../types';
import { XMarkIcon, CheckCircleIcon } from './icons/Icons';
import { testWordPressConnection, isWpProxyConfigured } from '../services/wordpressService';

interface WordPressSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: WordPressCredentials;
  onSave: (credentials: WordPressCredentials) => void;
}

const WordPressSettingsModal: React.FC<WordPressSettingsModalProps> = ({ isOpen, onClose, credentials, onSave }) => {
  const [localCreds, setLocalCreds] = useState<WordPressCredentials>(credentials);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalCreds(credentials);
  }, [credentials, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalCreds(prev => ({ ...prev, [name]: value }));
    setTestResult(null);
  };

  const handleSave = () => {
    onSave(localCreds);
    onClose();
  };
  
  const handleTestConnection = async () => {
      setIsTesting(true);
      setTestResult(null);
      setTestMessage(null);
      const result = await testWordPressConnection(localCreds);
      setIsTesting(false);
      if (result.ok) {
        setTestResult('success');
        setTestMessage(result.message ?? '接続に成功しました');
      } else {
        setTestResult('error');
        setTestMessage(result.message ?? '接続に失敗しました');
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">WordPress連携設定</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">
            記事を直接投稿するために、WordPressサイトの情報を入力してください。
            <a href="#" className="text-sky-600 hover:underline">アプリケーションパスワードの取得方法</a>
            {isWpProxyConfigured() && (
              <span className="block text-xs text-slate-500 mt-1">WPプロキシが有効です。CORS設定なしで接続テスト・投稿できます。</span>
            )}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">サイト名</label>
            <input
              type="text"
              name="siteName"
              value={localCreds.siteName || ''}
              onChange={handleChange}
              placeholder="例: 月刊副業"
              className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">WordPressサイトURL</label>
            <input
              type="url"
              name="url"
              value={localCreds.url}
              onChange={handleChange}
              placeholder="https://example.com"
              className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">WordPressユーザー名</label>
            <input
              type="text"
              name="username"
              value={localCreds.username}
              onChange={handleChange}
              placeholder="your_username"
              className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">アプリケーションパスワード</label>
            <input
              type="password"
              name="appPassword"
              value={localCreds.appPassword}
              onChange={handleChange}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
            <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 disabled:opacity-50"
            >
                {isTesting ? 'テスト中...' : '接続テスト'}
            </button>
            {testResult === 'success' && <span className="text-sm text-green-600 flex items-center"><CheckCircleIcon className="w-5 h-5 mr-1" />{testMessage ?? '接続に成功しました'}</span>}
            {testResult === 'error' && <span className="text-sm text-red-600">{testMessage ?? '接続に失敗しました'}</span>}
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordPressSettingsModal;
