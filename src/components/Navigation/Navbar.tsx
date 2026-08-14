import React, { useState } from 'react';
import { 
  MessageSquare, 
  Home, 
  Users, 
  User as UserIcon, 
  Sun, 
  Moon, 
  LogOut, 
  Bell, 
  Sparkles, 
  ShieldCheck, 
  Search 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationsPopover } from '../Notifications/NotificationsPopover';
import { AboutAppModal } from '../AboutAppModal';
import { ActiveTab } from '../../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, unreadCount = 0 }) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-900/60 backdrop-blur-2xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setShowAboutModal(true)} 
          className="flex items-center space-x-3 cursor-pointer group"
          title="Click to view About CHAT IN HB"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform overflow-hidden">
            <img
              src="/src/assets/images/app_logo_hb_1785541679338.jpg"
              alt="HB Logo"
              className="w-full h-full object-cover rounded-[10px]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              CHAT IN HB
            </span>
            <span className="text-[9px] font-bold text-purple-400 -mt-1 tracking-widest uppercase">
              Social Hub
            </span>
          </div>
        </div>

        {/* Primary Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center space-x-1 bg-white/5 backdrop-blur-lg p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'home'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'chats'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-pink-500 text-white font-black rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
          </button>

          <button
            onClick={() => setActiveTab('stories')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'stories'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Stories</span>
          </button>

          {userProfile?.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-indigo-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50">
                <NotificationsPopover onClose={() => setShowNotifications(false)} onNavigateTab={setActiveTab} />
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 transition-colors"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
          </button>

          {/* User Profile Button */}
          {userProfile && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2.5 p-1.5 pl-2.5 pr-3 rounded-full border transition-all ${
                activeTab === 'profile'
                  ? 'border-indigo-400/60 bg-indigo-600/20 shadow-lg shadow-indigo-600/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-800 ring-2 ring-indigo-500/40">
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-950" />
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                {userProfile.displayName}
              </span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AboutAppModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        onOpenSettingsAbout={() => setActiveTab('settings')}
      />
    </header>
  );
};
