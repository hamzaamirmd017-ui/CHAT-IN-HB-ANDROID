import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  UserPlus, 
  UserCheck, 
  UserX, 
  MessageSquare, 
  PhoneCall, 
  Video, 
  Sparkles, 
  Check, 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Home, 
  FileText, 
  Image as ImageIcon, 
  Heart, 
  Share2, 
  Lock, 
  Users, 
  Ban,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile, Post } from '../../types';

interface PublicUserProfileModalProps {
  targetUserId: string | null;
  onClose: () => void;
  onStartChat?: (chatId: string) => void;
}

export const PublicUserProfileModal: React.FC<PublicUserProfileModalProps> = ({
  targetUserId,
  onClose,
  onStartChat
}) => {
  const { user, userProfile } = useAuth();
  const { startCall } = useCall();

  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'photos' | 'about'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Comment input per post
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  // Subscribe to target user profile document
  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);

    const unsub = onSnapshot(
      doc(db, 'users', targetUserId),
      (docSnap) => {
        if (docSnap.exists()) {
          setTargetUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          setTargetUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching target user profile:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [targetUserId]);

  // Fetch target user's public posts
  useEffect(() => {
    if (!targetUserId) return;
    setLoadingPosts(true);

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubPosts = onSnapshot(
      q,
      (snapshot) => {
        const postsList: Post[] = [];
        snapshot.forEach((d) => {
          postsList.push({ id: d.id, ...d.data() } as Post);
        });
        setUserPosts(postsList);
        setLoadingPosts(false);
      },
      (err) => {
        console.warn('Error listening to user posts:', err);
        setLoadingPosts(false);
      }
    );

    return () => unsubPosts();
  }, [targetUserId]);

  if (!targetUserId || !user || !userProfile) return null;

  const isSelf = targetUserId === user.uid;

  // Relationship statuses
  const isFriend = userProfile.friends?.includes(targetUserId);
  const isSent = userProfile.friendRequestsSent?.includes(targetUserId);
  const isReceived = userProfile.friendRequestsReceived?.includes(targetUserId);
  const isBlocked = userProfile.blockedUsers?.includes(targetUserId);

  // Send Friend Request
  const handleSendRequest = async () => {
    if ((userProfile.friends?.length || 0) >= 1000) {
      alert('Friend limit reached! You cannot have more than 1,000 friends.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequestsSent: arrayUnion(targetUserId)
      });
      await updateDoc(doc(db, 'users', targetUserId), {
        friendRequestsReceived: arrayUnion(user.uid)
      });

      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
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

  // Accept Friend Request
  const handleAcceptRequest = async () => {
    if ((userProfile.friends?.length || 0) >= 1000) {
      alert('Friend limit reached! You cannot have more than 1,000 friends.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(targetUserId),
        friendRequestsReceived: arrayRemove(targetUserId)
      });
      await updateDoc(doc(db, 'users', targetUserId), {
        friends: arrayUnion(user.uid),
        friendRequestsSent: arrayRemove(user.uid)
      });

      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
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

  // Decline or Cancel Request
  const handleCancelOrDecline = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequestsReceived: arrayRemove(targetUserId),
        friendRequestsSent: arrayRemove(targetUserId)
      });
      await updateDoc(doc(db, 'users', targetUserId), {
        friendRequestsSent: arrayRemove(user.uid),
        friendRequestsReceived: arrayRemove(user.uid)
      });
    } catch (err) {
      console.error('Error canceling request:', err);
    }
  };

  // Unfriend
  const handleUnfriend = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(targetUserId)
      });
      await updateDoc(doc(db, 'users', targetUserId), {
        friends: arrayRemove(user.uid)
      });
    } catch (err) {
      console.error('Error unfriending:', err);
    }
  };

  // Open Direct Chat
  const handleOpenChat = async () => {
    if (!targetUser) return;
    try {
      const chatId = [user.uid, targetUserId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);

      await setDoc(
        chatRef,
        {
          id: chatId,
          participants: [user.uid, targetUserId],
          participantData: {
            [user.uid]: {
              displayName: userProfile.displayName,
              photoURL: userProfile.photoURL,
              email: userProfile.email || ''
            },
            [targetUserId]: {
              displayName: targetUser.displayName,
              photoURL: targetUser.photoURL,
              email: targetUser.email || ''
            }
          },
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      onClose();
      if (onStartChat) {
        onStartChat(chatId);
      }
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  // Toggle Like on post
  const handleToggleLike = async (post: Post) => {
    const isLiked = post.likes?.includes(user.uid);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  // Add Comment on post
  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId]?.trim();
    if (!text) return;

    const newComment = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: user.uid,
      authorName: userProfile.displayName,
      authorPhoto: userProfile.photoURL,
      text,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'posts', postId), {
        comments: arrayUnion(newComment)
      });
      setCommentInput((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Calculate mutual friends
  const getMutualFriendsCount = () => {
    if (!targetUser?.friends || !userProfile.friends) return 0;
    return targetUser.friends.filter((fUid) => userProfile.friends?.includes(fUid)).length;
  };

  const mediaPosts = userPosts.filter((p) => p.mediaUrl);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-slate-950 border border-purple-500/30 rounded-3xl overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-40 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all shadow-lg active:scale-95 cursor-pointer"
          title="Close Profile"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="p-12 text-center text-white space-y-3">
            <div className="w-10 h-10 border-3 border-fuchsia-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-purple-200">Loading user profile...</p>
          </div>
        ) : !targetUser ? (
          <div className="p-12 text-center text-white space-y-3">
            <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
            <h3 className="font-extrabold text-base">User Not Found</h3>
            <p className="text-xs text-slate-400">This profile is unavailable or no longer exists.</p>
          </div>
        ) : (
          <div className="overflow-y-auto no-scrollbar flex-1">
            
            {/* Cover Banner */}
            <div className="h-44 sm:h-60 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 relative overflow-hidden">
              {targetUser.coverPhotoURL ? (
                <img
                  src={targetUser.coverPhotoURL}
                  alt="Cover"
                  className="w-full h-full object-cover cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setSelectedPhoto(targetUser.coverPhotoURL || null)}
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800 via-indigo-950 to-slate-950 opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            </div>

            {/* Profile Info Header */}
            <div className="px-4 sm:px-6 pb-4 relative">
              
              {/* Overlapping Avatar */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                <div className="flex items-end space-x-4">
                  <div 
                    className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-slate-950 overflow-hidden bg-slate-900 shadow-2xl ring-4 ring-purple-500/30 flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedPhoto(targetUser.photoURL || null)}
                  >
                    <img src={targetUser.photoURL} alt={targetUser.displayName} className="w-full h-full object-cover" />
                    <div 
                      className={`absolute bottom-2 right-2 w-5 h-5 rounded-full ring-2 ring-slate-950 flex items-center justify-center ${
                        (targetUser.presence === 'online' || (targetUser.presence === undefined && targetUser.isOnline))
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : targetUser.presence === 'away'
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                          : 'bg-slate-500'
                      }`}
                    >
                      {(targetUser.presence === 'online' || (targetUser.presence === undefined && targetUser.isOnline)) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="pb-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white">{targetUser.displayName}</h2>
                    <p className="text-xs text-fuchsia-300 font-semibold">{targetUser.username || '@member'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-400">
                        {getMutualFriendsCount()} mutual friends
                      </span>
                      <span>•</span>
                      <span className={`text-[10px] font-bold ${
                        (targetUser.presence === 'online' || (targetUser.presence === undefined && targetUser.isOnline))
                          ? 'text-emerald-400'
                          : targetUser.presence === 'away'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}>
                        {(targetUser.presence === 'online' || (targetUser.presence === undefined && targetUser.isOnline))
                          ? '🟢 Active Now'
                          : targetUser.presence === 'away'
                          ? '🟡 Away'
                          : '⚪ Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Friend Action Buttons for Public Viewer */}
                {!isSelf && (
                  <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-2 sm:pt-0">
                    {isFriend ? (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenChat}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all active:scale-95"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Message</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startCall(targetUser.uid, targetUser.displayName, targetUser.photoURL, 'audio')}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                          title="Voice Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startCall(targetUser.uid, targetUser.displayName, targetUser.photoURL, 'video')}
                          className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow"
                          title="Video Call"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleUnfriend}
                          className="px-3 py-2 bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-bold text-xs rounded-xl border border-white/10 transition-colors"
                        >
                          Friends ✓
                        </button>
                      </>
                    ) : isSent ? (
                      <button
                        type="button"
                        onClick={handleCancelOrDecline}
                        className="px-4 py-2 bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-extrabold text-xs rounded-xl border border-white/10 transition-colors"
                      >
                        Request Sent (Cancel)
                      </button>
                    ) : isReceived ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleAcceptRequest}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelOrDecline}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs rounded-xl"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendRequest}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Read-Only Bio Box */}
              {targetUser.bio && (
                <p className="text-xs text-slate-200 italic bg-white/5 p-3 rounded-2xl border border-white/10 max-w-2xl mb-4">
                  "{targetUser.bio}"
                </p>
              )}

              {/* Navigation Tabs */}
              <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'posts'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>Posts ({userPosts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'photos'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Photos ({mediaPosts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('about')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'about'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>About</span>
                </button>
              </div>

              {/* Tab 1: Posts */}
              {activeTab === 'posts' && (
                <div className="pt-4 space-y-4">
                  {loadingPosts ? (
                    <div className="h-36 bg-white/5 rounded-2xl animate-pulse" />
                  ) : userPosts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/5">
                      <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="font-bold text-xs text-white">No public posts from this user yet.</p>
                    </div>
                  ) : (
                    userPosts.map((post) => (
                      <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center space-x-3">
                          <img src={post.authorPhoto} alt={post.authorName} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" />
                          <div>
                            <h4 className="font-bold text-xs text-white">{post.authorName}</h4>
                            <span className="text-[10px] text-slate-400">
                              {post.createdAt?.seconds
                                ? new Date(post.createdAt.seconds * 1000).toLocaleDateString()
                                : 'Recent'}
                            </span>
                          </div>
                        </div>

                        {post.content && (
                          <p className="text-xs text-slate-200 whitespace-pre-line">{post.content}</p>
                        )}

                        {post.mediaUrl && (
                          <div className="rounded-xl overflow-hidden max-h-72 bg-black border border-white/10">
                            <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post)}
                            className={`flex items-center space-x-1.5 font-bold ${
                              post.likes?.includes(user.uid) ? 'text-pink-500' : 'hover:text-white'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${post.likes?.includes(user.uid) ? 'fill-current' : ''}`} />
                            <span>{post.likes?.length || 0} Likes</span>
                          </button>
                          <span>{post.comments?.length || 0} Comments</span>
                        </div>

                        {/* Public Comments */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          {post.comments?.map((c) => (
                            <div key={c.id} className="bg-black/30 p-2.5 rounded-xl flex items-start space-x-2">
                              <img src={c.authorPhoto} alt={c.authorName} className="w-6 h-6 rounded-lg object-cover" />
                              <div className="text-[11px] min-w-0 flex-1">
                                <span className="font-bold text-white block">{c.authorName}</span>
                                <p className="text-slate-300">{c.text}</p>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-center space-x-2 pt-1">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentInput[post.id] || ''}
                              onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Photos */}
              {activeTab === 'photos' && (
                <div className="pt-4">
                  {mediaPosts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/5">
                      <ImageIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="font-bold text-xs text-white">No photos uploaded by this user.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {mediaPosts.map((p) => (
                        <div
                          key={p.id}
                          className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedPhoto(p.mediaUrl || null)}
                        >
                          <img src={p.mediaUrl} alt="User upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: About (Public Information Only) */}
              {activeTab === 'about' && (
                <div className="pt-4 space-y-3">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-xs text-slate-200">
                    <h3 className="font-extrabold text-sm text-white border-b border-white/10 pb-2 flex items-center space-x-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      <span>Public Overview</span>
                    </h3>

                    <div className="space-y-2.5">
                      {targetUser.workplace && (
                        <div className="flex items-center space-x-3 text-slate-300">
                          <Briefcase className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span>Works at <strong className="text-white">{targetUser.workplace}</strong></span>
                        </div>
                      )}

                      {targetUser.education && (
                        <div className="flex items-center space-x-3 text-slate-300">
                          <GraduationCap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <span>Studied at <strong className="text-white">{targetUser.education}</strong></span>
                        </div>
                      )}

                      {targetUser.currentCity && (
                        <div className="flex items-center space-x-3 text-slate-300">
                          <Home className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Lives in <strong className="text-white">{targetUser.currentCity}</strong></span>
                        </div>
                      )}

                      {targetUser.hometown && (
                        <div className="flex items-center space-x-3 text-slate-300">
                          <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span>From <strong className="text-white">{targetUser.hometown}</strong></span>
                        </div>
                      )}

                      <div className="flex items-center space-x-3 text-slate-300 pt-2 border-t border-white/5">
                        <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Connected Friends: <strong className="text-white">{targetUser.friends?.length || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Enlarge Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-rose-400 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={selectedPhoto} alt="Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
