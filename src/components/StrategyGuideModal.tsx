import React from 'react';
import { X, Layers, TrendingUp, Activity, BarChart2, Check, ArrowRight } from 'lucide-react';

interface GuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyGuideModal: React.FC<GuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl text-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0f17]">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              NSE Technical Strategies Handbook
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rules and execution criteria for Inside Bar Breakouts, EMA Crosses, RSI Divergences, and Volume confirmation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs leading-relaxed">
          {/* 1. Inside Bar & Consolidation */}
          <div className="space-y-2 border-l-2 border-sky-500 pl-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              1. Inside Bar (IB) Consolidation & Breakouts
            </h3>
            <p className="text-slate-300">
              An <strong className="text-white">Inside Bar</strong> occurs when a candle's high is lower than or equal to the previous candle's high, and its low is higher than or equal to the previous candle's low. The preceding larger candle is called the <strong className="text-sky-300">Mother Bar</strong>.
            </p>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="text-sky-400 font-sans font-semibold">Rules for High-Probability Breakout Execution:</div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Coil Energy:</strong> Double or Triple Inside Bars signify extreme volatility compression (NR7). Explosive expansion is imminent.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Bullish Trigger:</strong> Candle closes above Mother Bar High with Volume &gt; 1.3x 20 SMA.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Stop Loss:</strong> Placed just below the Mother Bar Low or middle 50% line. Target is minimum 1.5x Mother Bar range.</span>
              </div>
            </div>
          </div>

          {/* 2. EMA Cross */}
          <div className="space-y-2 border-l-2 border-amber-500 pl-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              2. Exponential Moving Average (EMA) Crossovers
            </h3>
            <p className="text-slate-300">
              Moving average crossovers identify shifts in directional momentum. Fast EMAs react quickly while slower EMAs establish institutional support/resistance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-white text-[12px] mb-1">9 / 21 EMA Momentum Cross</div>
                <p className="text-slate-400 text-[11px]">
                  When the 9 EMA crosses above the 21 EMA, short-term buyers have taken control. Best used in conjunction with breakout confirmation for swift swing entries.
                </p>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-white text-[12px] mb-1">50 / 200 EMA (Golden / Death Cross)</div>
                <p className="text-slate-400 text-[11px]">
                  Institutional long-term health filter. Golden Cross (50 crosses above 200) marks multi-month bull market cycles on NSE equities.
                </p>
              </div>
            </div>
          </div>

          {/* 3. RSI Divergence */}
          <div className="space-y-2 border-l-2 border-purple-500 pl-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              3. RSI Regular & Hidden Divergences
            </h3>
            <p className="text-slate-300">
              Divergence occurs when price action and the Relative Strength Index (RSI 14) disagree, signaling exhaustion of the prevailing trend and high likelihood of sharp reversal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-950/20 border border-emerald-800/60 p-3 rounded-lg">
                <div className="font-bold text-emerald-400 text-[12px] mb-1">Regular Bullish Divergence</div>
                <p className="text-slate-300 text-[11px]">
                  Price prints a <strong className="text-white">Lower Low (LL)</strong>, but RSI prints a <strong className="text-emerald-300">Higher Low (HL)</strong> below the 45 line. Indicates sellers lack momentum to push lower; imminent sharp bounce.
                </p>
              </div>
              <div className="bg-rose-950/20 border border-rose-800/60 p-3 rounded-lg">
                <div className="font-bold text-rose-400 text-[12px] mb-1">Regular Bearish Divergence</div>
                <p className="text-slate-300 text-[11px]">
                  Price prints a <strong className="text-white">Higher High (HH)</strong>, but RSI prints a <strong className="text-rose-300">Lower High (LH)</strong> above the 55 line. Indicates exhaustion of buyers at new highs; high probability profit taking / shorting opportunity.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Volume Confirmation */}
          <div className="space-y-2 border-l-2 border-yellow-500 pl-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-yellow-400" />
              4. Volume Confirmation & Dry-Up
            </h3>
            <p className="text-slate-300">
              Volume represents institutional liquidity footprint. Never trade price action in isolation without volume validation:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong className="text-sky-300">Volume Dry-Up during Consolidation:</strong> Volume below 0.65x of 20 SMA while inside an Inside Bar proves supply is absorbed and participants are waiting.</li>
              <li><strong className="text-emerald-300">Volume Surge on Breakout:</strong> Volume exceeding 1.5x–2.0x of 20 SMA confirms institutional participation and filters out false head-fakes.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0b0f17] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
