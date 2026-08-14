import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Image as ImageIcon, 
  Video, 
  Sparkles, 
  UserPlus, 
  Share2, 
  MoreHorizontal,
  Bell,
  Search
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { StoriesBar } from '../Stories/StoriesBar';
import { Post, UserProfile } from '../../types';

interface NewsFeedProps {
  onNavigateTab: (tab: any) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ onNavigateTab }) => {
  const { user, userProfile } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [newContent, setNewContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [publishing, setPublishing] = useState(false);

  // Subscribe to real-time posts feed
  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const list: Post[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Post);
      });
      setPosts(list);
    }, (err) => {
      console.warn('onSnapshot error in NewsFeed:', err);
    });

    return () => unsubscribe();
  }, []);

  // Fetch suggested friends
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        if (d.id !== user.uid && !userProfile?.friends?.includes(d.id)) {
          list.push({ uid: d.id, ...d.data() } as UserProfile);
        }
      });
      setSuggestedUsers(list.slice(0, 5));
    };
    fetchUsers();
  }, [user, userProfile]);

  if (!user || !userProfile) return null;

  // Create new Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !mediaUrl.trim()) return;

    setPublishing(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        content: newContent.trim(),
        mediaUrl: mediaUrl.trim() || null,
        mediaType: mediaUrl.includes('mp4') || mediaUrl.includes('youtube') ? 'video' : 'image',
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });

      setNewContent('');
      setMediaUrl('');
      setShowMediaInput(false);
    } catch (err) {
      console.error('Failed to publish post:', err);
    } finally {
      setPublishing(false);
    }
  };

  // Like / Unlike Post
  const handleToggleLike = async (post: Post) => {
    const postRef = doc(db, 'posts', post.id);
    const hasLiked = post.likes?.includes(user.uid);

    if (hasLiked) {
      await updateDoc(postRef, {
        likes: arrayRemove(user.uid)
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(user.uid)
      });

      // Send notification to author if not self
      if (post.authorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.authorId,
          title: 'Post Liked',
          body: `${userProfile.displayName} liked your post.`,
          type: 'post_like',
          read: false,
          fromUser: {
            uid: user.uid,
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL
          },
          createdAt: serverTimestamp()
        });
      }
    }
  };

  // Comment on Post
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const postRef = doc(db, 'posts', postId);
    const newComment = {
      id: Date.now().toString(),
      authorId: user.uid,
      authorName: userProfile.displayName,
      authorPhoto: userProfile.photoURL,
      text,
      createdAt: new Date()
    };

    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  // Send Friend Request to suggested user
  const handleAddSuggestedFriend = async (targetUid: string) => {
    const myRef = doc(db, 'users', user.uid);
    const targetRef = doc(db, 'users', targetUid);

    await updateDoc(myRef, { friendRequestsSent: arrayUnion(targetUid) });
    await updateDoc(targetRef, { friendRequestsReceived: arrayUnion(user.uid) });

    setSuggestedUsers((prev) => prev.filter((u) => u.uid !== targetUid));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 md:pb-6">
      
      {/* Main Feed Column (2 cols) */}
      <div className="lg:col-span-2 space-y-6">

        {/* Stories Bar Section */}
        <div className="frosted-card rounded-3xl p-5 shadow-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-extrabold text-sm text-[var(--text-main)] tracking-wide flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Stories</span>
            </h3>
            <button
              onClick={() => onNavigateTab('stories')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All
            </button>
          </div>
          <StoriesBar />
        </div>

        {/* Create Post Input Card */}
        <div className="frosted-card rounded-3xl p-5 shadow-xl space-y-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center space-x-3">
            <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/30" />
            <input
              type="text"
              placeholder={`What's on your mind, ${userProfile.displayName}?`}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-hint)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {showMediaInput && (
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="url"
                placeholder="Paste Image or Video URL (https://...)"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className="px-3 py-1.5 bg-[var(--bg-input)] hover:opacity-80 text-[var(--text-secondary)] text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-[var(--border-color)]"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Photo / Video</span>
              </button>
            </div>

            <button
              onClick={handleCreatePost}
              disabled={publishing || (!newContent.trim() && !mediaUrl.trim())}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{publishing ? 'Posting...' : 'Post'}</span>
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="frosted-card rounded-3xl p-12 text-center text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-color)]">
              <p className="font-semibold text-sm text-[var(--text-main)]">No posts in your feed yet.</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Be the first to share an update with your friends!</p>
            </div>
          ) : (
            posts.map((post) => {
              const hasLiked = post.likes?.includes(user.uid);
              const likesCount = post.likes?.length || 0;
              const commentsCount = post.comments?.length || 0;

              return (
                <div key={post.id} className="frosted-card rounded-3xl p-5 space-y-4 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-purple-500/30 transition-all shadow-xl">
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={post.authorPhoto} alt={post.authorName} className="w-10 h-10 rounded-2xl object-cover ring-1 ring-black/10" />
                      <div>
                        <h4 className="font-bold text-xs text-[var(--text-main)]">{post.authorName}</h4>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post Text Content */}
                  {post.content && (
                    <p className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-line">{post.content}</p>
                  )}

                  {/* Post Media */}
                  {post.mediaUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-950 border border-[var(--border-color)] max-h-[380px] flex items-center justify-center">
                      {post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} controls className="w-full max-h-[380px] object-contain" />
                      ) : (
                        <img src={post.mediaUrl} alt="Post media" className="w-full max-h-[380px] object-cover" />
                      )}
                    </div>
                  )}

                  {/* Likes & Comments Counters */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleToggleLike(post)}
                        className={`flex items-center space-x-1.5 transition-colors ${
                          hasLiked ? 'text-pink-500 font-bold' : 'hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-pink-500' : ''}`} />
                        <span>{likesCount}</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <MessageCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>{commentsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comment Input */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-[var(--border-color)]">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-hint)] focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                    >
                      Comment
                    </button>
                  </div>

                  {/* Comment List */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {post.comments.slice(-3).map((c) => (
                        <div key={c.id} className="flex items-start space-x-2 bg-[var(--bg-input)] p-2 rounded-xl text-xs border border-[var(--border-color)]">
                          <img src={c.authorPhoto} alt={c.authorName} className="w-6 h-6 rounded-lg object-cover" />
                          <div className="flex-1">
                            <span className="font-bold text-purple-600 dark:text-cyan-300 text-[11px]">{c.authorName}: </span>
                            <span className="text-[var(--text-main)] text-[11px]">{c.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Sidebar Column (Suggested Friends & Search) */}
      <div className="space-y-6">

        {/* Suggested Friends */}
        <div className="frosted-card rounded-3xl p-5 shadow-xl space-y-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
          <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center justify-between">
            <span>Suggested Friends</span>
            <button
              onClick={() => onNavigateTab('friends')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              See All
            </button>
          </h3>

          {suggestedUsers.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">No suggestions at the moment.</p>
          ) : (
            <div className="space-y-3">
              {suggestedUsers.map((su) => (
                <div key={su.uid} className="flex items-center justify-between p-2.5 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)]">
                  <div className="flex items-center space-x-2.5">
                    <img src={su.photoURL} alt={su.displayName} className="w-9 h-9 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-semibold text-xs text-[var(--text-main)]">{su.displayName}</h4>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400">{su.username || '@member'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddSuggestedFriend(su.uid)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"
                    title="Add Friend"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Quick Links Card */}
        <div className="frosted-card rounded-3xl p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border-color)]">
          <h3 className="font-bold text-xs text-[var(--text-hint)] uppercase tracking-wider">Quick Actions</h3>
          <button
            onClick={() => onNavigateTab('chats')}
            className="w-full text-left p-3 bg-[var(--bg-input)] hover:opacity-80 rounded-2xl text-xs font-semibold text-[var(--text-main)] flex items-center justify-between border border-[var(--border-color)]"
          >
            <span>Open Direct Chats</span>
            <span className="text-indigo-600 dark:text-indigo-400">→</span>
          </button>
          <button
            onClick={() => onNavigateTab('friends')}
            className="w-full text-left p-3 bg-[var(--bg-input)] hover:opacity-80 rounded-2xl text-xs font-semibold text-[var(--text-main)] flex items-center justify-between border border-[var(--border-color)]"
          >
            <span>Phone Contacts & Friends</span>
            <span className="text-indigo-600 dark:text-indigo-400">→</span>
          </button>
        </div>

      </div>

    </div>
  );
};
