import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { InstallAppModal } from './InstallAppModal';

export const InstallPromptBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Check if dismissed in session
    const isDismissed = sessionStorage.getItem('install_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('install_banner_dismissed', 'true');
  };

  const handleDownloadAPK = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setTimeout(() => {
      const dummyContent = "CHAT IN HB Android App v1.0.0 - Built by MD AMIR HAMZA";
      const blob = new Blob([dummyContent], { type: "application/vnd.android.package-archive" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CHAT-IN-HB-v1.0.0.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 1000);
  };

  if (dismissed) return <InstallAppModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />;

  return (
    <>
      {/* Top Prominent Web Banner for Initial Visit */}
      <div className="w-full bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 text-white px-3 sm:px-6 py-2.5 shadow-xl relative z-[60] flex items-center justify-between border-b border-purple-400/30 animate-fadeIn">
        
        {/* Left Info & Icon */}
        <div className="flex items-center space-x-2.5 min-w-0 cursor-pointer" onClick={() => setModalOpen(true)}>
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 animate-bounce">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-black text-xs sm:text-sm tracking-wide text-white truncate">
                Get CHAT IN HB Android App
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-mono font-bold uppercase">
                v1.0.0 APK
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-purple-100/90 truncate">
              Download official Android APK file directly on Mobile Web
            </p>
          </div>
        </div>

        {/* Right CTA Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleDownloadAPK}
            disabled={downloading}
            className="px-3 py-1.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-black text-xs shadow-md transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
            <span>{downloading ? 'Downloading...' : 'Download APK'}</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 border border-white/20 text-white font-bold text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
            <span>Options</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-purple-200 hover:text-white transition-colors"
            title="Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InstallAppModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
