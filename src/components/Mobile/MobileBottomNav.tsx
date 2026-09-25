import React from 'react';
import { Layers, CandlestickChart, Compass, SlidersHorizontal } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'watchlist' | 'chart' | 'screener' | 'setups';
  onViewChange: (view: 'watchlist' | 'chart' | 'screener' | 'setups') => void;
  setupsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onViewChange,
  setupsCount,
}) => {
  const tabs = [
    {
      id: 'watchlist' as const,
      label: 'Watchlist',
      icon: Layers,
    },
    {
      id: 'chart' as const,
      label: 'Charts',
      icon: CandlestickChart,
    },
    {
      id: 'setups' as const,
      label: 'Setups',
      icon: Compass,
      badge: setupsCount > 0 ? setupsCount : undefined,
    },
    {
      id: 'screener' as const,
      label: 'Screener',
      icon: SlidersHorizontal,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)] select-none">
      <div className="flex items-center justify-around h-14 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
                isActive
                  ? 'text-sky-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 text-[9px] font-mono font-bold bg-sky-500 text-white rounded-full leading-tight shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
