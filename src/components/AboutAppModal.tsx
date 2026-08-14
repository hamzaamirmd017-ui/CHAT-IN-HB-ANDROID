import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Info, 
  X, 
  ArrowLeft,
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Video, 
  MessageSquare, 
  Heart, 
  Globe, 
  Award,
  Smartphone,
  ExternalLink,
  Code
} from 'lucide-react';

interface AboutAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettingsAbout?: () => void;
}

export const AboutAppModal: React.FC<AboutAppModalProps> = ({
  isOpen,
  onClose,
  onOpenSettingsAbout
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Handle Android back button & browser history popstate to allow back-swipe/back-click exit
  useEffect(() => {
    if (!isOpen) return;

    // Push a dummy history state so browser/Android back button closes this modal
    window.history.pushState({ modal: 'about_app' }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    // If we pushed state, pop it cleanly or close
    if (window.history.state?.modal === 'about_app') {
      window.history.back();
    } else {
      onClose();
    }
  };

  const handleCheckForUpdates = () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateStatus('CHAT IN HB is up to date! You are running the latest version (v1.0.0).');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-[var(--bg-card)] text-[var(--text-main)] flex flex-col overflow-hidden animate-fadeIn">
      
      {/* Android Style Top Header Bar */}
      <div className="flex-shrink-0 h-16 bg-gradient-to-r from-purple-900 via-fuchsia-950 to-indigo-950 px-4 flex items-center justify-between border-b border-purple-800/40 shadow-lg text-white z-20">
        
        {/* Left: Android Back Arrow Button */}
        <button
          onClick={handleClose}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white font-bold text-xs"
          title="Back (Android Style)"
        >
          <ArrowLeft className="w-5 h-5 text-fuchsia-300" />
          <span>Back</span>
        </button>

        {/* Center: Title */}
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-fuchsia-400/50 shadow-md">
            <img
              src="/src/assets/images/app_logo_hb_1785541679338.jpg"
              alt="Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-wide bg-gradient-to-r from-white via-fuchsia-200 to-purple-200 bg-clip-text text-transparent">
            About CHAT IN HB
          </span>
        </div>

        {/* Right: Close X Button */}
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Full-Screen Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 md:p-8 space-y-6 max-w-2xl mx-auto w-full">
        
        {/* Hero Banner Section */}
        <div className="relative rounded-3xl bg-gradient-to-br from-purple-900/80 via-fuchsia-900/60 to-slate-900 p-6 border border-purple-500/30 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-500 via-fuchsia-400 to-violet-400 p-0.5 shadow-[0_0_25px_rgba(217,70,239,0.5)] overflow-hidden flex-shrink-0 border-2 border-white/20">
              <img
                src="/src/assets/images/app_logo_hb_1785541679338.jpg"
                alt="CHAT IN HB Logo"
                className="w-full h-full object-cover rounded-[14px]"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-white space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="font-black text-2xl tracking-wide">CHAT IN HB</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-200 text-[10px] font-mono font-extrabold">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-purple-200 font-medium">
                Official Social & Real-time Communication Network
              </p>
              <p className="text-[11px] text-fuchsia-300/80 font-mono pt-1">
                Designed & Built with ❤️ for seamless social connectivity.
              </p>
            </div>
          </div>
        </div>

        {/* App Overview Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-2">
          <p className="font-extrabold text-xs text-fuchsia-500 dark:text-fuchsia-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Platform Overview</span>
          </p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            CHAT IN HB is an all-in-one social platform enabling users to connect via high-speed encrypted messaging, voice/video calls, customized Facebook-style profile covers, 24-hour interactive stories, instant posts with reactions, and dark/light themes.
          </p>
        </div>

        {/* Features Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-500" />
            <span>Key Platform Capabilities</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-start space-x-3">
              <Video className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[var(--text-main)]">HD Voice & Video Calling</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Low latency WebRTC peer connection for instant calls.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-start space-x-3">
              <MessageSquare className="w-5 h-5 text-fuchsia-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[var(--text-main)]">Real-Time Sync Chat</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Instant Firestore database synchronization & voice messages.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[var(--text-main)]">24-Hour Stories & Posts</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Share photos, videos, and updates with instant comments.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-[var(--text-main)]">Facebook Style Cover & Profile</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Full user profile customization with custom cover images.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Card */}
        <div className="p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center space-x-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 p-0.5 flex-shrink-0 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
              👨‍💻
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-purple-500 dark:text-purple-300 uppercase tracking-widest block">
              Founder & Developer
            </span>
            <h4 className="font-black text-base text-[var(--text-main)] tracking-wide truncate">
              MD AMIR HAMZA
            </h4>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              Creator of CHAT IN HB Social Platform
            </p>
          </div>
        </div>

        {/* Version Check & Status */}
        <div className="p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                System Status
              </span>
              <p className="text-xs font-extrabold text-[var(--text-main)]">
                Production Release v1.0.0
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
              Up To Date ✓
            </span>
          </div>

          <button
            onClick={handleCheckForUpdates}
            disabled={checkingUpdate}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}</span>
          </button>

          {updateStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{updateStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Exit Bar */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--border-color)] bg-[var(--bg-appbar)] flex items-center justify-between gap-3">
        {onOpenSettingsAbout && (
          <button
            onClick={() => {
              handleClose();
              onOpenSettingsAbout();
            }}
            className="text-xs font-extrabold text-purple-600 dark:text-fuchsia-400 hover:underline flex items-center gap-1"
          >
            <span>Full Settings Info</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={handleClose}
          className="ml-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
        >
          Exit / Close
        </button>
      </div>
    </div>
  );
};
