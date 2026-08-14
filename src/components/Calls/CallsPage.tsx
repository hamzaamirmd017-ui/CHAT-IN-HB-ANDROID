import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Search, 
  Plus, 
  Users, 
  Clock, 
  Sparkles,
  Phone
} from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile, CallLog, ActiveTab } from '../../types';

interface CallsPageProps {
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const CallsPage: React.FC<CallsPageProps> = ({ onNavigateTab }) => {
  const { user, userProfile } = useAuth();
  const { startCall } = useCall();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'missed' | 'contacts'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all users for quick dial
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          if (d.id !== user.uid) {
            list.push({ uid: d.id, ...d.data() } as UserProfile);
          }
        });
        setAllUsers(list);
      } catch (err) {
        console.error('Error fetching users for calls:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  if (!user || !userProfile) return null;

  const friendsList = allUsers.filter((u) => userProfile.friends?.includes(u.uid));

  const filteredContacts = allUsers.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.phoneNumber && u.phoneNumber.includes(term))
    );
  });

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-28 md:pb-8">
      
      {/* Header Banner */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-lg">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide">Calls Workspace</h2>
            <p className="text-xs text-slate-400">Crystal-clear WebRTC voice & high-definition video calls</p>
          </div>
        </div>

        {/* SubTab Toggle Pills */}
        <div className="flex items-center space-x-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Quick Dial
          </button>
          <button
            onClick={() => setActiveSubTab('contacts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'contacts'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Contacts ({allUsers.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search contact by name, handle, or phone number (+1...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Friends Quick Call Bar */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Speed Dial Friends</span>
        </h3>

        {friendsList.length === 0 ? (
          <div className="frosted-card rounded-3xl p-8 text-center text-slate-400 space-y-2">
            <p className="font-semibold text-xs text-white">No friends added to speed dial.</p>
            <p className="text-[11px] text-slate-400">Add friends in the Friends tab to call them with a single tap!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friendsList.map((friend) => (
              <div key={friend.uid} className="frosted-card rounded-2xl p-4 flex items-center justify-between space-x-3 hover:border-purple-500/40 transition-all">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-purple-500/30 flex-shrink-0">
                    <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                    {friend.isOnline && (
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">{friend.displayName}</h4>
                    <p className="text-[10px] text-purple-400 font-medium truncate">{friend.username || '@friend'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => startCall(friend.uid, friend.displayName, friend.photoURL, 'audio')}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
                    title="Start Voice Call"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCall(friend.uid, friend.displayName, friend.photoURL, 'video')}
                    className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-95"
                    title="Start Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Contacts List */}
      <div className="space-y-4 pt-2">
        <h3 className="font-extrabold text-sm text-white tracking-wide">All Directory Contacts</h3>

        <div className="space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="frosted-card rounded-3xl p-8 text-center text-slate-400">
              No contacts found matching "{searchTerm}".
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.uid}
                className="frosted-card rounded-2xl p-3.5 flex items-center justify-between space-x-3 hover:border-white/20 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img src={contact.photoURL} alt={contact.displayName} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-white truncate">{contact.displayName}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{contact.phoneNumber || contact.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startCall(contact.uid, contact.displayName, contact.photoURL, 'audio')}
                    className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center space-x-1 shadow-md"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Audio</span>
                  </button>
                  <button
                    onClick={() => startCall(contact.uid, contact.displayName, contact.photoURL, 'video')}
                    className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl flex items-center space-x-1 shadow-md"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
