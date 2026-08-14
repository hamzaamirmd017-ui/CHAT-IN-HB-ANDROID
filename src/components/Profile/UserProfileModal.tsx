import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Edit2, 
  Check, 
  Camera, 
  Sparkles, 
  Phone, 
  AtSign, 
  ShieldCheck, 
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Layers,
  Heart,
  MessageSquare,
  Share2,
  Plus,
  X,
  Send,
  Globe,
  Lock,
  Users,
  Users as UsersIcon,
  Calendar,
  MapPin,
  Flame,
  Laugh,
  ThumbsUp,
  Trash2,
  MoreVertical,
  Pin,
  Bookmark,
  Settings,
  BellOff,
  Bell,
  Languages,
  EyeOff,
  Briefcase,
  Flag,
  GraduationCap,
  Home,
  Eye,
  Search,
  PlusCircle,
  Shield,
  Package,
  Clock,
  ListFilter,
  ChevronDown,
  Tv
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Post, Story } from '../../types';
import { StoryViewerModal } from '../Stories/StoryViewerModal';
import { CreateStoryModal } from '../Stories/CreateStoryModal';

// Helper to compress images before storing in Firestore (safely keeps payload under ~300KB to prevent Firestore limit errors)
const compressImage = (file: File, maxWidth = 1000, maxHeight = 700, initialQuality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = initialQuality;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Loop to ensure base64 string is under 350,000 characters (~250KB) to safely fit in Firestore document limits
        while (dataUrl.length > 350000 && quality > 0.25) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string || '');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=connect1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=connect2'
];

const PRESET_COVERS = [
  { name: 'Neon Wave Cyberpunk', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Cosmic Vibrant Gradient', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Retro Grid Synthwave', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Tropical Island Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Starry Mountain Night', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Northern Lights Aurora', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80' }
];

type ProfileTab = 'posts' | 'about' | 'photos' | 'all_posts';

interface ReactionCounts {
  [key: string]: string[]; // reactionEmoji -> array of userUids
}

export const UserProfileModal: React.FC = () => {
  const { user, userProfile, updateProfileData } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  // Edit Profile States
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [coverPhotoURL, setCoverPhotoURL] = useState(() => {
    return userProfile?.coverPhotoURL || (userProfile?.uid ? localStorage.getItem(`coverPhoto_${userProfile.uid}`) : '') || '';
  });
  const [workplace, setWorkplace] = useState(userProfile?.workplace || '');
  const [education, setEducation] = useState(userProfile?.education || '');
  const [currentCity, setCurrentCity] = useState(userProfile?.currentCity || '');
  const [hometown, setHometown] = useState(userProfile?.hometown || '');
  const [relationshipStatus, setRelationshipStatus] = useState(userProfile?.relationshipStatus || '');
  const [gender, setGender] = useState(userProfile?.gender || '');
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  const [website, setWebsite] = useState(userProfile?.website || '');
  const [aboutSubTab, setAboutSubTab] = useState<'overview' | 'work' | 'places' | 'contact' | 'family'>('overview');

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [quickBioText, setQuickBioText] = useState(userProfile?.bio || '');
  const [privacySettings, setPrivacySettings] = useState(userProfile?.privacySettings || {
    showLastSeen: true,
    showPhone: true,
    allowDirectMsg: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state whenever userProfile changes
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setUsername(userProfile.username || '');
      setEmail(userProfile.email || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setBio(userProfile.bio || '');
      setQuickBioText(userProfile.bio || '');
      setPhotoURL(userProfile.photoURL || '');

      const effectiveCover = userProfile.coverPhotoURL || localStorage.getItem(`coverPhoto_${userProfile.uid}`) || '';
      setCoverPhotoURL(effectiveCover);
      if (userProfile.coverPhotoURL && userProfile.uid) {
        localStorage.setItem(`coverPhoto_${userProfile.uid}`, userProfile.coverPhotoURL);
      }

      setWorkplace(userProfile.workplace || '');
      setEducation(userProfile.education || '');
      setCurrentCity(userProfile.currentCity || '');
      setHometown(userProfile.hometown || '');
      setRelationshipStatus(userProfile.relationshipStatus || '');
      setGender(userProfile.gender || '');
      setBirthDate(userProfile.birthDate || '');
      setWebsite(userProfile.website || '');
    }
  }, [userProfile]);

  // Posts & Photos state
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Post Creation
  const [newPostText, setNewPostText] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Comments State (postId -> string)
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  // Lightbox Photo Modal
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Delete Post Confirmation State
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Facebook-Style Profile Action States & Modals
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [viewAsPublicMode, setViewAsPublicMode] = useState(false);
  const [activeOptionModal, setActiveOptionModal] = useState<'none' | 'highlights' | 'status' | 'archive' | 'story_archive' | 'activity_log'>('none');
  const [archivedStories, setArchivedStories] = useState<Story[]>([]);
  const [activeArchiveStoryIndex, setActiveArchiveStoryIndex] = useState<number | null>(null);

  // Active Story & Story Creation States
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [userActiveStories, setUserActiveStories] = useState<Story[]>([]);
  const [isViewingUserStories, setIsViewingUserStories] = useState(false);

  // Fetch active stories for the current user
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(collection(db, 'stories'), (snapshot) => {
      const now = new Date().getTime();
      const list: Story[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === user.uid && data.archived !== true) {
          let expires = now + 86400000;
          if (data.expiresAt?.toDate) expires = data.expiresAt.toDate().getTime();
          else if (data.expiresAt?.seconds) expires = data.expiresAt.seconds * 1000;
          else if (data.expiresAt?.getTime) expires = data.expiresAt.getTime();
          else if (typeof data.expiresAt === 'number') expires = data.expiresAt;

          if (expires > now) {
            list.push({ id: docSnap.id, ...data } as Story);
          }
        }
      });
      setUserActiveStories(list);
    }, (err) => console.warn('Error fetching active stories in profile:', err));

    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch archived stories when Story Archive option modal is opened
  useEffect(() => {
    if (activeOptionModal !== 'story_archive' || !user?.uid) return;

    const unsubscribe = onSnapshot(collection(db, 'stories'), (snapshot) => {
      const now = new Date().getTime();
      const list: Story[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === user.uid) {
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

          if (expires <= now || data.archived === true) {
            list.push({
              id: docSnap.id,
              ...data
            } as Story);
          }
        }
      });

      list.sort((a, b) => {
        const getCreated = (item: any) => {
          if (!item.createdAt) return 0;
          if (item.createdAt.toDate) return item.createdAt.toDate().getTime();
          if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
          if (item.createdAt.getTime) return item.createdAt.getTime();
          if (typeof item.createdAt === 'number') return item.createdAt;
          return 0;
        };
        return getCreated(b) - getCreated(a);
      });

      setArchivedStories(list);
    }, (err) => {
      console.warn('Error fetching archived stories:', err);
    });

    return () => unsubscribe();
  }, [activeOptionModal, user?.uid]);
  const [showProfileSearch, setShowProfileSearch] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [showMoreTabsDropdown, setShowMoreTabsDropdown] = useState(false);
  const [thoughtNoteText, setThoughtNoteText] = useState(userProfile?.thoughtNote || '');
  const [showThoughtInputModal, setShowThoughtInputModal] = useState(false);
  const [highlightsList, setHighlightsList] = useState<Array<{ id: string; title: string; cover: string }>>([
    { id: '1', title: 'Memories 💖', cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&auto=format&fit=crop&q=80' },
    { id: '2', title: 'Travel ✈️', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80' }
  ]);
  const [newHighlightTitle, setNewHighlightTitle] = useState('');

  // Format last seen timestamp for offline status
  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Offline';
    let date: Date;
    if (lastSeen?.toDate && typeof lastSeen.toDate === 'function') {
      date = lastSeen.toDate();
    } else if (typeof lastSeen === 'string' || typeof lastSeen === 'number') {
      date = new Date(lastSeen);
    } else if (lastSeen?.seconds) {
      date = new Date(lastSeen.seconds * 1000);
    } else {
      return 'Offline';
    }
    
    if (isNaN(date.getTime())) return 'Offline';

    const minsAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minsAgo < 1) return 'Offline (Just now)';
    if (minsAgo < 60) return `Offline (${minsAgo}m ago)`;
    const hoursAgo = Math.floor(minsAgo / 60);
    if (hoursAgo < 24) return `Offline (${hoursAgo}h ago)`;
    return `Offline (${date.toLocaleDateString()})`;
  };

  // Fetch posts from Firestore
  useEffect(() => {
    if (!user) return;

    // Listen to all posts
    const qAll = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      const list: Post[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Post);
      });
      setAllPosts(list);
      setUserPosts(list.filter((p) => p.authorId === user.uid));
      setLoadingPosts(false);
    }, (err) => {
      console.warn('onSnapshot error in UserProfileModal posts:', err);
      setLoadingPosts(false);
    });

    return () => unsubAll();
  }, [user]);

  // Uploading image indicator states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [showPresetCoverModal, setShowPresetCoverModal] = useState(false);

  const handleSelectPresetCover = async (presetUrl: string) => {
    if (!user) return;
    setUploadingCover(true);
    setShowPresetCoverModal(false);
    setShowCoverMenu(false);
    try {
      setCoverPhotoURL(presetUrl);
      localStorage.setItem(`coverPhoto_${user.uid}`, presetUrl);
      await updateProfileData({ coverPhotoURL: presetUrl });
      await createAutoPost(`${displayName || userProfile?.displayName || 'User'} updated their cover photo.`, presetUrl);
    } catch (err) {
      console.error('Error setting preset cover photo:', err);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, 800, 800, 0.85);
      if (compressed) setPhotoURL(compressed);
    } catch (err) {
      console.error('Error compressing avatar:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const createAutoPost = async (content: string, mediaUrl: string, overrideAuthorPhoto?: string) => {
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: displayName || userProfile?.displayName || 'User',
        authorPhoto: overrideAuthorPhoto || photoURL || userProfile?.photoURL || '',
        content,
        mediaUrl,
        likes: [],
        reactions: {},
        comments: [],
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error creating auto post:', err);
    }
  };

  const handleAvatarDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, 800, 800, 0.85);
      if (compressed) {
        setPhotoURL(compressed);
        await updateProfileData({ photoURL: compressed });
        await createAutoPost(`${displayName || userProfile?.displayName || 'User'} updated their profile picture.`, compressed, compressed);
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const compressed = await compressImage(file, 1000, 600, 0.75);
      if (compressed) {
        setCoverPhotoURL(compressed);
        localStorage.setItem(`coverPhoto_${user.uid}`, compressed);
        await updateProfileData({ coverPhotoURL: compressed });
        await createAutoPost(`${displayName || userProfile?.displayName || 'User'} updated their cover photo.`, compressed);
      }
    } catch (err) {
      console.error('Error uploading cover photo:', err);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    if (!user) return;
    setUploadingCover(true);
    setShowCoverMenu(false);
    try {
      setCoverPhotoURL('');
      localStorage.removeItem(`coverPhoto_${user.uid}`);
      await updateProfileData({ coverPhotoURL: '' });
    } catch (err) {
      console.error('Error removing cover photo:', err);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveQuickBio = async () => {
    if (quickBioText.length > 150) return;
    setSaving(true);
    try {
      await updateProfileData({ bio: quickBioText });
      setBio(quickBioText);
      setIsEditingBio(false);
    } catch (err) {
      console.error('Error saving bio:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile || !user) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const effectiveCover = coverPhotoURL || userProfile?.coverPhotoURL || (user?.uid ? localStorage.getItem(`coverPhoto_${user.uid}`) : '') || '';

      if (photoURL && photoURL !== userProfile.photoURL) {
        await createAutoPost(`${displayName} updated their profile picture.`, photoURL);
      }
      if (effectiveCover && effectiveCover !== userProfile.coverPhotoURL) {
        await createAutoPost(`${displayName} updated their cover photo.`, effectiveCover);
      }

      if (effectiveCover && user?.uid) {
        localStorage.setItem(`coverPhoto_${user.uid}`, effectiveCover);
      }

      await updateProfileData({
        displayName,
        username: username.startsWith('@') ? username : `@${username}`,
        email,
        phoneNumber,
        bio,
        photoURL,
        coverPhotoURL: effectiveCover,
        privacySettings,
        workplace,
        education,
        currentCity,
        hometown,
        relationshipStatus,
        gender,
        birthDate,
        website
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // Create new post directly from profile
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !newMediaUrl.trim()) return;

    setPostSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        content: newPostText.trim(),
        mediaUrl: newMediaUrl.trim() || null,
        likes: [],
        reactions: {},
        comments: [],
        createdAt: serverTimestamp()
      });

      setNewPostText('');
      setNewMediaUrl('');
      setIsCreatingPost(false);
    } catch (err) {
      console.error('Error creating post from profile:', err);
    } finally {
      setPostSubmitting(false);
    }
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    setDeletingPostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletingPostId) return;
    const postToDelete = userPosts.find((p) => p.id === deletingPostId) || allPosts.find((p) => p.id === deletingPostId);
    if (postToDelete && user && postToDelete.userId !== user.uid && postToDelete.authorId !== user.uid) {
      alert("You cannot delete another user's post.");
      setDeletingPostId(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'posts', deletingPostId));
      setUserPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      setAllPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      setDeletingPostId(null);
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // React to post (Like, Heart, Laugh, Wow, Sad, Angry)
  const handleReactToPost = async (post: Post, emoji: string) => {
    const postRef = doc(db, 'posts', post.id);
    const existingReactions: ReactionCounts = (post as any).reactions || {};

    // Remove user's previous reaction if any
    const updatedReactions: ReactionCounts = { ...existingReactions };
    Object.keys(updatedReactions).forEach((key) => {
      if (Array.isArray(updatedReactions[key])) {
        updatedReactions[key] = updatedReactions[key].filter((uid) => uid !== user.uid);
      }
    });

    // Toggle current reaction
    if (!existingReactions[emoji]?.includes(user.uid)) {
      if (!updatedReactions[emoji]) updatedReactions[emoji] = [];
      updatedReactions[emoji].push(user.uid);
    }

    // Also sync standard likes array for compatibility
    const hasAnyReaction = Object.values(updatedReactions).some((uids) => uids.includes(user.uid));
    
    try {
      await updateDoc(postRef, {
        reactions: updatedReactions,
        likes: hasAnyReaction ? arrayUnion(user.uid) : arrayRemove(user.uid)
      });
    } catch (err) {
      console.error('Error reacting to post:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId]?.trim();
    if (!text) return;

    const newComment = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: user.uid,
      authorName: userProfile.displayName,
      authorPhoto: userProfile.photoURL,
      text,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'posts', postId), {
        comments: arrayUnion(newComment)
      });
      setCommentInput((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Filter media posts (posts with image/video URLs)
  const mediaPosts = allPosts.filter((p) => p.mediaUrl);

  return (
    <div className="w-full p-0 sm:p-4 space-y-4 sm:space-y-6 pb-20 md:pb-8">
      
      {/* PROFILE HEADER CARD */}
      <div className="frosted-card rounded-none sm:rounded-3xl p-3 sm:p-6 shadow-2xl relative overflow-hidden transition-all border-x-0 sm:border border-purple-500/20">
        
        {/* Facebook Style Cover Banner */}
        <div className="h-52 sm:h-72 md:h-80 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-none sm:rounded-2xl mb-14 sm:mb-16 relative shadow-2xl overflow-hidden group border-x-0 sm:border border-[var(--border-color)]">
          {coverPhotoURL || userProfile.coverPhotoURL ? (
            <img 
              src={coverPhotoURL || userProfile.coverPhotoURL} 
              alt="Cover Photo" 
              className="w-full h-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
              onClick={() => setSelectedPhoto(coverPhotoURL || userProfile.coverPhotoURL || null)}
            />
          ) : (
            <div 
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-700 via-purple-900 to-slate-950 flex flex-col items-center justify-center text-white/50 cursor-pointer"
              onClick={() => setShowPresetCoverModal(true)}
            >
              <Sparkles className="w-10 h-10 text-fuchsia-400 mb-1 animate-pulse" />
              <span className="text-xs font-bold text-fuchsia-200">Click to Choose Facebook Style Cover Photo</span>
            </div>
          )}

          {uploadingCover && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white space-y-2 animate-fadeIn">
              <div className="w-8 h-8 border-3 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-extrabold text-fuchsia-200">Saving Cover Photo...</span>
            </div>
          )}
          
          {/* Subtle bottom shadow overlay for high contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Facebook Style "Edit Cover Photo" Glass Button */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
            <button
              type="button"
              onClick={() => setShowCoverMenu(!showCoverMenu)}
              className="bg-slate-950/85 hover:bg-slate-900/95 text-white font-extrabold text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-fuchsia-400" />
              <span>{coverPhotoURL || userProfile.coverPhotoURL ? 'Edit Cover Photo' : 'Add Cover Photo'}</span>
            </button>

            {/* Floating Dropdown Context Menu */}
            {showCoverMenu && (
              <div className="absolute right-0 bottom-12 w-56 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-40 space-y-1 animate-fadeIn">
                <label className="w-full flex items-center space-x-2.5 px-3 py-2.5 hover:bg-purple-600/30 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors">
                  <Camera className="w-4 h-4 text-fuchsia-400" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { setShowCoverMenu(false); handleCoverFileChange(e); }} />
                </label>

                <button
                  type="button"
                  onClick={() => { setShowCoverMenu(false); setShowPresetCoverModal(true); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 hover:bg-purple-600/30 text-white text-xs font-bold rounded-xl transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Choose Preset Cover</span>
                </button>

                {(coverPhotoURL || userProfile.coverPhotoURL) && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setShowCoverMenu(false); setSelectedPhoto(coverPhotoURL || userProfile.coverPhotoURL || null); }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 hover:bg-purple-600/30 text-white text-xs font-bold rounded-xl transition-colors text-left"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>View Cover Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveCoverPhoto}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 hover:bg-rose-600/30 text-rose-300 hover:text-white text-xs font-bold rounded-xl transition-colors text-left border-t border-slate-800 pt-2"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Remove Cover Photo</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Facebook Overlapping Circular Avatar */}
          <div className="absolute -bottom-10 sm:-bottom-14 left-4 sm:left-8 z-30">
            {/* Facebook Style "Share a thought..." Speech Bubble above Avatar */}
            <div className="absolute -top-11 left-1 z-40">
              <button
                type="button"
                onClick={() => setShowThoughtInputModal(true)}
                className="px-3 py-1 bg-slate-900/90 hover:bg-slate-900 text-white font-bold text-[11px] rounded-2xl border border-white/20 shadow-xl backdrop-blur-md flex items-center space-x-1.5 transition-all active:scale-95 group/thought cursor-pointer"
                title="Share a thought..."
              >
                <Sparkles className="w-3 h-3 text-fuchsia-400 group-hover/thought:animate-spin" />
                <span className="truncate max-w-[130px]">
                  {thoughtNoteText || 'Share a thought...'}
                </span>
              </button>
            </div>

            <div className="relative group/avatar">
              <div 
                className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-slate-900 shadow-2xl relative cursor-pointer ${
                  userActiveStories.length > 0 
                    ? 'p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 ring-4 ring-pink-500/40' 
                    : 'border-4 border-slate-950 ring-4 ring-black/40'
                }`}
                onClick={() => {
                  if (userActiveStories.length > 0) {
                    setIsViewingUserStories(true);
                  } else {
                    setSelectedPhoto(photoURL || userProfile.photoURL || null);
                  }
                }}
              >
                <img src={photoURL || userProfile.photoURL} alt={displayName || userProfile.displayName} className="w-full h-full object-cover rounded-full" />
                
                {/* Profile Picture Camera Overlay on Hover */}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer rounded-full" title="Upload Profile Picture">
                  <Camera className="w-6 h-6 text-fuchsia-300 drop-shadow" />
                  <span className="text-[10px] font-extrabold mt-0.5">Edit Pic</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarDirectUpload} />
                </label>
              </div>
              
              {/* Camera Badge Button on Avatar */}
              <label className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 hover:bg-purple-500 border-2 border-slate-950 text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl z-30 transition-transform hover:scale-110" title="Change Profile Picture">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarDirectUpload} />
              </label>

              {/* Real-time Activity Indicator Badge */}
              <div 
                className={`absolute bottom-2 left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-4 ring-slate-950 flex items-center justify-center transition-all duration-300 z-20 ${
                  userProfile.isOnline 
                    ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.9)]' 
                    : 'bg-slate-600 border border-slate-500/50 shadow-md'
                }`}
                title={userProfile.isOnline ? 'Online now' : 'Offline'}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${userProfile.isOnline ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {userProfile.displayName}
              </h2>
              
              {/* Real-time Activity Presence Pill */}
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1.5 border transition-all ${
                userProfile.isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
              }`}>
                <span className={`w-2 h-2 rounded-full ${userProfile.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                <span>{userProfile.isOnline ? 'Active Now' : formatLastSeen(userProfile.lastSeen)}</span>
              </div>
            </div>

            {/* Friend Limit Display (1000 max) - Only shown if user has friends */}
            {Boolean(userProfile.friends && userProfile.friends.length > 0) && (
              <div className="flex items-center space-x-2 mt-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-extrabold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
                  Friends: {userProfile.friends.length} / 1000
                </span>
              </div>
            )}

            {/* Bio Display & Quick Inline Editor */}
            {!isEditingBio ? (
              <div className="mt-2.5 max-w-lg flex items-center space-x-2">
                <p className="text-xs text-slate-200 font-medium italic bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10 flex-1">
                  "{userProfile.bio || 'Hey there! I am using Connect Chat ✨'}"
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingBio(true);
                    setQuickBioText(userProfile.bio || '');
                  }}
                  className="p-2.5 bg-purple-600/20 hover:bg-purple-600/40 text-fuchsia-300 hover:text-white rounded-xl border border-purple-500/30 transition-all flex-shrink-0"
                  title="Edit Bio"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="mt-2.5 max-w-lg bg-purple-950/40 p-3 rounded-2xl border border-fuchsia-500/40 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-fuchsia-300 uppercase tracking-wider flex items-center space-x-1">
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Bio (Max 150 chars)</span>
                  </span>
                  <span className={`text-[10px] font-bold ${quickBioText.length >= 140 ? 'text-amber-400' : 'text-purple-300/60'}`}>
                    {quickBioText.length}/150
                  </span>
                </div>
                <textarea
                  value={quickBioText}
                  onChange={(e) => setQuickBioText(e.target.value.slice(0, 150))}
                  rows={2}
                  placeholder="Write something about yourself..."
                  className="w-full bg-black/40 border border-purple-800/60 rounded-xl p-2.5 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-fuchsia-400"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickBio}
                    disabled={saving}
                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Bio'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FACEBOOK STYLE PROFILE ACTION BUTTONS (+ Add to story | Edit profile | Three-dot Menu) */}
          <div className="flex items-center space-x-2.5 pt-2 flex-wrap gap-y-2">
            
            {/* 1. Add To Story Button */}
            <button
              type="button"
              onClick={() => setIsCreateStoryOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add to story</span>
            </button>

            {/* 2. Edit Profile Button */}
            <button
              type="button"
              onClick={() => {
                setIsEditing(!isEditing);
                setActiveTab('about');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl border border-slate-700 shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-300" />
              <span>{isEditing ? 'Cancel Editing' : 'Edit profile'}</span>
            </button>

            {/* 3. Three-Dot Options Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl border border-slate-700 shadow-md flex items-center justify-center transition-all active:scale-95"
                title="Profile Settings & Options"
              >
                <MoreVertical className="w-4 h-4 text-slate-200" />
              </button>

              {/* THREE-DOT DROPDOWN POPUP MENU (as shown in user image) */}
              {showThreeDotMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl z-50 py-2 divide-y divide-purple-900/30 animate-fadeIn"
                  onClick={() => setShowThreeDotMenu(false)}
                >
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setViewAsPublicMode(!viewAsPublicMode)}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>{viewAsPublicMode ? 'Exit View as' : 'View as'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowProfileSearch(!showProfileSearch)}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <Search className="w-4 h-4 text-fuchsia-400" />
                      <span>Search Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveOptionModal('highlights')}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 text-pink-400" />
                      <span>Add highlights</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveOptionModal('status')}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Profile status</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setActiveOptionModal('archive')}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>Archive</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveOptionModal('story_archive')}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span>Story archive</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveOptionModal('activity_log')}
                      className="w-full px-4 py-2.5 hover:bg-purple-600/20 text-left text-xs font-bold text-slate-200 flex items-center space-x-3 transition-colors"
                    >
                      <ListFilter className="w-4 h-4 text-violet-400" />
                      <span>Activity log</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View As Public Notice Banner */}
        {viewAsPublicMode && (
          <div className="mt-4 p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-2xl flex items-center justify-between text-xs text-cyan-200 animate-fadeIn shadow-lg">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>You are viewing your profile as a public viewer.</span>
            </div>
            <button
              type="button"
              onClick={() => setViewAsPublicMode(false)}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl transition-all"
            >
              Exit View As
            </button>
          </div>
        )}

        {/* Profile Search Input Bar */}
        {showProfileSearch && (
          <div className="mt-4 p-3 bg-slate-900 border border-purple-500/40 rounded-2xl flex items-center space-x-2 animate-fadeIn">
            <Search className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <input
              type="text"
              value={profileSearchQuery}
              onChange={(e) => setProfileSearchQuery(e.target.value)}
              placeholder="Search posts in this profile..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            {profileSearchQuery && (
              <button
                type="button"
                onClick={() => setProfileSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* NAVIGATION TABS: All/Posts | About | Friends | Photos | Reels | More ▾ */}
        <div className="mt-6 pt-3 border-t border-purple-900/40 flex items-center justify-start space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
          
          <button
            type="button"
            onClick={() => {
              setActiveTab('posts');
              setIsEditing(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'posts' && !isEditing
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/50'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Posts</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
              {userPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'about'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/50'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>About</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('photos');
              setIsEditing(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'photos'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/50'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Photos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
              {mediaPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('all_posts');
              setIsEditing(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'all_posts'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/50'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>All Posts</span>
          </button>

          {/* More Dropdown Tab */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreTabsDropdown(!showMoreTabsDropdown)}
              className="px-3 py-2 text-xs font-extrabold text-purple-300/70 hover:text-white hover:bg-white/5 rounded-xl flex items-center space-x-1 whitespace-nowrap transition-all"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
            </button>

            {showMoreTabsDropdown && (
              <div 
                className="absolute left-0 mt-1 w-44 bg-slate-900 border border-purple-500/30 rounded-xl shadow-2xl z-50 py-1"
                onClick={() => setShowMoreTabsDropdown(false)}
              >
                <button
                  type="button"
                  onClick={() => setActiveOptionModal('archive')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-purple-600/20 flex items-center space-x-2 font-bold"
                >
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Archive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOptionModal('activity_log')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-purple-600/20 flex items-center space-x-2 font-bold"
                >
                  <ListFilter className="w-3.5 h-3.5 text-violet-400" />
                  <span>Activity Log</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* TAB CONTENTS */}

      {/* 1. POSTS TAB */}
      {activeTab === 'posts' && !isEditing && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Create Post Card */}
          <div className="frosted-card rounded-3xl p-4 sm:p-5 border border-purple-500/20 shadow-xl space-y-3">
            <div className="flex items-center space-x-3">
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-purple-500/40"
              />
              <button
                type="button"
                onClick={() => setIsCreatingPost(true)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-2.5 px-4 text-left text-xs text-purple-200/60 transition-all"
              >
                What's on your mind, {userProfile.displayName.split(' ')[0]}?
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-purple-900/30 text-xs">
              <button
                type="button"
                onClick={() => setIsCreatingPost(true)}
                className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 font-bold px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo / Video</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreatingPost(true)}
                className="flex items-center space-x-2 text-fuchsia-400 hover:text-fuchsia-300 font-bold px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
              >
                <Flame className="w-4 h-4" />
                <span>Feeling / Activity</span>
              </button>
            </div>
          </div>

          {/* Create Post Dialog Modal */}
          {isCreatingPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
              <div className="w-full max-w-lg bg-slate-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
                  <h3 className="font-extrabold text-base text-white">Create Post</h3>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPost(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreatePost} className="space-y-4">
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Share your thoughts with your friends..."
                    rows={4}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-2xl p-3.5 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-purple-200/80 mb-1">Image URL (Optional)</label>
                    <input
                      type="url"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      placeholder="Paste image link..."
                      className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={postSubmitting || (!newPostText.trim() && !newMediaUrl.trim())}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{postSubmitting ? 'Publishing...' : 'Publish Post'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* User's Posts List */}
          {loadingPosts ? (
            <div className="p-8 text-center text-xs text-purple-300/60">Loading your posts...</div>
          ) : userPosts.length === 0 ? (
            <div className="frosted-card rounded-3xl p-8 text-center space-y-3 border border-purple-900/30">
              <FileText className="w-10 h-10 text-purple-400/50 mx-auto" />
              <p className="text-xs text-purple-200/70 font-semibold">No posts published yet.</p>
              <button
                type="button"
                onClick={() => setIsCreatingPost(true)}
                className="px-4 py-2 bg-purple-600/80 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Create First Post
              </button>
            </div>
          ) : (
            userPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user.uid}
                onReact={handleReactToPost}
                commentInput={commentInput}
                setCommentInput={setCommentInput}
                onAddComment={handleAddComment}
                onOpenPhoto={setSelectedPhoto}
                onDeletePost={handleDeletePost}
              />
            ))
          )}

        </div>
      )}

      {/* 2. ABOUT TAB - Facebook Style */}
      {activeTab === 'about' && (
        <div className="frosted-card rounded-3xl p-5 sm:p-6 border border-purple-500/20 shadow-2xl space-y-6 animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <User className="w-5 h-5 text-fuchsia-400" />
                <span>About</span>
              </h3>
              <p className="text-xs text-purple-300/60 mt-0.5">Your personal details, background info, and relationship status</p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 border border-purple-400/30 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Close Form' : 'Edit About Info'}</span>
            </button>
          </div>

          {/* Facebook-style Category Navigation Sub-tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-purple-900/30 no-scrollbar">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'work', label: 'Work & Education', icon: Briefcase },
              { id: 'places', label: 'Places Lived', icon: MapPin },
              { id: 'contact', label: 'Contact & Basic Info', icon: Mail },
              { id: 'family', label: 'Family & Relationships', icon: Heart }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = aboutSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAboutSubTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-2 transition-all ${
                    isActive
                      ? 'bg-purple-600/90 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] border border-purple-400/40'
                      : 'bg-white/5 text-purple-300 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-fuchsia-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-tab Content Views */}
          {!isEditing && (
            <div className="space-y-4 text-xs animate-fadeIn">
              
              {/* SUB TAB: OVERVIEW */}
              {aboutSubTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <Briefcase className="w-3 h-3 text-cyan-400" />
                      <span>Workplace</span>
                    </span>
                    <p className="font-bold text-white text-sm">{userProfile.workplace || 'No workplace added'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <GraduationCap className="w-3 h-3 text-amber-400" />
                      <span>Education</span>
                    </span>
                    <p className="font-bold text-white text-sm">{userProfile.education || 'No education added'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>Current City</span>
                    </span>
                    <p className="font-bold text-white text-sm">{userProfile.currentCity || 'Not specified'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <Heart className="w-3 h-3 text-pink-400" />
                      <span>Relationship Status</span>
                    </span>
                    <p className="font-bold text-white text-sm">{userProfile.relationshipStatus || 'Single'}</p>
                  </div>

                  <div className="sm:col-span-2 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider">Bio & Quote</span>
                    <p className="text-slate-200 italic">"{userProfile.bio || 'No bio provided yet.'}"</p>
                  </div>
                </div>
              )}

              {/* SUB TAB: WORK & EDUCATION */}
              {aboutSubTab === 'work' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                      <Briefcase className="w-4 h-4" />
                      <span>Work</span>
                    </div>
                    <p className="text-white text-sm font-semibold">{userProfile.workplace || 'No workplace specified'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold">
                      <GraduationCap className="w-4 h-4" />
                      <span>College / High School</span>
                    </div>
                    <p className="text-white text-sm font-semibold">{userProfile.education || 'No school or university specified'}</p>
                  </div>
                </div>
              )}

              {/* SUB TAB: PLACES LIVED */}
              {aboutSubTab === 'places' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center space-x-2 text-rose-400 font-bold">
                      <MapPin className="w-4 h-4" />
                      <span>Current City</span>
                    </div>
                    <p className="text-white text-sm font-semibold">{userProfile.currentCity || 'Not specified'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                      <Home className="w-4 h-4" />
                      <span>Hometown</span>
                    </div>
                    <p className="text-white text-sm font-semibold">{userProfile.hometown || 'Not specified'}</p>
                  </div>
                </div>
              )}

              {/* SUB TAB: CONTACT & BASIC INFO */}
              {aboutSubTab === 'contact' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <Mail className="w-3 h-3 text-cyan-400" />
                      <span>Email</span>
                    </span>
                    <p className="font-semibold text-white">{userProfile.email}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>Mobile Phone</span>
                    </span>
                    <p className="font-semibold text-white">{userProfile.phoneNumber || 'Not provided'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <Globe className="w-3 h-3 text-fuchsia-400" />
                      <span>Website / Social Link</span>
                    </span>
                    <p className="font-semibold text-white">{userProfile.website || 'None'}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-purple-300/60 uppercase font-extrabold tracking-wider flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Birth Date & Gender</span>
                    </span>
                    <p className="font-semibold text-white">
                      {userProfile.birthDate || 'Not specified'} • {userProfile.gender || 'Not specified'}
                    </p>
                  </div>
                </div>
              )}

              {/* SUB TAB: FAMILY & RELATIONSHIPS */}
              {aboutSubTab === 'family' && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center space-x-2 text-pink-400 font-bold">
                    <Heart className="w-4 h-4" />
                    <span>Relationship Status</span>
                  </div>
                  <p className="text-white text-sm font-bold">{userProfile.relationshipStatus || 'Single'}</p>
                </div>
              )}

            </div>
          )}

          {/* Full Facebook Details Edit Form Drawer */}
          {isEditing && (
            <div className="pt-4 border-t border-purple-900/30 space-y-4 animate-fadeIn">
              <h4 className="font-extrabold text-sm text-fuchsia-300">Edit Facebook-Style Profile Details</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Username (@handle)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Workplace / Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer at Tech Corp"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Education / College</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science at University"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Current City</label>
                  <input
                    type="text"
                    placeholder="e.g. New York, USA"
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Hometown</label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Relationship Status</label>
                  <select
                    value={relationshipStatus}
                    onChange={(e) => setRelationshipStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  >
                    <option value="Single">Single</option>
                    <option value="In a relationship">In a relationship</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Married">Married</option>
                    <option value="Civil partnership">Civil partnership</option>
                    <option value="It's complicated">It's complicated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Gender</label>
                  <input
                    type="text"
                    placeholder="Male / Female / Other"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Birth Date</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">Website / Portfolio Link</label>
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">Bio / Status Message</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                />
              </div>

              {/* Avatar Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-purple-200">Avatar Presets or Upload Custom Image</label>
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Preset Avatar"
                      onClick={() => setPhotoURL(url)}
                      className={`w-11 h-11 rounded-2xl cursor-pointer object-cover border-2 transition-transform ${
                        photoURL === url ? 'border-fuchsia-400 scale-110 shadow-[0_0_10px_#e879f9]' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <label className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                  </label>
                  <input
                    type="url"
                    placeholder="Or paste custom image URL..."
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="flex-1 bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              {/* Cover Photo Selector */}
              <div className="space-y-2 pt-2 border-t border-purple-900/30">
                <label className="block text-xs font-semibold text-purple-200">Cover Photo</label>
                <div className="flex items-center space-x-2">
                  <label className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center space-x-1.5 flex-shrink-0">
                    <Camera className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Upload Cover</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
                  </label>
                  <input
                    type="url"
                    placeholder="Or paste cover photo image URL..."
                    value={coverPhotoURL}
                    onChange={(e) => setCoverPhotoURL(e.target.value)}
                    className="flex-1 bg-white/5 border border-purple-900/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 mt-2"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>

            </div>
          )}

        </div>
      )}

      {/* 3. PHOTOS TAB */}
      {activeTab === 'photos' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              <span>Photos & Media ({mediaPosts.length})</span>
            </h3>
            <span className="text-xs text-purple-300/60">Click any photo to view and react</span>
          </div>

          {mediaPosts.length === 0 ? (
            <div className="frosted-card rounded-3xl p-8 text-center space-y-2 border border-purple-900/30">
              <ImageIcon className="w-10 h-10 text-amber-400/50 mx-auto" />
              <p className="text-xs text-purple-200/70 font-semibold">No photos posted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mediaPosts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPhoto(p.mediaUrl || null)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-purple-900/30 cursor-pointer shadow-lg hover:scale-[1.02] transition-all"
                >
                  <img
                    src={p.mediaUrl!}
                    alt="Photo"
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-[10px] text-white font-bold truncate">{p.content || 'Photo'}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-purple-300 mt-0.5">
                      <span className="flex items-center space-x-0.5">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        <span>{p.likes?.length || 0}</span>
                      </span>
                      <span className="flex items-center space-x-0.5">
                        <MessageSquare className="w-3 h-3 text-cyan-400" />
                        <span>{p.comments?.length || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ALL POSTS TAB */}
      {activeTab === 'all_posts' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>All Community Posts ({allPosts.length})</span>
            </h3>
            <span className="text-xs text-purple-300/60">View all posts & give reactions</span>
          </div>

          {loadingPosts ? (
            <div className="p-8 text-center text-xs text-purple-300/60">Loading all posts...</div>
          ) : allPosts.length === 0 ? (
            <div className="frosted-card rounded-3xl p-8 text-center text-xs text-purple-300/60 border border-purple-900/30">
              No posts found in feed.
            </div>
          ) : (
            allPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user.uid}
                onReact={handleReactToPost}
                commentInput={commentInput}
                setCommentInput={setCommentInput}
                onAddComment={handleAddComment}
                onOpenPhoto={setSelectedPhoto}
                onDeletePost={handleDeletePost}
              />
            ))
          )}
        </div>
      )}

      {/* DELETE POST CONFIRMATION MODAL */}
      {deletingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-white">Delete Post?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPostId(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PHOTO MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={selectedPhoto} alt="Expanded View" className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl ring-1 ring-purple-500/30" />
          </div>
        </div>
      )}

      {/* PRESET COVER PHOTO SELECTION MODAL */}
      {showPresetCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowPresetCoverModal(false)}>
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-extrabold text-white">Choose Preset Facebook Cover Photo</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetCoverModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-purple-200/80">
              Select one of our high-resolution Facebook style background covers for your profile:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[60vh] overflow-y-auto p-1">
              {PRESET_COVERS.map((cover) => (
                <div
                  key={cover.name}
                  onClick={() => handleSelectPresetCover(cover.url)}
                  className="group relative h-28 rounded-2xl overflow-hidden border border-purple-500/20 hover:border-fuchsia-400 cursor-pointer shadow-lg transition-all hover:scale-105"
                >
                  <img src={cover.url} alt={cover.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                    <span className="text-[11px] font-extrabold text-white drop-shadow">{cover.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPresetCoverModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPTION MODALS (Add Highlights, Profile Status, Archive, Story Archive, Activity Log) */}
      {activeOptionModal !== 'none' && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                {activeOptionModal === 'highlights' && <PlusCircle className="w-5 h-5 text-pink-400" />}
                {activeOptionModal === 'status' && <Shield className="w-5 h-5 text-emerald-400" />}
                {activeOptionModal === 'archive' && <Package className="w-5 h-5 text-amber-400" />}
                {activeOptionModal === 'story_archive' && <Clock className="w-5 h-5 text-indigo-400" />}
                {activeOptionModal === 'activity_log' && <ListFilter className="w-5 h-5 text-violet-400" />}
                <span>
                  {activeOptionModal === 'highlights' && 'Story Highlights'}
                  {activeOptionModal === 'status' && 'Profile Status'}
                  {activeOptionModal === 'archive' && 'Post Archive'}
                  {activeOptionModal === 'story_archive' && 'Story Archive'}
                  {activeOptionModal === 'activity_log' && 'Activity Log'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveOptionModal('none')}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content per modal type */}
            {activeOptionModal === 'highlights' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {highlightsList.map((h) => (
                    <div key={h.id} className="relative rounded-2xl overflow-hidden h-28 border border-purple-500/30 group shadow-md">
                      <img src={h.cover} alt={h.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                        <span className="text-xs font-black text-white">{h.title}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-purple-900/40 space-y-2">
                  <span className="text-xs font-bold text-slate-300">Create New Highlight</span>
                  <input
                    type="text"
                    value={newHighlightTitle}
                    onChange={(e) => setNewHighlightTitle(e.target.value)}
                    placeholder="Highlight Name (e.g., Vacation 🌴)"
                    className="w-full bg-black/40 border border-purple-800/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newHighlightTitle.trim()) return;
                      setHighlightsList([...highlightsList, {
                        id: Date.now().toString(),
                        title: newHighlightTitle.trim(),
                        cover: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=80'
                      }]);
                      setNewHighlightTitle('');
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    + Add Highlight
                  </button>
                </div>
              </div>
            )}

            {activeOptionModal === 'status' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center space-x-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Account Status: Good Standing</h4>
                    <p className="text-emerald-200/80 text-[11px]">No violations, warnings, or restrictions detected on CHAT IN HB.</p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Monetization Eligibility:</span>
                    <span className="font-bold text-emerald-400">Eligible ✓</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Profile Visibility:</span>
                    <span className="font-bold text-cyan-400">Public & Searchable</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Community Guidelines:</span>
                    <span className="font-bold text-white">100% Compliant</span>
                  </div>
                </div>
              </div>
            )}

            {activeOptionModal === 'archive' && (
              <div className="space-y-3 text-xs text-slate-300 py-4 text-center">
                <Package className="w-10 h-10 text-amber-400/60 mx-auto" />
                <p className="font-bold text-white">Post Archive</p>
                <p className="text-[11px] text-slate-400">Only you can see the posts you've archived. No posts are currently archived.</p>
              </div>
            )}

            {activeOptionModal === 'story_archive' && (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-extrabold text-sm text-white">Story Archive</h3>
                  </div>
                  <span className="text-[11px] text-slate-300 font-bold bg-slate-800/80 px-2.5 py-1 rounded-full border border-white/10">
                    {archivedStories.length} {archivedStories.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your past stories are automatically saved here after 24 hours. Only you can see your story archive.
                </p>

                {archivedStories.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                    <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">No archived stories yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Stories you share will automatically move here 24 hours after posting.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
                    {archivedStories.map((story, idx) => {
                      const dateStr = story.createdAt?.toDate
                        ? story.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : (story.createdAt?.seconds ? new Date(story.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Expired');

                      return (
                        <div
                          key={story.id}
                          className="group relative aspect-[9/12] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-slate-900 flex flex-col justify-between p-2.5 transition-all hover:scale-[1.02] cursor-pointer"
                          onClick={() => setActiveArchiveStoryIndex(idx)}
                        >
                          {/* Card Background Media */}
                          {story.mediaType === 'image' && story.mediaUrl ? (
                            <img src={story.mediaUrl} alt="Archive story" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          ) : story.mediaType === 'video' && story.mediaUrl ? (
                            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                              <video src={story.mediaUrl} className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                  ▶
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${story.bgColor || 'from-indigo-600 to-purple-700'} flex items-center justify-center p-3 text-center`}>
                              <p className="text-[10px] font-bold text-white line-clamp-3 leading-tight">{story.text}</p>
                            </div>
                          )}

                          {/* Dark Gradient Overlay for Readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

                          {/* Top Bar: Date Badge */}
                          <div className="relative z-10 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                              {dateStr}
                            </span>
                            
                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteDoc(doc(db, 'stories', story.id));
                                } catch (err) {
                                  console.error('Error deleting story from archive:', err);
                                }
                              }}
                              className="p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white transition-colors border border-rose-400/30"
                              title="Delete from Archive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom Bar: View Count & Text Snippet */}
                          <div className="relative z-10 space-y-1">
                            {story.text && (story.mediaType === 'image' || story.mediaType === 'video') && (
                              <p className="text-[10px] text-white font-medium truncate leading-tight drop-shadow">{story.text}</p>
                            )}
                            <div className="flex items-center space-x-1 text-[10px] font-bold text-cyan-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full w-fit border border-cyan-500/30">
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span>{story.views?.length || 0} views</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Story Viewer Modal for Selected Archived Story */}
                {activeArchiveStoryIndex !== null && (
                  <StoryViewerModal
                    stories={archivedStories}
                    initialIndex={activeArchiveStoryIndex}
                    isOpen={activeArchiveStoryIndex !== null}
                    onClose={() => setActiveArchiveStoryIndex(null)}
                  />
                )}
              </div>
            )}

            {activeOptionModal === 'activity_log' && (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200">
                  <span>Updated profile photo & cover</span>
                  <span className="text-[10px] text-slate-400">Today</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200">
                  <span>Logged in from Web App</span>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-200">
                  <span>Created real-time post</span>
                  <span className="text-[10px] text-slate-400">Yesterday</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveOptionModal('none')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SHARE A THOUGHT INPUT MODAL */}
      {showThoughtInputModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span>Share a thought...</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowThoughtInputModal(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-purple-200/80">
                This thought will appear as a speech bubble over your profile picture for your friends to see!
              </p>
              <input
                type="text"
                maxLength={60}
                value={thoughtNoteText}
                onChange={(e) => setThoughtNoteText(e.target.value)}
                placeholder="What's on your mind? (e.g., Feeling happy ✨)"
                className="w-full bg-black/50 border border-purple-500/40 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Maximum 60 characters</span>
                <span>{thoughtNoteText.length}/60</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              {thoughtNoteText && (
                <button
                  type="button"
                  onClick={async () => {
                    setThoughtNoteText('');
                    if (user) {
                      await updateProfileData({ thoughtNote: '' });
                    }
                    setShowThoughtInputModal(false);
                  }}
                  className="px-3 py-2.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 transition-all"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (user) {
                    await updateProfileData({ thoughtNote: thoughtNoteText });
                  }
                  setShowThoughtInputModal(false);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all"
              >
                Save Thought
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
      />

      {/* Active User Story Viewer Modal */}
      {isViewingUserStories && userActiveStories.length > 0 && (
        <StoryViewerModal
          stories={userActiveStories}
          initialIndex={0}
          isOpen={isViewingUserStories}
          onClose={() => setIsViewingUserStories(false)}
        />
      )}

    </div>
  );
};

/* ───────────────────────────────────────────────────────────── */
/* REUSABLE POST CARD WITH FULL REACTION SUPPORT */
/* ───────────────────────────────────────────────────────────── */
interface PostCardProps {
  post: Post;
  currentUserId: string;
  onReact: (post: Post, emoji: string) => void;
  commentInput: { [postId: string]: string };
  setCommentInput: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
  onAddComment: (postId: string) => void;
  onOpenPhoto: (url: string) => void;
  onDeletePost?: (postId: string) => void;
}

const REACTION_EMOJIS = [
  { label: 'Like', emoji: '👍', color: 'text-blue-400' },
  { label: 'Love', emoji: '❤️', color: 'text-rose-400' },
  { label: 'Haha', emoji: '😂', color: 'text-amber-400' },
  { label: 'Wow', emoji: '😮', color: 'text-amber-300' },
  { label: 'Sad', emoji: '😢', color: 'text-indigo-400' },
  { label: 'Angry', emoji: '😡', color: 'text-rose-500' },
];

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onReact,
  commentInput,
  setCommentInput,
  onAddComment,
  onOpenPhoto,
  onDeletePost
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPinned, setIsPinned] = useState(!!(post as any).isPinned);
  const [isSaved, setIsSaved] = useState(!!(post as any).isSaved);
  const [notificationsOff, setNotificationsOff] = useState(!!(post as any).notificationsOff);
  const [translationsOff, setTranslationsOff] = useState(!!(post as any).translationsOff);
  const [audience, setAudience] = useState<'public' | 'friends' | 'only_me'>((post as any).audience || 'public');
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const reactions = (post as any).reactions || {};
  
  // Calculate total reactions count
  let totalReactions = 0;
  let userCurrentEmoji = '';
  Object.keys(reactions).forEach((emoji) => {
    if (Array.isArray(reactions[emoji])) {
      totalReactions += reactions[emoji].length;
      if (reactions[emoji].includes(currentUserId)) {
        userCurrentEmoji = emoji;
      }
    }
  });

  // Fallback to post.likes length if no detailed reactions
  if (totalReactions === 0 && post.likes?.length) {
    totalReactions = post.likes.length;
    if (post.likes.includes(currentUserId)) userCurrentEmoji = '❤️';
  }

  const isAuthor = !!(currentUserId && (post.userId === currentUserId || post.authorId === currentUserId));

  const handleTogglePin = async () => {
    if (!isAuthor) return;
    const nextState = !isPinned;
    setIsPinned(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { isPinned: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSave = async () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { isSaved: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetAudienceChoice = async (val: 'public' | 'friends' | 'only_me') => {
    if (!isAuthor) return;
    setAudience(val);
    setShowAudiencePicker(false);
    try {
      await updateDoc(doc(db, 'posts', post.id), { audience: val });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNotifications = async () => {
    if (!isAuthor) return;
    const nextState = !notificationsOff;
    setNotificationsOff(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { notificationsOff: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTranslations = async () => {
    if (!isAuthor) return;
    const nextState = !translationsOff;
    setTranslationsOff(nextState);
    try {
      await updateDoc(doc(db, 'posts', post.id), { translationsOff: nextState });
    } catch (err) {
      console.error(err);
    }
  };

  if (isHidden) {
    return (
      <div className="frosted-card rounded-2xl p-4 border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span>Post hidden from profile view.</span>
        <button onClick={() => setIsHidden(false)} className="text-indigo-400 hover:underline font-bold">
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="frosted-card rounded-none sm:rounded-3xl p-4 sm:p-5 border-x-0 sm:border border-y border-purple-500/20 shadow-xl space-y-4">
      
      {/* Author Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={post.authorPhoto}
            alt={post.authorName}
            className="w-10 h-10 rounded-2xl object-cover ring-2 ring-purple-500/30"
          />
          <div>
            <h4 className="font-bold text-xs text-white flex items-center space-x-1.5">
              <span>{post.authorName}</span>
              {isPinned && <Pin className="w-3 h-3 text-fuchsia-400 fill-current" />}
            </h4>
            <p className="text-[10px] text-purple-300/60 flex items-center space-x-1">
              <span>{post.createdAt ? new Date(post.createdAt?.seconds ? post.createdAt.seconds * 1000 : post.createdAt).toLocaleDateString() : 'Just now'}</span>
              <span>•</span>
              {audience === 'public' && <Globe className="w-2.5 h-2.5 text-cyan-400" />}
              {audience === 'friends' && <UsersIcon className="w-2.5 h-2.5 text-indigo-400" />}
              {audience === 'only_me' && <Lock className="w-2.5 h-2.5 text-amber-400" />}
            </p>
          </div>
        </div>

        {/* 3-Dots Post Options Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Post Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-10 w-64 bg-slate-950/95 border border-purple-500/40 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-2xl space-y-1 animate-fadeIn text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Save post - Available to all users */}
              <button
                type="button"
                onClick={() => {
                  handleToggleSave();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-start space-x-2.5 transition-colors"
              >
                <Bookmark className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">{isSaved ? 'Unsave post' : 'Save post'}</p>
                  <p className="text-[10px] text-slate-400">Add this to your saved items.</p>
                </div>
              </button>

              {isAuthor ? (
                <>
                  {/* Pin post */}
                  <button
                    type="button"
                    onClick={() => {
                      handleTogglePin();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    <Pin className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold">{isPinned ? 'Unpin post' : 'Pin post'}</span>
                  </button>

                  {/* Edit audience */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAudiencePicker(!showAudiencePicker)}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-bold">Edit audience</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-fuchsia-300 bg-fuchsia-900/40 px-2 py-0.5 rounded-md">{audience}</span>
                    </button>

                    {showAudiencePicker && (
                      <div className="my-1 ml-6 p-1.5 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSetAudienceChoice('public')}
                          className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg flex items-center space-x-2 ${audience === 'public' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAudienceChoice('friends')}
                          className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg flex items-center space-x-2 ${audience === 'friends' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <UsersIcon className="w-3 h-3" />
                          <span>Friends</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAudienceChoice('only_me')}
                          className={`w-full text-left px-2.5 py-1 text-[11px] rounded-lg flex items-center space-x-2 ${audience === 'only_me' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Only Me</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Turn off notifications for this post */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotifications();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    {notificationsOff ? <Bell className="w-4 h-4 text-cyan-400" /> : <BellOff className="w-4 h-4 text-fuchsia-400" />}
                    <span className="font-bold">{notificationsOff ? 'Turn on notifications for this post' : 'Turn off notifications for this post'}</span>
                  </button>

                  {/* Turn off translations */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleTranslations();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    <Languages className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">{translationsOff ? 'Turn on translations' : 'Turn off translations'}</span>
                  </button>

                  <div className="border-t border-white/10 my-1" />

                  {/* Hide from profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHidden(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-start space-x-2.5 transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Hide from profile</p>
                      <p className="text-[10px] text-slate-400">This post may still appear in other places.</p>
                    </div>
                  </button>

                  {/* Delete post */}
                  {onDeletePost && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        if (onDeletePost) onDeletePost(post.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 rounded-xl flex items-center space-x-2.5 transition-colors border-t border-white/5 mt-1"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Delete post</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="border-t border-white/10 my-1" />
                  {/* Hide post for me */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHidden(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-600/20 rounded-xl flex items-start space-x-2.5 transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Hide post</p>
                      <p className="text-[10px] text-slate-400">See fewer posts like this.</p>
                    </div>
                  </button>

                  {/* Report post */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      alert('Post reported to system moderators.');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 rounded-xl flex items-center space-x-2.5 transition-colors"
                  >
                    <Flag className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-bold">Report post</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      {post.content && (
        <p className="text-xs text-purple-100 font-medium leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Post Image or Video Media */}
      {post.mediaUrl && (
        <div
          onClick={() => {
            if (!post.mediaUrl?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) && !post.mediaUrl?.startsWith('data:video/')) {
              onOpenPhoto(post.mediaUrl!);
            }
          }}
          className="rounded-2xl overflow-hidden max-h-96 bg-slate-900 border border-purple-900/40 cursor-pointer"
        >
          {post.mediaUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || post.mediaUrl.startsWith('data:video/') || post.mediaUrl.includes('video') ? (
            <video
              src={post.mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-96 object-contain bg-black"
            />
          ) : (
            <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          )}
        </div>
      )}

      {/* Reaction & Comments Counters */}
      <div className="flex items-center justify-between text-xs text-purple-300/70 pt-2 border-t border-purple-900/30">
        <div className="flex items-center space-x-1.5">
          <span className="flex -space-x-1">
            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">❤️</span>
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">👍</span>
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">😂</span>
          </span>
          <span className="font-bold text-white text-[11px]">{totalReactions} Reactions</span>
        </div>

        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="hover:text-white font-semibold"
        >
          {post.comments?.length || 0} Comments
        </button>
      </div>

      {/* REACTION BAR & ACTIONS */}
      <div className="relative flex items-center justify-around pt-1 border-t border-purple-900/20">
        
        {/* Hover / Popup Reaction Picker */}
        {showReactionPicker && (
          <div
            className="absolute bottom-11 left-4 bg-slate-950/95 border border-purple-500/40 rounded-full px-3 py-1.5 flex items-center space-x-2 shadow-2xl z-20 animate-fadeIn"
            onMouseLeave={() => setShowReactionPicker(false)}
          >
            {REACTION_EMOJIS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  onReact(post, r.emoji);
                  setShowReactionPicker(false);
                }}
                className="hover:scale-150 transition-transform text-lg"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reaction Button */}
        <button
          type="button"
          onClick={() => onReact(post, userCurrentEmoji || '❤️')}
          onMouseEnter={() => setShowReactionPicker(true)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            userCurrentEmoji
              ? 'bg-purple-600/30 text-fuchsia-300 border border-purple-500/40'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="text-sm">{userCurrentEmoji || '❤️'}</span>
          <span>{userCurrentEmoji ? 'Reacted' : 'React'}</span>
        </button>

        {/* Comment Toggle Button */}
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 text-purple-300/70 hover:text-white hover:bg-white/5 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Comment</span>
        </button>
      </div>

      {/* COMMENTS EXPANDED SECTION */}
      {showComments && (
        <div className="pt-3 border-t border-purple-900/30 space-y-3 animate-fadeIn">
          {/* Comments List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {post.comments?.length === 0 ? (
              <p className="text-[11px] text-purple-300/50 italic">No comments yet. Be the first to comment!</p>
            ) : (
              post.comments?.map((c) => (
                <div key={c.id} className="flex items-start space-x-2 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                  <img src={c.authorPhoto} alt={c.authorName} className="w-7 h-7 rounded-xl object-cover" />
                  <div>
                    <h6 className="font-bold text-[11px] text-white">{c.authorName}</h6>
                    <p className="text-xs text-purple-200/90">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentInput[post.id] || ''}
              onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onAddComment(post.id)}
              className="flex-1 bg-purple-950/30 border border-purple-800/40 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => onAddComment(post.id)}
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
