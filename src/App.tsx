import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CallProvider } from './context/CallContext';
import { TopNavigation } from './components/Navigation/TopNavigation';
import { LeftSidebar } from './components/Navigation/LeftSidebar';
import { RightSidebar } from './components/Navigation/RightSidebar';
import { AuthModal } from './components/Auth/AuthModal';
import { FeedView } from './components/Home/FeedView';
import { ChatsPage } from './components/Chat/ChatsPage';
import { FriendsPage } from './components/Friends/FriendsPage';
import { SearchUsers } from './components/Search/SearchUsers';
import { NotificationsPage } from './components/Notifications/NotificationsPage';
import { CallsPage } from './components/Calls/CallsPage';
import { UserProfileModal } from './components/Profile/UserProfileModal';
import { SettingsPage } from './components/Settings/SettingsPage';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { SavedPage } from './components/Saved/SavedPage';
import { GroupsPage } from './components/Groups/GroupsPage';
import { EventsPage } from './components/Events/EventsPage';
import { IncomingCallBanner } from './components/Calls/IncomingCallBanner';
import { CallOverlay } from './components/Calls/CallOverlay';
import { StoriesBar } from './components/Stories/StoriesBar';
import { MobileNav } from './components/Navigation/MobileNav';
import { ActiveTab } from './types';
import { Sparkles, MessageSquare, ArrowLeft } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

const MainAppContent: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [settingsSection, setSettingsSection] = useState<string>('profile');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState<number>(0);
  const [homeRefreshKey, setHomeRefreshKey] = useState<number>(0);

  const handleHomeClick = () => {
    setActiveTab('home');
    setHomeRefreshKey((prev) => prev + 1);
  };

  // Toggle Tab Selection (1st tap opens, 2nd tap on active option closes and returns to Home)
  const handleTabSelect = (tab: ActiveTab) => {
    if (activeTab === tab && tab !== 'home') {
      setActiveTab('home');
    } else if (activeTab === 'home' && tab === 'home') {
      handleHomeClick();
    } else {
      setActiveTab(tab);
    }
  };

  // Subscribe to unread notifications count
  useEffect(() => {
    if (!user) return;
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribeNotif = onSnapshot(notifQuery, (snap) => {
      setUnreadNotificationsCount(snap.size);
    }, (err) => {
      console.warn('onSnapshot error in notifications count:', err);
    });

    // Subscribe to unread chats count
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribeChats = onSnapshot(chatsQuery, (snap) => {
      let unread = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (data.lastMessage && !data.lastMessage.read && data.lastMessage.senderId !== user.uid) {
          unread += 1;
        }
      });
      setUnreadChatsCount(unread);
    }, (err) => {
      console.warn('onSnapshot error in chats count:', err);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeChats();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-main)] flex flex-col items-center justify-center p-4 text-[var(--text-main)] select-none">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-violet-400 p-0.5 shadow-2xl shadow-purple-500/50 animate-bounce mb-4">
          <div className="w-full h-full bg-[var(--bg-card)] rounded-[22px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <h2 className="font-extrabold text-2xl tracking-wider bg-gradient-to-r from-purple-400 via-fuchsia-300 to-violet-200 bg-clip-text text-transparent">
          CHAT IN HB
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-2 animate-pulse font-medium">Launching messenger & workspace feed...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  const friendRequestsCount = userProfile?.friendRequestsReceived?.length || 0;

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col transition-colors duration-200 relative overflow-x-clip select-none">
      
      {/* Top Header Navigation (Only shown on Home screen) */}
      {activeTab === 'home' && (
        <TopNavigation
          activeTab={activeTab}
          setActiveTab={handleTabSelect}
          onHomeClick={handleHomeClick}
          unreadChatsCount={unreadChatsCount}
          unreadNotificationsCount={unreadNotificationsCount}
          friendRequestsCount={friendRequestsCount}
          onNavigateSettingsSection={(section) => setSettingsSection(section)}
        />
      )}

      {/* Incoming Call Banner & Call Overlay */}
      <IncomingCallBanner />
      <CallOverlay />

      {/* Main Full-Width Native Android Layout Container */}
      <div className="w-full flex flex-1 relative z-10">
        
        {/* Left Column: Fixed Sidebar Navigation (Desktop/Tablet) */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={handleTabSelect}
          onHomeClick={handleHomeClick}
          unreadChatsCount={unreadChatsCount}
          unreadNotificationsCount={unreadNotificationsCount}
          friendRequestsCount={friendRequestsCount}
        />

        {/* Center Column: Main Active Page View */}
        <main className="flex-1 min-w-0 w-full pb-20 md:pb-4">
          {activeTab === 'home' && (
            <FeedView
              onNavigateTab={handleTabSelect}
              homeRefreshKey={homeRefreshKey}
            />
          )}

          {activeTab === 'chats' && (
            <ChatsPage
              onNavigateTab={handleTabSelect}
              selectedChatId={selectedChatId}
              setSelectedChatId={setSelectedChatId}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsPage
              onStartChat={(chatId) => {
                setSelectedChatId(chatId);
                setActiveTab('chats');
              }}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsPage onNavigateTab={handleTabSelect} />
          )}

          {activeTab === 'stories' && (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-28 md:pb-8">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="px-4 py-2 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-extrabold text-xs flex items-center space-x-2 transition-all active:scale-95 border border-[var(--border-color)] shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4 text-purple-400" />
                  <span>Back to Home</span>
                </button>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] tracking-wide flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>24-Hour Stories Lounge</span>
                </h2>
              </div>

              <div className="frosted-card rounded-3xl p-6 shadow-2xl space-y-4">
                <StoriesBar />
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <SavedPage onNavigateTab={handleTabSelect} />
          )}

          {activeTab === 'groups' && (
            <GroupsPage onNavigateTab={handleTabSelect} />
          )}

          {activeTab === 'events' && (
            <EventsPage onNavigateTab={handleTabSelect} />
          )}

          {activeTab === 'search' && (
            <SearchUsers
              onStartChat={(chatId) => {
                setSelectedChatId(chatId);
                setActiveTab('chats');
              }}
            />
          )}

          {activeTab === 'calls' && (
            <CallsPage onNavigateTab={handleTabSelect} />
          )}

          {activeTab === 'profile' && (
            <UserProfileModal />
          )}

          {activeTab === 'settings' && (
            <SettingsPage initialSection={settingsSection} />
          )}

          {activeTab === 'admin' && (
            <AdminDashboard />
          )}
        </main>

        {/* Right Column: Online Friends, Requests, Suggestions */}
        {(activeTab === 'home' || activeTab === 'stories' || activeTab === 'saved' || activeTab === 'groups' || activeTab === 'events') && (
          <RightSidebar
            onNavigateTab={handleTabSelect}
            onStartChat={(friendUid) => {
              setActiveTab('chats');
            }}
          />
        )}

      </div>

      {/* Mobile Android Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        onHomeClick={handleHomeClick}
        unreadChatsCount={unreadChatsCount}
        unreadNotificationsCount={unreadNotificationsCount}
        friendRequestsCount={friendRequestsCount}
      />

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <MainAppContent />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
