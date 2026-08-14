import React from 'react';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Sparkles, 
  Bookmark, 
  UsersRound, 
  Calendar, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from '../../types';

interface LeftSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onHomeClick?: () => void;
  unreadChatsCount?: number;
  unreadNotificationsCount?: number;
  friendRequestsCount?: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  setActiveTab,
  onHomeClick,
  unreadChatsCount = 0,
  unreadNotificationsCount = 0,
  friendRequestsCount = 0
}) => {
  const { userProfile, logout } = useAuth();

  // LEFT SIDEBAR requested items ONLY: Home, Friends, Chat, Stories, Saved, Groups, Events. No Settings.
  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home, color: 'text-purple-400' },
    { id: 'friends' as ActiveTab, label: 'Friends', icon: Users, badge: friendRequestsCount, color: 'text-fuchsia-400' },
    { id: 'chats' as ActiveTab, label: 'Chat', icon: MessageSquare, badge: unreadChatsCount, color: 'text-violet-400' },
    { id: 'stories' as ActiveTab, label: 'Stories', icon: Sparkles, color: 'text-purple-300' },
    { id: 'saved' as ActiveTab, label: 'Saved', icon: Bookmark, color: 'text-fuchsia-300' },
    { id: 'groups' as ActiveTab, label: 'Groups', icon: UsersRound, color: 'text-indigo-400' },
    { id: 'events' as ActiveTab, label: 'Events', icon: Calendar, color: 'text-pink-400' },
  ];

  return (
    <aside className="w-64 lg:w-72 hidden md:flex flex-col space-y-4 py-4 pr-2 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar select-none">
      
      {/* User Quick Profile Card */}
      {userProfile && (
        <button
          onClick={() => setActiveTab('profile')}
          className={`group w-full p-3.5 rounded-3xl transition-all duration-300 border flex items-center justify-between text-left ${
            activeTab === 'profile'
              ? 'bg-gradient-to-r from-purple-600/30 via-fuchsia-600/20 to-purple-600/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              : 'bg-[var(--bg-card)] hover:bg-[var(--bg-input)] border-[var(--border-color)]'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-black/20 ring-2 ring-purple-500/40 flex-shrink-0">
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div 
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-black flex items-center justify-center transition-all ${
                  (userProfile.presence === 'online' || (userProfile.presence === undefined && userProfile.isOnline))
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                    : userProfile.presence === 'away'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                    : 'bg-slate-500'
                }`}
                title={
                  (userProfile.presence === 'online' || (userProfile.presence === undefined && userProfile.isOnline))
                    ? 'Online'
                    : userProfile.presence === 'away'
                    ? 'Away'
                    : 'Offline'
                }
              >
                {(userProfile.presence === 'online' || (userProfile.presence === undefined && userProfile.isOnline)) && (
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs text-[var(--text-main)] truncate group-hover:text-purple-500 transition-colors">
                {userProfile.displayName}
              </h4>
              <p className="text-[10px] font-semibold text-purple-500 dark:text-purple-400 truncate">
                {userProfile.username || '@member'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-purple-400/60 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </button>
      )}

      {/* Main Navigation List */}
      <div className="space-y-1 bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-2 rounded-3xl shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = (item.badge || 0) > 0;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'home' && onHomeClick) {
                  onHomeClick();
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 group text-left ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/30 via-fuchsia-600/25 to-violet-600/20 text-purple-600 dark:text-white font-extrabold border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className={`p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] transition-all ${isActive ? 'bg-purple-600/30 border-purple-400/50' : 'group-hover:border-purple-500/30'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-500 dark:text-purple-300' : item.color}`} />
                </div>
                <span className="text-xs font-semibold truncate tracking-wide">
                  {item.label}
                </span>
              </div>

              {hasBadge && (
                <span className="px-2 py-0.5 text-[10px] bg-fuchsia-500 text-white font-black rounded-full shadow-[0_0_8px_#d946ef] animate-pulse">
                  {item.badge! > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer info & Sign Out */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl space-y-2 text-[11px] text-[var(--text-secondary)]">
        <p className="font-bold text-[var(--text-main)] text-xs flex items-center justify-between">
          <span>CHAT IN HB</span>
          <span className="text-[10px] font-bold text-purple-500 dark:text-purple-400">PRO</span>
        </p>
        <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
          Social Network & Messenger
        </p>
        <button
          onClick={logout}
          className="w-full mt-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-bold border border-red-500/20 flex items-center justify-center space-x-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  );
};

