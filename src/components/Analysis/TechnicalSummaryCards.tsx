import React from 'react';
import { Candle, TechnicalIndicators, StockMetadata, StrategySetup } from '../../types/stock';
import { Layers, Activity, TrendingUp, BarChart2, ShieldAlert, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';

interface AnalysisProps {
  stock: StockMetadata;
  candles: Candle[];
  indicators: TechnicalIndicators;
  setups: StrategySetup[];
}

export const TechnicalSummaryCards: React.FC<AnalysisProps> = ({
  stock,
  candles,
  indicators,
  setups,
}) => {
  const lastIdx = candles.length - 1;
  const lastCandle = candles[lastIdx];
  const lastPattern = indicators.insideBars.get(lastIdx);
  const prevPattern = indicators.insideBars.get(lastIdx - 1);
  const activePattern = lastPattern || prevPattern;

  // EMA levels
  const ema9 = indicators.ema9[lastIdx];
  const ema21 = indicators.ema21[lastIdx];
  const ema50 = indicators.ema50[lastIdx];
  const ema200 = indicators.ema200[lastIdx];

  const isBullishEmaStack = ema9 && ema21 && ema9 > ema21;
  const recentCross = indicators.emaCrossovers[indicators.emaCrossovers.length - 1];

  // RSI & Divergence
  const rsi = indicators.rsi14[lastIdx];
  const recentDivergence = indicators.rsiDivergences[indicators.rsiDivergences.length - 1];

  // Volume
  const vol = lastCandle.volume;
  const volSMA = indicators.volumeSMA20[lastIdx] || 1;
  const volRatio = (vol / volSMA).toFixed(1);
  const isSpike = indicators.volumeSpikes[lastIdx];
  const isDryUp = indicators.volumeDryUps[lastIdx];

  return (
    <div className="space-y-4">
      {/* 4 Technical Pillar Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Inside Bar & Consolidation */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Inside Bar / Consolidation
              </span>
              {activePattern?.isInsideBar && (
                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 px-1.5 py-0.5 rounded font-mono">
                  Coil #{activePattern.insideBarNumber}
                </span>
              )}
            </div>

            {activePattern?.isInsideBar ? (
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-white">Range Compression Active</div>
                <div className="text-[11px] text-slate-400">
                  Mother Bar High: <span className="font-mono text-slate-200">₹{activePattern.motherHigh?.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Mother Bar Low: <span className="font-mono text-slate-200">₹{activePattern.motherLow?.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-sky-300 font-mono">
                  Range Width: ₹{((activePattern.motherHigh || 0) - (activePattern.motherLow || 0)).toFixed(2)} ({(((activePattern.motherHigh || 0) - (activePattern.motherLow || 0)) / (activePattern.motherLow || 1) * 100).toFixed(1)}%)
                </div>
              </div>
            ) : activePattern?.breakout?.occurred ? (
              <div className="space-y-1.5">
                <div className={`text-sm font-bold ${activePattern.breakout.type === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activePattern.breakout.type === 'bullish' ? '▲ Bullish Breakout' : '▼ Bearish Breakdown'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Trigger: Closed at <span className="font-mono text-white">₹{activePattern.breakout.breakoutPrice?.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Vol Confirmation: {activePattern.breakout.volumeConfirmed ? (
                    <span className="text-emerald-400 font-semibold">Confirmed (High Vol)</span>
                  ) : (
                    <span className="text-amber-400">Average Volume</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-400 text-xs">
                <div className="text-sm font-semibold text-slate-200">Normal Range Trading</div>
                <p className="text-[11px] text-slate-400">No active inside bar contraction currently forming on this timeframe.</p>
              </div>
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>NR7 Bar: {activePattern?.isNR7 ? 'Yes (Volatile Setup)' : 'No'}</span>
            <span className="text-slate-400">Pattern: Multi-Bar</span>
          </div>
        </div>

        {/* 2. EMA Cross & Alignment */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                EMA Trend & Cross
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isBullishEmaStack
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {isBullishEmaStack ? '9 > 21 Bullish' : '9 < 21 Bearish'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] tabular-nums">
              <div className="flex justify-between">
                <span className="text-cyan-400 font-sans">EMA 9:</span>
                <span className="text-white font-semibold">₹{ema9 ? ema9.toFixed(1) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400 font-sans">EMA 21:</span>
                <span className="text-white font-semibold">₹{ema21 ? ema21.toFixed(1) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-400 font-sans">EMA 50:</span>
                <span className="text-white font-semibold">₹{ema50 ? ema50.toFixed(1) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400 font-sans">EMA 200:</span>
                <span className="text-white font-semibold">₹{ema200 ? ema200.toFixed(1) : '-'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 truncate">
            {recentCross ? (
              <span className="text-amber-300 font-sans">Last: {recentCross.label}</span>
            ) : (
              <span>No recent crossover</span>
            )}
          </div>
        </div>

        {/* 3. RSI & Swing Divergence */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                RSI 14 & Divergence
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                rsi && rsi >= 70
                  ? 'bg-rose-950 text-rose-300'
                  : rsi && rsi <= 30
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-purple-950 text-purple-300'
              }`}>
                {rsi ? rsi.toFixed(1) : '-'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">
                {rsi && rsi >= 70
                  ? 'Overbought Zone (>70)'
                  : rsi && rsi <= 30
                  ? 'Oversold Zone (<30)'
                  : 'Neutral Momentum Band'}
              </div>

              {recentDivergence && recentDivergence.toIndex >= candles.length - 12 ? (
                <div className={`p-2 rounded text-[11px] ${
                  recentDivergence.type === 'bullish'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {recentDivergence.type === 'bullish' ? 'Bullish Divergence' : 'Bearish Divergence'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">
                    {recentDivergence.description}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Oscillator aligned with price trajectory. No sharp divergence on recent swings.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between font-mono">
            <span>Range: 30 - 70</span>
            <span>Period: 14 (Wilder)</span>
          </div>
        </div>

        {/* 4. Volume Profile & Institutional Flow */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-yellow-400" />
                Volume & Institutional Flow
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isSpike
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : isDryUp
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {volRatio}x 20SMA
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Active Vol:</span>
                <span className="text-white font-semibold">{(vol / 100000).toFixed(1)} Lakhs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">20 SMA Vol:</span>
                <span className="text-amber-400">{(volSMA / 100000).toFixed(1)} Lakhs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Volume State:</span>
                <span className={isSpike ? 'text-amber-300 font-bold' : isDryUp ? 'text-sky-300' : 'text-slate-300'}>
                  {isSpike ? 'Institutional Spike' : isDryUp ? 'Compression Dry-Up' : 'Normal Participation'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400">
            {isDryUp && (
              <span className="text-sky-300 font-sans">💡 Low volume indicates potential impending coil release</span>
            )}
            {isSpike && (
              <span className="text-amber-300 font-sans">⚡ High volume indicates institutional positioning</span>
            )}
            {!isDryUp && !isSpike && (
              <span>Standard turnover volume</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Strategy Setup Blueprint */}
      {setups.length > 0 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Actionable Technical Setup: {setups[0].strategyName}
              </h3>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
              setups[0].bias === 'BULLISH'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {setups[0].bias} BIAS · R:R {setups[0].riskReward}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs font-mono tabular-nums">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-sans text-slate-400">Trigger Entry</div>
              <div className="text-sm font-bold text-white">₹{setups[0].entryPrice.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-sans text-slate-400">Stop Loss (Invalidation)</div>
              <div className="text-sm font-bold text-rose-400">₹{setups[0].stopLoss.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-sans text-slate-400">Target 1 (1:1.5)</div>
              <div className="text-sm font-bold text-emerald-400">₹{setups[0].target1.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-sans text-slate-400">Target 2 (Runner)</div>
              <div className="text-sm font-bold text-emerald-300">₹{setups[0].target2.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-300 font-sans bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
            <span className="font-semibold text-sky-400">Technical Rationale: </span>
            {setups[0].rationale}
          </div>
        </div>
      )}
    </div>
  );
};
