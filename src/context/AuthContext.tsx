import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile, UserPresenceStatus } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  signupWithEmail: (e: string, p: string, name: string, phone?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phone: string, name?: string) => Promise<void>;
  loginAsGuest: (guestName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  setPresenceStatus: (presence: UserPresenceStatus, customStatus?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const manualPresenceOverrideRef = useRef<UserPresenceStatus | null>(null);
  const idleTimerRef = useRef<any>(null);

  // Helper to set presence directly in Firestore & state
  const setPresenceStatus = useCallback(async (presence: UserPresenceStatus, customStatus?: string) => {
    if (!auth.currentUser) return;
    manualPresenceOverrideRef.current = presence;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const updatePayload: Record<string, any> = {
      presence: presence,
      isOnline: presence === 'online',
      lastSeen: serverTimestamp()
    };
    if (customStatus !== undefined) {
      updatePayload.status = customStatus;
    }
    await updateDoc(userRef, updatePayload).catch(() => {});
    setUserProfile((prev) => prev ? { 
      ...prev, 
      presence, 
      isOnline: presence === 'online',
      ...(customStatus !== undefined ? { status: customStatus } : {}) 
    } : null);
  }, []);

  // Sync profile & online status
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Listen to user profile changes
        unsubscribeProfile = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setUserProfile(data);
          } else {
            // Create user profile if it doesn't exist yet
            const defaultPhoto = currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`;
            const cleanName = currentUser.displayName || (currentUser.isAnonymous ? 'Guest User' : 'Connect Member');
            const cleanUsername = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);

            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: cleanName,
              username: `@${cleanUsername}`,
              email: currentUser.email || `${currentUser.uid}@connectchat.io`,
              phoneNumber: currentUser.phoneNumber || '+15550192834',
              photoURL: defaultPhoto,
              bio: 'Hey there! I am using Connect Chat ✨',
              status: 'Available',
              presence: 'online',
              isOnline: true,
              friends: [],
              friendRequestsReceived: [],
              friendRequestsSent: [],
              blockedUsers: [],
              isAdmin: currentUser.email?.endsWith('@connectchat.io') || currentUser.email === 'hamzaamirmd017@gmail.com' || false,
              twoFactorEnabled: false,
              privacySettings: {
                showLastSeen: true,
                showPhone: true,
                allowDirectMsg: true
              },
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          }
        }, (err) => {
          console.warn('onSnapshot error in AuthContext profile:', err);
        });

        // Set online status initially
        await updateDoc(userRef, {
          presence: 'online',
          isOnline: true,
          lastSeen: serverTimestamp()
        }).catch(() => {});

      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Update real-time presence on tab visibility, user idle/inactivity, or window unload
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes of inactivity marks user as 'away'

    const resetIdleTimer = () => {
      // If user hasn't explicitly chosen offline/invisible mode
      if (manualPresenceOverrideRef.current !== 'offline') {
        // If user was away due to idle, return them to online
        if (document.visibilityState === 'visible') {
          updateDoc(userRef, { 
            presence: 'online', 
            isOnline: true, 
            lastSeen: serverTimestamp() 
          }).catch(() => {});
        }
      }

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        // Only transition to away if user is currently online
        if (manualPresenceOverrideRef.current !== 'offline') {
          updateDoc(userRef, { 
            presence: 'away', 
            isOnline: false, 
            lastSeen: serverTimestamp() 
          }).catch(() => {});
        }
      }, IDLE_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (manualPresenceOverrideRef.current === 'offline') return;

      if (document.visibilityState === 'visible') {
        updateDoc(userRef, { 
          presence: 'online', 
          isOnline: true, 
          lastSeen: serverTimestamp() 
        }).catch(() => {});
        resetIdleTimer();
      } else {
        updateDoc(userRef, { 
          presence: 'away', 
          isOnline: false, 
          lastSeen: serverTimestamp() 
        }).catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      updateDoc(userRef, { 
        presence: 'offline', 
        isOnline: false, 
        lastSeen: serverTimestamp() 
      }).catch(() => {});
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    resetIdleTimer();

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [user]);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, phone?: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const userRef = doc(db, 'users', res.user.uid);
    const defaultPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`;
    const cleanUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);

    const newProfile: UserProfile = {
      uid: res.user.uid,
      displayName: name,
      username: `@${cleanUsername}`,
      email: email,
      phoneNumber: phone || '+15550192834',
      photoURL: defaultPhoto,
      bio: 'Hey there! I am using Connect Chat ✨',
      status: 'Available',
      presence: 'online',
      isOnline: true,
      friends: [],
      friendRequestsReceived: [],
      friendRequestsSent: [],
      blockedUsers: [],
      isAdmin: email.endsWith('@connectchat.io') || email === 'hamzaamirmd017@gmail.com',
      twoFactorEnabled: false,
      privacySettings: {
        showLastSeen: true,
        showPhone: true,
        allowDirectMsg: true
      },
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    await setDoc(userRef, newProfile);
    setUserProfile(newProfile);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithPhone = async (phone: string, name = 'Phone User') => {
    // Phone OTP login via anonymous auth & set profile with phone
    const res = await signInAnonymously(auth);
    const userRef = doc(db, 'users', res.user.uid);
    const defaultPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`;
    const cleanUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);

    const newProfile: UserProfile = {
      uid: res.user.uid,
      displayName: name,
      username: `@${cleanUsername}`,
      email: `user_${res.user.uid.slice(0, 5)}@connectchat.io`,
      phoneNumber: phone,
      photoURL: defaultPhoto,
      bio: 'Mobile verified user 📱',
      status: 'Available',
      presence: 'online',
      isOnline: true,
      friends: [],
      friendRequestsReceived: [],
      friendRequestsSent: [],
      blockedUsers: [],
      isAdmin: false,
      twoFactorEnabled: true,
      privacySettings: {
        showLastSeen: true,
        showPhone: true,
        allowDirectMsg: true
      },
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    await setDoc(userRef, newProfile);
    setUserProfile(newProfile);
  };

  const loginAsGuest = async (guestName = 'Guest Explorer') => {
    const res = await signInAnonymously(auth);
    const userRef = doc(db, 'users', res.user.uid);
    const defaultPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`;
    const cleanUsername = 'guest_' + res.user.uid.slice(0, 5);

    const newProfile: UserProfile = {
      uid: res.user.uid,
      displayName: guestName,
      username: `@${cleanUsername}`,
      email: `guest_${res.user.uid.slice(0, 5)}@connectchat.io`,
      phoneNumber: '+15559876543',
      photoURL: defaultPhoto,
      bio: 'Exploring Connect Chat 🚀',
      status: 'Online & testing features',
      presence: 'online',
      isOnline: true,
      friends: [],
      friendRequestsReceived: [],
      friendRequestsSent: [],
      blockedUsers: [],
      isAdmin: true, // Allow guest tester to see admin features if desired
      twoFactorEnabled: false,
      privacySettings: {
        showLastSeen: true,
        showPhone: true,
        allowDirectMsg: true
      },
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    await setDoc(userRef, newProfile);
    setUserProfile(newProfile);
  };

  const logout = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        presence: 'offline', 
        isOnline: false, 
        lastSeen: serverTimestamp() 
      }).catch(() => {});
    }
    await firebaseSignOut(auth);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginWithPhone,
        loginAsGuest,
        logout,
        updateProfileData,
        setPresenceStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
