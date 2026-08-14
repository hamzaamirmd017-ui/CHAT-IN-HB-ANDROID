import React, { useState, useEffect } from 'react';
import { 
  UsersRound, 
  Plus, 
  Search, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare, 
  X,
  Lock,
  Globe
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { GroupItem, ActiveTab } from '../../types';

interface GroupsPageProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

const CATEGORIES = ['All', 'Technology', 'Design & Art', 'Fitness & Health', 'Gaming', 'Music & Movies', 'General'];

export const GroupsPage: React.FC<GroupsPageProps> = ({ onNavigateTab }) => {
  const { user, userProfile } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const list: GroupItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GroupItem);
      });
      setGroups(list);
      setLoading(false);
    }, (err) => {
      console.warn('onSnapshot error in GroupsPage:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!user || !userProfile) return null;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description: description.trim() || 'A community space for members.',
        category,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
        members: [user.uid],
        adminId: user.uid,
        isPrivate,
        createdAt: serverTimestamp()
      });

      setName('');
      setDescription('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleJoin = async (group: GroupItem) => {
    const isMember = group.members?.includes(user.uid);
    const groupRef = doc(db, 'groups', group.id);

    try {
      if (isMember) {
        await updateDoc(groupRef, {
          members: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid)
        });
      }
    } catch (err) {
      console.error('Error joining group:', err);
    }
  };

  const filteredGroups = groups.filter((g) => {
    const matchesCat = selectedCategory === 'All' || g.category === selectedCategory;
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-28 md:pb-8">
      
      {/* Header Banner */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-400/30 flex items-center justify-center text-pink-400 shadow-lg">
            <UsersRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide">Community Hubs & Groups</h2>
            <p className="text-xs text-slate-400">Discover or create communities centered around shared passions</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-pink-600/30 flex items-center space-x-2 self-start md:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Filter Categories Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar bg-slate-900/40 p-2 rounded-2xl border border-slate-800">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search groups by topic or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
        />
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="h-64 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
          ))
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full frosted-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <p className="font-bold text-sm text-white">No groups found in this category</p>
            <p className="text-xs">Be the first to create a community for "{selectedCategory}"!</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isMember = group.members?.includes(user.uid);
            return (
              <div
                key={group.id}
                className="frosted-card rounded-3xl overflow-hidden border border-slate-800 hover:border-pink-500/40 transition-all shadow-xl flex flex-col group"
              >
                {/* Cover Image Banner */}
                <div className="h-32 relative overflow-hidden bg-slate-800">
                  <img
                    src={group.coverImage}
                    alt={group.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-xl text-[10px] font-bold text-pink-300 border border-pink-500/30 flex items-center space-x-1">
                    {group.isPrivate ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-emerald-400" />}
                    <span>{group.category}</span>
                  </div>
                </div>

                {/* Group Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-pink-300 transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      {group.members?.length || 0} Members
                    </span>

                    <button
                      onClick={() => handleToggleJoin(group)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 ${
                        isMember
                          ? 'bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-400 border border-slate-700'
                          : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white'
                      }`}
                    >
                      {isMember ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Joined</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Join Hub</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="frosted-card rounded-3xl p-6 max-w-lg w-full space-y-4 border border-pink-500/30 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <UsersRound className="w-5 h-5 text-pink-400" />
                <span>Create New Community</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Tech Enthusiasts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What is this community about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="priv"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="priv" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Private Group (Invite & Approval only)
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-lg mt-2"
              >
                {creating ? 'Creating Group...' : 'Launch Community Hub'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
