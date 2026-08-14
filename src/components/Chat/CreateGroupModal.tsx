import React, { useState, useEffect } from 'react';
import { X, Users, Check, Sparkles, Plus, Search } from 'lucide-react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (chatId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { user, userProfile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        snap.forEach((doc) => {
          if (doc.id !== user.uid) {
            list.push({ uid: doc.id, ...doc.data() } as UserProfile);
          }
        });
        setUsers(list);
      } catch (err) {
        console.error('Failed to load users for group:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const toggleUserSelection = (uid: string) => {
    if (selectedUserIds.includes(uid)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== uid));
    } else {
      setSelectedUserIds([...selectedUserIds, uid]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0 || creating) return;

    setCreating(true);
    try {
      const participants = [user.uid, ...selectedUserIds];
      const participantData: { [uid: string]: any } = {};

      if (userProfile) {
        participantData[user.uid] = {
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          email: userProfile.email
        };
      }

      users.forEach((u) => {
        if (selectedUserIds.includes(u.uid)) {
          participantData[u.uid] = {
            displayName: u.displayName,
            photoURL: u.photoURL,
            email: u.email
          };
        }
      });

      const groupPhoto = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;

      const newGroupDoc = await addDoc(collection(db, 'chats'), {
        participants,
        participantData,
        isGroup: true,
        groupName: groupName.trim(),
        groupPhoto,
        groupAdmin: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: {
          text: `Group "${groupName.trim()}" created`,
          senderId: user.uid,
          timestamp: new Date(),
          read: false
        }
      });

      onGroupCreated(newGroupDoc.id);
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create Group Chat</h3>
              <p className="text-xs text-slate-400">Add group name and participants</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col pt-4 space-y-4 overflow-hidden">
          
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Group Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design Team, Weekend Hangout"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Participant Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search users to invite..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
            />
          </div>

          {/* User List Checkboxes */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-white/5 rounded-2xl p-2 bg-white/5">
            {loading ? (
              <p className="text-center text-xs text-slate-400 py-4">Loading user directory...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">No available users found.</p>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.uid);
                return (
                  <div
                    key={u.uid}
                    onClick={() => toggleUserSelection(u.uid)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/40' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" />
                      <div>
                        <h4 className="font-semibold text-xs text-white">{u.displayName}</h4>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Selected: <strong className="text-indigo-400">{selectedUserIds.length}</strong> participants
            </span>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedUserIds.length === 0 || creating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
            >
              {creating ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
