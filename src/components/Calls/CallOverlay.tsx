import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2, ShieldAlert } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const CallOverlay: React.FC = () => {
  const { 
    activeCall, 
    localStream, 
    remoteStream, 
    isMuted, 
    isVideoOff, 
    toggleMute, 
    toggleVideo, 
    endCall 
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [callDuration, setCallDuration] = useState(0);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Timer
  useEffect(() => {
    if (!activeCall) {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      
      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between text-white bg-gray-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-500 bg-gray-800">
            <img 
              src={activeCall.callerPhotoURL} 
              alt={activeCall.callerName} 
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{activeCall.callerName}</h3>
            <p className="text-xs text-indigo-400 font-mono">
              {activeCall.status === 'connected' ? formatTime(callDuration) : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Call</span>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-1 my-4 rounded-3xl overflow-hidden bg-gray-950 flex items-center justify-center border border-gray-800">
        
        {/* Remote Video Stream */}
        {activeCall.type === 'video' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-28 h-28 rounded-full ring-4 ring-indigo-500/30 p-1 bg-gray-900 overflow-hidden shadow-2xl animate-pulse">
              <img 
                src={activeCall.callerPhotoURL} 
                alt={activeCall.callerName} 
                className="w-full h-full object-cover rounded-full" 
              />
            </div>
            <p className="text-lg font-bold text-white">{activeCall.callerName}</p>
            <span className="text-xs text-indigo-400">Audio Call Active</span>
          </div>
        )}

        {/* Local Stream PIP (Picture-In-Picture) */}
        {activeCall.type === 'video' && (
          <div className="absolute bottom-4 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                <VideoOff className="w-6 h-6" />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Control Toolbar */}
      <div className="relative z-10 flex items-center justify-center space-x-4 bg-gray-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 max-w-md mx-auto w-full">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition-all ${
            isMuted 
              ? 'bg-red-600/80 hover:bg-red-600 text-white' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
          }`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {activeCall.type === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-2xl transition-all ${
              isVideoOff 
                ? 'bg-red-600/80 hover:bg-red-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        <button
          onClick={endCall}
          className="p-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white shadow-xl shadow-red-600/30 transition-transform active:scale-95 flex items-center justify-center"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
};
