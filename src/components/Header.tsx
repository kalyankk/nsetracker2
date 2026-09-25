import React, { useState, useEffect } from 'react';
import { RefreshCw, BookOpen, Clock, Activity } from 'lucide-react';

interface HeaderProps {
  activeView: 'watchlist' | 'chart' | 'screener' | 'setups';
  onViewChange: (view: 'watchlist' | 'chart' | 'screener' | 'setups') => void;
  isLiveAutoRefresh: boolean;
  onToggleLiveAutoRefresh: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenGuide: () => void;
  selectedSymbol?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  isLiveAutoRefresh,
  onToggleLiveAutoRefresh,
  onRefresh,
  isRefreshing,
  onOpenGuide,
  selectedSymbol,
}) => {
  const [istTime, setIstTime] = useState<string>('');
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to IST
      const istString = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setIstTime(istString);

      // Check if within 09:15 to 15:30 IST Monday(1) to Friday(5)
      const day = now.getDay();
      const hours = parseInt(istString.split(':')[0], 10);
      const minutes = parseInt(istString.split(':')[1], 10);
      const timeInMins = hours * 60 + minutes;
      const isOpen = day >= 1 && day <= 5 && timeInMins >= 9 * 60 + 15 && timeInMins <= 15 * 60 + 30;
      setIsMarketOpen(isOpen);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-3 md:px-6 py-2.5 md:py-3.5 border-b border-slate-800 bg-[#0b0f17] select-none shrink-0">
      {/* Zone 1: Wordmark & Live Status */}
      <div className="flex items-center gap-2 md:gap-3">
        <a
          href="/"
          className="text-sm md:text-lg font-bold tracking-tight text-white font-sans whitespace-nowrap hover:text-sky-400 transition-colors flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-sky-400 md:hidden" />
          <span>NSE Trader</span>
          <span className="hidden sm:inline text-slate-400 font-normal">Terminal</span>
        </a>

        {/* Live Market status badge */}
        <span
          className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono ${
            isMarketOpen
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
          />
          {isMarketOpen ? 'NSE Live' : 'Closed'} · {istTime || 'IST'}
        </span>

        {selectedSymbol && (
          <span className="md:hidden px-2 py-0.5 bg-slate-800 text-sky-400 rounded text-xs font-mono font-bold border border-slate-700">
            {selectedSymbol}
          </span>
        )}
      </div>

      {/* Zone 2: Desktop Tabs (Hidden on Mobile, replaced by Bottom Navigation Bar) */}
      <nav className="hidden md:flex items-center gap-6 text-xs md:text-sm font-medium text-slate-400">
        <button
          onClick={() => onViewChange('chart')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeView === 'chart'
              ? 'text-white border-b-2 border-sky-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Terminal Chart
        </button>
        <button
          onClick={() => onViewChange('screener')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeView === 'screener'
              ? 'text-white border-b-2 border-sky-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Technical Screener
        </button>
        <button
          onClick={() => onViewChange('setups')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeView === 'setups'
              ? 'text-white border-b-2 border-sky-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Trade Setups
        </button>
        <button
          onClick={onOpenGuide}
          className="hover:text-slate-200 transition-colors whitespace-nowrap flex items-center gap-1.5 pb-0.5"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          Strategy Guide
        </button>
      </nav>

      {/* Zone 3: Actions (Refresh, Auto-Sync, Guide on Mobile) */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onOpenGuide}
          className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          title="Strategy Handbook"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          title="Refresh live data from NSE"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
        </button>

        <button
          onClick={onToggleLiveAutoRefresh}
          className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border ${
            isLiveAutoRefresh
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
          }`}
          title="Auto-refresh live quotes from NSE"
        >
          <span className="relative flex h-2 w-2">
            {isLiveAutoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isLiveAutoRefresh ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            ></span>
          </span>
          <span className="hidden sm:inline">
            {isLiveAutoRefresh ? 'Live Auto-Sync: ON' : 'Auto-Sync: Paused'}
          </span>
          <span className="sm:hidden text-[10px]">
            {isLiveAutoRefresh ? 'LIVE' : 'PAUSED'}
          </span>
        </button>
      </div>
    </header>
  );
};
