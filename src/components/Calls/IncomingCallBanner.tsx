import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallBanner: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 animate-bounce">
      <div className="bg-gray-900 border border-indigo-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between text-white">
        
        {/* Caller Info */}
        <div className="flex items-center space-x-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-500 animate-pulse">
            <img 
              src={incomingCall.callerPhotoURL} 
              alt={incomingCall.callerName} 
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <h4 className="font-bold text-sm">{incomingCall.callerName}</h4>
            <p className="text-xs text-indigo-400 font-medium capitalize">
              Incoming {incomingCall.type} call...
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={declineCall}
            className="p-3 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg transition-transform active:scale-95"
            title="Decline"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
          
          <button
            onClick={acceptCall}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center"
            title="Accept Call"
          >
            {incomingCall.type === 'video' ? (
              <Video className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
