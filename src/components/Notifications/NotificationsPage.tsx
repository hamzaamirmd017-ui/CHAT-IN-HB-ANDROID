import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  UserPlus, 
  MessageSquare, 
  PhoneCall, 
  Heart, 
  Sparkles, 
  Filter, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { AppNotification, ActiveTab } from '../../types';

interface NotificationsPageProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'requests' | 'social'>('all');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AppNotification);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.warn('onSnapshot error in NotificationsPage:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const handleMarkAsRead = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const handleDeleteNotif = async (notifId: string) => {
    await deleteDoc(doc(db, 'notifications', notifId));
  };

  const handleClearAll = async () => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'requests') return n.type === 'friend_request';
    if (filter === 'social') return n.type === 'post_like' || n.type === 'story_like' || n.type === 'chat_message';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-emerald-400" />;
      case 'chat_message':
        return <MessageSquare className="w-5 h-5 text-cyan-400" />;
      case 'call':
        return <PhoneCall className="w-5 h-5 text-purple-400" />;
      case 'post_like':
      case 'story_like':
        return <Heart className="w-5 h-5 text-pink-400 fill-current" />;
      default:
        return <Bell className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-28 md:pb-8">
      
      {/* Header Banner */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide flex items-center space-x-2">
              <span>Notifications Hub</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs bg-pink-500 text-white font-black rounded-full animate-pulse shadow-[0_0_10px_#ec4899]">
                  {unreadCount} New
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Stay updated on friend requests, messages, likes, and calls</p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl border border-indigo-400/30 flex items-center space-x-1.5 shadow-md"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-semibold rounded-xl border border-white/10 flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 bg-white/5 p-1.5 rounded-2xl border border-white/10">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'requests'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Friend Requests
        </button>
        <button
          onClick={() => setFilter('social')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'social'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Social Activity
        </button>
      </div>

      {/* Notifications Cards Container */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="frosted-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm text-white">No notifications match this view</p>
            <p className="text-xs text-slate-400">You're all caught up! New friend requests, messages, and calls will appear here.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`frosted-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 border ${
                notif.read
                  ? 'bg-white/5 border-white/5 opacity-80'
                  : 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                {/* Icon or Avatar */}
                <div className="relative flex-shrink-0">
                  {notif.fromUser?.photoURL ? (
                    <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white/10">
                      <img src={notif.fromUser.photoURL} alt={notif.fromUser.displayName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
                      {getIconForType(notif.type)}
                    </div>
                  )}

                  <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-lg ring-1 ring-white/20">
                    {getIconForType(notif.type)}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{notif.body}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {notif.createdAt?.seconds
                      ? new Date(notif.createdAt.seconds * 1000).toLocaleString()
                      : 'Just now'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-center">
                {notif.type === 'friend_request' && (
                  <button
                    onClick={() => onNavigateTab('friends')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1 shadow-md"
                  >
                    <span>View Request</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {notif.type === 'chat_message' && (
                  <button
                    onClick={() => onNavigateTab('chats')}
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1 shadow-md"
                  >
                    <span>Open Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {!notif.read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-emerald-400 rounded-xl"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleDeleteNotif(notif.id)}
                  className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                  title="Delete Notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
