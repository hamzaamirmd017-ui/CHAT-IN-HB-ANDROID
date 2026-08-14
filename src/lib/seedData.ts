import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export const DEMO_USERS = [
  {
    uid: 'demo_user_sophia',
    displayName: 'Sophia Chen',
    email: 'sophia.chen@connectchat.io',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'Product Designer & Visual Artist 🎨✨ | Coffee lover',
    status: 'Designing the future 🚀',
    isOnline: true,
  },
  {
    uid: 'demo_user_alex',
    displayName: 'Alex Rivera',
    email: 'alex.rivera@connectchat.io',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Software Architect & Open Source Enthusiast 💻⚡',
    status: 'In a coding flow state 👨‍💻',
    isOnline: true,
  },
  {
    uid: 'demo_user_marcus',
    displayName: 'Marcus Vance',
    email: 'marcus.vance@connectchat.io',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Digital Nomad 🌴 | Fitness & Health Advocate 🏋️‍♂️',
    status: 'Exploring Bali sunsets 🌅',
    isOnline: false,
  },
  {
    uid: 'demo_user_elena',
    displayName: 'Elena Rostova',
    email: 'elena.rostova@connectchat.io',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Travel Photographer 📸 | World Explorer 🗺️',
    status: 'Capturing moments ✨',
    isOnline: true,
  }
];

export async function seedDemoDataForUser(currentUserId: string, currentUserProfile: UserProfile) {
  try {
    // 1. Ensure Demo Users exist in Firestore
    for (const demoUser of DEMO_USERS) {
      const userRef = doc(db, 'users', demoUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...demoUser,
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp()
        });
      }
    }

    // 2. Check if current user has any chats with demo users
    const chatsRef = collection(db, 'chats');
    const existingChatsSnap = await getDocs(chatsRef);
    let hasChat = false;
    
    existingChatsSnap.forEach(doc => {
      const data = doc.data();
      if (data.participants && data.participants.includes(currentUserId)) {
        hasChat = true;
      }
    });

    if (!hasChat) {
      // Create initial welcome chat with Sophia Chen
      const sophia = DEMO_USERS[0];
      const chatId = [currentUserId, sophia.uid].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);

      await setDoc(chatRef, {
        id: chatId,
        participants: [currentUserId, sophia.uid],
        participantData: {
          [currentUserId]: {
            displayName: currentUserProfile.displayName,
            photoURL: currentUserProfile.photoURL,
            email: currentUserProfile.email || ''
          },
          [sophia.uid]: {
            displayName: sophia.displayName,
            photoURL: sophia.photoURL,
            email: sophia.email
          }
        },
        lastMessage: {
          text: 'Hey! Welcome to Connect Chat 🎉 Feel free to test real-time messages, audio/video calls, and stories!',
          senderId: sophia.uid,
          timestamp: new Date(),
          read: false
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Add messages in this chat
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        chatId: chatId,
        senderId: sophia.uid,
        text: `Hey ${currentUserProfile.displayName}! Welcome to Connect Chat 🎉`,
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        readBy: [sophia.uid]
      });

      await addDoc(messagesRef, {
        chatId: chatId,
        senderId: sophia.uid,
        text: 'You can test real-time messaging, start an audio/video call using the buttons at the top, or check out stories!',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        readBy: [sophia.uid]
      });

      // Create a demo story from Sophia & Alex
      const storiesRef = collection(db, 'stories');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await addDoc(storiesRef, {
        userId: sophia.uid,
        userDisplayName: sophia.displayName,
        userPhotoURL: sophia.photoURL,
        mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        text: 'Working on a new design system! 🎨✨',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        audioTitle: 'Acoustic Sunset Vibe',
        audioArtist: 'Chill Acoustic',
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        views: []
      });

      await addDoc(storiesRef, {
        userId: DEMO_USERS[1].uid,
        userDisplayName: DEMO_USERS[1].displayName,
        userPhotoURL: DEMO_USERS[1].photoURL,
        mediaType: 'text',
        text: '🚀 Connect Chat is live! Real-time WebRTC calling and stories working smoothly.',
        bgColor: 'from-purple-600 via-indigo-600 to-pink-500',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        audioTitle: 'Neon Cyberwave',
        audioArtist: 'Synth Retro',
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        views: []
      });
    }
  } catch (err) {
    console.warn('Seed data warning:', err);
  }
}
