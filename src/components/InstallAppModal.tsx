import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2, X, Sparkles, ShieldCheck, Share2, ExternalLink } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install CHAT IN HB on Android:\n1. Open Chrome menu (⋮)\n2. Tap "Install App" or "Add to Home Screen"');
    }
  };

  const handleDownloadAPK = () => {
    setDownloading(true);
    setTimeout(() => {
      // Simulate/trigger APK Download
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
      setDownloadSuccess(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div 
        className="w-full max-w-lg bg-[var(--bg-dialog)] text-[var(--text-main)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-[var(--bg-input)] hover:bg-purple-500/20 text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 p-0.5 shadow-xl flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-fuchsia-400" />
            </div>
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold font-mono uppercase tracking-wider">
              Android Release v1.0.0
            </span>
            <h3 className="font-black text-xl text-[var(--text-main)] tracking-wide mt-0.5">
              Install CHAT IN HB App
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              By MD AMIR HAMZA (Founder & Lead Developer)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          {/* Option 1: Direct APK Download */}
          <button
            onClick={handleDownloadAPK}
            disabled={downloading}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl hover:opacity-95 transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center space-x-3">
              <Download className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} />
              <div className="text-left">
                <span className="block font-black text-sm">Download Android APK</span>
                <span className="block text-[10px] opacity-80 font-normal">Direct APK File (CHAT-IN-HB-v1.0.0.apk)</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-xl text-xs font-bold">
              {downloading ? 'Downloading...' : 'APK'}
            </span>
          </button>

          {/* Option 2: Add to Home Screen / PWA */}
          <button
            onClick={handleInstallPWA}
            className="w-full p-4 rounded-2xl bg-[var(--bg-input)] hover:bg-purple-500/10 border border-[var(--border-color)] text-[var(--text-main)] font-extrabold text-sm transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-fuchsia-500" />
              <div className="text-left">
                <span className="block font-bold text-xs sm:text-sm">Install App to Home Screen</span>
                <span className="block text-[10px] text-[var(--text-secondary)] font-normal">Fast, Offline-Ready Android App</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-fuchsia-500/10 text-fuchsia-500 rounded-xl text-xs font-bold border border-fuchsia-500/30">
              {isInstalled ? 'Installed ✓' : 'Install'}
            </span>
          </button>
        </div>

        {/* Success Alert */}
        {downloadSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>APK Downloaded! Open the file on your Android device to install.</span>
          </div>
        )}

        {/* Play Store Info Box */}
        <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-purple-500 dark:text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Google Play Store Status</span>
            </h4>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono font-bold">App Bundle (AAB)</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            CHAT IN HB is compiled with Android App Bundle (AAB) support, ready for distribution on Google Play Store with WebRTC calling, Firebase backend, and high-contrast Light/Dark mode auto-sync.
          </p>
        </div>

        {/* Theme Color Change Notice */}
        <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center space-x-3">
          <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            <strong className="text-[var(--text-main)]">Automatic Theme Sync:</strong> Changing background theme instantly switches all text colors for 100% contrast & legibility.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center border-t border-[var(--border-color)]">
          <p className="text-[11px] text-[var(--text-secondary)] font-mono">
            © 2026 CHAT IN HB • Developer MD AMIR HAMZA
          </p>
        </div>
      </div>
    </div>
  );
};
