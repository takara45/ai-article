
import React from 'react';
import { Cog8ToothIcon, HomeIcon, ArrowLeftOnRectangleIcon } from './icons/Icons';

interface HeaderProps {
  onSettingsClick: () => void;
  onHomeClick: () => void;
  onSignOut?: () => void;
  userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onHomeClick, onSignOut, userEmail }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={onHomeClick}
        >
          <img src="https://picsum.photos/40/40?random=1" alt="App Logo" className="w-10 h-10 rounded-full" />
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">専門分野特化型AI記事生成</h1>
        </div>
        <div className="flex items-center space-x-4">
          {userEmail && <span className="text-sm text-slate-600">こんにちは、{userEmail}</span>}
          <button onClick={onHomeClick} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label="ダッシュボードへ">
              <HomeIcon className="w-6 h-6 text-slate-600" />
          </button>
          <button onClick={onSettingsClick} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label="WordPress連携設定">
              <Cog8ToothIcon className="w-6 h-6 text-slate-600" />
          </button>
          {onSignOut && (
            <button onClick={onSignOut} className="p-2 rounded-full hover:bg-red-50 transition-colors" aria-label="サインアウト">
              <ArrowLeftOnRectangleIcon className="w-6 h-6 text-red-500" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
