import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Eye, 
  Send, 
  Share2,
  Play, 
  Pause, 
  Heart, 
  Users, 
  Sparkles,
  MoreHorizontal,
  Link,
  VolumeX,
  Volume2,
  AlertCircle,
  Bug,
  Check,
  Flag,
  Trash2,
  Music,
  Disc
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, getDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Story, StoryReaction } from '../../types';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onReply?: (authorId: string, text: string) => void;
}

const STORY_REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👏', '👍', '🎉'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  xOffset: number;
}

interface ViewerDetail {
  uid: string;
  displayName: string;
  photoURL: string;
  viewedAt?: string;
  reactionEmoji?: string;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  isOpen,
  onClose,
  onReply
}) => {
  const { user, userProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [replyText, setReplyText] = useState('');

  // Floating Reactions State
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // 3-Dots Story Options Menu (Image 1)
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Muted Story Authors State
  const [mutedAuthorIds, setMutedAuthorIds] = useState<string[]>([]);

  // Report Story Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Something isn't working (Bug Report) Modal
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // Story Viewers Modal / Drawer
  const [isViewerListOpen, setIsViewerListOpen] = useState(false);
  const [viewersList, setViewersList] = useState<ViewerDetail[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    setIsAutoPlaying(true);
    setIsMuted(false);
    setIsAutoplayBlocked(false);
    setIsViewerListOpen(false);
    setIsOptionsMenuOpen(false);
    setIsReportModalOpen(false);
    setIsBugModalOpen(false);
    setShowDeleteConfirm(false);
  }, [initialIndex, isOpen]);

  const currentStory = stories[currentIndex];

  // Story background sound track playback controller
  useEffect(() => {
    if (!isOpen || !currentStory || !currentStory.audioUrl || isPaused || isViewerListOpen || isOptionsMenuOpen || isReportModalOpen || isBugModalOpen || showDeleteConfirm) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!audioRef.current || audioRef.current.src !== currentStory.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(currentStory.audioUrl);
      audioRef.current.loop = true;
    }

    audioRef.current.muted = isMuted;

    if (!isMuted && isAutoPlaying) {
      audioRef.current.play().then(() => {
        setIsAutoplayBlocked(false);
      }).catch((err) => {
        console.warn('Story audio auto-play policy notice:', err);
        setIsAutoplayBlocked(true);
      });
    } else {
      audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, currentStory, isMuted, isPaused, isAutoPlaying, isViewerListOpen, isOptionsMenuOpen, isReportModalOpen, isBugModalOpen, showDeleteConfirm]);

  // Story video playback controller
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (!isOpen || !currentStory || currentStory.mediaType !== 'video' || isPaused || isViewerListOpen || isOptionsMenuOpen || isReportModalOpen || isBugModalOpen || showDeleteConfirm) {
      video.pause();
      return;
    }

    const shouldMuteVideo = isMuted || !!currentStory.audioUrl;
    video.muted = shouldMuteVideo;

    if (isAutoPlaying) {
      video.play().then(() => {
        setIsAutoplayBlocked(false);
      }).catch((err) => {
        console.warn('Story video auto-play notice:', err);
        video.muted = true;
        video.play().catch(() => {});
        setIsAutoplayBlocked(true);
      });
    } else {
      video.pause();
    }
  }, [isOpen, currentStory, isMuted, isPaused, isAutoPlaying, isViewerListOpen, isOptionsMenuOpen, isReportModalOpen, isBugModalOpen, showDeleteConfirm]);

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setIsAutoplayBlocked(false);

    if (audioRef.current && currentStory?.audioUrl) {
      audioRef.current.muted = nextMuted;
      if (!nextMuted && !isPaused) {
        audioRef.current.play().catch(() => setIsAutoplayBlocked(true));
      } else {
        audioRef.current.pause();
      }
    }

    if (videoRef.current) {
      const shouldMuteVideo = nextMuted || !!currentStory?.audioUrl;
      videoRef.current.muted = shouldMuteVideo;
      if (!nextMuted && !isPaused) {
        videoRef.current.play().catch(() => setIsAutoplayBlocked(true));
      }
    }
  };

  const handleCanvasClick = () => {
    if (isAutoplayBlocked || isMuted) {
      setIsAutoplayBlocked(false);
      setIsMuted(false);
      if (audioRef.current && currentStory?.audioUrl && !isPaused) {
        audioRef.current.muted = false;
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current && !isPaused) {
        videoRef.current.muted = !!currentStory?.audioUrl;
        videoRef.current.play().catch(() => {});
      }
    } else {
      setIsAutoPlaying(!isAutoPlaying);
    }
  };

  // Lock body scroll when modal is open to prevent page scrolling jump
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    return () => {
      document.body.style.overflow = '';
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen]);

  // Auto-advance progress timer
  useEffect(() => {
    if (!isOpen || !currentStory || !isAutoPlaying || isPaused || isViewerListOpen || isOptionsMenuOpen || isReportModalOpen || isBugModalOpen) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / 600); // 1 minute (60 seconds = 600 * 100ms) total duration
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, currentIndex, isAutoPlaying, isPaused, isViewerListOpen, isOptionsMenuOpen, isReportModalOpen, isBugModalOpen, stories]);

  // Mark story as viewed in Firestore with viewer details
  useEffect(() => {
    if (!currentStory || !user) return;

    const storyRef = doc(db, 'stories', currentStory.id);
    const hasViewed = currentStory.views?.includes(user.uid);

    if (!hasViewed) {
      updateDoc(storyRef, {
        views: arrayUnion(user.uid),
        [`viewersData.${user.uid}`]: {
          displayName: userProfile?.displayName || user.displayName || 'User',
          photoURL: userProfile?.photoURL || user.photoURL || '',
          viewedAt: new Date().toISOString()
        }
      }).catch((err) => {
        console.warn('Notice: Story view update skipped (document may be missing or deleted):', err?.message || err);
      });
    }
  }, [currentStory, user, userProfile]);

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Copy Link to Share Story
  const handleCopyStoryLink = () => {
    setIsOptionsMenuOpen(false);
    setIsPaused(false);
    const storyUrl = `${window.location.origin}/?story=${currentStory?.id}`;
    navigator.clipboard.writeText(storyUrl).then(() => {
      showToast('Link copied to share this story!');
    }).catch(() => {
      showToast('Copied story link!');
    });
  };

  // Direct Share Story via Web Share API or Clipboard
  const handleShareStory = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentStory) return;
    const storyUrl = `${window.location.origin}/?story=${currentStory.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentStory.userDisplayName}'s Story`,
          text: currentStory.text ? `Check out this story: "${currentStory.text}"` : `Check out ${currentStory.userDisplayName}'s story!`,
          url: storyUrl
        });
        showToast('Story shared successfully!');
        return;
      } catch {
        // User closed share dialog or failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(storyUrl);
      showToast('Story link copied to share!');
    } catch {
      showToast('Copied story link!');
    }
  };

  // Toggle Mute Author Stories
  const handleToggleMuteAuthor = () => {
    setIsOptionsMenuOpen(false);
    setIsPaused(false);
    if (!currentStory) return;
    const authorId = currentStory.userId;
    if (mutedAuthorIds.includes(authorId)) {
      setMutedAuthorIds((prev) => prev.filter((id) => id !== authorId));
      showToast(`Unmuted ${currentStory.userDisplayName}'s stories`);
    } else {
      setMutedAuthorIds((prev) => [...prev, authorId]);
      showToast(`Muted ${currentStory.userDisplayName}'s stories`);
    }
  };

  // Load viewers details when View Count button is clicked
  const handleOpenViewerList = async () => {
    if (!currentStory) return;
    setIsViewerListOpen(true);
    setIsPaused(true);
    setLoadingViewers(true);

    try {
      const viewerUids = currentStory.views || [];
      const viewersData = currentStory.viewersData || {};
      const reactions = currentStory.reactions || [];

      // Build map of reactions by user ID
      const userReactionsMap: { [uid: string]: string } = {};
      reactions.forEach((r) => {
        if (r.userId && r.emoji) {
          userReactionsMap[r.userId] = r.emoji;
        }
      });

      const details: ViewerDetail[] = [];

      for (const uid of viewerUids) {
        if (viewersData[uid]) {
          details.push({
            uid,
            displayName: viewersData[uid].displayName || 'User',
            photoURL: viewersData[uid].photoURL || '',
            viewedAt: viewersData[uid].viewedAt,
            reactionEmoji: userReactionsMap[uid]
          });
        } else {
          // Fetch from Firestore users collection if sparse
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              details.push({
                uid,
                displayName: uData.displayName || 'User',
                photoURL: uData.photoURL || '',
                reactionEmoji: userReactionsMap[uid]
              });
            } else {
              details.push({
                uid,
                displayName: 'Story Viewer',
                photoURL: '',
                reactionEmoji: userReactionsMap[uid]
              });
            }
          } catch {
            details.push({
              uid,
              displayName: 'Story Viewer',
              photoURL: '',
              reactionEmoji: userReactionsMap[uid]
            });
          }
        }
      }

      setViewersList(details);
    } catch (err) {
      console.error('Error fetching story viewers:', err);
    } finally {
      setLoadingViewers(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setSlideDirection('next');
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSlideDirection('prev');
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  // Add Reaction to Story
  const handleAddReaction = async (emoji: string) => {
    if (!user || !currentStory) return;

    // Trigger Floating Particle Animation
    const newBurst: FloatingEmoji[] = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      emoji,
      xOffset: (Math.random() - 0.5) * 140
    }));
    setFloatingEmojis((prev) => [...prev, ...newBurst]);

    // Cleanup floating particles after 1.8s
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => !newBurst.some((b) => b.id === item.id)));
    }, 1800);

    // Save reaction to Firestore
    try {
      const storyRef = doc(db, 'stories', currentStory.id);
      const newReaction: StoryReaction = {
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'User',
        userPhoto: userProfile?.photoURL || user.photoURL || '',
        emoji,
        createdAt: new Date().toISOString()
      };

      await updateDoc(storyRef, {
        reactions: arrayUnion(newReaction)
      });

      showToast(`Reacted ${emoji} to story!`);

      if (onReply && currentStory.userId !== user.uid) {
        onReply(currentStory.userId, `Reacted ${emoji} to your story`);
      }
    } catch (err) {
      console.error('Error adding story reaction:', err);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReply) return;
    onReply(currentStory.userId, `Replied to story: "${replyText.trim()}"`);
    setReplyText('');
    onClose();
  };

  const handleDeleteStory = () => {
    if (!currentStory?.id) return;
    if (user && currentStory.userId !== user.uid) {
      showToast("You can only delete your own story!");
      return;
    }
    setIsOptionsMenuOpen(false);
    setIsPaused(true);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteStory = async () => {
    if (!currentStory?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'stories', currentStory.id));
      showToast('Story deleted permanently!');
      setShowDeleteConfirm(false);
      setIsPaused(false);
      if (stories.length <= 1) {
        onClose();
      } else {
        if (currentIndex >= stories.length - 1) {
          setCurrentIndex(Math.max(0, stories.length - 2));
        }
      }
    } catch (err: any) {
      console.error('Error deleting story:', err);
      showToast('Failed to delete story: ' + (err?.message || 'Error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentStory) return null;

  const isAuthorMuted = mutedAuthorIds.includes(currentStory.userId);

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between overflow-hidden select-none animate-fadeIn p-0 sm:p-2.5 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed top-20 z-[10000] left-1/2 -translate-x-1/2 bg-slate-900 border border-indigo-500/50 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl animate-bounce flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Custom Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="bg-[#181d25] border border-slate-700/80 rounded-2xl p-5 max-w-sm w-full text-center space-y-4 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Delete Story?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Are you sure you want to delete this story? It will be permanently removed from your feed and archive.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setIsPaused(false);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStory}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="relative w-full h-full max-w-lg mx-auto bg-[#080c14] overflow-hidden flex flex-col justify-between rounded-none sm:rounded-2xl border-0 sm:border sm:border-slate-800 shadow-2xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        
        {/* Top Progress Bars */}
        <div className="absolute top-2.5 inset-x-3 z-30 flex space-x-1 px-1">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden shadow-sm">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header Bar */}
        <div className="absolute top-5 inset-x-3 z-30 flex items-center justify-between text-white drop-shadow-md px-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full ring-2 ring-indigo-500 overflow-hidden bg-slate-800 flex-shrink-0 shadow-md">
              <img src={currentStory.userPhotoURL} alt={currentStory.userDisplayName} className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-xs text-white tracking-wide uppercase">{currentStory.userDisplayName}</p>
              <span className="text-[10px] text-slate-300 font-medium">Story</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Sound Toggle Button (Green) */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-full transition-all shadow-md active:scale-95 ${
                isMuted ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-500 hover:bg-emerald-600'
              } text-white`}
              title={isMuted ? 'Unmute Story Sound' : 'Mute Story Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Pause/Play Toggle Button (Purple) */}
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95"
              title={isAutoPlaying ? 'Pause Auto-Play' : 'Start Auto-Play'}
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* View Count Pill */}
            <button
              type="button"
              onClick={handleOpenViewerList}
              className="flex items-center space-x-1 bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white transition-colors border border-white/10 shadow-sm"
              title="Viewers & Reactions"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentStory.views?.length || 0}</span>
            </button>

            {/* Direct Share Button */}
            <button
              type="button"
              onClick={handleShareStory}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-extrabold transition-all shadow-md active:scale-95 shrink-0"
              title="Share Story Link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {/* 3-Dots Menu Button */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(!isOptionsMenuOpen);
                  setIsPaused(!isOptionsMenuOpen);
                }}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors border border-white/10 shadow-sm"
                title="Story Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Dropdown Options Popup */}
              {isOptionsMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => {
                      setIsOptionsMenuOpen(false);
                      setIsPaused(false);
                    }}
                  />
                  <div 
                    className="absolute right-0 top-9 w-64 bg-[#1e232a] border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-2xl text-slate-100 text-xs space-y-1 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={handleCopyStoryLink}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start space-x-3 group"
                    >
                      <Link className="w-4 h-4 text-slate-300 group-hover:text-white mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-slate-100 group-hover:text-white">Copy link to share this story</p>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Stories are visible for 24 hours.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleMuteAuthor}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center space-x-3 group"
                    >
                      {isAuthorMuted ? (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="font-bold text-xs text-slate-100 group-hover:text-white">Unmute {currentStory.userDisplayName}</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4 text-slate-300 group-hover:text-white flex-shrink-0" />
                          <span className="font-bold text-xs text-slate-100 group-hover:text-white">Mute {currentStory.userDisplayName}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        setIsReportModalOpen(true);
                        setReportSubmitted(false);
                        setIsPaused(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center space-x-3 group"
                    >
                      <AlertCircle className="w-4 h-4 text-slate-300 group-hover:text-white flex-shrink-0" />
                      <span className="font-bold text-xs text-slate-100 group-hover:text-white">Report story</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        setIsBugModalOpen(true);
                        setBugSubmitted(false);
                        setIsPaused(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center space-x-3 group"
                    >
                      <Bug className="w-4 h-4 text-slate-300 group-hover:text-white flex-shrink-0" />
                      <span className="font-bold text-xs text-slate-100 group-hover:text-white">Something isn't working</span>
                    </button>

                    {currentStory.userId === user?.uid && (
                      <button
                        type="button"
                        onClick={handleDeleteStory}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-rose-500/20 text-rose-400 transition-colors flex items-start space-x-3 group border-t border-slate-700/60 pt-2.5"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-rose-300">Delete Story</p>
                          <p className="text-[10px] text-rose-400/80 leading-tight">Permanently remove story</p>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Close Button */}
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors border border-white/10 shadow-sm"
              title="Close Story"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden p-2 pt-16 pb-32">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStory.id}
              initial={{
                opacity: 0,
                x: slideDirection === 'next' ? 60 : -60,
                scale: 0.96
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                x: slideDirection === 'next' ? -60 : 60,
                scale: 0.96
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full h-full relative flex items-center justify-center rounded-2xl overflow-hidden bg-black/90 shadow-2xl"
            >
              {/* Background Sound Track Pill Header */}
              {(currentStory.audioTitle || currentStory.audioUrl) && (
                <div className="absolute top-4 left-4 z-30 flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/50 text-white shadow-xl animate-fadeIn">
                  <Disc className={`w-3.5 h-3.5 text-pink-400 ${!isMuted && isAutoPlaying && !isPaused ? 'animate-spin' : ''}`} />
                  <div className="text-[11px] leading-tight overflow-hidden max-w-[170px]">
                    <p className="font-extrabold text-white truncate">{currentStory.audioTitle || 'Story Sound'}</p>
                    {currentStory.audioArtist && (
                      <p className="text-[9px] text-pink-300 truncate font-semibold">{currentStory.audioArtist}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tap for Sound Floating Notice Badge */}
              {(isAutoplayBlocked || (isMuted && (currentStory.audioUrl || currentStory.mediaType === 'video'))) && (
                <button
                  type="button"
                  onClick={handleCanvasClick}
                  className="absolute top-16 right-4 z-40 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-2xl flex items-center space-x-1.5 animate-bounce border border-emerald-400/50 backdrop-blur-md"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Tap for Sound 🔊</span>
                </button>
              )}

              {currentStory.mediaType === 'video' && currentStory.mediaUrl ? (
                <div 
                  className="w-full h-full relative flex items-center justify-center bg-black cursor-pointer"
                  onClick={handleCanvasClick}
                >
                  <video
                    ref={videoRef}
                    src={currentStory.mediaUrl}
                    autoPlay
                    loop
                    muted={isMuted || !!currentStory.audioUrl}
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  {currentStory.text && (
                    <div className="absolute bottom-3 inset-x-4 p-3 bg-black/80 backdrop-blur-md rounded-2xl text-white text-xs text-center font-medium shadow-xl border border-white/10 z-20">
                      {currentStory.text}
                    </div>
                  )}
                </div>
              ) : currentStory.mediaType === 'image' && currentStory.mediaUrl ? (
                <div 
                  className="w-full h-full relative flex items-center justify-center bg-black cursor-pointer"
                  onClick={handleCanvasClick}
                >
                  <img src={currentStory.mediaUrl} alt="Story" className="w-full h-full object-contain" />
                  {currentStory.text && (
                    <div className="absolute bottom-3 inset-x-4 p-3 bg-black/80 backdrop-blur-md rounded-2xl text-white text-xs text-center font-medium shadow-xl border border-white/10 z-20">
                      {currentStory.text}
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  onClick={handleCanvasClick}
                  className={`w-full h-full bg-gradient-to-br ${currentStory.bgColor || 'from-indigo-600 via-purple-600 to-pink-500'} flex items-center justify-center p-8 text-center cursor-pointer`}
                >
                  <p className="font-extrabold text-white text-xl sm:text-2xl leading-relaxed drop-shadow-lg">
                    {currentStory.text}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Floating Emoji Particles */}
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden flex items-end justify-center pb-28">
            <AnimatePresence>
              {floatingEmojis.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 1, y: 0, scale: 0.8, x: item.xOffset }}
                  animate={{ opacity: 0, y: -260, scale: 1.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="absolute text-4xl drop-shadow-2xl select-none"
                >
                  {item.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Nav Controls */}
          <button 
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 z-20 shadow-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 z-20 shadow-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Section: Reaction Emojis & Reply Input */}
        <div className="absolute bottom-3 inset-x-3 z-30 space-y-2">
          
          {/* Reaction Emojis Bar */}
          <div className="flex items-center justify-around bg-[#0c1018]/95 backdrop-blur-xl border border-slate-800/90 rounded-full px-4 py-2 shadow-2xl">
            {STORY_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddReaction(emoji)}
                className="text-xl hover:scale-130 active:scale-90 transition-transform p-1 select-none"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply Input Form */}
          <form onSubmit={handleSendReply} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={`Reply to ${currentStory.userDisplayName.split(' ')[0]}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-[#0c1018]/95 border border-slate-800/90 backdrop-blur-xl rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xl"
            />
            <button
              type="submit"
              className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full text-white shadow-xl transition-all active:scale-95 flex-shrink-0"
              title="Send Reply"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleShareStory}
              className="p-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-full text-white shadow-xl transition-all active:scale-95 flex-shrink-0 flex items-center justify-center"
              title="Share Story"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* REPORT STORY MODAL - WITH CLICK OUTSIDE TO DISMISS */}
        {isReportModalOpen && (
          <div 
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => {
              setIsReportModalOpen(false);
              setIsPaused(false);
            }}
          >
            <div 
              className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3 text-left animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2 text-rose-400">
                  <Flag className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm text-white">Report Story</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setIsPaused(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!reportSubmitted ? (
                <>
                  <p className="text-xs text-slate-300">Why are you reporting this story?</p>

                  <div className="space-y-1.5 text-xs">
                    {['Inappropriate Content', 'Spam or Scam', 'Harassment or Bullying', 'Intellectual Property Violation', 'Other Issue'].map((reason) => (
                      <label 
                        key={reason}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition-all ${
                          reportReason === reason
                            ? 'bg-rose-500/20 border-rose-500 text-rose-200 font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="story_report"
                          value={reason}
                          checked={reportReason === reason}
                          onChange={() => setReportReason(reason)}
                          className="accent-rose-500"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsReportModalOpen(false);
                        setIsPaused(false);
                      }}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (user) {
                            await addDoc(collection(db, 'story_reports'), {
                              reporterId: user.uid,
                              storyId: currentStory.id,
                              authorId: currentStory.userId,
                              reason: reportReason,
                              timestamp: serverTimestamp()
                            });
                          }
                          setReportSubmitted(true);
                        } catch (err) {
                          console.error('Error submitting story report:', err);
                          setReportSubmitted(true);
                        }
                      }}
                      className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all"
                    >
                      Submit
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-3 py-3">
                  <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-xs">Report Submitted</h4>
                  <p className="text-[11px] text-slate-300">
                    Thank you for helping keep our community safe. We will review this story.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportModalOpen(false);
                      setIsPaused(false);
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SOMETHING ISN'T WORKING (BUG REPORT) MODAL - WITH CLICK OUTSIDE TO DISMISS */}
        {isBugModalOpen && (
          <div 
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => {
              setIsBugModalOpen(false);
              setIsPaused(false);
            }}
          >
            <div 
              className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3 text-left animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Bug className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm text-white">Something isn't working</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBugModalOpen(false);
                    setIsPaused(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!bugSubmitted ? (
                <>
                  <p className="text-xs text-slate-300">Briefly explain what went wrong with this story:</p>
                  <textarea
                    rows={3}
                    placeholder="e.g., Image didn't load, sound cut off..."
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBugModalOpen(false);
                        setIsPaused(false);
                      }}
                      className="py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (user) {
                            await addDoc(collection(db, 'story_issues'), {
                              reporterId: user.uid,
                              storyId: currentStory.id,
                              description: bugDescription || 'Unspecified issue',
                              timestamp: serverTimestamp()
                            });
                          }
                          setBugSubmitted(true);
                        } catch (err) {
                          console.error('Error submitting story issue:', err);
                          setBugSubmitted(true);
                        }
                      }}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      Send Feedback
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-3 py-3">
                  <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-xs">Feedback Sent</h4>
                  <p className="text-[11px] text-slate-300">
                    Thank you for letting us know! We'll fix it right away.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBugModalOpen(false);
                      setIsPaused(false);
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STORY VIEWERS & REACTIONS MODAL / BOTTOM SHEET - WITH CLICK OUTSIDE TO DISMISS */}
        {isViewerListOpen && (
          <div 
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fadeIn"
            onClick={() => {
              setIsViewerListOpen(false);
              setIsPaused(false);
            }}
          >
            <div 
              className="w-full max-h-[75%] bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm text-white">
                    Story Viewers ({currentStory.views?.length || 0})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewerListOpen(false);
                    setIsPaused(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewers & Reactions List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-1">
                {loadingViewers ? (
                  <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center space-x-2">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading viewers...</span>
                  </div>
                ) : viewersList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic">
                    No views yet. Share your story with friends!
                  </div>
                ) : (
                  viewersList.map((viewer) => (
                    <div 
                      key={viewer.uid}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/60 border border-slate-800/80"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden ring-1 ring-slate-600">
                          {viewer.photoURL ? (
                            <img src={viewer.photoURL} alt={viewer.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-300">
                              {viewer.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-white">{viewer.displayName}</p>
                          <span className="text-[10px] text-slate-400">Viewed story</span>
                        </div>
                      </div>

                      {/* Display Reaction Emoji if user reacted */}
                      {viewer.reactionEmoji && (
                        <div className="text-xl bg-slate-700/80 px-2 py-0.5 rounded-full shadow-sm">
                          {viewer.reactionEmoji}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsViewerListOpen(false);
                  setIsPaused(false);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Back to Story
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

