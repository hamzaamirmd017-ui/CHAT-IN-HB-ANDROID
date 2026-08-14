import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Trash2, 
  Heart, 
  MessageSquare, 
  Share2, 
  Sparkles, 
  ExternalLink,
  Search
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { SavedPostItem, ActiveTab } from '../../types';

interface SavedPageProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const SavedPage: React.FC<SavedPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<SavedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'saved_posts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SavedPostItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as SavedPostItem);
      });
      setSavedPosts(list);
      setLoading(false);
    }, (err) => {
      console.warn('onSnapshot error in SavedPage:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const handleRemoveSaved = async (savedId: string) => {
    try {
      await deleteDoc(doc(db, 'saved_posts', savedId));
    } catch (err) {
      console.error('Error removing saved post:', err);
    }
  };

  const filteredPosts = savedPosts.filter((item) => {
    if (!searchTerm) return true;
    const text = item.post?.content || '';
    const author = item.post?.authorName || '';
    return text.toLowerCase().includes(searchTerm.toLowerCase()) || author.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-28 md:pb-8">
      
      {/* Header Banner */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide flex items-center space-x-2">
              <span>Saved Collection</span>
              <span className="px-2.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-400/30">
                {savedPosts.length} Items
              </span>
            </h2>
            <p className="text-xs text-slate-400">Bookmarked posts, media, and articles saved for later</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Saved Posts Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-36 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="frosted-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Bookmark className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="font-bold text-sm text-white">No saved posts yet</p>
            <p className="text-xs text-slate-400">Click the bookmark icon on any post in your feed to save it here!</p>
            <button
              onClick={() => onNavigateTab('home')}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs rounded-xl shadow-lg"
            >
              Explore Home Feed
            </button>
          </div>
        ) : (
          filteredPosts.map((saved) => (
            <div key={saved.id} className="frosted-card rounded-3xl p-5 space-y-3 border border-white/10 hover:border-emerald-500/40 transition-all shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={saved.post.authorPhoto} alt={saved.post.authorName} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/30" />
                  <div>
                    <h4 className="font-extrabold text-xs text-white">{saved.post.authorName}</h4>
                    <span className="text-[10px] text-slate-400">
                      Saved {saved.savedAt?.seconds ? new Date(saved.savedAt.seconds * 1000).toLocaleDateString() : 'recently'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveSaved(saved.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  title="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">{saved.post.content}</p>

              {saved.post.mediaUrl && (
                <div className="rounded-2xl overflow-hidden max-h-80 border border-white/10">
                  <img src={saved.post.mediaUrl} alt="Saved post media" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1 text-pink-400 font-semibold">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>{saved.post.likes?.length || 0} Likes</span>
                  </span>
                  <span className="flex items-center space-x-1 text-cyan-400 font-semibold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{saved.post.comments?.length || 0} Comments</span>
                  </span>
                </div>

                <button
                  onClick={() => onNavigateTab('home')}
                  className="text-xs font-bold text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <span>View in Feed</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
