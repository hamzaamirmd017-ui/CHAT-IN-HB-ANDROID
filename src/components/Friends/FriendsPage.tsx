import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Check, 
  X, 
  Ban, 
  Share2, 
  MessageSquare, 
  PhoneCall, 
  Video, 
  Sparkles, 
  ShieldAlert,
  Contact,
  Eye
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile } from '../../types';
import { PublicUserProfileModal } from '../Profile/PublicUserProfileModal';

interface FriendsPageProps {
  onStartChat: (chatId: string) => void;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({ onStartChat }) => {
  const { user, userProfile } = useAuth();
  const { startCall } = useCall();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'requests' | 'search' | 'contacts' | 'blocked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Contacts Sync states
  const [contactsList, setContactsList] = useState<{ name: string; phone: string; registeredUser?: UserProfile }[]>([
    { name: 'Sarah Connor', phone: '+15550192834' },
    { name: 'David Miller', phone: '+15559876543' },
    { name: 'Jessica Alba', phone: '+15551234567' },
    { name: 'Alex Rivers', phone: '+15558889999' }
  ]);
  const [contactsSynced, setContactsSynced] = useState(false);

  // Load all user profiles for friend lookup
  useEffect(() => {
    if (!user) return;

    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        snap.forEach((doc) => {
          if (doc.id !== user.uid) {
            list.push({ uid: doc.id, ...doc.data() } as UserProfile);
          }
        });
        setAllUsers(list);
      } catch (err) {
        console.error('Failed to load user directory:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, [user]);

  if (!user || !userProfile) return null;

  const friendsList = allUsers.filter((u) => userProfile.friends?.includes(u.uid));
  const requestsReceived = allUsers.filter((u) => userProfile.friendRequestsReceived?.includes(u.uid));
  const requestsSent = allUsers.filter((u) => userProfile.friendRequestsSent?.includes(u.uid));
  const blockedList = allUsers.filter((u) => userProfile.blockedUsers?.includes(u.uid));

  // Send Friend Request
  const handleSendRequest = async (targetUid: string) => {
    if ((userProfile.friends?.length || 0) >= 1000) {
      alert('Friend limit reached! You cannot have more than 1,000 friends.');
      return;
    }
    try {
      const myRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', targetUid);

      await updateDoc(myRef, {
        friendRequestsSent: arrayUnion(targetUid)
      });
      await updateDoc(targetRef, {
        friendRequestsReceived: arrayUnion(user.uid)
      });

      // Send notification
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        title: 'New Friend Request',
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
      console.error('Failed to send request:', err);
    }
  };

  // Accept Friend Request
  const handleAcceptRequest = async (targetUid: string) => {
    if ((userProfile.friends?.length || 0) >= 1000) {
      alert('Friend limit reached! You cannot have more than 1,000 friends.');
      return;
    }
    try {
      const myRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', targetUid);

      await updateDoc(myRef, {
        friends: arrayUnion(targetUid),
        friendRequestsReceived: arrayRemove(targetUid)
      });
      await updateDoc(targetRef, {
        friends: arrayUnion(user.uid),
        friendRequestsSent: arrayRemove(targetUid)
      });
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  // Reject / Cancel Request
  const handleRejectRequest = async (targetUid: string) => {
    try {
      const myRef = doc(db, 'users', user.uid);
      const targetRef = doc(db, 'users', targetUid);

      await updateDoc(myRef, {
        friendRequestsReceived: arrayRemove(targetUid)
      });
      await updateDoc(targetRef, {
        friendRequestsSent: arrayRemove(user.uid)
      });
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  // Block User
  const handleBlockUser = async (targetUid: string) => {
    try {
      const myRef = doc(db, 'users', user.uid);
      await updateDoc(myRef, {
        blockedUsers: arrayUnion(targetUid),
        friends: arrayRemove(targetUid)
      });
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  // Unblock User
  const handleUnblockUser = async (targetUid: string) => {
    try {
      const myRef = doc(db, 'users', user.uid);
      await updateDoc(myRef, {
        blockedUsers: arrayRemove(targetUid)
      });
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
  };

  // Start direct conversation with friend
  const handleOpenChat = async (targetUser: UserProfile) => {
    try {
      const chatsSnap = await getDocs(collection(db, 'chats'));
      let existingChatId: string | null = null;

      chatsSnap.forEach((d) => {
        const data = d.data();
        if (!data.isGroup && data.participants.includes(user.uid) && data.participants.includes(targetUser.uid)) {
          existingChatId = d.id;
        }
      });

      if (existingChatId) {
        onStartChat(existingChatId);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, targetUser.uid],
          participantData: {
            [user.uid]: {
              displayName: userProfile.displayName,
              photoURL: userProfile.photoURL,
              email: userProfile.email
            },
            [targetUser.uid]: {
              displayName: targetUser.displayName,
              photoURL: targetUser.photoURL,
              email: targetUser.email
            }
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: {
            text: 'Started conversation',
            senderId: user.uid,
            timestamp: new Date(),
            read: false
          }
        });
        onStartChat(newChat.id);
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  // Simulate Contact Directory Sync
  const handleSyncContacts = () => {
    setContactsSynced(true);
    const updated = contactsList.map((contact) => {
      const matched = allUsers.find(
        (u) => u.phoneNumber === contact.phone || u.displayName.toLowerCase() === contact.name.toLowerCase()
      );
      return { ...contact, registeredUser: matched };
    });
    setContactsList(updated);
  };

  // Calculate mutual friends
  const getMutualFriendsCount = (targetUser: UserProfile) => {
    if (!targetUser.friends || !userProfile.friends) return 0;
    return targetUser.friends.filter((fUid) => userProfile.friends?.includes(fUid)).length;
  };

  const filteredSearchUsers = allUsers.filter((u) => {
    const term = searchTerm.toLowerCase();
    const isBlocked = userProfile.blockedUsers?.includes(u.uid);
    if (isBlocked) return false;
    return (
      u.displayName.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.phoneNumber && u.phoneNumber.includes(term)) ||
      u.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-24 md:pb-6">
      
      {/* Header */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-white tracking-wide">Friends & Directory</h2>
              <p className="text-xs text-slate-400">Connect, discover, and manage your contacts</p>
            </div>
          </div>
        </div>

        {/* Global Friend Search Bar - Positioned ABOVE Directory Navigation */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-indigo-500/40 shadow-inner space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Friend Search Bar</span>
            </label>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-indigo-400" />
            <input
              type="text"
              placeholder="Type name, @username, phone number or email to search & add friends..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value && activeSubTab !== 'search') {
                  setActiveSubTab('search');
                }
              }}
              className="w-full bg-slate-950 border border-purple-500/40 focus:border-fuchsia-400 rounded-xl py-2.5 pl-10 pr-9 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Friends ({friendsList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all relative ${
              activeSubTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Requests ({requestsReceived.length})
            {requestsReceived.length > 0 && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-pink-500 inline-block animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('search')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'search'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Find Friends</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: All Friends */}
      {activeSubTab === 'all' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friendsList.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 frosted-card rounded-3xl p-6">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="font-semibold text-sm text-white">No friends added yet.</p>
                <p className="text-xs text-slate-400 mt-1">Use "Find Friends" or "Sync Contacts" to connect with people!</p>
              </div>
            ) : (
              friendsList.map((friend) => (
                <div key={friend.uid} className="frosted-card rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div 
                      onClick={() => setViewingUserId(friend.uid)}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-indigo-500/30">
                        <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {friend.isOnline && (
                          <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">{friend.displayName}</h4>
                        <p className="text-[11px] text-indigo-400 font-medium">{friend.username || '@member'}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{friend.bio}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">
                    <span>{getMutualFriendsCount(friend)} mutual friends</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenChat(friend)}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-colors"
                        title="Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startCall(friend.uid, friend.displayName, friend.photoURL, 'audio')}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors"
                        title="Voice Call"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startCall(friend.uid, friend.displayName, friend.photoURL, 'video')}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleBlockUser(friend.uid)}
                        className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                        title="Block User"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Requests Received & Sent */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          <div className="frosted-card rounded-3xl p-6">
            <h3 className="font-bold text-base text-white mb-4">Received Requests ({requestsReceived.length})</h3>
            {requestsReceived.length === 0 ? (
              <p className="text-xs text-slate-400">No pending incoming friend requests.</p>
            ) : (
              <div className="space-y-3">
                {requestsReceived.map((req) => (
                  <div key={req.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center space-x-3">
                      <img src={req.photoURL} alt={req.displayName} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-semibold text-xs text-white">{req.displayName}</h4>
                        <p className="text-[10px] text-slate-400">{req.username || req.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(req.uid)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.uid)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="frosted-card rounded-3xl p-6">
            <h3 className="font-bold text-base text-white mb-4">Sent Requests ({requestsSent.length})</h3>
            {requestsSent.length === 0 ? (
              <p className="text-xs text-slate-400">No pending sent requests.</p>
            ) : (
              <div className="space-y-3">
                {requestsSent.map((req) => (
                  <div key={req.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center space-x-3">
                      <img src={req.photoURL} alt={req.displayName} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-semibold text-xs text-white">{req.displayName}</h4>
                        <p className="text-[10px] text-slate-400">Waiting for response...</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRejectRequest(req.uid)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 3: Friend Search Bar / Directory Search */}
      {activeSubTab === 'search' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
              <Search className="w-4 h-4 text-fuchsia-400" />
              <span>Friend Directory Results ({filteredSearchUsers.length})</span>
            </h3>
            {searchTerm && (
              <span className="text-xs text-indigo-300 font-medium">
                Searching for: "<strong className="text-white">{searchTerm}</strong>"
              </span>
            )}
          </div>

          {filteredSearchUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 frosted-card rounded-3xl p-6 border border-white/5 space-y-3">
              <UserPlus className="w-12 h-12 mx-auto text-indigo-400/60" />
              <p className="font-bold text-sm text-white">No matching users found.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try searching with a full name, username (e.g. <span className="text-fuchsia-300">@amir</span>), phone number, or email address.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSearchUsers.map((target) => {
                const isFriend = userProfile.friends?.includes(target.uid);
                const isSent = userProfile.friendRequestsSent?.includes(target.uid);
                const isReceived = userProfile.friendRequestsReceived?.includes(target.uid);

                return (
                  <div key={target.uid} className="frosted-card rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-all">
                    <div 
                      onClick={() => setViewingUserId(target.uid)}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      <img src={target.photoURL} alt={target.displayName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/30 group-hover:scale-105 transition-transform" />
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{target.displayName}</h4>
                        <p className="text-[11px] text-indigo-400 font-medium">{target.username || '@user'}</p>
                        {target.phoneNumber && (
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{target.phoneNumber}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{getMutualFriendsCount(target)} mutual friends</span>
                      {isFriend ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </span>
                          <button
                            onClick={() => handleOpenChat(target)}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow"
                            title="Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isSent ? (
                        <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">Request Sent</span>
                      ) : isReceived ? (
                        <button
                          onClick={() => handleAcceptRequest(target.uid)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow"
                        >
                          Accept Request
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(target.uid)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl flex items-center space-x-1 shadow-md transition-all hover:scale-105"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SubTab 4: Contacts Sync */}
      {activeSubTab === 'contacts' && (
        <div className="frosted-card rounded-3xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Contact className="w-5 h-5 text-indigo-400" />
                <span>Phone Contacts Integration</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sync your device contacts to instantly find who is registered on Connect Chat.
              </p>
            </div>
            <button
              onClick={handleSyncContacts}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{contactsSynced ? 'Resync Device Contacts' : 'Sync Contacts Now'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {contactsList.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">{c.name}</h4>
                    <p className="text-[10px] text-slate-400">{c.phone}</p>
                  </div>
                </div>

                {c.registeredUser ? (
                  <button
                    onClick={() => handleSendRequest(c.registeredUser!.uid)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Friend</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText('Join me on Connect Chat: https://connectchat.io');
                      alert(`Invite link copied! Share with ${c.name}`);
                    }}
                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Invite Friend</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 5: Blocked Users */}
      {activeSubTab === 'blocked' && (
        <div className="frosted-card rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-base text-white">Blocked Users ({blockedList.length})</h3>
          {blockedList.length === 0 ? (
            <p className="text-xs text-slate-400">You haven't blocked any users.</p>
          ) : (
            <div className="space-y-3">
              {blockedList.map((b) => (
                <div key={b.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center space-x-3">
                    <img src={b.photoURL} alt={b.displayName} className="w-10 h-10 rounded-xl object-cover grayscale" />
                    <div>
                      <h4 className="font-semibold text-xs text-white">{b.displayName}</h4>
                      <p className="text-[10px] text-slate-400">{b.username || b.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblockUser(b.uid)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
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

    </div>
  );
};
