import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Check, 
  Star, 
  Users, 
  Clock, 
  Sparkles, 
  X,
  Share2
} from 'lucide-react';
import { 
  collection, 
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
import { EventItem, ActiveTab } from '../../types';

interface EventsPageProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onNavigateTab }) => {
  const { user, userProfile } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const list: EventItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as EventItem);
      });
      setEvents(list);
      setLoading(false);
    }, (err) => {
      console.warn('onSnapshot error in EventsPage:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!user || !userProfile) return null;

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setCreating(true);
    try {
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim() || 'Join us for this community event!',
        location: location.trim() || 'Online / Virtual Workspace',
        date,
        time: time || '18:00',
        coverImage: coverImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
        organizerId: user.uid,
        organizerName: userProfile.displayName,
        going: [user.uid],
        interested: [],
        createdAt: serverTimestamp()
      });

      setTitle('');
      setDescription('');
      setLocation('');
      setDate('');
      setTime('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleGoing = async (eventItem: EventItem) => {
    const isGoing = eventItem.going?.includes(user.uid);
    const eventRef = doc(db, 'events', eventItem.id);

    try {
      if (isGoing) {
        await updateDoc(eventRef, {
          going: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(eventRef, {
          going: arrayUnion(user.uid),
          interested: arrayRemove(user.uid)
        });
      }
    } catch (err) {
      console.error('Error toggling going status:', err);
    }
  };

  const handleToggleInterested = async (eventItem: EventItem) => {
    const isInterested = eventItem.interested?.includes(user.uid);
    const eventRef = doc(db, 'events', eventItem.id);

    try {
      if (isInterested) {
        await updateDoc(eventRef, {
          interested: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(eventRef, {
          interested: arrayUnion(user.uid),
          going: arrayRemove(user.uid)
        });
      }
    } catch (err) {
      console.error('Error toggling interested status:', err);
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 space-y-5 pb-28 md:pb-8">
      
      {/* Header Banner */}
      <div className="frosted-card rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-white tracking-wide">Community Events & Meetups</h2>
            <p className="text-xs text-slate-400">Host or attend virtual hangouts, tech talks, and local gatherings</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-rose-600 via-indigo-600 to-purple-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/30 flex items-center space-x-2 self-start md:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Host New Event</span>
        </button>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1, 2].map((n) => (
            <div key={n} className="h-72 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
          ))
        ) : events.length === 0 ? (
          <div className="col-span-full frosted-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <Calendar className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="font-bold text-sm text-white">No upcoming events scheduled</p>
            <p className="text-xs text-slate-400">Be the first to host an event for your community!</p>
          </div>
        ) : (
          events.map((evt) => {
            const isGoing = evt.going?.includes(user.uid);
            const isInterested = evt.interested?.includes(user.uid);

            return (
              <div
                key={evt.id}
                className="frosted-card rounded-3xl overflow-hidden border border-slate-800 hover:border-rose-500/40 transition-all shadow-2xl flex flex-col group"
              >
                {/* Event Image & Date Badge */}
                <div className="h-44 relative bg-slate-900 overflow-hidden">
                  <img src={evt.coverImage} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Date Badge */}
                  <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-rose-500/40 text-center shadow-lg">
                    <span className="block text-[10px] font-black text-rose-400 uppercase tracking-wider">
                      {evt.date ? new Date(evt.date).toLocaleString('default', { month: 'short' }) : 'EVENT'}
                    </span>
                    <span className="block text-sm font-black text-white -mt-0.5">
                      {evt.date ? new Date(evt.date).getDate() : '15'}
                    </span>
                  </div>
                </div>

                {/* Event Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-base text-white group-hover:text-rose-300 transition-colors">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="pt-2 space-y-1 text-xs text-slate-400 font-medium">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{evt.time} • Organized by {evt.organizerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* RSVP Action Controls */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      {evt.going?.length || 0} Going • {evt.interested?.length || 0} Interested
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleInterested(evt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isInterested
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 inline mr-1" />
                        <span>Interested</span>
                      </button>

                      <button
                        onClick={() => handleToggleGoing(evt)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                          isGoing
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white hover:from-rose-500 hover:to-indigo-500'
                        }`}
                      >
                        {isGoing ? <Check className="w-3.5 h-3.5 inline mr-1" /> : <Calendar className="w-3.5 h-3.5 inline mr-1" />}
                        <span>{isGoing ? 'Attending' : 'Attend'}</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="frosted-card rounded-3xl p-6 max-w-lg w-full space-y-4 border border-rose-500/30 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-rose-400" />
                <span>Host Community Event</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Tech Hackathon & Lounge"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Location or Meeting Link</label>
                <input
                  type="text"
                  placeholder="e.g. Aether Live Lounge or NYC Tech Space"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Tell attendees what to expect..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg mt-2"
              >
                {creating ? 'Creating Event...' : 'Publish Event'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
