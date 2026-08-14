import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Plus, Sparkles, UserPlus, Users } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Chat, ActiveTab } from '../../types';
import { StoriesBar } from '../Stories/StoriesBar';
import { ChatView } from '../Chat/ChatView';
import { CreateGroupModal } from '../Chat/CreateGroupModal';

interface HomePageProps {
  onNavigateTab: (tab: ActiveTab) => void;
  selectedChatId?: string;
  setSelectedChatId: (id: string | undefined) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateTab,
  selectedChatId,
  setSelectedChatId
}) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedChats: Chat[] = [];
      snapshot.forEach((docSnap) => {
        loadedChats.push({ id: docSnap.id, ...docSnap.data() } as Chat);
      });

      // Sort by last updated
      loadedChats.sort((a, b) => {
        const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
        const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setChats(loadedChats);
      setLoading(false);

      // Auto select first chat if on desktop and none selected
      if (!selectedChatId && loadedChats.length > 0 && window.innerWidth >= 768) {
        setSelectedChatId(loadedChats[0].id);
      }
    }, (err) => {
      console.warn('onSnapshot error in HomePage chats:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredChats = chats.filter((c) => {
    if (!user) return false;
    if (c.isGroup) {
      return (c.groupName || 'Group').toLowerCase().includes(searchTerm.toLowerCase());
    }
    const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
    const partner = c.participantData?.[partnerId];
    if (!partner) return true;
    return partner.displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full h-screen min-h-[100dvh] flex flex-col md:flex-row bg-slate-950/60 backdrop-blur-3xl overflow-hidden transition-colors">
      
      {/* Sidebar / Chat Feed List */}
      <div className={`w-full md:w-80 lg:w-96 h-full border-r border-white/10 flex flex-col bg-white/5 backdrop-blur-2xl ${
        selectedChatId ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Stories Bar */}
        <StoriesBar onReplyToStory={(authorId) => onNavigateTab('search')} />

        {/* Chat Feed Header */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white flex items-center space-x-2 tracking-wide">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span>Connect Chat</span>
            </h2>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="p-2 bg-purple-600/80 hover:bg-purple-500 text-white rounded-xl transition-all text-xs font-semibold flex items-center space-x-1 shadow-[0_0_12px_rgba(168,85,247,0.3)] border border-purple-400/30"
                title="Create Group Chat"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">New Group</span>
              </button>
              <button
                onClick={() => onNavigateTab('search')}
                className="p-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl transition-all text-xs font-semibold flex items-center space-x-1 shadow-[0_0_12px_rgba(99,102,241,0.3)] border border-indigo-400/30"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Search Chat Field */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations or groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-all"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 font-medium">No active chats found.</p>
              <button
                onClick={() => onNavigateTab('search')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30"
              >
                Discover Users
              </button>
            </div>
          ) : (
            filteredChats.map((c) => {
              if (!user) return null;
              
              const isGroup = c.isGroup;
              const title = isGroup ? c.groupName || 'Group Chat' : (() => {
                const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                return c.participantData?.[partnerId]?.displayName || 'Connect User';
              })();

              const photo = isGroup ? c.groupPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.id}` : (() => {
                const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                return c.participantData?.[partnerId]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`;
              })();

              const isSelected = selectedChatId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedChatId(c.id)}
                  className={`p-3.5 flex items-center space-x-3 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-white/10 backdrop-blur-xl border-l-4 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 ring-1 ring-white/10">
                    <img src={photo} alt={title} className="w-full h-full object-cover" />
                    {isGroup ? (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 rounded-full ring-2 ring-slate-900 flex items-center justify-center">
                        <Users className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-100 truncate flex items-center space-x-1.5">
                        <span className="truncate">{title}</span>
                        {isGroup && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                            {c.participants.length}
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {c.lastMessage?.timestamp?.toDate
                          ? c.lastMessage.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate">
                      {c.lastMessage?.text || 'Started a conversation'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Main Chat Content Panel */}
      <div className={`flex-1 h-full bg-slate-950/40 backdrop-blur-3xl ${
        selectedChatId ? 'flex' : 'hidden md:flex'
      }`}>
        {selectedChatId ? (
          <ChatView chatId={selectedChatId} onBackMobile={() => setSelectedChatId(undefined)} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/10">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-lg text-white tracking-wide">Connect Chat Workspace</h3>
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
              Select a conversation or group to enjoy audio/video calls, real-time messaging, image sharing, and voice messages with frosted glass aesthetics.
            </p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={(chatId) => setSelectedChatId(chatId)}
      />

    </div>
  );
};

