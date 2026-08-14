export type UserPresenceStatus = 'online' | 'away' | 'offline';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  coverPhotoURL?: string;
  bio?: string;
  status?: string;
  presence?: UserPresenceStatus;
  isOnline: boolean;
  lastSeen?: any;
  createdAt?: any;
  phoneNumber?: string;
  username?: string;
  friends?: string[]; // uids
  friendRequestsReceived?: string[]; // uids
  friendRequestsSent?: string[]; // uids
  blockedUsers?: string[]; // uids
  isAdmin?: boolean;
  isBanned?: boolean;
  twoFactorEnabled?: boolean;
  privacySettings?: {
    showLastSeen?: boolean;
    showPhone?: boolean;
    allowDirectMsg?: boolean;
  };
  workplace?: string;
  education?: string;
  currentCity?: string;
  hometown?: string;
  relationshipStatus?: string;
  gender?: string;
  birthDate?: string;
  website?: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // array of uids
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioUrl?: string;
  timestamp: any;
  readBy?: string[];
  replyTo?: {
    id: string;
    senderId: string;
    text: string;
  };
  reactions?: { [emoji: string]: string[] }; // emoji -> array of uids
  isEdited?: boolean;
  isDeleted?: boolean;
  forwardedFrom?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  participantData?: {
    [uid: string]: {
      displayName: string;
      photoURL: string;
      email?: string;
    };
  };
  isGroup?: boolean;
  groupName?: string;
  groupPhoto?: string;
  groupAdmin?: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    read: boolean;
  };
  typing?: {
    [uid: string]: boolean;
  };
  updatedAt: any;
  createdAt?: any;
}

export interface StoryReaction {
  userId: string;
  userName: string;
  userPhoto?: string;
  emoji: string;
  createdAt?: any;
}

export interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  text?: string;
  bgColor?: string;
  audioUrl?: string;
  audioTitle?: string;
  audioArtist?: string;
  createdAt: any;
  expiresAt: any;
  archived?: boolean;
  views?: string[];
  viewersData?: { [uid: string]: { displayName: string; photoURL: string; viewedAt?: any } };
  reactions?: StoryReaction[];
  likes?: string[];
  replies?: {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: any;
  }[];
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes?: string[];
  comments?: {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto: string;
    text: string;
    createdAt: any;
  }[];
  createdAt: any;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhotoURL: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'offering' | 'connected' | 'ended' | 'declined';
  offer?: any;
  answer?: any;
  createdAt: any;
}

export interface CallLog {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined';
  duration?: number;
  createdAt: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'friend_request' | 'chat_message' | 'call' | 'story_like' | 'post_like';
  read: boolean;
  fromUser?: {
    uid: string;
    displayName: string;
    photoURL: string;
  };
  createdAt: any;
  chatId?: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: any;
}

export interface GroupItem {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  category: string;
  members: string[]; // uids
  adminId: string;
  isPrivate?: boolean;
  createdAt: any;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  location: string;
  date: string;
  time: string;
  organizerId: string;
  organizerName: string;
  going: string[]; // uids
  interested: string[]; // uids
  createdAt: any;
}

export interface SavedPostItem {
  id: string;
  userId: string;
  postId: string;
  post: Post;
  savedAt: any;
}

export type ActiveTab = 
  | 'home' 
  | 'chats' 
  | 'friends' 
  | 'notifications' 
  | 'stories' 
  | 'saved'
  | 'groups'
  | 'events'
  | 'search' 
  | 'calls' 
  | 'profile' 
  | 'settings' 
  | 'admin';
