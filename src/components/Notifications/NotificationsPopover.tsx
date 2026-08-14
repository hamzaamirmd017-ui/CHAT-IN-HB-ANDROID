import React, { useState, useEffect } from 'react';
import { Bell, Check, X, MessageSquare, Heart, PhoneCall, UserPlus, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { AppNotification } from '../../types';

interface NotificationsPopoverProps {
  onClose?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ onClose, onNavigateTab }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(list);
    }, (err) => {
      console.warn('onSnapshot error in NotificationsPopover:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  const handleDeleteNotif = async (notifId: string) => {
    await deleteDoc(doc(db, 'notifications', notifId));
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'chat_message':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'call':
        return <PhoneCall className="w-4 h-4 text-purple-400" />;
      case 'post_like':
      case 'story_like':
        return <Heart className="w-4 h-4 text-pink-400 fill-current" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="w-80 sm:w-96 frosted-card rounded-3xl p-4 shadow-2xl border border-white/10 space-y-3 z-50">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-xs text-white">Notifications</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No new notifications right now.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-2xl flex items-start justify-between space-x-2 transition-all ${
                n.read ? 'bg-white/5 text-slate-400' : 'bg-indigo-600/10 border border-indigo-500/20 text-white'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <div className="p-2 bg-slate-900 rounded-xl border border-white/10 mt-0.5">
                  {getIconForType(n.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">{n.title}</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">{n.body}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {!n.read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1 hover:bg-white/10 text-emerald-400 rounded-lg"
                    title="Mark as Read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteNotif(n.id)}
                  className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
