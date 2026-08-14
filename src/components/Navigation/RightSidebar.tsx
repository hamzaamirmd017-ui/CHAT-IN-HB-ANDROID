import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  PhoneCall, 
  Check, 
  X, 
  Sparkles, 
  Search,
  Activity,
  Clock,
  EyeOff,
  Edit3,
  Smile,
  Circle,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  onSnapshot,
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile, ActiveTab, UserPresenceStatus } from '../../types';
import { PublicUserProfileModal } from '../Profile/PublicUserProfileModal';

interface RightSidebarProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onStartChat: (friendUid: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ onNavigateTab, onStartChat }) => {
  const { user, userProfile, setPresenceStatus } = useAuth();
  const { startCall } = useCall();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  
  // Status filter for friends list: 'all' | 'online' | 'away' | 'offline'
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'away' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom status message editing state
  const [isEditingCustomStatus, setIsEditingCustomStatus] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState(userProfile?.status || '');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    if (!user) return;
    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCollection,
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          if (d.id !== user.uid) {
            list.push({ uid: d.id, ...d.data() } as UserProfile);
          }
        });
        setAllUsers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('onSnapshot error fetching users for right sidebar:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!user || !userProfile) return null;

  // Derive helper for calculating presence state
  const getUserPresenceState = (u: UserProfile): UserPresenceStatus => {
    if (u.presence === 'away') return 'away';
    if (u.presence === 'offline') return 'offline';
    if (u.presence === 'online') return 'online';
    // Fallback based on isOnline boolean
    return u.isOnline ? 'online' : 'offline';
  };

  const currentPresence: UserPresenceStatus = getUserPresenceState(userProfile);

  // Quick preset custom status messages
  const statusPresets = [
    { label: 'Available', emoji: '✨' },
    { label: 'In a Meeting', emoji: '💼' },
    { label: 'Focus / Coding', emoji: '🚀' },
    { label: 'Coffee Break', emoji: '☕' },
    { label: 'Do Not Disturb', emoji: '⛔' }
  ];

  const handleSaveCustomStatus = async (statusText: string) => {
    setIsSavingStatus(true);
    try {
      await setPresenceStatus(currentPresence, statusText);
      setIsEditingCustomStatus(false);
    } catch (err) {
      console.error('Failed to update custom status:', err);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Filter Friends
  const friendsList = allUsers.filter((u) => userProfile.friends?.includes(u.uid));
  const onlineFriends = friendsList.filter((u) => getUserPresenceState(u) === 'online');
  const awayFriends = friendsList.filter((u) => getUserPresenceState(u) === 'away');
  const offlineFriends = friendsList.filter((u) => getUserPresenceState(u) === 'offline');

  // Filtered friends based on active tab and search
  const filteredFriends = friendsList.filter((u) => {
    const userPresence = getUserPresenceState(u);
    const matchesFilter = 
      presenceFilter === 'all' ? true :
      presenceFilter === 'online' ? userPresence === 'online' :
      presenceFilter === 'away' ? userPresence === 'away' :
      userPresence === 'offline';

    const matchesSearch = searchQuery.trim() === '' || 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // Friend Requests Received
  const incomingRequestUids = userProfile.friendRequestsReceived || [];
  const incomingRequests = allUsers.filter((u) => incomingRequestUids.includes(u.uid));

  // Suggested Friends (not friends, not requested, not self)
  const sentRequestUids = userProfile.friendRequestsSent || [];
  const existingFriendUids = userProfile.friends || [];
  const suggestedFriends = allUsers.filter(
    (u) =>
      !existingFriendUids.includes(u.uid) &&
      !incomingRequestUids.includes(u.uid) &&
      !sentRequestUids.includes(u.uid)
  ).slice(0, 4);

  // Accept Friend Request
  const handleAcceptRequest = async (friendUid: string, friendName: string, friendPhoto: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendUid),
        friendRequestsReceived: arrayRemove(friendUid)
      });

      await updateDoc(doc(db, 'users', friendUid), {
        friends: arrayUnion(user.uid),
        friendRequestsSent: arrayRemove(user.uid)
      });

      await addDoc(collection(db, 'notifications'), {
        userId: friendUid,
        title: 'Friend Request Accepted! 🎉',
        body: `${userProfile.displayName} accepted your friend request. You are now connected!`,
        type: 'friend_request',
        read: false,
        fromUser: {
          uid: user.uid,
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL
        },
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  // Reject Request
  const handleRejectRequest = async (friendUid: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequestsReceived: arrayRemove(friendUid)
      });
      await updateDoc(doc(db, 'users', friendUid), {
        friendRequestsSent: arrayRemove(user.uid)
      });
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  // Send Friend Request
  const handleSendRequest = async (targetUid: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequestsSent: arrayUnion(targetUid)
      });
      await updateDoc(doc(db, 'users', targetUid), {
        friendRequestsReceived: arrayUnion(user.uid)
      });

      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        title: 'New Friend Request 👥',
        body: `${userProfile.displayName} sent you a friend request.`,
        type: 'friend_request',
        read: false,
        fromUser: {
          uid: user.uid,
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL
        },
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  // Format last seen / presence label
  const renderPresenceBadge = (status: UserPresenceStatus, size: 'sm' | 'md' = 'sm') => {
    switch (status) {
      case 'online':
        return (
          <div className="flex items-center space-x-1.5 text-emerald-500 font-semibold text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Online</span>
          </div>
        );
      case 'away':
        return (
          <div className="flex items-center space-x-1.5 text-amber-500 font-semibold text-[10px]">
            <span className="inline-flex rounded-full h-2 w-2 bg-amber-400 ring-1 ring-amber-300/40" />
            <span>Away</span>
          </div>
        );
      case 'offline':
      default:
        return (
          <div className="flex items-center space-x-1.5 text-slate-400 font-medium text-[10px]">
            <span className="inline-flex rounded-full h-2 w-2 bg-slate-400" />
            <span>Offline</span>
          </div>
        );
    }
  };

  return (
    <aside className="w-72 lg:w-80 hidden xl:flex flex-col space-y-4 py-4 pl-2 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar select-none">
      
      {/* 🟢 Live Presence & Status Controller Widget */}
      <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-4 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="font-extrabold text-xs text-[var(--text-main)] uppercase tracking-wider">
              My Real-Time Status
            </h3>
          </div>
          {renderPresenceBadge(currentPresence, 'sm')}
        </div>

        {/* Status Toggle Switcher (Online / Away / Offline) */}
        <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-input)] p-1 rounded-2xl border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setPresenceStatus('online')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
              currentPresence === 'online'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
            }`}
            title="Set status to Online"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 ring-2 ring-emerald-600/30" />
            <span>Online</span>
          </button>

          <button
            type="button"
            onClick={() => setPresenceStatus('away')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
              currentPresence === 'away'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
            }`}
            title="Set status to Away"
          >
            <span className="w-2 h-2 rounded-full bg-amber-200 ring-2 ring-amber-600/30" />
            <span>Away</span>
          </button>

          <button
            type="button"
            onClick={() => setPresenceStatus('offline')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
              currentPresence === 'offline'
                ? 'bg-slate-600 text-white shadow-md shadow-slate-600/20 scale-[1.02]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
            }`}
            title="Set status to Invisible / Offline"
          >
            <span className="w-2 h-2 rounded-full bg-slate-300 ring-2 ring-slate-700/30" />
            <span>Offline</span>
          </button>
        </div>

        {/* Custom Status Message display & editor */}
        <div className="pt-1">
          {isEditingCustomStatus ? (
            <div className="space-y-2 bg-[var(--bg-input)] p-2.5 rounded-2xl border border-[var(--border-color)] animate-fadeIn">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customStatusInput}
                  onChange={(e) => setCustomStatusInput(e.target.value)}
                  placeholder="What are you up to?..."
                  maxLength={60}
                  className="flex-1 bg-transparent text-xs text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-secondary)]"
                  autoFocus
                />
              </div>

              {/* Status preset chips */}
              <div className="flex flex-wrap gap-1 pt-1">
                {statusPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCustomStatusInput(`${preset.emoji} ${preset.label}`);
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-[var(--bg-card)] hover:bg-purple-600/20 text-[var(--text-secondary)] hover:text-purple-400 border border-[var(--border-color)] transition-colors"
                  >
                    {preset.emoji} {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingCustomStatus(false)}
                  className="px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingStatus}
                  onClick={() => handleSaveCustomStatus(customStatusInput)}
                  className="px-3 py-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-[11px] rounded-lg shadow-sm"
                >
                  {isSavingStatus ? 'Saving...' : 'Set Status'}
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => {
                setCustomStatusInput(userProfile.status || '');
                setIsEditingCustomStatus(true);
              }}
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-input)]/60 hover:bg-[var(--bg-input)] border border-[var(--border-color)] cursor-pointer group transition-all"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <Smile className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)] group-hover:text-[var(--text-main)] truncate font-medium">
                  {userProfile.status || 'Set custom status note...'}
                </span>
              </div>
              <Edit3 className="w-3 h-3 text-[var(--text-secondary)] group-hover:text-purple-400 opacity-60 group-hover:opacity-100 flex-shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Pending Friend Requests Widget */}
      {incomingRequests.length > 0 && (
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-4 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-pink-400" />
              <span>Friend Requests ({incomingRequests.length})</span>
            </h3>
            <button
              onClick={() => onNavigateTab('friends')}
              className="text-[10px] font-bold text-purple-500 dark:text-purple-400 hover:underline"
            >
              See All
            </button>
          </div>

          <div className="space-y-2.5">
            {incomingRequests.slice(0, 3).map((reqUser) => {
              const reqPresence = getUserPresenceState(reqUser);
              return (
                <div key={reqUser.uid} className="bg-[var(--bg-input)] p-3 rounded-2xl border border-[var(--border-color)] space-y-2">
                  <div 
                    onClick={() => setViewingUserId(reqUser.uid)}
                    className="flex items-center space-x-2.5 cursor-pointer group"
                  >
                    <div className="relative">
                      <img src={reqUser.photoURL} alt={reqUser.displayName} className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform" />
                      <div 
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-card)] ${
                          reqPresence === 'online' ? 'bg-emerald-500' : reqPresence === 'away' ? 'bg-amber-400' : 'bg-slate-400'
                        }`} 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-[var(--text-main)] group-hover:text-purple-400 transition-colors truncate">{reqUser.displayName}</h4>
                      <p className="text-[10px] text-purple-500 dark:text-purple-400 font-medium truncate">{reqUser.username || '@member'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleAcceptRequest(reqUser.uid, reqUser.displayName, reqUser.photoURL)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1 shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(reqUser.uid)}
                      className="py-1.5 px-3 bg-[var(--bg-card)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-500 font-bold text-[11px] rounded-xl border border-[var(--border-color)] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 👥 Real-Time Friends Presence & Status Widget */}
      <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-4 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="font-extrabold text-xs text-[var(--text-main)] uppercase tracking-wider">
              Presence & Friends
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('friends')}
            className="text-[10px] font-bold text-purple-500 dark:text-purple-400 hover:underline"
          >
            Manage
          </button>
        </div>

        {/* Presence Status Quick Filter Pills */}
        <div className="flex items-center space-x-1 bg-[var(--bg-input)] p-1 rounded-2xl border border-[var(--border-color)] text-[10px] font-extrabold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setPresenceFilter('all')}
            className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
              presenceFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            All ({friendsList.length})
          </button>
          <button
            type="button"
            onClick={() => setPresenceFilter('online')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center space-x-1 whitespace-nowrap ${
              presenceFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Online ({onlineFriends.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPresenceFilter('away')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center space-x-1 whitespace-nowrap ${
              presenceFilter === 'away'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-500 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Away ({awayFriends.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPresenceFilter('offline')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center space-x-1 whitespace-nowrap ${
              presenceFilter === 'offline'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-500/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Off ({offlineFriends.length})</span>
          </button>
        </div>

        {/* Mini Search Bar if user has multiple friends */}
        {friendsList.length > 4 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search status & contacts..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:border-purple-500/50"
            />
          </div>
        )}

        {friendsList.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-secondary)] space-y-2">
            <p className="text-xs">No friends added yet.</p>
            <button
              onClick={() => onNavigateTab('search')}
              className="px-3 py-1.5 bg-purple-600/30 text-purple-600 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-400/30 hover:bg-purple-600/50"
            >
              Discover People
            </button>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="py-6 text-center text-[var(--text-secondary)] text-xs">
            No contacts matching this status filter.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
            {filteredFriends.map((friend) => {
              const friendPresence = getUserPresenceState(friend);
              return (
                <div
                  key={friend.uid}
                  className="group flex items-center justify-between p-2 rounded-2xl hover:bg-[var(--bg-input)] transition-all border border-transparent hover:border-[var(--border-color)]"
                >
                  <div
                    onClick={() => onStartChat(friend.uid)}
                    className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-[var(--bg-input)] ring-1 ring-[var(--border-color)] flex-shrink-0">
                      <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[var(--bg-card)] flex items-center justify-center ${
                          friendPresence === 'online'
                            ? 'bg-emerald-500'
                            : friendPresence === 'away'
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                        }`}
                        title={friendPresence === 'online' ? 'Online' : friendPresence === 'away' ? 'Away' : 'Offline'}
                      >
                        {friendPresence === 'online' && (
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-bold text-xs text-[var(--text-main)] truncate group-hover:text-purple-400 transition-colors">
                          {friend.displayName}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-1">
                        {renderPresenceBadge(friendPresence, 'sm')}
                        {friend.status && (
                          <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[100px] border-l border-[var(--border-color)] pl-1">
                            {friend.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStartChat(friend.uid)}
                      className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-purple-400 hover:bg-purple-500/10"
                      title="Send Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startCall(friend.uid, friend.displayName, friend.photoURL, 'audio')}
                      className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/10"
                      title="Voice Call"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suggested Friends Widget */}
      {suggestedFriends.length > 0 && (
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-4 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Suggested Connections</span>
            </h3>
            <button
              onClick={() => onNavigateTab('search')}
              className="text-[10px] font-bold text-purple-500 dark:text-purple-400 hover:underline"
            >
              Search
            </button>
          </div>

          <div className="space-y-2.5">
            {suggestedFriends.map((sug) => {
              const sugPresence = getUserPresenceState(sug);
              return (
                <div key={sug.uid} className="flex items-center justify-between p-2 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                  <div 
                    onClick={() => setViewingUserId(sug.uid)}
                    className="flex items-center space-x-2.5 min-w-0 cursor-pointer group flex-1"
                  >
                    <div className="relative">
                      <img src={sug.photoURL} alt={sug.displayName} className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform" />
                      <div 
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-card)] ${
                          sugPresence === 'online' ? 'bg-emerald-500' : sugPresence === 'away' ? 'bg-amber-400' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-[var(--text-main)] group-hover:text-purple-400 transition-colors truncate">{sug.displayName}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">
                        {sug.status || sug.username || '@member'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendRequest(sug.uid)}
                    className="p-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold shadow-md transition-transform active:scale-95 flex-shrink-0"
                    title="Add Friend"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Public User Profile Modal */}
      {viewingUserId && (
        <PublicUserProfileModal
          targetUserId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onStartChat={(chatId) => {
            setViewingUserId(null);
            onStartChat(chatId);
          }}
        />
      )}

    </aside>
  );
};
