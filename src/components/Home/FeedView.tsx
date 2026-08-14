import React, { useState, useEffect, useRef } from 'react';
import { 
  Video,
  Image as ImageIcon, 
  Smile, 
  Share2, 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Send, 
  MoreHorizontal, 
  Sparkles, 
  Check, 
  UserPlus, 
  Film,
  Flame,
  Laugh,
  X,
  Lock,
  Globe,
  Users,
  Trash2,
  MoreVertical,
  Pin,
  Settings,
  BellOff,
  Bell,
  Languages,
  EyeOff,
  RefreshCw,
  ArrowDown,
  Flag,
  Link
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Post, ActiveTab } from '../../types';
import { StoriesBar } from '../Stories/StoriesBar';
import { PublicUserProfileModal } from '../Profile/PublicUserProfileModal';

interface FeedViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onStartChatWithUser?: (uid: string) => void;
  homeRefreshKey?: number;
}

export const FeedView: React.FC<FeedViewProps> = ({ onNavigateTab, onStartChatWithUser, homeRefreshKey }) => {
  const { user, userProfile } = useAuth();
  const isInitialMount = useRef(true);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'media' | 'friends'>('all');

  // Create Post States
  const [postContent, setPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');
  const [selectedFeeling, setSelectedFeeling] = useState<string>('');

  // Comment States (postId -> text)
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});

  // Saved Posts (set of saved post IDs)
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);

  // Delete Post state & confirmation
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Post Sharing States
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const triggerShareToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 3200);
  };

  const handleCopyPostLink = async (postToCopy: Post) => {
    const postUrl = `${window.location.origin}?post=${postToCopy.id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = postUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      triggerShareToast('Post link copied to clipboard!');
    } catch (err) {
      triggerShareToast('Link: ' + postUrl);
    }
    setSharingPost(null);
  };

  const handleRepostToFeed = async (postToRepost: Post) => {
    if (!user || !userProfile) return;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        content: `Shared ${postToRepost.authorName}'s post:\n"${postToRepost.content || ''}"`,
        mediaUrl: postToRepost.mediaUrl || '',
        createdAt: serverTimestamp(),
        likes: [],
        comments: [],
        audience: 'public'
      });
      triggerShareToast('Post shared to your feed!');
      setSharingPost(null);
    } catch (err) {
      console.error('Repost error:', err);
      triggerShareToast('Failed to share to feed.');
    }
  };

  // Pull-To-Refresh Feed States
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(0);
  const startYRef = useRef(0);

  // Trigger Feed Refresh
  const triggerFeedRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(0);
    setIsPulling(false);
    setStoriesRefreshKey((prev) => prev + 1);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const loaded: Post[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as Post);
      });
      setPosts(loaded);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } catch (err) {
      console.error('Error refreshing feed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop <= 30) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop > 40) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;
    if (delta > 0) {
      const distance = Math.min(delta * 0.55, 80);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    if (pullDistance >= 35) {
      triggerFeedRefresh();
    } else {
      setPullDistance(0);
    }
    setIsPulling(false);
  };

  // Fetch real-time posts
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: Post[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as Post);
      });
      setPosts(loaded);
      setLoading(false);
    }, (err) => {
      console.warn('onSnapshot error in FeedView posts:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Trigger auto refresh when Home tab is clicked
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (homeRefreshKey && homeRefreshKey > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      triggerFeedRefresh();
    }
  }, [homeRefreshKey]);

  // Fetch saved posts for current user
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'saved_posts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.userId === user.uid) {
          ids.push(data.postId);
        }
      });
      setSavedPostIds(ids);
    }, (err) => {
      console.warn('onSnapshot error in FeedView saved posts:', err);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user || !userProfile) return null;

  // Handle Post Submission
  const handleCreatePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const contentToPost = selectedFeeling 
      ? `${postContent.trim()} — feeling ${selectedFeeling}`.trim()
      : postContent.trim();

    if (!contentToPost && !mediaUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        content: contentToPost,
        mediaUrl: mediaUrl.trim() || null,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });

      setPostContent('');
      setMediaUrl('');
      setShowImageInput(false);
      setSelectedFeeling('');
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePost = async () => {
    if (!deletingPostId) return;
    const postToDelete = posts.find((p) => p.id === deletingPostId);
    if (postToDelete && user && postToDelete.userId !== user.uid && postToDelete.authorId !== user.uid) {
      alert("You cannot delete another user's post.");
      setDeletingPostId(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'posts', deletingPostId));
      setPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      setDeletingPostId(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post. Please try again.');
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeletingPostId(postId);
  };

  // Toggle Like Reaction
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

        // Notify post author if not self
        if (post.authorId !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: post.authorId,
            title: 'New Like ❤️',
            body: `${userProfile.displayName} liked your post: "${post.content.slice(0, 30)}..."`,
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
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

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

      setCommentText((prev) => ({ ...prev, [postId]: '' }));

      // Notify post author
      if (post.authorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.authorId,
          title: 'New Comment 💬',
          body: `${userProfile.displayName} commented on your post: "${text.slice(0, 30)}..."`,
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
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Bookmark / Save Post
  const handleToggleSavePost = async (post: Post) => {
    const isSaved = savedPostIds.includes(post.id);

    try {
      if (isSaved) {
        // Query and remove saved record
        const snap = await getDocs(query(collection(db, 'saved_posts')));
        snap.forEach(async (d) => {
          const data = d.data();
          if (data.userId === user.uid && data.postId === post.id) {
            await deleteDoc(doc(db, 'saved_posts', d.id));
          }
        });
      } else {
        await addDoc(collection(db, 'saved_posts'), {
          userId: user.uid,
          postId: post.id,
          post,
          savedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving post:', err);
    }
  };

  // Filtered Posts
  const filteredPosts = posts.filter((p) => {
    if (filterMode === 'media') return Boolean(p.mediaUrl);
    if (filterMode === 'friends') return userProfile.friends?.includes(p.authorId) || p.authorId === user.uid;
    return true;
  });

  const firstName = userProfile.displayName ? userProfile.displayName.split(' ')[0] : 'MD';

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-2xl mx-auto space-y-0 sm:space-y-1.5 pb-28 md:pb-12 touch-pan-y"
    >
      
      {/* Pull-to-Refresh Feedback Banner (Only visible during pull gesture or refresh) */}
      {(pullDistance > 0 || isRefreshing || refreshSuccess) && (
        <div 
          style={{ height: `${isRefreshing ? 60 : Math.max(pullDistance, refreshSuccess ? 48 : 0)}px` }}
          className="w-full transition-all duration-200 overflow-hidden flex items-center justify-center pointer-events-none my-0.5"
        >
          <div className="flex items-center space-x-2.5 px-4 py-2 bg-gradient-to-r from-purple-900/90 via-fuchsia-950/90 to-indigo-950/90 border border-fuchsia-500/40 rounded-2xl shadow-2xl text-white text-xs font-extrabold animate-fadeIn backdrop-blur-md">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 text-fuchsia-400 animate-spin" />
                <span className="text-fuchsia-200">Refreshing stories and posts...</span>
              </>
            ) : refreshSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Stories & feed refreshed! ✓</span>
              </>
            ) : (
              <>
                <RefreshCw 
                  className="w-4 h-4 text-fuchsia-400 transition-transform duration-150" 
                  style={{ transform: `rotate(${pullDistance * 4}deg)` }}
                />
                <span className="text-purple-200">
                  {pullDistance >= 35 ? 'Release to refresh feed!' : 'Pull down to refresh...'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Horizontal Stories Carousel */}
      <div className="w-full overflow-hidden bg-[var(--bg-card)] border-b border-[var(--border-color)]">
        <StoriesBar onReplyToStory={() => onNavigateTab('stories')} refreshKey={storiesRefreshKey} />
      </div>

      {/* Redesigned Single Horizontal Row Create Post Bar (~60-70px height) */}
      <div className="w-full px-3.5 sm:px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-2xl flex items-center justify-between space-x-2.5 sm:space-x-3.5 min-h-[58px] transition-all hover:border-purple-500/30">
        
        {/* Left: Circular Profile Picture (48px) */}
        <button 
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="relative flex-shrink-0 group focus:outline-none"
        >
          <img
            src={userProfile.photoURL}
            alt={userProfile.displayName}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/40 group-hover:ring-purple-400 group-hover:scale-105 transition-all shadow-md"
          />
        </button>

        {/* Center: Rounded Input Trigger */}
        <div 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex-1 bg-[var(--bg-input)] hover:opacity-90 border border-[var(--border-color)] rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm text-[var(--text-main)] cursor-pointer transition-all flex items-center shadow-inner group overflow-hidden"
        >
          <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-main)] font-medium truncate">
            What's on your mind, {firstName}?
          </span>
        </div>

        {/* Right side: Three colorful action icons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* 📹 Live Video (Red) */}
          <button
            type="button"
            onClick={() => { setIsCreateModalOpen(true); setShowImageInput(true); }}
            className="p-2 sm:p-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
            title="Live Video"
          >
            <Video className="w-5 h-5 text-rose-500" />
          </button>

          {/* 🖼️ Photo (Green) */}
          <button
            type="button"
            onClick={() => { setIsCreateModalOpen(true); setShowImageInput(true); }}
            className="p-2 sm:p-2.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
            title="Photo / Video"
          >
            <ImageIcon className="w-5 h-5 text-emerald-500" />
          </button>

          {/* 😊 Feeling (Orange) */}
          <button
            type="button"
            onClick={() => { setIsCreateModalOpen(true); }}
            className="p-2 sm:p-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
            title="Feeling / Activity"
          >
            <Smile className="w-5 h-5 text-amber-500" />
          </button>
        </div>

      </div>

      {/* Full Create Post Material Design 3 Glassmorphism Modal */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-black/90 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(168,85,247,0.25)] space-y-4 relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="font-extrabold text-base text-white tracking-wide flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Create Post</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setPostContent('');
                  setMediaUrl('');
                  setShowImageInput(false);
                  setSelectedFeeling('');
                }}
                className="p-2 rounded-full text-purple-300 hover:text-white hover:bg-purple-900/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info Header with Privacy Selector */}
            <div className="flex items-center space-x-3">
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/40"
              />
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {userProfile.displayName}
                  {selectedFeeling && (
                    <span className="font-normal text-purple-300 text-xs ml-1.5">
                      is feeling <span className="font-bold text-amber-400">{selectedFeeling}</span>
                    </span>
                  )}
                </h4>
                
                {/* Privacy Pill */}
                <div className="flex items-center space-x-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setPrivacy(privacy === 'public' ? 'friends' : privacy === 'friends' ? 'only_me' : 'public')}
                    className="px-2.5 py-0.5 bg-purple-950/60 border border-purple-800/40 hover:border-purple-500/50 text-purple-300 rounded-full text-[10px] font-bold flex items-center space-x-1 transition-all"
                  >
                    {privacy === 'public' && <Globe className="w-3 h-3 text-cyan-400" />}
                    {privacy === 'friends' && <Users className="w-3 h-3 text-purple-400" />}
                    {privacy === 'only_me' && <Lock className="w-3 h-3 text-pink-400" />}
                    <span className="capitalize">{privacy.replace('_', ' ')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Textarea */}
            <textarea
              rows={4}
              autoFocus
              placeholder={`What's on your mind, ${firstName}?`}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full bg-purple-950/20 border border-purple-900/40 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none transition-all"
            />

            {/* Optional Media URL Input */}
            {showImageInput && (
              <div className="relative flex items-center">
                <input
                  type="url"
                  placeholder="Paste Photo/Video URL (https://...)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full bg-purple-950/30 border border-purple-800/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500"
                />
                {mediaUrl && (
                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="absolute right-2 p-1 text-purple-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Media Preview if attached */}
            {mediaUrl && (
              <div className="relative rounded-2xl overflow-hidden max-h-52 border border-purple-800/50">
                <img src={mediaUrl} alt="Preview attachment" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 text-white rounded-full hover:bg-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Feeling / Emoji Quick Selector */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-bold text-purple-300/70 mr-1 flex-shrink-0">Feelings:</span>
              {['😊 Happy', '🔥 Excited', '❤️ Loved', '😎 Cool', '🎉 Celebrating', '😴 Tired'].map((feeling) => (
                <button
                  key={feeling}
                  type="button"
                  onClick={() => setSelectedFeeling(selectedFeeling === feeling ? '' : feeling)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    selectedFeeling === feeling
                      ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
                      : 'bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 border border-purple-900/40'
                  }`}
                >
                  {feeling}
                </button>
              ))}
            </div>

            {/* Add to Your Post Bar inside modal */}
            <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200">Add to your post</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all"
                  title="Live Video"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  title="Photo / Video"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFeeling(selectedFeeling ? '' : '😊 Happy')}
                  className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all"
                  title="Feeling / Activity"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Publish Post Button */}
            <button
              type="button"
              onClick={(e) => handleCreatePost(e)}
              disabled={isSubmitting || (!postContent.trim() && !mediaUrl.trim())}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center space-x-2 active:scale-98"
            >
              <span>{isSubmitting ? 'Publishing...' : 'Publish Post'}</span>
              <Send className="w-4 h-4" />
            </button>

          </div>
        </div>
      )}


      {/* Posts List */}
      <div className="space-y-1.5 sm:space-y-2.5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="frosted-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <Sparkles className="w-10 h-10 text-cyan-400 mx-auto" />
            <p className="font-bold text-sm text-white">No posts to display in this feed view</p>
            <p className="text-xs text-slate-400">Share something with your friends to kick off the conversation!</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <FeedPostCardItem
              key={post.id}
              post={post}
              user={user}
              userProfile={userProfile}
              isSaved={savedPostIds.includes(post.id)}
              isCommentsExpanded={!!expandedComments[post.id]}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSavePost}
              onDeletePost={handleDeletePost}
              onToggleComments={(id) => setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }))}
              onAddComment={handleAddComment}
              commentText={commentText}
              setCommentText={setCommentText}
              onViewProfile={(authorId) => setViewingUserId(authorId)}
              onSharePost={(postToShare) => setSharingPost(postToShare)}
            />
          ))
        )}
      </div>

      {/* Public User Profile Modal */}
      {viewingUserId && (
        <PublicUserProfileModal
          targetUserId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onStartChat={(chatId) => {
            setViewingUserId(null);
            if (onStartChatWithUser) {
              onStartChatWithUser(chatId);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-white">Delete Post?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPostId(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Toast Notification */}
      {shareToast && (
        <div className="fixed top-20 z-[100000] left-1/2 -translate-x-1/2 bg-slate-900 border border-fuchsia-500/50 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl animate-bounce flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Share Post Modal */}
      {sharingPost && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setSharingPost(null)}
        >
          <div 
            className="w-full max-w-md bg-slate-950 border-t sm:border border-purple-500/40 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 text-white animate-slideUp sm:animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm text-white">Share Post</h3>
              </div>
              <button
                type="button"
                onClick={() => setSharingPost(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Post Preview Snippet */}
            <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-2xl flex items-center space-x-3">
              <img src={sharingPost.authorPhoto} alt={sharingPost.authorName} className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-500" />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-purple-200">{sharingPost.authorName}</h4>
                <p className="text-[11px] text-slate-300 truncate">{sharingPost.content || 'Shared media'}</p>
              </div>
            </div>

            {/* Share Action Choices */}
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `Post by ${sharingPost.authorName} on CHAT IN HB`,
                        text: sharingPost.content || 'Check out this post on CHAT IN HB!',
                        url: window.location.href,
                      });
                      triggerShareToast('Shared successfully!');
                      setSharingPost(null);
                    } catch (e) {
                      // user canceled
                    }
                  } else {
                    handleCopyPostLink(sharingPost);
                  }
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-purple-600/30 active:scale-98"
              >
                <div className="flex items-center space-x-3">
                  <Share2 className="w-4 h-4" />
                  <span>Share via Apps (WhatsApp, Facebook...)</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Share</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyPostLink(sharingPost)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs rounded-2xl flex items-center space-x-3 transition-colors active:scale-98"
              >
                <Link className="w-4 h-4 text-cyan-400" />
                <span>Copy Post Link to Clipboard</span>
              </button>

              <button
                type="button"
                onClick={() => handleRepostToFeed(sharingPost)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs rounded-2xl flex items-center space-x-3 transition-colors active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span>Share to My Feed (Repost)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface FeedPostCardItemProps {
  post: Post;
  user: any;
  userProfile: any;
  isSaved: boolean;
  isCommentsExpanded: boolean;
  onToggleLike: (post: Post) => void;
  onToggleSave: (post: Post) => void;
  onDeletePost: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string) => void;
  commentText: { [postId: string]: string };
  setCommentText: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  onViewProfile?: (authorId: string) => void;
  onSharePost?: (post: Post) => void;
}

const FeedPostCardItem: React.FC<FeedPostCardItemProps> = ({
  post,
  user,
  userProfile,
  isSaved,
  isCommentsExpanded,
  onToggleLike,
  onToggleSave,
  onDeletePost,
  onToggleComments,
  onAddComment,
  commentText,
  setCommentText,
  onViewProfile,
  onSharePost
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isPinned, setIsPinned] = useState(!!(post as any).isPinned);
  const [notificationsOff, setNotificationsOff] = useState(!!(post as any).notificationsOff);
  const [translationsOff, setTranslationsOff] = useState(!!(post as any).translationsOff);
  const [audience, setAudience] = useState<'public' | 'friends' | 'only_me'>((post as any).audience || 'public');
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const isLiked = post.likes?.includes(user.uid);
  const isAuthor = !!(user && (post.userId === user.uid || post.authorId === user.uid));

  const handleTogglePin = async () => {
    if (!isAuthor) return;
    const nextState = !isPinned;
    setIsPinned(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { isPinned: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetAudienceChoice = async (val: 'public' | 'friends' | 'only_me') => {
    if (!isAuthor) return;
    setAudience(val);
    setShowAudiencePicker(false);
    try {
      await updateDoc(doc(db, 'posts', post.id), { audience: val });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNotifications = async () => {
    if (!isAuthor) return;
    const nextState = !notificationsOff;
    setNotificationsOff(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { notificationsOff: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTranslations = async () => {
    if (!isAuthor) return;
    const nextState = !translationsOff;
    setTranslationsOff(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { translationsOff: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  if (isHidden) {
    return (
      <div className="frosted-card rounded-2xl p-4 border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span>Post hidden from feed view.</span>
        <button onClick={() => setIsHidden(false)} className="text-cyan-400 hover:underline font-bold">
          Undo
        </button>
      </div>
    );
  }

  return (
    <article className="w-full rounded-none sm:rounded-2xl p-3.5 sm:p-4 border-y sm:border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-purple-500/30 transition-all shadow-sm space-y-3">
      {/* Author Info */}
      <div className="flex items-center justify-between">
        <div 
          onClick={() => onViewProfile && onViewProfile(post.authorId)}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <img
            src={post.authorPhoto}
            alt={post.authorName}
            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-cyan-500/30 group-hover:scale-105 transition-transform"
          />
          <div>
            <h4 className="font-extrabold text-xs text-[var(--text-main)] group-hover:text-cyan-400 transition-colors flex items-center space-x-1.5">
              <span>{post.authorName}</span>
              {isPinned && <Pin className="w-3 h-3 text-fuchsia-400 fill-current" />}
            </h4>
            <span className="text-[10px] text-[var(--text-secondary)] flex items-center space-x-1">
              <span>
                {post.createdAt?.seconds
                  ? new Date(post.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now'}
              </span>
              <span>•</span>
              {audience === 'public' && <Globe className="w-2.5 h-2.5 text-cyan-400" />}
              {audience === 'friends' && <Users className="w-2.5 h-2.5 text-indigo-400" />}
              {audience === 'only_me' && <Lock className="w-2.5 h-2.5 text-amber-400" />}
            </span>
          </div>
        </div>

        {/* 3-Dots Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] transition-colors"
            title="Post Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/10" 
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} 
              />
              <div 
                className="absolute right-0 top-10 w-64 bg-slate-950/95 border border-purple-500/40 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-2xl space-y-1 animate-fadeIn text-left text-white"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Save post - Available to all users */}
              <button
                type="button"
                onClick={() => {
                  onToggleSave(post);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-start space-x-2.5 transition-colors"
              >
                <Bookmark className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">{isSaved ? 'Unsave post' : 'Save post'}</p>
                  <p className="text-[10px] text-slate-400">Add this to your saved items.</p>
                </div>
              </button>

              {isAuthor ? (
                <>
                  {/* Pin post */}
                  <button
                    type="button"
                    onClick={() => {
                      handleTogglePin();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    <Pin className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold">{isPinned ? 'Unpin post' : 'Pin post'}</span>
                  </button>

                  {/* Edit audience */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAudiencePicker(!showAudiencePicker)}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-bold">Edit audience</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-fuchsia-300 bg-fuchsia-900/40 px-2 py-0.5 rounded-md">{audience}</span>
                    </button>

                    {showAudiencePicker && (
                      <div className="my-1 ml-6 p-1.5 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSetAudienceChoice('public')}
                          className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg flex items-center space-x-2 ${audience === 'public' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAudienceChoice('friends')}
                          className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg flex items-center space-x-2 ${audience === 'friends' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <Users className="w-3 h-3" />
                          <span>Friends</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAudienceChoice('only_me')}
                          className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg flex items-center space-x-2 ${audience === 'only_me' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Only Me</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Turn off notifications */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotifications();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    {notificationsOff ? <Bell className="w-4 h-4 text-cyan-400" /> : <BellOff className="w-4 h-4 text-fuchsia-400" />}
                    <span className="font-bold">{notificationsOff ? 'Turn on notifications for this post' : 'Turn off notifications for this post'}</span>
                  </button>

                  {/* Turn off translations */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleTranslations();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    <Languages className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">{translationsOff ? 'Turn on translations' : 'Turn off translations'}</span>
                  </button>

                  <div className="border-t border-white/10 my-1" />

                  {/* Hide from profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHidden(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-start space-x-2.5 transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Hide from profile</p>
                      <p className="text-[10px] text-slate-400">This post may still appear in other places.</p>
                    </div>
                  </button>

                  {/* Delete post */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDeletePost(post.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 rounded-xl flex items-center space-x-2.5 transition-colors border-t border-white/5 mt-1"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Delete post</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-white/10 my-1" />
                  {/* Hide post for me */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHidden(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-start space-x-2.5 transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Hide post</p>
                      <p className="text-[10px] text-slate-400">See fewer posts like this.</p>
                    </div>
                  </button>

                  {/* Report post */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      alert('Post reported to system moderators.');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    <Flag className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-bold">Report post</span>
                  </button>
                </>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Post Body Content */}
      {post.content && (
        <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed font-normal whitespace-pre-line">
          {post.content}
        </p>
      )}

      {/* Media Attachment (Image or Video) */}
      {post.mediaUrl && (
        <div className="rounded-2xl overflow-hidden max-h-96 border border-[var(--border-color)] bg-slate-950">
          {post.mediaUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || post.mediaUrl.startsWith('data:video/') || post.mediaUrl.includes('video') ? (
            <video
              src={post.mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-96 object-contain bg-black"
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post Media"
              className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
            />
          )}
        </div>
      )}

      {/* Engagement Bar Stats */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-color)] pb-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 text-pink-500 font-bold">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{post.likes?.length || 0} Likes</span>
          </span>
          <span className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.comments?.length || 0} Comments</span>
          </span>
        </div>

        <span className="text-[10px] text-[var(--text-hint)] uppercase">{audience} Post</span>
      </div>

      {/* Action Buttons: Like, Comment, Share */}
      <div className="flex items-center justify-around py-1">
        <button
          onClick={() => onToggleLike(post)}
          className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
            isLiked
              ? 'text-pink-500 bg-pink-500/10 border border-pink-500/30 shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>{isLiked ? 'Liked' : 'Like'}</span>
        </button>

        <button
          onClick={() => onToggleComments(post.id)}
          className="flex-1 py-2 rounded-2xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] transition-all flex items-center justify-center space-x-2"
        >
          <MessageSquare className="w-4 h-4 text-cyan-500" />
          <span>Comment</span>
        </button>

        <button
          onClick={() => {
            if (onSharePost) {
              onSharePost(post);
            } else if (navigator.share) {
              navigator.share({
                title: `Post by ${post.authorName}`,
                text: post.content || 'Check out this post on CHAT IN HB',
                url: window.location.href,
              }).catch(() => {});
            } else {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href);
              }
            }
          }}
          className="flex-1 py-2 rounded-2xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] transition-all flex items-center justify-center space-x-2 active:scale-95"
        >
          <Share2 className="w-4 h-4 text-indigo-500" />
          <span>Share</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {(isCommentsExpanded || (post.comments?.length || 0) > 0) && (
        <div className="pt-3 space-y-3 border-t border-[var(--border-color)]">
          {/* Add Comment Input */}
          <div className="flex items-center space-x-2">
            <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-8 h-8 rounded-xl object-cover ring-1 ring-cyan-500/30" />
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText[post.id] || ''}
                onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddComment(post.id);
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl py-2 pl-3.5 pr-10 text-xs text-[var(--text-main)] placeholder-[var(--text-hint)] focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => onAddComment(post.id)}
                className="absolute right-2 p-1.5 text-cyan-500 hover:text-cyan-600"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pt-1">
            {post.comments?.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2.5 p-2 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                <img src={comment.authorPhoto} alt={comment.authorName} className="w-7 h-7 rounded-xl object-cover ring-1 ring-black/10 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h5 className="font-extrabold text-[11px] text-purple-600 dark:text-cyan-300">{comment.authorName}</h5>
                  <p className="text-xs text-[var(--text-main)] mt-0.5 leading-relaxed">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};
