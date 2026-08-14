import React, { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Story } from '../../types';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewerModal } from './StoryViewerModal';

interface StoriesBarProps {
  onReplyToStory?: (authorId: string, text: string) => void;
  refreshKey?: number;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ onReplyToStory, refreshKey }) => {
  const { user, userProfile } = useAuth();

  const [stories, setStories] = useState<Story[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  useEffect(() => {
    // Query stories collection directly without orderBy to avoid index errors or pending serverTimestamp failures
    const unsubscribe = onSnapshot(collection(db, 'stories'), (snapshot) => {
      const now = new Date().getTime();
      const loadedStories: Story[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Calculate expiration (24h) safely across Timestamps, Date objects, or numbers
        if (data.archived === true) return;

        let expires = now + 86400000;
        if (data.expiresAt?.toDate) {
          expires = data.expiresAt.toDate().getTime();
        } else if (data.expiresAt?.seconds) {
          expires = data.expiresAt.seconds * 1000;
        } else if (data.expiresAt?.getTime) {
          expires = data.expiresAt.getTime();
        } else if (typeof data.expiresAt === 'number') {
          expires = data.expiresAt;
        }

        if (expires > now) {
          loadedStories.push({
            id: doc.id,
            ...data
          } as Story);
        }
      });

      // Sort client-side by createdAt descending
      loadedStories.sort((a, b) => {
        const timeA = a.createdAt?.toDate 
          ? a.createdAt.toDate().getTime() 
          : (a.createdAt?.getTime ? a.createdAt.getTime() : now);
        const timeB = b.createdAt?.toDate 
          ? b.createdAt.toDate().getTime() 
          : (b.createdAt?.getTime ? b.createdAt.getTime() : now);
        return timeB - timeA;
      });

      setStories(loadedStories);
    }, (err) => {
      console.warn('onSnapshot error in StoriesBar:', err);
    });

    return () => unsubscribe();
  }, [refreshKey]);

  const openViewer = (index: number) => {
    setActiveStoryIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="w-full py-2.5 px-3 border-b border-[var(--border-color)] bg-[var(--bg-card)] transition-colors">
      <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar py-1">
        
        {/* Add Story Card */}
        {userProfile && (
          <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group" onClick={() => setIsCreateOpen(true)}>
            <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-pink-500 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-0.5 flex items-center justify-center relative overflow-hidden">
                <img src={userProfile.photoURL} alt="Your profile" className="w-full h-full object-cover rounded-full opacity-80" />
                <div className="absolute inset-0 bg-indigo-900/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white bg-indigo-600 rounded-full p-1 shadow-md" />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-1.5 truncate max-w-[64px]">
              Add Story
            </span>
          </div>
        )}

        {/* Stories List */}
        {stories.map((story, idx) => {
          const isOwn = story.userId === user?.uid;
          return (
            <div
              key={story.id}
              onClick={() => openViewer(idx)}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
            >
              <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 group-hover:scale-105 transition-transform shadow-sm">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px] overflow-hidden">
                  <img
                    src={story.userPhotoURL}
                    alt={story.userDisplayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mt-1.5 truncate max-w-[68px]">
                {isOwn ? 'You' : story.userDisplayName.split(' ')[0]}
              </span>
            </div>
          );
        })}

        {stories.length === 0 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 italic pl-2 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>No active stories right now. Be the first to share one!</span>
          </div>
        )}

      </div>

      <CreateStoryModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      
      <StoryViewerModal
        stories={stories}
        initialIndex={activeStoryIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onReply={onReplyToStory}
      />
    </div>
  );
};
