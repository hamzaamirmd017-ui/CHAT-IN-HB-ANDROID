import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  Plus, 
  Users, 
  UserPlus, 
  MoreVertical, 
  MoreHorizontal,
  CheckCheck, 
  Archive, 
  X, 
  Sparkles,
  Phone,
  Video,
  Smile,
  ImageIcon,
  Camera,
  Mic,
  ArrowLeft,
  Check,
  UserCheck,
  Moon,
  ShieldOff,
  UserX,
  CircleDot,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Trash2,
  Bell,
  BellOff,
  PhoneCall,
  Volume2,
  Shield,
  MessageCircle,
  Send,
  Ban,
  ChevronRight,
  ChevronLeft,
  Settings,
  Mail,
  User,
  AlertTriangle
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDocs, setDoc, serverTimestamp, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Chat, UserProfile, ActiveTab } from '../../types';
import { ChatView } from './ChatView';
import { CreateGroupModal } from './CreateGroupModal';

interface ChatsPageProps {
  onNavigateTab: (tab: ActiveTab) => void;
  selectedChatId?: string;
  setSelectedChatId: (id: string | undefined) => void;
}

export const ChatsPage: React.FC<ChatsPageProps> = ({
  onNavigateTab,
  selectedChatId,
  setSelectedChatId
}) => {
  const { user, userProfile } = useAuth();
  const { initiateCall } = useCall();

  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups' | 'archived'>('all');

  // Active 3-dots Context Menu for Chat Item
  const [activeContextChatId, setActiveContextChatId] = useState<string | null>(null);

  // Modals for Context Menu Actions
  const [viewingProfileUser, setViewingProfileUser] = useState<{
    displayName: string;
    photoURL: string;
    email?: string;
    uid?: string;
    isGroup?: boolean;
    memberCount?: number;
  } | null>(null);

  const [deletingChat, setDeletingChat] = useState<{ id: string; title: string } | null>(null);
  const [reportingChat, setReportingChat] = useState<{ id: string; title: string } | null>(null);
  const [reportReason, setReportReason] = useState('Spam or Scam');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  
  // Modals & Settings
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Messenger Settings States
  const [incomingCallSounds, setIncomingCallSounds] = useState(() => {
    return localStorage.getItem('incoming_call_sounds') !== 'false';
  });
  const [messageSounds, setMessageSounds] = useState(() => {
    return localStorage.getItem('message_sounds') !== 'false';
  });
  const [popupNewMessages, setPopupNewMessages] = useState(() => {
    return localStorage.getItem('popup_new_messages') !== 'false';
  });
  const [activeStatus, setActiveStatus] = useState(true);
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showMessageRequestsModal, setShowMessageRequestsModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showMessageDeliveryModal, setShowMessageDeliveryModal] = useState(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Sub-modal toggle settings
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [safeMessaging, setSafeMessaging] = useState(true);
  const [peopleWithPhoneDelivery, setPeopleWithPhoneDelivery] = useState<'chats' | 'requests' | 'none'>('chats');
  const [friendsOfFriendsDelivery, setFriendsOfFriendsDelivery] = useState<'chats' | 'requests' | 'none'>('chats');
  const [othersDelivery, setOthersDelivery] = useState<'requests' | 'none'>('requests');

  const [blockedUsers, setBlockedUsers] = useState([
    { id: 'b1', name: 'John Doe', username: '@johndoe_sp' },
    { id: 'b2', name: 'Alex Smith', username: '@alex_spam' }
  ]);
  const [restrictedUsers, setRestrictedUsers] = useState([
    { id: 'r1', name: 'Unknown Contact', username: '@restricted_user1' }
  ]);

  // Load chats for current user
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

      // Sort chats by last updated time
      loadedChats.sort((a, b) => {
        const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
        const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setChats(loadedChats);
      setLoading(false);

      // On desktop, auto-select first chat if none selected
      if (!selectedChatId && loadedChats.length > 0 && window.innerWidth >= 768) {
        setSelectedChatId(loadedChats[0].id);
      }
    }, (err) => {
      console.warn('onSnapshot error in ChatsPage:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load all users for Active Tray & New Chat Modal
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      setUserSearchLoading(true);
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const fetched: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          if (data.uid !== user.uid) {
            fetched.push(data);
          }
        });
        setAllUsers(fetched);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUserSearchLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  // Filtered chats logic
  const filteredChats = chats.filter((c) => {
    if (!user) return false;

    // Filter by Tab
    if (filterTab === 'unread') {
      const isUnread = c.lastMessage && !c.lastMessage.read && c.lastMessage.senderId !== user.uid;
      if (!isUnread) return false;
    } else if (filterTab === 'groups') {
      if (!c.isGroup) return false;
    } else if (filterTab === 'archived') {
      if (!c.isArchived) return false;
    } else {
      // 'all' tab -> exclude archived
      if (c.isArchived) return false;
    }

    // Filter by Search Term
    if (!searchTerm.trim()) return true;

    if (c.isGroup) {
      return (c.groupName || 'Group').toLowerCase().includes(searchTerm.toLowerCase());
    }
    const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
    const partner = c.participantData?.[partnerId];
    if (!partner) return true;
    return partner.displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate unread & counts
  const unreadCount = chats.filter((c) => c.lastMessage && !c.lastMessage.read && c.lastMessage.senderId !== user?.uid).length;
  const groupsCount = chats.filter((c) => c.isGroup).length;
  const archivedCount = chats.filter((c) => c.isArchived).length;

  // Handle starting a new direct chat
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!user || !userProfile) return;

    const chatId = [user.uid, targetUser.uid].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);

    await setDoc(
      chatRef,
      {
        id: chatId,
        participants: [user.uid, targetUser.uid],
        participantData: {
          [user.uid]: {
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL,
            email: userProfile.email || ''
          },
          [targetUser.uid]: {
            displayName: targetUser.displayName,
            photoURL: targetUser.photoURL,
            email: targetUser.email || ''
          }
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    setSelectedChatId(chatId);
    setIsNewChatModalOpen(false);
  };

  const filteredNewChatUsers = allUsers.filter((u) =>
    u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors relative">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* CHAT LIST PANEL (Android Messenger Style) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`w-full h-full flex flex-col bg-[var(--bg-card)] relative ${
        selectedChatId ? 'hidden md:flex md:w-80 lg:w-96 border-r border-[var(--border-color)]' : 'w-full flex-1'
      }`}>
        
        {/* Header Bar */}
        <div className="sticky top-0 z-20 p-4 border-b border-[var(--border-color)] space-y-3 bg-[var(--bg-appbar)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <h1 className="font-extrabold text-xl text-white tracking-wide flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-fuchsia-400" />
              <span>Chats</span>
            </h1>

            {/* Header Right Actions: Search Toggle & Three-dot Menu */}
            <div className="flex items-center space-x-2 relative">
              <button
                type="button"
                onClick={() => {
                  const searchEl = document.getElementById('chat-search-input');
                  if (searchEl) searchEl.focus();
                }}
                className="p-2 rounded-full text-purple-200 hover:text-white hover:bg-purple-900/40 transition-colors"
                title="Search Chats"
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className="p-2 rounded-full text-purple-200 hover:text-white hover:bg-purple-900/40 transition-colors"
                title="More Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Three-dot Dropdown Menu */}
              {isHeaderMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/10" 
                    onClick={(e) => { e.stopPropagation(); setIsHeaderMenuOpen(false); }} 
                  />
                  <div 
                    className="absolute right-0 top-11 w-60 bg-slate-950/95 border border-purple-500/40 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-2xl space-y-1 animate-fadeIn text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                  {/* Chat Settings Option (Matching user image) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setShowChatSettingsModal(true);
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-white bg-purple-600/30 hover:bg-purple-600/50 rounded-xl flex items-center justify-between transition-colors border border-purple-500/30 shadow-md"
                  >
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-fuchsia-400 animate-spin-slow" />
                      <span>Chat settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-300" />
                  </button>

                  {/* Friend Search Bar Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onNavigateTab('friends');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span>Friend Search Bar</span>
                  </button>

                  <div className="h-px bg-purple-900/30 my-1" />

                  {/* Active Status Quick Toggle */}
                  <div 
                    onClick={async () => {
                      const next = !activeStatus;
                      setActiveStatus(next);
                      if (user) {
                        try {
                          await updateDoc(doc(db, 'users', user.uid), { isOnline: next });
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <CircleDot className={`w-4 h-4 ${activeStatus ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>Active Status: {activeStatus ? 'ON' : 'OFF'}</span>
                    </div>
                    {activeStatus ? (
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  {/* Privacy & Safety */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setShowPrivacyModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Privacy & safety</span>
                  </button>

                  {/* Message Requests */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setShowMessageRequestsModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    <span>Message requests</span>
                  </button>

                  {/* Archived Chats */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setShowArchivedModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Archive className="w-4 h-4 text-amber-400" />
                    <span>Archived chats</span>
                  </button>

                  {/* Blocked Accounts */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockedModal(true);
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>Block settings</span>
                  </button>

                  {/* Restricted Accounts */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestrictedModal(true);
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <ShieldOff className="w-4 h-4 text-amber-400" />
                    <span>Restricted accounts</span>
                  </button>

                  <div className="h-px bg-purple-900/30 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsNewChatModalOpen(true);
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-fuchsia-400" />
                    <span>New Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupModalOpen(true);
                      setIsHeaderMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>New Group</span>
                  </button>
                </div>
                </>
              )}
            </div>
          </div>

          {/* Search Chats Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-purple-400/60" />
            <input
              id="chat-search-input"
              type="text"
              placeholder="Search Messenger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-purple-950/30 border border-purple-800/40 hover:border-purple-500/50 rounded-2xl py-2 pl-9 pr-3 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-purple-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Facebook Messenger Active Contacts Tray */}
          <div className="py-2 border-y border-purple-900/30">
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1 px-1">
              {/* Your Story item */}
              <button
                type="button"
                onClick={() => onNavigateTab('home')}
                className="flex flex-col items-center space-y-1 group flex-shrink-0"
              >
                <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-purple-600 to-fuchsia-500 ring-2 ring-purple-500/20 group-hover:scale-105 transition-transform">
                  <img
                    src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                    alt="Your Story"
                    className="w-full h-full object-cover rounded-full bg-slate-900"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full border-2 border-black flex items-center justify-center text-white font-bold text-[10px]">
                    +
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-purple-200/80 truncate max-w-[56px]">
                  Your Story
                </span>
              </button>

              {/* Active Online Friends / Users */}
              {allUsers.map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => handleStartChatWithUser(u)}
                  className="flex flex-col items-center space-y-1 group flex-shrink-0"
                  title={`Chat with ${u.displayName}`}
                >
                  <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-teal-400 ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform">
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                      alt={u.displayName}
                      className="w-full h-full object-cover rounded-full bg-slate-900"
                    />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 truncate max-w-[56px]">
                    {u.displayName.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tabs (All | Unread | Groups) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-purple-600/80 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] border border-purple-400/50'
                  : 'bg-purple-950/30 text-purple-300/70 hover:text-white hover:bg-purple-900/30 border border-purple-900/30'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{chats.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                filterTab === 'unread'
                  ? 'bg-purple-600/80 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] border border-purple-400/50'
                  : 'bg-purple-950/30 text-purple-300/70 hover:text-white hover:bg-purple-900/30 border border-purple-900/30'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-fuchsia-500 text-white font-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('groups')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                filterTab === 'groups'
                  ? 'bg-purple-600/80 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] border border-purple-400/50'
                  : 'bg-purple-950/30 text-purple-300/70 hover:text-white hover:bg-purple-900/30 border border-purple-900/30'
              }`}
            >
              <span>Groups</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{groupsCount}</span>
            </button>
          </div>

          {filterTab === 'archived' && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
              <span>Viewing Archived Chats ({archivedCount})</span>
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className="text-amber-200 font-bold hover:underline"
              >
                Back to All
              </button>
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-purple-900/20 pb-20 md:pb-6">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-16 bg-purple-950/20 rounded-2xl animate-pulse border border-purple-900/20" />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto text-fuchsia-400 shadow-inner">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-xs text-purple-300/70 font-medium">
                {filterTab === 'unread'
                  ? 'No unread messages.'
                  : filterTab === 'groups'
                  ? 'No group chats yet.'
                  : filterTab === 'archived'
                  ? 'No archived chats.'
                  : 'No active conversations found.'}
              </p>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
              >
                Start a New Chat
              </button>
            </div>
          ) : (
            filteredChats.map((c) => {
              if (!user) return null;

              const isGroup = c.isGroup;
              const title = isGroup ? c.groupName || 'Group Chat' : (() => {
                const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                return c.nicknames?.[partnerId] || c.participantData?.[partnerId]?.displayName || 'HB User';
              })();

              const photo = isGroup ? c.groupPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.id}` : (() => {
                const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                return c.participantData?.[partnerId]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`;
              })();

              const isSelected = selectedChatId === c.id;
              const isUnread = c.lastMessage && !c.lastMessage.read && c.lastMessage.senderId !== user.uid;

              // Format date preview
              const formatTime = () => {
                if (!c.lastMessage?.timestamp?.toDate) return '';
                const date = c.lastMessage.timestamp.toDate();
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${diffMins}m`;
                if (diffHours < 24) return `${diffHours}h`;
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
              };

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedChatId(c.id)}
                  className={`p-3.5 flex items-center space-x-3.5 cursor-pointer transition-all duration-200 border-l-4 group relative ${
                    isSelected
                      ? 'bg-purple-900/30 border-fuchsia-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                      : isUnread
                      ? 'bg-purple-950/40 border-purple-500 hover:bg-purple-900/20'
                      : 'border-transparent hover:bg-purple-950/20'
                  }`}
                >
                  {/* Avatar + Online Indicator */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-900 flex-shrink-0 ring-2 ring-purple-500/30 shadow-md">
                    <img src={photo} alt={title} className="w-full h-full object-cover" />
                    {isGroup ? (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 rounded-full ring-2 ring-black flex items-center justify-center">
                        <Users className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-black" />
                    )}
                  </div>

                  {/* Message Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-xs sm:text-sm truncate flex items-center space-x-1.5 ${
                        isUnread ? 'font-black text-white' : 'font-semibold text-purple-100'
                      }`}>
                        <span className="truncate">{title}</span>
                        {isGroup && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-purple-600/30 text-purple-300 rounded-full border border-purple-500/30 font-bold">
                            {c.participants.length}
                          </span>
                        )}
                      </h4>

                      <span className={`text-[10px] flex-shrink-0 ${isUnread ? 'text-fuchsia-400 font-bold' : 'text-purple-300/60'}`}>
                        {formatTime()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {c.typing && Object.entries(c.typing).some(([uid, isTyping]) => uid !== user.uid && isTyping) ? (
                        <p className="text-xs text-fuchsia-400 font-bold animate-pulse flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce" />
                          <span className="ml-1 text-[11px]">typing...</span>
                        </p>
                      ) : (
                        <p className={`text-xs truncate flex items-center ${
                          isUnread ? 'font-bold text-white' : 'text-purple-300/60'
                        }`}>
                          {c.lastMessage?.senderId === user.uid && (
                            <CheckCheck className={`w-3.5 h-3.5 mr-1 shrink-0 ${
                              c.lastMessage.read
                                ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)] font-bold'
                                : 'text-slate-500'
                            }`} />
                          )}
                          <span className="truncate">{c.lastMessage?.text || 'Started a conversation'}</span>
                        </p>
                      )}

                      {/* Unread Badge */}
                      {isUnread && (
                        <div className="w-2.5 h-2.5 bg-fuchsia-500 rounded-full ring-4 ring-fuchsia-500/30 animate-pulse ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* 3-Dots Menu Button & Dropdown Options (Matching Image 1 & 2) */}
                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContextChatId(activeContextChatId === c.id ? null : c.id);
                      }}
                      className={`p-2 rounded-xl transition-all ${
                        activeContextChatId === c.id
                          ? 'bg-purple-600/40 text-white shadow-md'
                          : 'text-purple-300/60 hover:text-white hover:bg-purple-800/30 md:opacity-0 md:group-hover:opacity-100 opacity-100'
                      }`}
                      title="More Options"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Context Menu Dropdown Popup */}
                    {activeContextChatId === c.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setActiveContextChatId(null)} 
                        />
                        <div 
                          className="absolute right-0 top-9 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 backdrop-blur-2xl space-y-0.5 text-xs text-slate-100 animate-fadeIn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 1. Mark as unread / Mark as read */}
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveContextChatId(null);
                              try {
                                await updateDoc(doc(db, 'chats', c.id), {
                                  'lastMessage.read': isUnread
                                });
                              } catch (err) {
                                console.error('Error toggling unread:', err);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <Mail className="w-4 h-4 text-slate-300" />
                            <span>{isUnread ? 'Mark as read' : 'Mark as unread'}</span>
                          </button>

                          {/* 2. Open messaging */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextChatId(null);
                              setSelectedChatId(c.id);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 text-blue-400" />
                            <span>Open messaging</span>
                          </button>

                          {/* 3. Mute notifications */}
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveContextChatId(null);
                              try {
                                await updateDoc(doc(db, 'chats', c.id), {
                                  isMuted: !c.isMuted
                                });
                              } catch (err) {
                                console.error('Error muting chat:', err);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            {c.isMuted ? (
                              <>
                                <Bell className="w-4 h-4 text-amber-400" />
                                <span>Unmute notifications</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-4 h-4 text-slate-300" />
                                <span>Mute notifications</span>
                              </>
                            )}
                          </button>

                          {/* 4. View profile */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextChatId(null);
                              const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                              const partnerData = c.participantData?.[partnerId];
                              setViewingProfileUser({
                                displayName: title,
                                photoURL: photo,
                                email: partnerData?.email,
                                uid: partnerId,
                                isGroup: c.isGroup,
                                memberCount: c.participants.length
                              });
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <User className="w-4 h-4 text-purple-400" />
                            <span>View profile</span>
                          </button>

                          {/* Divider */}
                          <div className="h-px bg-slate-800 my-1" />

                          {/* 5. Audio call */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextChatId(null);
                              const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                              if (!c.isGroup && partnerId) {
                                initiateCall(partnerId, title, photo, 'audio');
                              } else {
                                alert('Audio calls are available in individual member chats.');
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <Phone className="w-4 h-4 text-emerald-400" />
                            <span>Audio call</span>
                          </button>

                          {/* 6. Video chat */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextChatId(null);
                              const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                              if (!c.isGroup && partnerId) {
                                initiateCall(partnerId, title, photo, 'video');
                              } else {
                                alert('Video calls are available in individual member chats.');
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <Video className="w-4 h-4 text-sky-400" />
                            <span>Video chat</span>
                          </button>

                          {/* 7. Block */}
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveContextChatId(null);
                              const partnerId = c.participants.find((id) => id !== user.uid) || user.uid;
                              try {
                                await updateDoc(doc(db, 'chats', c.id), {
                                  isBlocked: !c.isBlocked
                                });
                                if (!c.isBlocked) {
                                  setBlockedUsers((prev) => [...prev, { id: partnerId, name: title, username: `@${title.toLowerCase().replace(/\s+/g, '_')}` }]);
                                }
                              } catch (err) {
                                console.error('Error blocking user:', err);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <UserX className="w-4 h-4 text-amber-400" />
                            <span>{c.isBlocked ? 'Unblock' : 'Block'}</span>
                          </button>

                          {/* 8. Archive chat */}
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveContextChatId(null);
                              try {
                                await updateDoc(doc(db, 'chats', c.id), {
                                  isArchived: !c.isArchived
                                });
                              } catch (err) {
                                console.error('Error archiving chat:', err);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <Archive className="w-4 h-4 text-indigo-400" />
                            <span>{c.isArchived ? 'Unarchive chat' : 'Archive chat'}</span>
                          </button>

                          {/* 9. Delete chat */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextChatId(null);
                              setDeletingChat({ id: c.id, title });
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            <span>Delete chat</span>
                          </button>

                          {/* 10. Report */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextChatId(null);
                              setReportingChat({ id: c.id, title });
                              setReportSubmitted(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <span>Report</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* FLOATING ACTION BUTTON (+) AT BOTTOM RIGHT */}
        {/* ───────────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setIsNewChatModalOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-[0_10px_25px_rgba(168,85,247,0.6),0_0_30px_rgba(168,85,247,0.4)] border border-purple-300/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
          title="Start New Chat"
        >
          <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
        </button>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN CHAT CONVERSATION VIEW (ChatView) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`flex-1 h-full bg-[var(--bg-main)] text-[var(--text-main)] ${
        selectedChatId ? 'flex' : 'hidden md:flex'
      }`}>
        {selectedChatId ? (
          <ChatView 
            chatId={selectedChatId} 
            onBackMobile={() => setSelectedChatId(undefined)} 
            onChatDeleted={() => setSelectedChatId(undefined)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-purple-300/60 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-center text-fuchsia-400 shadow-2xl shadow-purple-500/10">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-xl text-white tracking-wide">CHAT IN HB Messenger</h3>
            <p className="text-xs max-w-sm text-purple-300/70 leading-relaxed">
              Select a conversation to send messages, photos, voice notes, or initiate HD audio and video calls.
            </p>
            <button
              type="button"
              onClick={() => setIsNewChatModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-500/30 transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* NEW CHAT MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isNewChatModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsNewChatModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-black/95 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4 relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="font-extrabold text-base text-white tracking-wide flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-fuchsia-400" />
                <span>New Conversation</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-full text-purple-300 hover:text-white hover:bg-purple-900/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setIsGroupModalOpen(true);
                }}
                className="p-3 bg-purple-950/40 border border-purple-800/40 hover:border-purple-500/60 rounded-2xl flex items-center space-x-2.5 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Create Group</h5>
                  <p className="text-[10px] text-purple-300/60">Multi-user chat</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('friends')}
                className="p-3 bg-purple-950/40 border border-purple-800/40 hover:border-purple-500/60 rounded-2xl flex items-center space-x-2.5 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-fuchsia-600/20 text-fuchsia-300 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Friend List</h5>
                  <p className="text-[10px] text-purple-300/60">Search contacts</p>
                </div>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-purple-400/60" />
              <input
                type="text"
                placeholder="Search people by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-purple-950/30 border border-purple-800/40 rounded-2xl py-2 pl-9 pr-3 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Users List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {userSearchLoading ? (
                <div className="p-4 text-center text-xs text-purple-300/60">Loading users...</div>
              ) : filteredNewChatUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-purple-300/60">No matching contacts found.</div>
              ) : (
                filteredNewChatUsers.map((u) => (
                  <div
                    key={u.uid}
                    onClick={() => handleStartChatWithUser(u)}
                    className="p-2.5 bg-purple-950/20 hover:bg-purple-900/30 border border-purple-900/30 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={u.photoURL}
                        alt={u.displayName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/30"
                      />
                      <div>
                        <h5 className="font-bold text-xs text-white">{u.displayName}</h5>
                        <p className="text-[10px] text-purple-300/60 truncate max-w-[180px]">{u.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={(chatId) => setSelectedChatId(chatId)}
      />

      {/* Blocked Accounts Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <UserX className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-extrabold text-white">Blocked Accounts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockedModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Blocked people cannot call you or send you messages on Connect Chat.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {blockedUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No blocked accounts.</div>
              ) : (
                blockedUsers.map((u) => (
                  <div key={u.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-white">{u.name}</h5>
                      <p className="text-[10px] text-slate-400">{u.username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlockedUsers(blockedUsers.filter(b => b.id !== u.id))}
                      className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/60 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-xl transition-all"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowBlockedModal(false)}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Restricted Accounts Modal */}
      {showRestrictedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldOff className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">Restricted Accounts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestrictedModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Restricted contacts won't see when you're online or read receipts for their messages.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {restrictedUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No restricted accounts.</div>
              ) : (
                restrictedUsers.map((u) => (
                  <div key={u.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-white">{u.name}</h5>
                      <p className="text-[10px] text-slate-400">{u.username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestrictedUsers(restrictedUsers.filter(r => r.id !== u.id))}
                      className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/40 text-amber-200 text-xs font-bold rounded-xl transition-all"
                    >
                      Unrestrict
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowRestrictedModal(false)}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CHAT SETTINGS MAIN MODAL (Matching User Image) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showChatSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowChatSettingsModal(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-950/95 border border-purple-500/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden animate-scaleUp text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-purple-900/30 flex items-center justify-between bg-purple-950/30">
              <div>
                <h2 className="text-lg font-black text-white tracking-wide">Chat settings</h2>
                <p className="text-xs text-purple-300/60 font-medium">Customize your Messenger experience.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowChatSettingsModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Options List (Exact order as in screenshot) */}
            <div className="p-3 space-y-1 max-h-[75vh] overflow-y-auto no-scrollbar divide-y divide-purple-900/20">
              
              {/* Friend Search Bar Option */}
              <div className="pb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowChatSettingsModal(false);
                    onNavigateTab('friends');
                  }}
                  className="w-full p-3 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-between text-left transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                      <Search className="w-5 h-5 text-fuchsia-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-fuchsia-300">Friend Search Bar</h4>
                      <p className="text-[10px] text-purple-300/70">Search friend dictionary and add contacts</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* 1. Incoming call sounds */}
              <div className="pt-2 flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Incoming call sounds</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !incomingCallSounds;
                    setIncomingCallSounds(next);
                    localStorage.setItem('incoming_call_sounds', String(next));
                  }}
                  className="text-purple-300 hover:text-white"
                >
                  {incomingCallSounds ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-500" />
                  )}
                </button>
              </div>

              {/* 2. Message sounds */}
              <div className="flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Message sounds</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !messageSounds;
                    setMessageSounds(next);
                    localStorage.setItem('message_sounds', String(next));
                  }}
                  className="text-purple-300 hover:text-white"
                >
                  {messageSounds ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-500" />
                  )}
                </button>
              </div>

              {/* 3. Pop-up new messages */}
              <div className="flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-100">Pop-up new messages</h4>
                    <p className="text-[10px] text-purple-300/60">Automatically open new messages.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !popupNewMessages;
                    setPopupNewMessages(next);
                    localStorage.setItem('popup_new_messages', String(next));
                  }}
                  className="text-purple-300 hover:text-white"
                >
                  {popupNewMessages ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-500" />
                  )}
                </button>
              </div>

              {/* 4. Privacy & safety */}
              <button
                type="button"
                onClick={() => {
                  setShowPrivacyModal(true);
                  setShowChatSettingsModal(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Privacy & safety</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 5. Active Status */}
              <div className="flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CircleDot className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-100">Active Status: {activeStatus ? 'ON' : 'OFF'}</span>
                    <p className="text-[10px] text-purple-300/60">Show when you are active.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const next = !activeStatus;
                    setActiveStatus(next);
                    if (user) {
                      try {
                        await updateDoc(doc(db, 'users', user.uid), { isOnline: next });
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  className="text-purple-300 hover:text-white"
                >
                  {activeStatus ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-500" />
                  )}
                </button>
              </div>

              {/* 6. Message requests */}
              <button
                type="button"
                onClick={() => {
                  setShowMessageRequestsModal(true);
                  setShowChatSettingsModal(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Message requests</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 7. Archived chats */}
              <button
                type="button"
                onClick={() => {
                  setShowArchivedModal(true);
                  setShowChatSettingsModal(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Archive className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Archived chats</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 8. Message delivery settings */}
              <button
                type="button"
                onClick={() => {
                  setShowMessageDeliveryModal(true);
                  setShowChatSettingsModal(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Message delivery settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 9. Restricted accounts */}
              <button
                type="button"
                onClick={() => {
                  setShowRestrictedModal(true);
                  setShowChatSettingsModal(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldOff className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Restricted accounts</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 10. Block settings */}
              <button
                type="button"
                onClick={() => {
                  setShowBlockedModal(true);
                  setShowChatSettingsModal(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-purple-900/20 rounded-2xl transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-100">Block settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>
          </div>
        </div>
      )}

      {/* PRIVACY & SAFETY SUBMODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-extrabold text-white">Privacy & safety</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-white">Security Alerts</h5>
                  <p className="text-[10px] text-slate-400">Get notified when security keys change</p>
                </div>
                <button onClick={() => setSecurityAlerts(!securityAlerts)}>
                  {securityAlerts ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-white">Read Receipts</h5>
                  <p className="text-[10px] text-slate-400">Show when you have read messages</p>
                </div>
                <button onClick={() => setReadReceipts(!readReceipts)}>
                  {readReceipts ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-white">Safe Link Protection</h5>
                  <p className="text-[10px] text-slate-400">Warn before opening external links</p>
                </div>
                <button onClick={() => setSafeMessaging(!safeMessaging)}>
                  {safeMessaging ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>

              <div className="p-3 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 text-xs text-indigo-300">
                <p className="font-bold">🔐 End-to-End Encrypted</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Your direct messages and personal media are secured with modern encryption.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MESSAGE REQUESTS MODAL */}
      {showMessageRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-extrabold text-white">Message requests</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMessageRequestsModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Open a request to get info about who is messaging you. They won't know you've seen it until you accept.
            </p>

            <div className="p-6 text-center text-xs text-purple-300/60 bg-white/5 rounded-2xl border border-white/5">
              No pending message requests.
            </div>

            <button
              type="button"
              onClick={() => setShowMessageRequestsModal(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ARCHIVED CHATS MODAL */}
      {showArchivedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Archive className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">Archived chats</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowArchivedModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {chats.filter(c => c.isArchived).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-white/5 rounded-2xl border border-white/5">
                No archived chats.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {chats.filter(c => c.isArchived).map(c => (
                  <div key={c.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{c.groupName || 'Chat'}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await updateDoc(doc(db, 'chats', c.id), { isArchived: false });
                      }}
                      className="px-3 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-200 text-xs rounded-xl font-bold"
                    >
                      Unarchive
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowArchivedModal(false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MESSAGE DELIVERY SETTINGS MODAL */}
      {showMessageDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-sky-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold text-white">Message delivery settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMessageDeliveryModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white/5 rounded-2xl space-y-1">
                <label className="font-bold text-white block">People with your phone number</label>
                <select
                  value={peopleWithPhoneDelivery}
                  onChange={(e: any) => setPeopleWithPhoneDelivery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white"
                >
                  <option value="chats">Chats</option>
                  <option value="requests">Message requests</option>
                  <option value="none">Don't receive requests</option>
                </select>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl space-y-1">
                <label className="font-bold text-white block">Friends of friends</label>
                <select
                  value={friendsOfFriendsDelivery}
                  onChange={(e: any) => setFriendsOfFriendsDelivery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white"
                >
                  <option value="chats">Chats</option>
                  <option value="requests">Message requests</option>
                  <option value="none">Don't receive requests</option>
                </select>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl space-y-1">
                <label className="font-bold text-white block">Others on Connect Chat</label>
                <select
                  value={othersDelivery}
                  onChange={(e: any) => setOthersDelivery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white"
                >
                  <option value="requests">Message requests</option>
                  <option value="none">Don't receive requests</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMessageDeliveryModal(false)}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              Save Delivery Settings
            </button>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {viewingProfileUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setViewingProfileUser(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingProfileUser(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500/50 mx-auto shadow-xl">
              <img src={viewingProfileUser.photoURL} alt={viewingProfileUser.displayName} className="w-full h-full object-cover" />
            </div>

            <div>
              <h3 className="font-black text-lg text-white">{viewingProfileUser.displayName}</h3>
              {viewingProfileUser.isGroup ? (
                <p className="text-xs text-purple-300">Group Chat • {viewingProfileUser.memberCount || 2} members</p>
              ) : (
                <p className="text-xs text-slate-400">{viewingProfileUser.email || 'Connect Chat Member'}</p>
              )}
            </div>

            {!viewingProfileUser.isGroup && viewingProfileUser.uid && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const uid = viewingProfileUser.uid!;
                    initiateCall(uid, viewingProfileUser.displayName, viewingProfileUser.photoURL, 'audio');
                    setViewingProfileUser(null);
                  }}
                  className="py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Audio Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const uid = viewingProfileUser.uid!;
                    initiateCall(uid, viewingProfileUser.displayName, viewingProfileUser.photoURL, 'video');
                    setViewingProfileUser(null);
                  }}
                  className="py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Video className="w-4 h-4 text-sky-400" />
                  <span>Video Chat</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewingProfileUser(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* DELETE CHAT CONFIRMATION MODAL */}
      {deletingChat && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setDeletingChat(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-black text-lg text-white">Delete Conversation?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete the conversation with <strong className="text-white">{deletingChat.title}</strong>? This will permanently remove it.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChat(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, 'chats', deletingChat.id));
                    if (selectedChatId === deletingChat.id) {
                      setSelectedChatId(undefined);
                    }
                    setDeletingChat(null);
                  } catch (err) {
                    console.error('Error deleting chat:', err);
                  }
                }}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CHAT MODAL */}
      {reportingChat && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setReportingChat(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-left animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-black text-lg text-white">Report Conversation</h3>
            </div>

            {!reportSubmitted ? (
              <>
                <p className="text-xs text-slate-300">
                  Select a reason for reporting <strong className="text-white">{reportingChat.title}</strong>:
                </p>

                <div className="space-y-2 text-xs">
                  {['Spam or Scam', 'Harassment or Bullying', 'Inappropriate Content', 'Fake Account / Impersonation', 'Other Issue'].map((reason) => (
                    <label 
                      key={reason}
                      className={`p-3 rounded-xl border flex items-center space-x-2 cursor-pointer transition-all ${
                        reportReason === reason
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={reason}
                        checked={reportReason === reason}
                        onChange={() => setReportReason(reason)}
                        className="accent-amber-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingChat(null)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (user) {
                          await addDoc(collection(db, 'reports'), {
                            reporterId: user.uid,
                            chatId: reportingChat.id,
                            reportedTitle: reportingChat.title,
                            reason: reportReason,
                            timestamp: serverTimestamp()
                          });
                        }
                        setReportSubmitted(true);
                      } catch (err) {
                        console.error('Error submitting report:', err);
                        setReportSubmitted(true);
                      }
                    }}
                    className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-600/30 transition-all"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Report Submitted</h4>
                <p className="text-xs text-slate-300">
                  Thank you for keeping Connect Chat safe. We will review this conversation.
                </p>
                <button
                  type="button"
                  onClick={() => setReportingChat(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all mt-2"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
