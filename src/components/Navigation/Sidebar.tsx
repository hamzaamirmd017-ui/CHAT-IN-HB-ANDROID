import React from 'react';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Bell, 
  Sparkles, 
  Search, 
  PhoneCall, 
  User, 
  Settings, 
  ShieldCheck, 
  Sun, 
  Moon, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ActiveTab } from '../../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadChatsCount?: number;
  unreadNotificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadChatsCount = 0,
  unreadNotificationsCount = 0
}) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home },
    { id: 'chats' as ActiveTab, label: 'Chat', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'friends' as ActiveTab, label: 'Friends', icon: Users },
    { id: 'notifications' as ActiveTab, label: 'Notifications', icon: Bell, badge: unreadNotificationsCount },
    { id: 'stories' as ActiveTab, label: 'Stories', icon: Sparkles },
    { id: 'search' as ActiveTab, label: 'Search', icon: Search },
    { id: 'calls' as ActiveTab, label: 'Calls', icon: PhoneCall },
    { id: 'profile' as ActiveTab, label: 'Profile', icon: User },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  if (userProfile?.isAdmin) {
    navItems.push({ id: 'admin' as ActiveTab, label: 'Admin', icon: ShieldCheck });
  }

  return (
    <>
      {/* Desktop Left Vertical Sidebar (Fixed 80px Width) */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-20 z-50 bg-slate-950/85 backdrop-blur-2xl border-r border-slate-800/80 flex-col items-center justify-between py-5 shadow-[5px_0_30px_rgba(0,0,0,0.5)] select-none">
        
        {/* Top: Brand Logo */}
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={() => setActiveTab('home')}
            className="group relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-105 transition-all duration-300"
            title="Connect Chat"
          >
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            {/* Tooltip */}
            <div className="absolute left-20 top-2.5 bg-slate-900 border border-slate-700/80 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
              Connect Chat
            </div>
          </button>

          <div className="w-10 h-px bg-slate-800/80" />
        </div>

        {/* Center: Main Navigation Icons */}
        <nav className="flex-1 my-3 flex flex-col items-center space-y-2 overflow-y-auto no-scrollbar py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasBadge = (item.badge || 0) > 0;

            return (
              <div key={item.id} className="relative group flex items-center">
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute -left-3 top-2 bottom-2 w-1.5 bg-cyan-400 rounded-r-full shadow-[0_0_12px_#22d3ee]" />
                )}

                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`relative p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'bg-gradient-to-tr from-cyan-600/30 via-indigo-600/30 to-purple-600/20 text-cyan-400 border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.35)] scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-cyan-400' : ''}`} />

                  {/* Badge */}
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] bg-pink-500 text-white font-black rounded-full shadow-[0_0_8px_#ec4899] animate-pulse">
                      {item.badge! > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>

                {/* Tooltip on Hover */}
                <div className="absolute left-20 bg-slate-900 border border-slate-700/80 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom: Profile / Theme / Logout */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="w-10 h-px bg-slate-800/80" />

          {/* Theme Toggle */}
          <div className="relative group">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-all duration-200"
              title="Toggle Theme Mode"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </button>
            <div className="absolute left-20 bg-slate-900 border border-slate-700/80 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </div>
          </div>

          {/* User Profile Avatar */}
          {userProfile && (
            <div className="relative group">
              <button
                onClick={() => setActiveTab('profile')}
                className={`relative w-10 h-10 rounded-2xl overflow-hidden ring-2 transition-all duration-300 ${
                  activeTab === 'profile'
                    ? 'ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105'
                    : 'ring-white/10 hover:ring-white/40'
                }`}
              >
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-950" />
              </button>
              <div className="absolute left-20 bg-slate-900 border border-slate-700/80 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                {userProfile.displayName}
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="relative group">
            <button
              onClick={logout}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="absolute left-20 bg-slate-900 border border-slate-700/80 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
              Log Out
            </div>
          </div>

        </div>

      </aside>

      {/* Mobile Bottom Dock Bar (Responsive for Mobile Screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 py-2 shadow-[0_-5px_25px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-around overflow-x-auto no-scrollbar space-x-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasBadge = (item.badge || 0) > 0;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all min-w-[52px] ${
                  isActive
                    ? 'text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[8px] bg-pink-500 text-white font-black rounded-full animate-pulse">
                      {item.badge! > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] mt-0.5 truncate max-w-[50px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
