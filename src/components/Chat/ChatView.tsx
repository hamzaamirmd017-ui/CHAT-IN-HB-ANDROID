import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Camera,
  Smile, 
  Mic, 
  Phone, 
  Video, 
  ArrowLeft, 
  CheckCheck, 
  Heart, 
  ThumbsUp, 
  Flame, 
  CornerUpLeft,
  X,
  Volume2,
  MoreVertical,
  Trash2,
  BellOff,
  Bell,
  User,
  ShieldAlert,
  Search,
  Sparkles,
  Sliders,
  UploadCloud,
  Check,
  Keyboard,
  Delete,
  Lock,
  Pin,
  Palette,
  Edit2,
  FileText,
  Shield,
  Clock,
  Eye,
  Key,
  Slash,
  Ban,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Minus
} from 'lucide-react';
import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Chat, Message } from '../../types';
import { EmojiPicker } from './EmojiPicker';

interface ChatViewProps {
  chatId: string;
  onBackMobile?: () => void;
  onChatDeleted?: () => void;
}

interface PendingImageUpload {
  file: File;
  previewUrl: string;
  filterName: string;
  caption: string;
  compressedUrl: string;
}

export interface ThemeOption {
  id: string;
  name: string;
  emoji: string;
  bgClass: string;
  headerBg: string;
  ownBubble: string;
  partnerBubble: string;
  accentColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'cosmic-constellation',
    name: 'Cosmic Galaxy',
    emoji: '🌌',
    bgClass: 'bg-[#0b081b]',
    headerBg: 'bg-[#110e28]/95 border-purple-900/40',
    ownBubble: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-[0_4px_20px_rgba(249,115,22,0.3)]',
    partnerBubble: 'bg-[#23203c]/90 text-slate-100 border border-purple-500/20 shadow-md',
    accentColor: 'text-amber-400'
  },
  {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    emoji: '💜',
    bgClass: 'bg-[#0b081b]',
    headerBg: 'bg-[#130b28]/95 border-purple-800/40',
    ownBubble: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-medium shadow-[0_4px_20px_rgba(168,85,247,0.35)]',
    partnerBubble: 'bg-[#1c133a]/90 text-slate-100 border border-purple-500/30 shadow-md',
    accentColor: 'text-purple-400'
  },
  {
    id: 'ocean-cyan',
    name: 'Ocean Cyan',
    emoji: '🌊',
    bgClass: 'bg-[#0b081b]',
    headerBg: 'bg-[#0b1b28]/95 border-cyan-900/40',
    ownBubble: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium shadow-[0_4px_20px_rgba(6,182,212,0.35)]',
    partnerBubble: 'bg-[#102436]/90 text-slate-100 border border-cyan-500/30 shadow-md',
    accentColor: 'text-cyan-400'
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    emoji: '🌲',
    bgClass: 'bg-[#0b081b]',
    headerBg: 'bg-[#0a231b]/95 border-emerald-900/40',
    ownBubble: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-[0_4px_20px_rgba(16,185,129,0.35)]',
    partnerBubble: 'bg-[#122e23]/90 text-slate-100 border border-emerald-500/30 shadow-md',
    accentColor: 'text-emerald-400'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    emoji: '🌅',
    bgClass: 'bg-[#0b081b]',
    headerBg: 'bg-[#23120e]/95 border-orange-900/40',
    ownBubble: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white font-medium shadow-[0_4px_20px_rgba(249,115,22,0.35)]',
    partnerBubble: 'bg-[#2b1713]/90 text-slate-100 border border-orange-500/30 shadow-md',
    accentColor: 'text-orange-400'
  },
  {
    id: 'neon-rose',
    name: 'Neon Rose',
    emoji: '🌹',
    bgClass: 'bg-[#0b081b]',
    headerBg: 'bg-[#230b1b]/95 border-pink-900/40',
    ownBubble: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium shadow-[0_4px_20px_rgba(244,63,94,0.35)]',
    partnerBubble: 'bg-[#2b1022]/90 text-slate-100 border border-pink-500/30 shadow-md',
    accentColor: 'text-pink-400'
  }
];

const STICKERS_LIST = [
  { id: 'star', name: 'Cosmic Star', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTYyeTV4Y3dtZnEzOXdja3A1Y2p0NW5qNHd0MnFzeHVmY3FwdDZ1ZiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26u4b45b8KXYA4aKs/giphy.gif' },
  { id: 'heart', name: 'Glowing Heart', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZsdDVvZmdsb241dm5kMnZzeGZrbWhnaXQ1ODZva3llYzJ4Ym0xbSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/l2QDR0u28k87Nf584/giphy.gif' },
  { id: 'fire', name: 'Fire Flame', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtNXhkbXJkOWEyaDh3aXptY3RjcDVna281eDhhZmxlNWRvNm52dyZlcD12MV_zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  { id: 'cat', name: 'Cute Cat', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjhucDFmbDFhbnRqcnRraDExczkxdjE1eGJ5Y2NrdWhjcnh0cG50YSZlcD12MV_zdGlja2Vyc19zZWFyY2gmY3Q9cw/Lq0h93752f6J9tijrh/giphy.gif' },
  { id: 'thumbsup', name: 'Thumbs Up', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3czM0eXo4cDFwNmJzbjBsdjRsdXdwNWc0ZmlnbHcyOTc1dXFveSZlcD12MV_zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7abKhOpu0NwenH3O/giphy.gif' },
  { id: 'party', name: 'Party Popper', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTA4ZmhrcjBvNHhhOHM4cmhkbXZ3N2M3ZnBycDF0MnlzaXp5enoxYSZlcD12MV_zdGlja2Vyc19zZWFyY2gmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif' },
];

const GIFS_LIST = [
  { id: 'gif1', name: 'Wow Stars', url: 'https://media.giphy.com/media/26xlSWeZ3yv6RjY9q/giphy.gif' },
  { id: 'gif2', name: 'Space Galaxy', url: 'https://media.giphy.com/media/l0HlOBZehRZO0SJDG/giphy.gif' },
  { id: 'gif3', name: 'Love Hug', url: 'https://media.giphy.com/media/xT0Xz0pU3c1sW7nB4s/giphy.gif' },
  { id: 'gif4', name: 'Happy Dance', url: 'https://media.giphy.com/media/13m24iFmhomZi0/giphy.gif' },
];

// Canvas-based image compression & filter utility
const compressImageFile = (file: File, filterName: string = 'none'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        if (filterName === 'vintage') {
          ctx.filter = 'sepia(40%) contrast(110%) brightness(95%)';
        } else if (filterName === 'bw') {
          ctx.filter = 'grayscale(100%) contrast(120%)';
        } else if (filterName === 'vivid') {
          ctx.filter = 'saturate(180%) contrast(115%)';
        } else if (filterName === 'sepia') {
          ctx.filter = 'sepia(90%) hue-rotate(-10deg)';
        } else {
          ctx.filter = 'none';
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ChatView: React.FC<ChatViewProps> = ({ chatId, onBackMobile, onChatDeleted }) => {
  const { user, userProfile } = useAuth();
  const { initiateCall } = useCall();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerTab, setStickerTab] = useState<'stickers' | 'gifs'>('stickers');
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [isCapsOn, setIsCapsOn] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState<'abc' | '123' | 'sym'>('abc');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  // Customization & Theme States
  const [chatTheme, setChatTheme] = useState<string>('cosmic-constellation');
  const [quickEmoji, setQuickEmoji] = useState<string>('💫');
  const [partnerNickname, setPartnerNickname] = useState<string>('');
  const [editPartnerNickname, setEditPartnerNickname] = useState<string>('');
  const [editOwnNickname, setEditOwnNickname] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [readReceiptsOn, setReadReceiptsOn] = useState<boolean>(true);
  const [disappearingMode, setDisappearingMode] = useState<'off' | '24h' | '7d' | '90d'>('off');
  const [activeSubModal, setActiveSubModal] = useState<'theme' | 'emoji' | 'nickname' | 'pinned' | 'media' | 'files' | 'disappearing' | 'encryption' | null>(null);
  const [accordionOpen, setAccordionOpen] = useState({
    info: true,
    customize: true,
    media: false,
    privacy: false
  });

  const toggleSection = (section: keyof typeof accordionOpen) => {
    setAccordionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeTheme = THEME_OPTIONS.find((t) => t.id === chatTheme) || THEME_OPTIONS[0];

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImageUpload | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [chatId]);

  // Load chat document
  useEffect(() => {
    if (!chatId) return;
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setChat({ id: snapshot.id, ...data } as Chat);
        if (data.theme) setChatTheme(data.theme); else setChatTheme('cosmic-constellation');
        if (data.quickEmoji) setQuickEmoji(data.quickEmoji); else setQuickEmoji('💫');
        if (data.isMuted !== undefined) setIsMuted(data.isMuted);
        if (data.readReceiptsOn !== undefined) setReadReceiptsOn(data.readReceiptsOn);
        if (data.disappearingMode) setDisappearingMode(data.disappearingMode);
      }
    }, (err) => {
      console.warn('onSnapshot error in ChatView doc:', err);
    });
    return () => unsubscribe();
  }, [chatId]);

  // Sync nicknames when chat or user updates
  useEffect(() => {
    if (chat && user) {
      const pId = chat.participants?.find((id) => id !== user.uid) || user.uid;
      const pNick = chat.nicknames?.[pId] || '';
      const oNick = chat.nicknames?.[user.uid] || '';
      setPartnerNickname(pNick);
      setEditPartnerNickname(pNick);
      setEditOwnNickname(oNick);
    }
  }, [chat, user]);

  // Load real-time messages subcollection
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((docSnap) => {
        loadedMessages.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(loadedMessages);
    }, (err) => {
      console.warn('onSnapshot error in ChatView messages:', err);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Read Receipts
  useEffect(() => {
    if (!chatId || !user || messages.length === 0) return;
    const unreadMsgs = messages.filter(
      (m) => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid))
    );
    if (unreadMsgs.length > 0) {
      unreadMsgs.forEach(async (m) => {
        try {
          await updateDoc(doc(db, 'chats', chatId, 'messages', m.id), {
            readBy: arrayUnion(user.uid)
          });
        } catch (err) {
          console.error('Error updating read status:', err);
        }
      });
      updateDoc(doc(db, 'chats', chatId), {
        'lastMessage.read': true
      }).catch(() => {});
    }
  }, [messages, chatId, user]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!chat || !user || !userProfile) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-gray-400 text-xs">
        Select a conversation to start chatting.
      </div>
    );
  }

  const partnerId = chat.participants.find((id) => id !== user.uid) || user.uid;
  const partnerData = chat.participantData?.[partnerId] || {
    displayName: 'Chat Contact',
    photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`
  };

  const isPartnerTyping = !!chat.typing?.[partnerId];

  const handleSelectTheme = async (themeId: string) => {
    setChatTheme(themeId);
    setActiveSubModal(null);
    if (!chatId || !user) return;

    const selected = THEME_OPTIONS.find((t) => t.id === themeId);
    const nameLabel = selected ? `${selected.name} ${selected.emoji}` : themeId;

    try {
      await updateDoc(doc(db, 'chats', chatId), { theme: themeId });
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        chatId,
        senderId: user.uid,
        text: `🎨 Changed the chat theme to ${nameLabel}`,
        isSystem: true,
        timestamp: serverTimestamp(),
        readBy: [user.uid]
      });
    } catch (err) {
      console.error('Failed to change theme:', err);
    }
  };

  const handleSelectQuickEmoji = async (emoji: string) => {
    setQuickEmoji(emoji);
    setActiveSubModal(null);
    if (!chatId || !user) return;

    try {
      await updateDoc(doc(db, 'chats', chatId), { quickEmoji: emoji });
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        chatId,
        senderId: user.uid,
        text: `👍 Set quick reaction emoji to ${emoji}`,
        isSystem: true,
        timestamp: serverTimestamp(),
        readBy: [user.uid]
      });
    } catch (err) {
      console.error('Failed to change quick emoji:', err);
    }
  };

  const handleSaveNicknames = async () => {
    setActiveSubModal(null);
    if (!chatId || !partnerId || !user) return;

    const newPartnerNick = editPartnerNickname.trim();
    const newOwnNick = editOwnNickname.trim();

    const currentPartnerNick = chat?.nicknames?.[partnerId] || '';
    const currentOwnNick = chat?.nicknames?.[user.uid] || '';

    const updates: Record<string, any> = {};
    const systemTexts: string[] = [];

    if (newPartnerNick !== currentPartnerNick) {
      updates[`nicknames.${partnerId}`] = newPartnerNick;
      setPartnerNickname(newPartnerNick);
      if (newPartnerNick) {
        systemTexts.push(`✏️ Set nickname for ${partnerData.displayName} to "${newPartnerNick}"`);
      } else {
        systemTexts.push(`✏️ Cleared nickname for ${partnerData.displayName}`);
      }
    }

    if (newOwnNick !== currentOwnNick) {
      updates[`nicknames.${user.uid}`] = newOwnNick;
      if (newOwnNick) {
        systemTexts.push(`✏️ Set own nickname to "${newOwnNick}"`);
      } else {
        systemTexts.push(`✏️ Cleared own nickname`);
      }
    }

    if (Object.keys(updates).length > 0) {
      try {
        await updateDoc(doc(db, 'chats', chatId), updates);
        if (systemTexts.length > 0) {
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          await addDoc(messagesRef, {
            chatId,
            senderId: user.uid,
            text: systemTexts.join(' • '),
            isSystem: true,
            timestamp: serverTimestamp(),
            readBy: [user.uid]
          });
        }
      } catch (err) {
        console.error('Failed to save nicknames:', err);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (chatId && user) {
      updateDoc(doc(db, 'chats', chatId), {
        [`typing.${user.uid}`]: true
      }).catch(() => {});

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        updateDoc(doc(db, 'chats', chatId), {
          [`typing.${user.uid}`]: false
        }).catch(() => {});
      }, 2500);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !imageUrl.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, 'chats', chatId), {
      [`typing.${user.uid}`]: false
    }).catch(() => {});

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messageData: Record<string, any> = {
      chatId,
      senderId: user.uid,
      text: inputText.trim(),
      timestamp: new Date(),
      readBy: [user.uid]
    };

    if (imageUrl.trim()) {
      messageData.imageUrl = imageUrl.trim();
    }

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        senderId: replyingTo.senderId,
        text: replyingTo.text || 'Image attachment'
      };
    }

    const sentText = inputText.trim() || 'Sent an image';
    setInputText('');
    setImageUrl('');
    setShowImageInput(false);
    setReplyingTo(null);

    await addDoc(messagesRef, messageData);

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: sentText,
        senderId: user.uid,
        timestamp: new Date(),
        read: false
      },
      updatedAt: serverTimestamp()
    });
  };

  // Quick Emoji Button Action
  const handleSendQuickEmoji = async () => {
    if (!chatId || !user) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      chatId,
      senderId: user.uid,
      text: quickEmoji,
      timestamp: new Date(),
      readBy: [user.uid]
    });

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: quickEmoji,
        senderId: user.uid,
        timestamp: new Date(),
        read: false
      },
      updatedAt: serverTimestamp()
    });
  };

  // Send Sticker / GIF Action
  const handleSendStickerOrGif = async (url: string, name: string) => {
    if (!chatId || !user) return;
    setShowStickerPicker(false);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      chatId,
      senderId: user.uid,
      text: `Sticker: ${name}`,
      imageUrl: url,
      timestamp: new Date(),
      readBy: [user.uid]
    });

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: `✨ Sent a sticker`,
        senderId: user.uid,
        timestamp: new Date(),
        read: false
      },
      updatedAt: serverTimestamp()
    });
  };

  const handleToggleReaction = async (msg: Message, emoji: string) => {
    const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
    const currentReactions = msg.reactions || {};
    const usersForEmoji = currentReactions[emoji] || [];
    
    let updatedUsers = [...usersForEmoji];
    if (updatedUsers.includes(user.uid)) {
      updatedUsers = updatedUsers.filter((u) => u !== user.uid);
    } else {
      updatedUsers.push(user.uid);
    }

    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: updatedUsers
    });
  };

  const handleSelectImageFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large (max 10MB).');
      return;
    }
    try {
      const compressedUrl = await compressImageFile(file, 'none');
      setPendingImage({
        file,
        previewUrl: compressedUrl,
        filterName: 'none',
        caption: '',
        compressedUrl
      });
    } catch (err) {
      console.error('Error processing image:', err);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectImageFile(file);
    }
  };

  const handleApplyFilter = async (filterName: string) => {
    if (!pendingImage) return;
    try {
      const compressedUrl = await compressImageFile(pendingImage.file, filterName);
      setPendingImage((prev) => prev ? { ...prev, filterName, compressedUrl } : null);
    } catch (err) {
      console.error('Error applying filter:', err);
    }
  };

  const handleSendPendingImage = async () => {
    if (!pendingImage) return;
    const imageToSend = pendingImage.compressedUrl;
    const captionText = pendingImage.caption.trim();

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messageData: Record<string, any> = {
      chatId,
      senderId: user.uid,
      text: captionText,
      imageUrl: imageToSend,
      timestamp: new Date(),
      readBy: [user.uid]
    };

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        senderId: replyingTo.senderId,
        text: replyingTo.text || 'Image attachment'
      };
    }

    setPendingImage(null);
    setShowImageInput(false);
    setReplyingTo(null);

    await addDoc(messagesRef, messageData);

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: captionText || '📷 Sent an image',
        senderId: user.uid,
        timestamp: new Date(),
        read: false
      },
      updatedAt: serverTimestamp()
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await handleSelectImageFile(file);
      }
    }
  };

  const startVoiceNoteRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
              chatId,
              senderId: user.uid,
              text: '🎵 Voice Message',
              audioUrl: base64Audio,
              timestamp: new Date(),
              readBy: [user.uid]
            });

            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
              lastMessage: {
                text: '🎵 Voice Message',
                senderId: user.uid,
                timestamp: new Date(),
                read: false
              },
              updatedAt: serverTimestamp()
            });
          };
          reader.readAsDataURL(audioBlob);

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecordingVoice(true);
      } else {
        handleSendVoiceNoteFallback();
      }
    } catch (err) {
      console.warn('Microphone access unavailable, using simulated voice note:', err);
      handleSendVoiceNoteFallback();
    }
  };

  const stopVoiceNoteRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  const handleSendVoiceNoteFallback = async () => {
    setIsRecordingVoice(true);
    setTimeout(async () => {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        chatId,
        senderId: user.uid,
        text: '🎵 Voice Note (0:05)',
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
        timestamp: new Date(),
        readBy: [user.uid]
      });

      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: '🎵 Voice note',
          senderId: user.uid,
          timestamp: new Date(),
          read: false
        },
        updatedAt: serverTimestamp()
      });

      setIsRecordingVoice(false);
    }, 1500);
  };

  const handleDeleteConversation = async () => {
    try {
      setIsMoreMenuOpen(false);
      await deleteDoc(doc(db, 'chats', chatId));
      if (onChatDeleted) onChatDeleted();
      if (onBackMobile) onBackMobile();
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div 
      className={`flex flex-col h-full ${activeTheme.bgClass} transition-colors overflow-hidden relative select-none`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Space Constellation Starfield Wallpaper (Exact Match Image 1) */}
      <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden z-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="nebulaGlow1" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#2e1065" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f0c24" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="planetGlow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#nebulaGlow1)" />
          
          <g stroke="rgba(192, 132, 252, 0.25)" strokeWidth="1" strokeDasharray="2,2">
            <line x1="15%" y1="20%" x2="35%" y2="28%" />
            <line x1="35%" y1="28%" x2="55%" y2="18%" />
            <line x1="55%" y1="18%" x2="75%" y2="35%" />
            <line x1="75%" y1="35%" x2="85%" y2="55%" />
            <line x1="20%" y1="65%" x2="45%" y2="70%" />
            <line x1="45%" y1="70%" x2="70%" y2="60%" />
            <line x1="70%" y1="60%" x2="80%" y2="80%" />
          </g>

          <circle cx="15%" cy="20%" r="3" fill="#fbbf24" className="animate-pulse" />
          <circle cx="35%" cy="28%" r="4" fill="#a855f7" />
          <circle cx="55%" cy="18%" r="2.5" fill="#38bdf8" />
          <circle cx="75%" cy="35%" r="5" fill="#f97316" className="animate-pulse" />
          <circle cx="85%" cy="55%" r="3" fill="#ec4899" />
          <circle cx="20%" cy="65%" r="3.5" fill="#facc15" />
          <circle cx="45%" cy="70%" r="4.5" fill="#e879f9" className="animate-pulse" />
          <circle cx="70%" cy="60%" r="3" fill="#38bdf8" />
          <circle cx="80%" cy="80%" r="4" fill="#fbbf24" />

          <circle cx="50%" cy="45%" r="140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <circle cx="50%" cy="45%" r="22" fill="url(#planetGlow1)" />
          <circle cx="50%" cy="45%" r="12" fill="#1e1b4b" stroke="#f97316" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Drag & Drop File Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-purple-950/90 backdrop-blur-md border-4 border-dashed border-amber-400 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <UploadCloud className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h3 className="font-extrabold text-xl text-white">Drop Photo Here</h3>
          <p className="text-xs text-amber-200 mt-1">Release to compress and preview image before sending</p>
        </div>
      )}

      {/* Header Bar (Exact Match Image 1) */}
      <div className={`flex-shrink-0 sticky top-0 z-30 px-4 sm:px-6 py-3 ${activeTheme.headerBg} backdrop-blur-2xl border-b border-purple-900/30 flex flex-col shadow-xl transition-colors`}>
        <div className="flex items-center justify-between">
          
          {/* Left: Partner info with Dropdown Chevron */}
          <div className="flex items-center space-x-3">
            {onBackMobile && (
              <button
                onClick={onBackMobile}
                className="md:hidden p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div 
              onClick={() => setIsMoreMenuOpen(true)}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-800 ring-2 ring-purple-500/40 shadow-md cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            >
              <img src={partnerData.photoURL} alt={partnerData.displayName} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#110e28]" />
            </div>

            <div 
              onClick={() => setIsMoreMenuOpen(true)}
              className="cursor-pointer group select-none"
            >
              <h3 className="font-extrabold text-sm text-white leading-tight tracking-wide flex items-center space-x-1.5 group-hover:text-amber-300 transition-colors">
                <span>{partnerNickname || partnerData.displayName}</span>
                <ChevronDown className="w-4 h-4 text-purple-300 group-hover:text-amber-300 transition-colors" />
              </h3>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online</span>
              </span>
            </div>
          </div>

          {/* Right: Search, Audio Call (pink), Video Call (pink), Minimize (-), Close (X) */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            
            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery('');
              }}
              className={`p-2 rounded-full transition-all ${
                isSearchOpen || searchQuery
                  ? 'bg-purple-600/30 text-amber-300'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
              title="Search Messages"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Audio Call Button (Pink/Magenta Icon) */}
            <button
              type="button"
              onClick={() => initiateCall(partnerId, partnerData.displayName, partnerData.photoURL, 'audio')}
              className="p-2 rounded-full text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition-colors"
              title="Start Audio Call"
            >
              <Phone className="w-5 h-5" />
            </button>

            {/* Video Call Button (Pink/Magenta Icon) */}
            <button
              type="button"
              onClick={() => initiateCall(partnerId, partnerData.displayName, partnerData.photoURL, 'video')}
              className="p-2 rounded-full text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition-colors"
              title="Start Video Call"
            >
              <Video className="w-5 h-5" />
            </button>

            {/* Minimize Button (-) */}
            <button
              type="button"
              onClick={onBackMobile || (() => setIsMoreMenuOpen(true))}
              className="p-2 rounded-full text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition-colors"
              title="Minimize Chat"
            >
              <Minus className="w-5 h-5" />
            </button>

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={onBackMobile || (() => setIsMoreMenuOpen(true))}
              className="p-2 rounded-full text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition-colors"
              title="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* Inline Message Search Bar */}
        {isSearchOpen && (
          <div className="flex items-center space-x-2 bg-[#1d1838] border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white mt-2.5 animate-fadeIn">
            <Search className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              placeholder="Search chat messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-purple-300/40 focus:outline-none flex-1"
              autoFocus
            />
            {searchQuery && (
              <span className="text-[10px] text-amber-300 font-mono">
                {filteredMessages.length} match{filteredMessages.length !== 1 ? 'es' : ''}
              </span>
            )}
            <button 
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} 
              className="text-purple-300 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CHAT INFO & CUSTOMIZATION SIDEBAR */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveSubModal(null);
            }}
          />

          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-[#0e0b21] border-l border-purple-900/40 shadow-2xl z-10 overflow-y-auto flex flex-col text-slate-200 animate-slideInRight"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center space-x-1.5 py-2.5 bg-[#14102c] border-b border-purple-900/30 text-[11px] font-semibold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>End-to-end encrypted</span>
              <button 
                onClick={() => setIsMoreMenuOpen(false)}
                className="absolute right-3 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center border-b border-purple-900/30 space-y-3">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-800 ring-2 ring-purple-500/40 shadow-2xl">
                <img src={partnerData.photoURL} alt={partnerData.displayName} className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-950" />
              </div>

              <div className="text-center">
                <h2 className="font-extrabold text-base text-white">
                  {partnerNickname || partnerData.displayName}
                </h2>
                {partnerNickname && (
                  <p className="text-xs text-purple-300">({partnerData.displayName})</p>
                )}
                <span className="text-[11px] text-emerald-400 font-medium">● Online</span>
              </div>

              <div className="flex items-center justify-center gap-8 pt-2 w-full">
                <button
                  type="button"
                  onClick={() => setActiveSubModal('nickname')}
                  className="flex flex-col items-center space-y-1.5 group"
                >
                  <div className="w-11 h-11 rounded-full bg-slate-800/80 hover:bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-200 group-hover:text-white transition-all shadow-md">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 group-hover:text-white">Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center space-y-1.5 group"
                >
                  <div className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-md ${
                    isMuted ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-slate-800/80 hover:bg-purple-900/60 border-purple-500/30 text-purple-200 group-hover:text-white'
                  }`}>
                    {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 group-hover:text-white">
                    {isMuted ? 'Unmute' : 'Mute'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="flex flex-col items-center space-y-1.5 group"
                >
                  <div className="w-11 h-11 rounded-full bg-slate-800/80 hover:bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-200 group-hover:text-white transition-all shadow-md">
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 group-hover:text-white">Search</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="rounded-2xl bg-slate-900/60 border border-purple-900/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('customize')}
                  className="w-full px-4 py-3 font-bold text-xs text-white flex items-center justify-between hover:bg-purple-950/40 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Chat Customization</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accordionOpen.customize ? 'rotate-180' : ''}`} />
                </button>

                {accordionOpen.customize && (
                  <div className="p-2 space-y-1 border-t border-purple-900/30 bg-black/20">
                    <button
                      type="button"
                      onClick={() => setActiveSubModal('theme')}
                      className="w-full px-3 py-2.5 rounded-xl text-xs hover:bg-purple-900/30 flex items-center justify-between transition-colors"
                    >
                      <span className="text-slate-300">Theme</span>
                      <span className="text-amber-300 font-semibold text-[11px] flex items-center space-x-1">
                        <span>{activeTheme.name}</span>
                        <span>{activeTheme.emoji}</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSubModal('emoji')}
                      className="w-full px-3 py-2.5 rounded-xl text-xs hover:bg-purple-900/30 flex items-center justify-between transition-colors"
                    >
                      <span className="text-slate-300">Quick Emoji</span>
                      <span className="text-base">{quickEmoji}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSubModal('nickname')}
                      className="w-full px-3 py-2.5 rounded-xl text-xs hover:bg-purple-900/30 flex items-center justify-between transition-colors"
                    >
                      <span className="text-slate-300">Nicknames</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
                        {partnerNickname || 'Set Nickname'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  className="w-full py-2.5 px-4 bg-rose-950/40 hover:bg-rose-600/30 border border-rose-800/40 rounded-2xl text-xs font-bold text-rose-300 flex items-center justify-center space-x-2 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Conversation</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL OVERLAYS */}
      {activeSubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setActiveSubModal(null)} />

          <div className="relative z-10 bg-[#120e29] border border-amber-500/40 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white" onClick={(e) => e.stopPropagation()}>
            
            {activeSubModal === 'theme' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <h3 className="font-extrabold text-sm flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Change Chat Theme</span>
                  </h3>
                  <button onClick={() => setActiveSubModal(null)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto p-1">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTheme(t.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        chatTheme === t.id
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-500/50'
                          : 'bg-slate-900/80 border-purple-900/40 hover:bg-purple-950/40'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{t.emoji}</span>
                        <span className="text-xs font-bold text-white">{t.name}</span>
                      </div>
                      {chatTheme === t.id && <Check className="w-4 h-4 text-amber-400 font-bold" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSubModal === 'emoji' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <h3 className="font-extrabold text-sm flex items-center space-x-2">
                    <ThumbsUp className="w-4 h-4 text-amber-400" />
                    <span>Change Quick Emoji</span>
                  </h3>
                  <button onClick={() => setActiveSubModal(null)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 p-1">
                  {['💫', '👍', '❤️', '🔥', '😂', '🎉', '⚡', '💙', '💯', '🌸', '✨', '😍', '🙌', '👏', '🥳', '💩'].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => handleSelectQuickEmoji(e)}
                      className={`h-12 text-2xl rounded-2xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                        quickEmoji === e
                          ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-500'
                          : 'bg-slate-900 border-purple-900/40 hover:bg-slate-800'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSubModal === 'nickname' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <h3 className="font-extrabold text-sm flex items-center space-x-2">
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                    <span>Edit Nicknames</span>
                  </h3>
                  <button onClick={() => setActiveSubModal(null)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-purple-900/30">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                      <span>{partnerData.displayName}'s Nickname:</span>
                      {editPartnerNickname && (
                        <button 
                          type="button" 
                          onClick={() => setEditPartnerNickname('')}
                          className="text-[10px] text-rose-400 hover:underline font-normal"
                        >
                          Reset
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editPartnerNickname}
                      onChange={(e) => setEditPartnerNickname(e.target.value)}
                      placeholder={partnerData.displayName}
                      className="w-full bg-slate-950 border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-purple-900/30">
                    <label className="text-[11px] font-bold text-purple-200 flex items-center justify-between">
                      <span>Your Nickname ({userProfile?.displayName || 'You'}):</span>
                      {editOwnNickname && (
                        <button 
                          type="button" 
                          onClick={() => setEditOwnNickname('')}
                          className="text-[10px] text-rose-400 hover:underline font-normal"
                        >
                          Reset
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editOwnNickname}
                      onChange={(e) => setEditOwnNickname(e.target.value)}
                      placeholder={userProfile?.displayName || 'Your Name'}
                      className="w-full bg-slate-950 border border-purple-800/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubModal(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNicknames}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all active:scale-95"
                  >
                    Save Nicknames
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Messages Stream Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 space-y-3.5 z-10">
        {filteredMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2 select-none animate-fadeIn">
                <div className="px-3.5 py-1.5 bg-[#1b173a]/90 border border-purple-500/25 rounded-full text-[11px] font-medium text-slate-300 shadow-md backdrop-blur-md flex items-center space-x-1.5">
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          const isOwn = msg.senderId === user.uid;
          const isReadByRecipient = msg.readBy && (msg.readBy.length > 1 || msg.readBy.includes(partnerId));

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative items-end`}
            >
              {/* Partner Avatar on left of received message */}
              {!isOwn && (
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-800 shrink-0 mr-2 mb-0.5 border border-purple-500/30 shadow-sm">
                  <img src={partnerData.photoURL} alt={partnerData.displayName} className="w-full h-full object-cover" />
                </div>
              )}

              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[78%] sm:max-w-md`}>
                
                {/* Reply Preview inside bubble */}
                {msg.replyTo && (
                  <div className={`text-[10px] p-2 rounded-xl mb-1 max-w-xs border border-white/10 backdrop-blur-md ${
                    isOwn ? 'bg-amber-900/60 text-amber-100' : 'bg-white/10 text-slate-200'
                  }`}>
                    <span className="font-semibold block text-amber-300">Replying to:</span>
                    <p className="truncate">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Message Bubble + Action Buttons Container */}
                <div className="relative flex items-center group/bubble">
                  
                  {/* Hover Action Group */}
                  <div className={`opacity-0 group-hover/bubble:opacity-100 group-hover:opacity-100 transition-all flex items-center space-x-1 bg-[#16132b]/95 backdrop-blur-xl border border-purple-500/30 rounded-full px-2 py-1 shadow-xl absolute z-20 ${
                    isOwn ? '-left-24' : '-right-24'
                  }`}>
                    <button 
                      onClick={() => handleToggleReaction(msg, '😊')} 
                      className="hover:scale-125 transition-transform p-0.5 text-slate-300 hover:text-amber-300"
                      title="React"
                    >
                      <Smile className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    <button 
                      onClick={() => setReplyingTo(msg)} 
                      className="hover:scale-125 transition-transform p-0.5 text-slate-300 hover:text-indigo-400" 
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleToggleReaction(msg, '💫')} 
                      className="hover:scale-125 transition-transform p-0.5 text-slate-300 hover:text-amber-300"
                      title="Star"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  </div>

                  {/* Bubble Box */}
                  <div className={`relative rounded-2xl px-4 py-2.5 text-xs sm:text-sm transition-all duration-200 backdrop-blur-md ${
                    isOwn
                      ? `${activeTheme.ownBubble} rounded-br-xs`
                      : `${activeTheme.partnerBubble} rounded-bl-xs`
                  }`}>
                    
                    {/* Image attachment */}
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black/40 border border-white/10">
                        <img src={msg.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Audio voice note */}
                    {msg.audioUrl && (
                      <div className="flex items-center space-x-2 py-1">
                        <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                        <audio controls src={msg.audioUrl} className="h-8 w-48 opacity-90" />
                      </div>
                    )}

                    {/* Message Text */}
                    {msg.text && (
                      <p className="leading-relaxed whitespace-pre-wrap font-sans">
                        {searchQuery.trim() ? (
                          msg.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, idx) =>
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={idx} className="bg-amber-400 text-slate-950 rounded px-0.5 font-bold">
                                {part}
                              </mark>
                            ) : (
                              part
                            )
                          )
                        ) : (
                          msg.text
                        )}
                      </p>
                    )}

                  </div>

                </div>

                {/* Attached Reaction Badge */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(msg.reactions).map(([emoji, uids]) => {
                      const userList = (uids || []) as string[];
                      if (userList.length === 0) return null;
                      const userReacted = userList.includes(user.uid);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg, emoji)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 border transition-all hover:scale-105 shadow-md ${
                            userReacted
                              ? 'bg-amber-500/30 border-amber-400/60 text-amber-200 shadow-amber-500/20'
                              : 'bg-[#18152e] border-purple-900/40 text-slate-300 hover:bg-[#201c3d]'
                          }`}
                        >
                          <span>{emoji}</span>
                          {userList.length > 1 && <span>{userList.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Footer details */}
                <div className={`flex items-center space-x-1 mt-0.5 text-[10px] ${
                  isOwn ? 'text-amber-200/80 justify-end' : 'text-slate-400 justify-start'
                }`}>
                  <span>
                    {msg.timestamp?.toDate
                      ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </span>
                  {isOwn && (
                    <span title={isReadByRecipient ? "Read by recipient" : "Sent"}>
                      {isReadByRecipient ? (
                        <div className="w-3 h-3 rounded-full overflow-hidden inline-block ring-1 ring-amber-400 ml-0.5">
                          <img src={partnerData.photoURL} alt="Seen" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-amber-300 font-bold" />
                      )}
                    </span>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 relative p-2.5 sm:p-3.5 bg-[#110e28]/95 backdrop-blur-2xl border-t border-purple-900/30 transition-colors z-20">
        
        {/* Typing Indicator */}
        {isPartnerTyping && (
          <div className="flex items-center space-x-2 px-3 py-1 mb-2 bg-[#1d193b] rounded-full border border-purple-500/30 text-xs text-amber-300 animate-fadeIn w-fit shadow-lg">
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
            </div>
            <span className="font-semibold text-[11px]">{partnerData.displayName} is typing...</span>
          </div>
        )}

        {/* Reply Indicator banner */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-[#1d193b] backdrop-blur-md p-2 rounded-xl mb-2 text-xs border border-amber-500/30 text-amber-200">
            <div className="flex items-center space-x-2">
              <CornerUpLeft className="w-4 h-4 text-amber-400" />
              <span>Replying to: <strong>{replyingTo.text || 'Attachment'}</strong></span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-amber-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />

        {/* Image URL or preview input drawer */}
        {showImageInput && (
          <div className="flex items-center space-x-2 mb-3 p-2 bg-[#1b1738] border border-purple-800/40 rounded-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Choose Photo</span>
            </button>
            <span className="text-purple-400 text-xs">or</span>
            <input
              type="url"
              placeholder="Paste Image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder-purple-300/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowImageInput(false)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 px-2"
            >
              Done
            </button>
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelectEmoji={(emoji) => {
              setInputText((prev) => prev + emoji);
              setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {/* Sticker / GIF Drawer Popup */}
        {showStickerPicker && (
          <div className="absolute bottom-16 left-3 sm:left-6 z-50 bg-[#16132b] border border-amber-500/40 rounded-3xl p-3.5 shadow-2xl w-80 max-h-72 overflow-y-auto backdrop-blur-2xl animate-fadeIn space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStickerTab('stickers')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    stickerTab === 'stickers' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  Stickers 💫
                </button>
                <button
                  type="button"
                  onClick={() => setStickerTab('gifs')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    stickerTab === 'gifs' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  GIFs 🎬
                </button>
              </div>
              <button onClick={() => setShowStickerPicker(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {stickerTab === 'stickers' ? (
              <div className="grid grid-cols-3 gap-2.5">
                {STICKERS_LIST.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSendStickerOrGif(st.url, st.name)}
                    className="p-2 bg-[#201c3d] hover:bg-amber-500/20 border border-purple-900/40 hover:border-amber-400/60 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all hover:scale-105 active:scale-95"
                  >
                    <img src={st.url} alt={st.name} className="w-12 h-12 object-contain" />
                    <span className="text-[10px] text-amber-200 font-medium truncate w-full text-center">{st.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {GIFS_LIST.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleSendStickerOrGif(gif.url, gif.name)}
                    className="relative h-24 rounded-2xl overflow-hidden border border-purple-900/40 hover:border-amber-400/60 transition-all hover:scale-105 active:scale-95"
                  >
                    <img src={gif.url} alt={gif.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black/60 backdrop-blur-xs rounded-lg text-[9px] text-white font-bold text-center truncate">
                      {gif.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          
          {/* Microphone */}
          <button
            type="button"
            onClick={isRecordingVoice ? stopVoiceNoteRecording : startVoiceNoteRecording}
            className={`p-1.5 sm:p-2 rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors ${
              isRecordingVoice ? 'bg-rose-600/80 text-white animate-pulse' : ''
            }`}
            title={isRecordingVoice ? 'Stop Recording' : 'Voice Message'}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Gallery Image */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 sm:p-2 rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
            title="Upload Photo"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Stickers */}
          <button
            type="button"
            onClick={() => {
              setShowStickerPicker(!showStickerPicker);
              if (showEmojiPicker) setShowEmojiPicker(false);
            }}
            className={`p-1.5 sm:p-2 rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors ${
              showStickerPicker ? 'bg-amber-500/20 ring-1 ring-amber-400' : ''
            }`}
            title="Stickers"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* GIF Button */}
          <button
            type="button"
            onClick={() => {
              setStickerTab('gifs');
              setShowStickerPicker(true);
            }}
            className="px-2 py-0.5 text-[11px] font-black bg-amber-500/20 text-amber-400 border border-amber-400/40 rounded-md hover:bg-amber-500/30 transition-all cursor-pointer select-none"
            title="GIFs"
          >
            GIF
          </button>

          {/* Center: "Aa" Input Capsule */}
          <div className="flex-1 relative bg-[#201d3a]/90 border border-purple-900/40 rounded-full px-3.5 py-1.5 flex items-center shadow-inner">
            <input
              ref={textInputRef}
              type="text"
              autoFocus
              placeholder="Aa"
              value={inputText}
              onChange={handleInputChange}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-purple-300/40 focus:outline-none pr-7"
            />
            {/* Inside Capsule Right Smiley Icon */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                if (showStickerPicker) setShowStickerPicker(false);
              }}
              className="absolute right-2.5 p-1 text-amber-400 hover:text-amber-300 transition-colors"
              title="Emoji Picker"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Far Right Control */}
          {inputText.trim() || imageUrl.trim() ? (
            <button
              type="submit"
              className="p-2 sm:p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-full shadow-lg shadow-orange-500/30 transition-transform active:scale-95 flex items-center justify-center shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendQuickEmoji}
              className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center text-lg hover:bg-amber-500/30 transition-transform active:scale-110 shadow-md shrink-0 select-none"
              title={`Send Quick Reaction (${quickEmoji})`}
            >
              {quickEmoji}
            </button>
          )}

        </form>
      </div>

      {/* Image Preview & Filter Modal */}
      {pendingImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#120e29] border border-amber-500/40 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Image Preview & Filter</span>
              </h3>
              <button 
                onClick={() => setPendingImage(null)}
                className="text-purple-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden max-h-72 bg-black border border-purple-900/40 flex items-center justify-center">
              <img 
                src={pendingImage.compressedUrl} 
                alt="Preview" 
                className="max-h-72 w-auto object-contain" 
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 border border-amber-500/30 text-[10px] text-amber-200 font-mono">
                Compressed ✨
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Photo Filter</span>
              </label>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { id: 'none', label: 'Normal' },
                  { id: 'vintage', label: 'Vintage' },
                  { id: 'bw', label: 'B & W' },
                  { id: 'vivid', label: 'Vivid' },
                  { id: 'sepia', label: 'Sepia' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleApplyFilter(f.id)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                      pendingImage.filterName === f.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'bg-purple-950/40 text-purple-300 border-purple-900/40 hover:bg-purple-900/40'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Add a caption..."
              value={pendingImage.caption}
              onChange={(e) => setPendingImage({ ...pendingImage, caption: e.target.value })}
              className="w-full bg-purple-950/40 border border-purple-800/40 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-purple-900/40">
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-900/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPendingImage}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Photo</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
