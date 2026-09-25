import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle } from 'lucide-react';

export const AndroidInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('dismissed_android_install') === 'true';
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If prompt event is not supported or already triggered, give user guidance
      alert('To install on Android: Tap the 3 dots (⋮) in Chrome and select "Add to Home screen" or "Install App".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('dismissed_android_install', 'true');
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-sky-800/60 px-3.5 py-2 flex items-center justify-between text-xs text-slate-200 shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg shrink-0 border border-sky-500/30">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="truncate">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span>Install NSE Trader Android App</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono border border-emerald-500/30">
              PWA
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Fast full-screen mobile charts & instant alerts on home screen
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1 px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-colors shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-slate-200 rounded"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
