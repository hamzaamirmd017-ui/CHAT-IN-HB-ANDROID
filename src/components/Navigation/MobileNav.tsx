import React from 'react';
import { Home, MessageSquare, Users, User as UserIcon } from 'lucide-react';
import { ActiveTab } from '../../types';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onHomeClick?: () => void;
  unreadChatsCount?: number;
  unreadNotificationsCount?: number;
  friendRequestsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  onHomeClick,
  unreadChatsCount = 0,
  unreadNotificationsCount = 0,
  friendRequestsCount = 0
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-bottomnav)] text-[var(--text-main)] border-t border-[var(--border-color)] px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-xl">
      <div className="grid grid-cols-4 items-center w-full">
        
        {/* 1. Home */}
        <button
          onClick={() => {
            if (onHomeClick) {
              onHomeClick();
            } else {
              setActiveTab('home');
            }
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-2 transition-all relative ${
            activeTab === 'home' 
              ? 'text-purple-600 dark:text-fuchsia-400 font-extrabold' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          {activeTab === 'home' && (
            <div className="absolute top-0 w-8 h-0.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          )}
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* 2. Friends */}
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-2 transition-all relative ${
            activeTab === 'friends' 
              ? 'text-purple-600 dark:text-fuchsia-400 font-extrabold' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          {activeTab === 'friends' && (
            <div className="absolute top-0 w-8 h-0.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          )}
          <div className="relative">
            <Users className="w-5 h-5" />
            {friendRequestsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[8px] bg-fuchsia-500 text-white font-black rounded-full animate-pulse">
                {friendRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Friends</span>
        </button>

        {/* 3. Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-2 transition-all relative ${
            activeTab === 'profile' 
              ? 'text-purple-600 dark:text-fuchsia-400 font-extrabold' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          {activeTab === 'profile' && (
            <div className="absolute top-0 w-8 h-0.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          )}
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>

        {/* 4. Chat */}
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-2 transition-all relative ${
            activeTab === 'chats' 
              ? 'text-purple-600 dark:text-fuchsia-400 font-extrabold' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          {activeTab === 'chats' && (
            <div className="absolute top-0 w-8 h-0.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
          )}
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadChatsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[8px] bg-fuchsia-500 text-white font-black rounded-full animate-pulse">
                {unreadChatsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Chat</span>
        </button>

      </div>
    </div>
  );
};


