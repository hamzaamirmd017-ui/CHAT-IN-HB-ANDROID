import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Bell, 
  User, 
  MoreVertical, 
  Search, 
  Sparkles, 
  Bookmark, 
  UsersRound, 
  Calendar, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  X,
  MessageCircle,
  UserCog,
  ShieldCheck,
  Lock,
  Globe,
  Ban,
  KeyRound,
  Archive,
  Download,
  HelpCircle,
  Info,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ActiveTab } from '../../types';
import { InstallAppModal } from '../InstallAppModal';
import { AboutAppModal } from '../AboutAppModal';

interface TopNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onHomeClick?: () => void;
  unreadChatsCount?: number;
  unreadNotificationsCount?: number;
  friendRequestsCount?: number;
  onSearchSubmit?: (query: string) => void;
  onNavigateSettingsSection?: (section: string) => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  setActiveTab,
  onHomeClick,
  unreadChatsCount = 0,
  unreadNotificationsCount = 0,
  friendRequestsCount = 0,
  onSearchSubmit,
  onNavigateSettingsSection
}) => {
  const { userProfile, logout } = useAuth();
  const { theme, activeTheme, toggleTheme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchQuery.trim());
      }
      setActiveTab('search');
    }
  };

  const handleDownloadData = () => {
    if (!userProfile) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chat_in_hb_data_${userProfile.username || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Center Navigation Icons in exact order: Home -> Friends -> Profile -> Chat
  const navCenterTabs = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home },
    { id: 'friends' as ActiveTab, label: 'Friends', icon: Users, badge: friendRequestsCount },
    { id: 'profile' as ActiveTab, label: 'Profile', icon: User },
    { id: 'chats' as ActiveTab, label: 'Chat', icon: MessageSquare, badge: unreadChatsCount },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full flex-shrink-0 bg-[var(--bg-appbar)] backdrop-blur-2xl border-b border-[var(--border-color)] shadow-sm select-none pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: CHAT IN HB Logo & Search Bar */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <button
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center space-x-2 group focus:outline-none flex-shrink-0 cursor-pointer"
            title="Click to view About CHAT IN HB"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-violet-400 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-transform duration-300 overflow-hidden relative">
              <img
                src="/src/assets/images/app_logo_hb_1785541679338.jpg"
                alt="HB Logo"
                className="w-full h-full object-cover rounded-[14px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-black text-base lg:text-lg tracking-wider bg-gradient-to-r from-purple-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent leading-none flex items-center gap-1">
                CHAT IN HB
                <Info className="w-3.5 h-3.5 text-fuchsia-400 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              </span>
              <span className="text-[8px] lg:text-[9px] font-bold text-purple-500 dark:text-purple-400 tracking-[0.2em] uppercase mt-0.5">
                About Platform
              </span>
            </div>
          </button>

          {/* Search Bar (~40% smaller width) */}
          <div className="relative flex-1 max-w-[130px] sm:max-w-[170px] md:max-w-[190px] lg:max-w-[210px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-hint)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-[var(--bg-search)] border border-[var(--border-color)] rounded-2xl py-1.5 pl-8 pr-3 text-xs text-[var(--text-main)] placeholder-[var(--text-hint)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Center: Top Navigation Icons (Home -> Friends -> Profile -> Chat) */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navCenterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasBadge = (tab.badge || 0) > 0;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'home' && onHomeClick) {
                    onHomeClick();
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`relative px-4 lg:px-6 py-2.5 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
                  isActive
                    ? 'text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/40 shadow-sm font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-purple-600 dark:text-purple-400' : ''}`} />
                
                {hasBadge && (
                  <span className="absolute top-1.5 right-2 px-1.5 py-0.5 text-[9px] bg-fuchsia-500 text-white font-black rounded-full animate-pulse shadow-[0_0_8px_#d946ef]">
                    {tab.badge! > 99 ? '99+' : tab.badge}
                  </span>
                )}

                {/* Bottom Active Indicator Pill */}
                {isActive && (
                  <div className="absolute -bottom-1 left-4 right-4 h-1 bg-purple-500 rounded-full shadow-[0_0_12px_#a855f7]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Theme Toggle -> Notification (🔔) -> Three-dot Menu (⋮) */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">

          {/* Quick Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl border text-[var(--text-main)] hover:bg-[var(--bg-input)] border-[var(--border-color)] bg-[var(--bg-search)] transition-all hover:scale-105 active:scale-95"
            title={activeTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {activeTheme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-fuchsia-500" />}
          </button>

          {/* 1. Notification Button */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2.5 rounded-2xl border transition-all ${
              activeTab === 'notifications'
                ? 'text-purple-600 dark:text-purple-300 bg-purple-500/15 border-purple-500/60 shadow-sm'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-input)] border-[var(--border-color)] bg-[var(--bg-search)]'
            }`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-fuchsia-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-md">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* 2. Three-Dot Menu (⋮) with Glassmorphism Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`p-2.5 rounded-2xl border transition-all ${
                dropdownOpen || activeTab === 'settings'
                  ? 'text-purple-600 dark:text-purple-300 bg-purple-500/15 border-purple-500/60 shadow-sm'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-input)] border-[var(--border-color)] bg-[var(--bg-search)]'
              }`}
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/20" 
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} 
                />
                <div 
                  className="absolute right-0 mt-2 w-64 bg-[var(--bg-popup)] backdrop-blur-2xl border border-[var(--border-color)] text-[var(--text-main)] rounded-3xl p-2.5 shadow-2xl animate-fadeIn z-50 max-h-[80vh] overflow-y-auto no-scrollbar space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  
                  {/* User Header inside dropdown */}
                  {userProfile && (
                    <div className="p-2.5 bg-purple-950/40 rounded-2xl border border-purple-900/40 mb-1 flex items-center space-x-3">
                      <img
                        src={userProfile.photoURL}
                        alt={userProfile.displayName}
                        className="w-8 h-8 rounded-xl object-cover ring-2 ring-purple-500/40"
                      />
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-white truncate">{userProfile.displayName}</p>
                        <p className="text-[10px] text-purple-400 truncate">{userProfile.username || '@user'}</p>
                      </div>
                    </div>
                  )}

                  {/* 0. Navigation Menu (Moved inside 3-dots dropdown) */}
                  <button
                    onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left border-b border-[var(--border-color)] pb-2 mb-1"
                  >
                    <Menu className="w-4 h-4 text-fuchsia-500" />
                    <span className="font-bold">Navigation Menu</span>
                  </button>

                  {/* 1. My Profile */}
                  <button
                    onClick={() => { setActiveTab('profile'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-purple-500" />
                    <span>My Profile</span>
                  </button>

                  {/* 2. Account Settings */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('account'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <UserCog className="w-4 h-4 text-fuchsia-500" />
                    <span>Account Settings</span>
                  </button>

                  {/* 3. Privacy */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('privacy'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-violet-500" />
                    <span>Privacy</span>
                  </button>

                  {/* 4. Security */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('security'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Lock className="w-4 h-4 text-indigo-500" />
                    <span>Security</span>
                  </button>

                  {/* 5. Notification Settings */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('notifications'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Bell className="w-4 h-4 text-pink-500" />
                    <span>Notification Settings</span>
                  </button>

                  {/* 6. Language */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('language'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Globe className="w-4 h-4 text-cyan-500" />
                    <span>Language</span>
                  </button>

                  {/* 7. Dark Mode */}
                  <button
                    onClick={() => { setTheme('dark'); setDropdownOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                      theme === 'dark' ? 'text-purple-400 font-bold bg-purple-500/10' : 'text-[var(--text-main)] hover:bg-purple-600/20'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span>🌙 Dark Mode</span>
                  </button>

                  {/* 8. Light Mode */}
                  <button
                    onClick={() => { setTheme('light'); setDropdownOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                      theme === 'light' ? 'text-amber-500 font-bold bg-purple-500/10' : 'text-[var(--text-main)] hover:bg-purple-600/20'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>☀ Light Mode</span>
                  </button>

                  {/* 9. Blocked Users */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('blocked'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Ban className="w-4 h-4 text-rose-500" />
                    <span>Blocked Users</span>
                  </button>

                  {/* 10. Change Password */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('password'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 text-purple-500" />
                    <span>Change Password</span>
                  </button>

                  {/* 11. Archive */}
                  <button
                    onClick={() => { setActiveTab('saved'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Archive className="w-4 h-4 text-fuchsia-500" />
                    <span>Archive</span>
                  </button>

                  {/* 12. Download My Data */}
                  <button
                    onClick={() => { handleDownloadData(); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Download My Data</span>
                  </button>

                  {/* 13. Help & Support */}
                  <button
                    onClick={() => { onNavigateSettingsSection?.('support'); setActiveTab('settings'); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span>Help & Support</span>
                  </button>

                  {/* 14. About CHAT IN HB */}
                  <button
                    onClick={() => { setAboutModalOpen(true); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-main)] hover:bg-purple-600/20 transition-colors text-left"
                  >
                    <Info className="w-4 h-4 text-purple-500" />
                    <span>About CHAT IN HB</span>
                  </button>

                <div className="pt-1 border-t border-purple-900/40">
                  {/* 15. Logout */}
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>

              </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-purple-900/50 bg-black/95 backdrop-blur-3xl px-4 py-4 space-y-2 animate-fadeIn shadow-2xl">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-purple-900/40">
            {navCenterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold ${
                    isActive ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-purple-200/80 hover:bg-purple-900/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => { setActiveTab('stories'); setMobileMenuOpen(false); }}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold text-purple-200/80 hover:bg-purple-900/20"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Stories</span>
            </button>

            <button
              onClick={() => { setActiveTab('saved'); setMobileMenuOpen(false); }}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold text-purple-200/80 hover:bg-purple-900/20"
            >
              <Bookmark className="w-4 h-4 text-fuchsia-400" />
              <span>Saved</span>
            </button>

            <button
              onClick={() => { setActiveTab('groups'); setMobileMenuOpen(false); }}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold text-purple-200/80 hover:bg-purple-900/20"
            >
              <UsersRound className="w-4 h-4 text-violet-400" />
              <span>Groups</span>
            </button>

            <button
              onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold text-purple-200/80 hover:bg-purple-900/20"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Events</span>
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-bold text-purple-200/80 hover:bg-purple-900/20 col-span-2"
            >
              <MoreVertical className="w-4 h-4 text-purple-400" />
              <span>More Settings</span>
            </button>
          </div>

          <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-xs font-bold text-red-400 hover:text-red-300 p-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Install Android App Modal */}
      <InstallAppModal 
        isOpen={installModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
      />

      {/* About App Modal */}
      <AboutAppModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        onOpenSettingsAbout={() => {
          if (onNavigateSettingsSection) {
            onNavigateSettingsSection('about');
          }
          setActiveTab('settings');
        }}
      />
    </header>
  );
};


