import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageSquare, Phone, Video, Sparkles, Check, Eye } from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile } from '../../types';
import { PublicUserProfileModal } from '../Profile/PublicUserProfileModal';

interface SearchUsersProps {
  onStartChat: (chatId: string) => void;
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ onStartChat }) => {
  const { user, userProfile } = useAuth();
  const { initiateCall } = useCall();

  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserProfile[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          if (data.uid !== user?.uid) {
            fetchedUsers.push(data);
          }
        });

        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  const filteredUsers = users.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(searchLower) ||
      (u.username && u.username.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower)) ||
      (u.phoneNumber && u.phoneNumber.toLowerCase().includes(searchLower)) ||
      (u.status && u.status.toLowerCase().includes(searchLower)) ||
      (u.bio && u.bio.toLowerCase().includes(searchLower))
    );
  });

  const handleCreateOrOpenChat = async (targetUser: UserProfile) => {
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

    onStartChat(chatId);
  };

  const handleSendRequest = async (targetUid: string) => {
    if (!user || !userProfile) return;
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

  return (
    <div className="w-full p-3 sm:p-5 space-y-5">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Discover Connections</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Find & Connect with Friends
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm max-w-lg">
            Search users by name or username, view public profiles, send friend requests, or start direct chats.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, username, email, phone, or bio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-sm"
        />
      </div>

      {/* User Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-gray-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] p-8">
          <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="font-bold text-[var(--text-main)] text-sm">No users found</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Try searching with a different keyword or name.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredUsers.map((targetUser) => {
            const isFriend = userProfile?.friends?.includes(targetUser.uid);
            const isSent = userProfile?.friendRequestsSent?.includes(targetUser.uid);
            const isReceived = userProfile?.friendRequestsReceived?.includes(targetUser.uid);

            return (
              <div
                key={targetUser.uid}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/50 transition-all shadow-sm group"
              >
                <div 
                  onClick={() => setViewingUserId(targetUser.uid)}
                  className="flex items-center space-x-3.5 min-w-0 cursor-pointer flex-1 mr-2"
                >
                  <div className="relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-500/20 bg-gray-800">
                    <img
                      src={targetUser.photoURL}
                      alt={targetUser.displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {targetUser.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[var(--text-main)] truncate group-hover:text-indigo-400 transition-colors">
                      {targetUser.displayName}
                    </h4>
                    <p className="text-xs text-indigo-400 font-medium truncate">
                      {targetUser.username || '@member'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {targetUser.status || targetUser.bio || 'Available'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => setViewingUserId(targetUser.uid)}
                    className="p-2 bg-purple-500/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-xl transition-colors"
                    title="View Public Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {!isFriend && !isSent && !isReceived && (
                    <button
                      onClick={() => handleSendRequest(targetUser.uid)}
                      className="p-2 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-colors"
                      title="Add Friend"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleCreateOrOpenChat(targetUser)}
                    className="p-2 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-colors"
                    title="Chat"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => initiateCall(targetUser.uid, targetUser.displayName, targetUser.photoURL, 'audio')}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl transition-colors"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
