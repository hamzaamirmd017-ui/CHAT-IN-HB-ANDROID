import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Image as ImageIcon, 
  Type, 
  Video, 
  Sparkles, 
  Upload, 
  Send, 
  Smile, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  RefreshCw,
  ArrowLeft,
  Palette,
  Music,
  Disc,
  Search,
  Trash2
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { compressImageFile } from '../../lib/imageCompression';
import { compressVideoFile } from '../../lib/videoCompression';
import { PRESET_STORY_TRACKS, StoryAudioTrack } from '../../lib/storyAudio';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BG_GRADIENTS = [
  'from-purple-600 via-indigo-600 to-pink-500',
  'from-blue-600 via-teal-500 to-emerald-500',
  'from-amber-500 via-orange-600 to-red-600',
  'from-fuchsia-600 via-purple-700 to-indigo-800',
  'from-rose-500 via-pink-600 to-purple-600',
  'from-cyan-600 via-blue-700 to-indigo-900',
  'from-gray-900 via-indigo-950 to-black'
];

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80'
];

const SAMPLE_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1187-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4'
];

const STICKERS = ['🔥', '❤️', '✨', '🎉', '🎧', '🌟', '😍', '🚀', '💯', '🌸', '💬', '☕'];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();
  
  const [step, setStep] = useState<'select' | 'edit'>('select');
  const [type, setType] = useState<'text' | 'image' | 'video'>('text');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [fileAccept, setFileAccept] = useState('image/*,video/*');

  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Sound Track State
  const [selectedAudio, setSelectedAudio] = useState<StoryAudioTrack | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [customAudioTitle, setCustomAudioTitle] = useState('');
  const [customAudioArtist, setCustomAudioArtist] = useState('');
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const editAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Sync video element muted property when isMuted changes
  useEffect(() => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.muted = isMuted;
    }
  }, [isMuted, mediaUrl]);

  // Lock body scroll when modal is open to prevent page scrolling jump
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      if (editAudioRef.current) {
        editAudioRef.current.pause();
      }
    };
  }, [isOpen]);

  // Handle preview background sound track in edit mode
  useEffect(() => {
    const currentAudioUrl = selectedAudio ? selectedAudio.url : (customAudioUrl || null);

    if (!isOpen || !currentAudioUrl || isMuted || step !== 'edit') {
      if (editAudioRef.current) {
        editAudioRef.current.pause();
      }
      return;
    }

    if (!editAudioRef.current || editAudioRef.current.src !== currentAudioUrl) {
      if (editAudioRef.current) editAudioRef.current.pause();
      editAudioRef.current = new Audio(currentAudioUrl);
      editAudioRef.current.loop = true;
    }

    editAudioRef.current.muted = isMuted;
    editAudioRef.current.play().catch((err) => console.warn('Edit story audio autoplay notice:', err));

    return () => {
      if (editAudioRef.current) {
        editAudioRef.current.pause();
      }
    };
  }, [isOpen, selectedAudio, customAudioUrl, isMuted, step]);

  if (!isOpen || !user || !userProfile) return null;

  const resetAndClose = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    if (editAudioRef.current) {
      editAudioRef.current.pause();
    }
    setStep('select');
    setText('');
    setMediaUrl('');
    setVideoUrlInput('');
    setSelectedSticker(null);
    setShowStickers(false);
    setIsProcessingFile(false);
    setSelectedAudio(null);
    setCustomAudioUrl('');
    setCustomAudioTitle('');
    setCustomAudioArtist('');
    setIsSoundModalOpen(false);
    setPreviewTrackId(null);
    onClose();
  };

  const handleSelectOption = (selectedType: 'video' | 'image' | 'text') => {
    setType(selectedType);
    if (selectedType === 'video') {
      setFileAccept('video/*');
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 50);
      setStep('edit');
    } else if (selectedType === 'image') {
      setFileAccept('image/*');
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 50);
      setStep('edit');
    } else {
      setStep('edit');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'text' && !text.trim() && !selectedSticker) {
      alert('Please enter some text or select a sticker for your story.');
      return;
    }
    if ((type === 'image' || type === 'video') && !mediaUrl.trim() && !text.trim()) {
      alert(`Please upload or select a ${type} for your story.`);
      return;
    }

    // Strict safety check for document size (Firestore limit is 1MB / ~1,048,576 bytes)
    if (mediaUrl && mediaUrl.length > 980000) {
      alert('স্টোরি ফাইলটির সাইজ ১ মেগাবাইটের বেশি। অনুগ্রহ করে ১৫ সেকেন্ডের ছোট একটি ভিডিও সিলেক্ট করুন।');
      return;
    }

    setSubmitting(true);
    try {
      const storiesRef = collection(db, 'stories');

      // Check 2,000 story limit for user
      const userStoriesSnap = await getDocs(query(storiesRef, where('userId', '==', user.uid)));
      if (userStoriesSnap.size >= 2000) {
        alert('Story creation limit reached! You cannot post more than 2,000 stories.');
        setSubmitting(false);
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const combinedText = selectedSticker ? `${selectedSticker} ${text.trim()}` : text.trim();

      const audioUrlToSave = selectedAudio ? selectedAudio.url : (customAudioUrl.trim() || null);
      const audioTitleToSave = selectedAudio ? selectedAudio.title : (customAudioTitle.trim() || (customAudioUrl ? 'Custom Sound Track' : null));
      const audioArtistToSave = selectedAudio ? selectedAudio.artist : (customAudioArtist.trim() || (customAudioUrl ? 'Audio Track' : null));

      await addDoc(storiesRef, {
        userId: user.uid,
        userDisplayName: userProfile.displayName || user.displayName || 'User',
        userPhotoURL: userProfile.photoURL || user.photoURL || '',
        mediaType: type,
        text: combinedText,
        mediaUrl: (type === 'image' || type === 'video') ? mediaUrl.trim() : null,
        bgColor: selectedBg,
        audioUrl: audioUrlToSave,
        audioTitle: audioTitleToSave,
        audioArtist: audioArtistToSave,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        archived: false,
        views: []
      });

      // Send real-time notification to all connected friends
      if (userProfile.friends && userProfile.friends.length > 0) {
        const friendNotifs = userProfile.friends.map((friendUid) =>
          addDoc(collection(db, 'notifications'), {
            userId: friendUid,
            title: `${userProfile.displayName || 'Friend'} posted a new story`,
            body: combinedText ? `Story: "${combinedText.slice(0, 40)}"` : 'Tap to view story',
            type: 'story_like',
            read: false,
            fromUser: {
              uid: user.uid,
              displayName: userProfile.displayName || user.displayName || 'User',
              photoURL: userProfile.photoURL || user.photoURL || ''
            },
            createdAt: serverTimestamp()
          })
        );
        await Promise.allSettled(friendNotifs);
      }

      resetAndClose();
    } catch (err: any) {
      console.error('Error publishing story:', err);
      alert('Failed to publish story: ' + (err?.message || 'Please check your connection or file size.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);

    try {
      if (file.type.startsWith('video/')) {
        setType('video');
        setIsMuted(false);
        const compressedDataUrl = await compressVideoFile(file);
        if (compressedDataUrl && compressedDataUrl.length <= 950000) {
          setMediaUrl(compressedDataUrl);
          setStep('edit');
        } else {
          // Fallback if dataUrl exceeds 950,000 chars (~920KB)
          alert('ভিডিওটি সাইজে বড় অথবা দীর্ঘ। স্টোরির জন্য ১৫ সেকেন্ডের কম দৈর্ঘ্যের ছোট ভিডিও ক্লিপ সিলেক্ট করুন।');
        }
        setIsProcessingFile(false);
      } else {
        setType('image');
        // Compress photo to max 900px & 0.70 quality
        const compressedDataUrl = await compressImageFile(file, 900, 900, 0.70);
        if (compressedDataUrl && compressedDataUrl.length <= 950000) {
          setMediaUrl(compressedDataUrl);
          setStep('edit');
        } else {
          alert('Photo is too large. Please choose a smaller image file.');
        }
        setIsProcessingFile(false);
      }
    } catch (err) {
      console.error('Error processing media file:', err);
      alert('Error processing file. Please choose another file.');
      setIsProcessingFile(false);
    }
  };

  const toggleTrackPreview = (track: StoryAudioTrack) => {
    if (previewTrackId === track.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPreviewTrackId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(track.url);
      audioPreviewRef.current = audio;
      audio.play().catch((err) => console.warn('Audio preview play notice:', err));
      setPreviewTrackId(track.id);
      audio.onended = () => setPreviewTrackId(null);
    }
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) {
      alert('Custom audio file size is too large (max 700KB for story storage). Please select a shorter audio clip or choose a preset music track.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAudioUrl(reader.result);
        setCustomAudioTitle(file.name.replace(/\.[^/.]+$/, ''));
        setCustomAudioArtist('Custom Audio Track');
        setSelectedAudio(null);
        if (audioPreviewRef.current) audioPreviewRef.current.pause();
        setPreviewTrackId(null);
        setIsSoundModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredTracks = PRESET_STORY_TRACKS.filter((track) => {
    const matchesCategory = activeCategory === 'All' || track.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none animate-fadeIn">
      
      {/* Hidden file input for native file browsing */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* CANVAS CONTAINER (FITS BETWEEN TOP APPBAR & BOTTOM NAV) */}
      <div className="relative w-full h-full bg-slate-950/80 overflow-hidden flex flex-col justify-between">
        
        {/* Processing overlay */}
        {isProcessingFile && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-3 animate-fadeIn">
            <RefreshCw className="w-10 h-10 text-pink-400 animate-spin" />
            <p className="text-sm font-bold text-white">Compressing media for story...</p>
            <p className="text-xs text-slate-400">Please wait a moment while your video/photo is prepared.</p>
          </div>
        )}
        
        {/* TOP OVERLAY HEADER */}
        <div className="sticky top-0 inset-x-0 z-30 p-3 sm:p-4 bg-slate-950/95 border-b border-purple-900/40 flex items-center justify-between backdrop-blur-md shadow-md">
          <div className="flex items-center space-x-2.5">
            {step === 'edit' && (
              <button
                type="button"
                onClick={() => setStep('select')}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white mr-1 transition-all"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <img 
              src={userProfile.photoURL || 'https://via.placeholder.com/150'} 
              alt={userProfile.displayName} 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/80 shadow-md"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-extrabold text-xs sm:text-sm text-white drop-shadow">
                  {userProfile.displayName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[8px] font-black uppercase tracking-wider text-white shadow-sm">
                  CREATE STORY
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Visible 24 hours to friends</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {step === 'edit' && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting}
                className="py-1.5 px-3.5 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:opacity-90 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-pink-600/30 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{submitting ? 'Sharing...' : 'Share Story'}</span>
              </button>
            )}

            <button 
              type="button"
              onClick={resetAndClose}
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-95 border border-purple-800/40 shadow-lg"
              title="Close Story Creator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP 1: INITIAL 3-OPTION CHOOSER */}
        {step === 'select' ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-md w-full space-y-4 text-center my-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center space-x-2">
                  <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
                  <span>Create Story</span>
                </h2>
                <p className="text-xs text-gray-300 mt-1 font-medium">
                  Select a format to share with your friends
                </p>
              </div>

              {/* THREE LARGE ACTION BUTTONS: Video Uploads, Image Uploads, Text */}
              <div className="grid grid-cols-1 gap-4 w-full pt-2">
                
                {/* 1. Video Uploads */}
                <button
                  type="button"
                  onClick={() => handleSelectOption('video')}
                  className="group relative w-full p-5 rounded-3xl bg-gradient-to-r from-pink-950/60 via-purple-950/60 to-slate-900/90 border border-pink-500/40 hover:border-pink-400 text-left transition-all hover:scale-[1.02] active:scale-98 shadow-2xl flex items-center space-x-4 backdrop-blur-md"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-pink-300 transition-colors flex items-center justify-between">
                      <span>Video Uploads</span>
                      <span className="text-xs font-bold text-pink-300 bg-pink-500/30 px-2.5 py-1 rounded-full border border-pink-500/40">Video</span>
                    </h3>
                    <p className="text-xs text-gray-300 mt-1">
                      Upload MP4 video clips from your device
                    </p>
                  </div>
                </button>

                {/* 2. Image Uploads */}
                <button
                  type="button"
                  onClick={() => handleSelectOption('image')}
                  className="group relative w-full p-5 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-slate-900/90 border border-indigo-500/40 hover:border-indigo-400 text-left transition-all hover:scale-[1.02] active:scale-98 shadow-2xl flex items-center space-x-4 backdrop-blur-md"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      <span>Image Uploads</span>
                      <span className="text-xs font-bold text-indigo-300 bg-indigo-500/30 px-2.5 py-1 rounded-full border border-indigo-500/40">Photo</span>
                    </h3>
                    <p className="text-xs text-gray-300 mt-1">
                      Upload photos from your gallery
                    </p>
                  </div>
                </button>

                {/* 3. Text Post */}
                <button
                  type="button"
                  onClick={() => handleSelectOption('text')}
                  className="group relative w-full p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-slate-900/90 border border-amber-500/40 hover:border-amber-400 text-left transition-all hover:scale-[1.02] active:scale-98 shadow-2xl flex items-center space-x-4 backdrop-blur-md"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-fuchsia-600 flex items-center justify-center text-white shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                    <Type className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                      <span>Text Post</span>
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/30 px-2.5 py-1 rounded-full border border-amber-500/40">Text Story</span>
                    </h3>
                    <p className="text-xs text-gray-300 mt-1">
                      Write formatted text with colorful gradients
                    </p>
                  </div>
                </button>

              </div>
            </div>
          </div>
        ) : (
          <>
            {/* MAIN CANVAS BODY AREA (EDIT STEP) */}
        <div className="relative w-full flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-0">
          
          {/* 1. TEXT STORY CANVAS */}
          {type === 'text' && (
            <div className={`w-full h-full min-h-[300px] bg-gradient-to-br ${selectedBg} flex flex-col items-center justify-center p-6 text-center transition-all duration-300 relative`}>
              {selectedSticker && (
                <div className="text-4xl mb-3 animate-bounce drop-shadow-lg">
                  {selectedSticker}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tap to type your story..."
                maxLength={280}
                className="w-full bg-transparent text-white placeholder-white/70 font-black text-2xl sm:text-3xl text-center resize-none border-none focus:outline-none drop-shadow-lg leading-relaxed pt-4"
                rows={4}
              />

              {/* Character Counter */}
              <div className="text-xs text-white/70 font-semibold mt-2 drop-shadow">
                {text.length}/280 characters
              </div>
            </div>
          )}

          {/* 2. PHOTO STORY CANVAS */}
          {type === 'image' && (
            <div className="w-full h-full relative flex items-center justify-center bg-gray-950 overflow-y-auto min-h-0">
              {mediaUrl ? (
                <>
                  <img src={mediaUrl} alt="Story Preview" className="w-full h-full object-contain" />
                  
                  {(text || selectedSticker) && (
                    <div className="absolute bottom-16 inset-x-4 p-3 bg-black/75 backdrop-blur-md rounded-2xl text-white text-xs font-semibold text-center border border-white/10 shadow-xl z-20">
                      {selectedSticker && <span className="text-lg mr-1.5">{selectedSticker}</span>}
                      {text}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors z-20"
                    title="Change Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="p-4 sm:p-6 text-center flex flex-col items-center justify-center space-y-4 w-full max-w-sm my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base">Add Photo Story</h4>
                    <p className="text-xs text-gray-400 mt-1">Upload image from device gallery</p>
                  </div>

                  <div className="w-full space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 active:scale-95 text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-xl transition-all"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Choose Photo from Gallery</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. VIDEO STORY CANVAS */}
          {type === 'video' && (
            <div className="w-full h-full relative flex items-center justify-center bg-gray-950 overflow-y-auto min-h-0">
              {mediaUrl ? (
                <>
                  <div 
                    className="w-full h-full relative flex items-center justify-center cursor-pointer"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    <video
                      ref={videoPreviewRef}
                      src={mediaUrl}
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/80 text-white hover:bg-black transition-all z-20 flex items-center space-x-1.5 shadow-lg border border-white/20 active:scale-95"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 text-rose-400" />
                        <span className="text-[11px] font-bold text-rose-300">Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-300">Sound On</span>
                      </>
                    )}
                  </button>

                  {(text || selectedSticker) && (
                    <div className="absolute bottom-16 inset-x-4 p-3 bg-black/80 backdrop-blur-md rounded-2xl text-white text-xs font-semibold text-center border border-white/10 shadow-xl z-20">
                      {selectedSticker && <span className="text-lg mr-1.5">{selectedSticker}</span>}
                      {text}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors z-20"
                    title="Change Video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="p-4 sm:p-6 text-center flex flex-col items-center justify-center space-y-4 w-full max-w-sm my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-xl">
                    <Video className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-lg">Add Video Story</h4>
                    <p className="text-xs text-gray-400 mt-1">Select video clip directly from your device</p>
                  </div>

                  <div className="w-full space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 px-5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 active:scale-95 text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-xl transition-all"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Choose Video from Gallery</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM CONTROLS OVERLAY (Matching Screenshot Palette & Toolbar) */}
        <div className="p-3 bg-black/90 backdrop-blur-2xl border-t border-white/10 z-30 space-y-2.5">
          
          {/* Color Palette Selector (Text Mode) */}
          {type === 'text' && (
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 px-1">
              <Palette className="w-4 h-4 text-white/60 shrink-0" />
              {BG_GRADIENTS.map((grad, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedBg(grad)}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} ring-2 transition-transform shrink-0 ${
                    selectedBg === grad ? 'ring-white scale-110 shadow-lg' : 'ring-transparent opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Floating Sound Badge on Canvas */}
          {(selectedAudio || customAudioUrl) && (
            <div className="absolute top-16 left-4 z-30 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/50 text-white text-xs shadow-xl animate-fadeIn">
              <Disc className="w-3.5 h-3.5 text-pink-400 animate-spin" />
              <span className="font-bold truncate max-w-[150px]">
                {selectedAudio ? selectedAudio.title : (customAudioTitle || 'Custom Sound')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedAudio(null);
                  setCustomAudioUrl('');
                  setCustomAudioTitle('');
                  setCustomAudioArtist('');
                }}
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors ml-1 text-slate-300 hover:text-white"
                title="Remove Sound"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Caption / Sound / Sticker toolbar for photo, video, or text */}
          <div className="flex items-center space-x-2">
            {(type === 'image' || type === 'video') && (
              <>
                <button
                  type="button"
                  onClick={() => setShowStickers(!showStickers)}
                  className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-pink-400 hover:bg-gray-800 transition-colors shrink-0"
                  title="Add Emoji Sticker"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder="Add text caption..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </>
            )}

            {/* Sound Button */}
            <button
              type="button"
              onClick={() => setIsSoundModalOpen(true)}
              className={`p-2 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all shrink-0 ${
                (selectedAudio || customAudioUrl)
                  ? 'bg-pink-600/30 border-pink-500 text-pink-300 shadow-md ring-1 ring-pink-500'
                  : 'bg-gray-900 border-gray-800 text-pink-400 hover:bg-gray-800'
              }`}
              title="Add Sound / Music Track"
            >
              <Music className="w-4 h-4" />
              <span>{(selectedAudio || customAudioUrl) ? 'Music Added' : 'Add Sound'}</span>
            </button>
          </div>

          {showStickers && (
            <div className="p-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-around overflow-x-auto">
              {STICKERS.map((stk) => (
                <button
                  key={stk}
                  type="button"
                  onClick={() => {
                    setSelectedSticker(selectedSticker === stk ? null : stk);
                    setShowStickers(false);
                  }}
                  className={`text-xl p-1 rounded-lg hover:bg-gray-800 transition-transform ${
                    selectedSticker === stk ? 'bg-purple-600/30 ring-2 ring-purple-500 scale-110' : ''
                  }`}
                >
                  {stk}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Toolbar: Video | Image | Text Pills + Share Story Button */}
          <div className="flex items-center justify-between gap-2 pt-1">
            
            {/* Mode Pills Switcher (Video, Image, Text) */}
            <div className="flex items-center bg-gray-900/90 p-1 rounded-2xl border border-gray-800 flex-1">
              <button
                type="button"
                onClick={() => {
                  setType('video');
                  if (!mediaUrl) fileInputRef.current?.click();
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                  type === 'video'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('image');
                  if (!mediaUrl) fileInputRef.current?.click();
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                  type === 'image'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image</span>
              </button>

              <button
                type="button"
                onClick={() => setType('text')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                  type === 'text'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
            </div>

            {/* Share Story Button */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="py-2.5 px-4 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:opacity-90 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-pink-600/30 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 shrink-0"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{submitting ? 'Sharing...' : 'Share Story'}</span>
            </button>

          </div>

        </div>
          </>
        )}

      </div>

      {/* SOUND SELECTION MODAL DRAWER */}
      {isSoundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 text-white max-h-[85vh] flex flex-col shadow-2xl space-y-3">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Add Story Sound</h3>
                  <p className="text-[11px] text-slate-400">Choose music track or upload sound</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (audioPreviewRef.current) audioPreviewRef.current.pause();
                  setPreviewTrackId(null);
                  setIsSoundModalOpen(false);
                }}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden Audio File Input */}
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleCustomAudioUpload}
            />

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search music or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
              {['All', 'Acoustic', 'Chill', 'Pop', 'Electronic', 'Piano', 'Summer'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeCategory === cat
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Preset Tracks List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[250px]">
              {filteredTracks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No music tracks found.
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const isSelected = selectedAudio?.id === track.id;
                  const isPreviewing = previewTrackId === track.id;

                  return (
                    <div
                      key={track.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-pink-600/20 border-pink-500/80 ring-1 ring-pink-500'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => toggleTrackPreview(track)}
                          className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0 relative group hover:scale-105 transition-transform"
                          title={isPreviewing ? 'Pause Preview' : 'Play Preview'}
                        >
                          {track.coverEmoji}
                          <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isPreviewing ? <Pause className="w-4 h-4 text-pink-400" /> : <Play className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                        <div className="leading-tight">
                          <p className="font-extrabold text-xs text-white">{track.title}</p>
                          <p className="text-[10px] text-slate-400">{track.artist} • {track.duration}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleTrackPreview(track)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
                        >
                          {isPreviewing ? <Pause className="w-4 h-4 text-pink-400" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAudio(track);
                            setCustomAudioUrl('');
                            if (audioPreviewRef.current) audioPreviewRef.current.pause();
                            setPreviewTrackId(null);
                            setIsSoundModalOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-pink-600 text-white'
                              : 'bg-slate-800 hover:bg-pink-600 text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Use'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom Audio Upload / URL */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Custom Audio Upload</p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => audioFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-pink-300 border border-slate-700 flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio File (MP3)</span>
                </button>

                {(selectedAudio || customAudioUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAudio(null);
                      setCustomAudioUrl('');
                      setCustomAudioTitle('');
                      setCustomAudioArtist('');
                    }}
                    className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/30 transition-all flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>,
    document.body
  );
};


