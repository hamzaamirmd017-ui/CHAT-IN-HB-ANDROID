import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  getDocs,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { CallSession } from '../types';

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  initiateCall: (receiverId: string, receiverName: string, receiverPhoto: string, type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callUnsubscribe = useRef<(() => void) | null>(null);
  const ringtoneAudio = useRef<HTMLAudioElement | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'offering')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData = { id: change.doc.id, ...change.doc.data() } as CallSession;
          setIncomingCall(callData);
          playRingtone();
        }
      });
    }, (err) => {
      console.warn('onSnapshot error in CallContext incoming calls:', err);
    });

    return () => {
      unsubscribe();
      stopRingtone();
    };
  }, [user]);

  const playRingtone = () => {
    try {
      // Play soft ringtone using Web Audio API oscillator if audio file unavailable
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 1500);
    } catch (e) {
      console.warn('Ringtone playback notice:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
    }
  };

  // Helper to get media stream with fallback
  const getMedia = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      return stream;
    } catch (err) {
      console.warn('Media devices not available, creating virtual fallback stream', err);
      // Fallback: create audio track via Web Audio API canvas if camera/mic missing
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#818cf8';
        ctx.font = '24px sans-serif';
        ctx.fillText('Connect Chat Video Call', 180, 240);
      }
      const virtualStream = canvas.captureStream(30);
      return virtualStream;
    }
  };

  const initiateCall = async (
    receiverId: string, 
    receiverName: string, 
    receiverPhoto: string, 
    type: 'audio' | 'video'
  ) => {
    if (!user || !userProfile) return;

    try {
      const stream = await getMedia(type === 'video');
      setLocalStream(stream);

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnection.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const rStream = new MediaStream();
      setRemoteStream(rStream);

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rStream.addTrack(track);
        });
      };

      // Create Call Doc
      const callDocRef = doc(collection(db, 'calls'));
      const callerCandidatesCol = collection(callDocRef, 'callerCandidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(callerCandidatesCol, event.candidate.toJSON());
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const newCallData: CallSession = {
        id: callDocRef.id,
        callerId: user.uid,
        callerName: userProfile.displayName,
        callerPhotoURL: userProfile.photoURL,
        receiverId,
        type,
        status: 'offering',
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp()
      };

      await setDoc(callDocRef, newCallData);
      setActiveCall({ ...newCallData, receiverName, receiverPhoto } as any);

      // Listen for answer and call updates
      callUnsubscribe.current = onSnapshot(callDocRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (data.status === 'declined' || data.status === 'ended') {
          cleanupCall();
        }

        if (!pc.currentRemoteDescription && data.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDescription);

          // Listen for receiver candidates
          const receiverCandidatesCol = collection(callDocRef, 'receiverCandidates');
          onSnapshot(receiverCandidatesCol, (candSnap) => {
            candSnap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          }, (err) => console.warn('onSnapshot error in receiverCandidates:', err));

          setActiveCall((prev) => prev ? { ...prev, status: 'connected' } : null);
        }
      }, (err) => console.warn('onSnapshot error in callDocRef:', err));

    } catch (err) {
      console.error('Error initiating call:', err);
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !user) return;

    stopRingtone();
    const callSession = incomingCall;
    setIncomingCall(null);
    setActiveCall(callSession);

    try {
      const stream = await getMedia(callSession.type === 'video');
      setLocalStream(stream);

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnection.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const rStream = new MediaStream();
      setRemoteStream(rStream);

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rStream.addTrack(track);
        });
      };

      const callDocRef = doc(db, 'calls', callSession.id);
      const receiverCandidatesCol = collection(callDocRef, 'receiverCandidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(receiverCandidatesCol, event.candidate.toJSON());
        }
      };

      if (callSession.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callSession.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateDoc(callDocRef, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected'
        });
      }

      // Listen for caller candidates
      const callerCandidatesCol = collection(callDocRef, 'callerCandidates');
      onSnapshot(callerCandidatesCol, (candSnap) => {
        candSnap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate);
          }
        });
      }, (err) => console.warn('onSnapshot error in callerCandidates:', err));

      // Listen for status changes
      callUnsubscribe.current = onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (data && (data.status === 'ended' || data.status === 'declined')) {
          cleanupCall();
        }
      }, (err) => console.warn('onSnapshot error in callDocRef status:', err));

    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupCall();
    }
  };

  const declineCall = async () => {
    stopRingtone();
    if (incomingCall) {
      const callDocRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callDocRef, { status: 'declined' }).catch(() => {});
      setIncomingCall(null);
    }
  };

  const endCall = async () => {
    stopRingtone();
    if (activeCall) {
      const callDocRef = doc(db, 'calls', activeCall.id);
      await updateDoc(callDocRef, { status: 'ended' }).catch(() => {});
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (callUnsubscribe.current) {
      callUnsubscribe.current();
      callUnsubscribe.current = null;
    }
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
