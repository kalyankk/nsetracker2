import React, { useState } from 'react';
import { StrategySetup } from '../../types/stock';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Filter,
  Search,
} from 'lucide-react';

interface SetupsListProps {
  setups: StrategySetup[];
  onSelectStock: (symbol: string) => void;
}

export const TradeSetupsList: React.FC<SetupsListProps> = ({ setups, onSelectStock }) => {
  const [strategyFilter, setStrategyFilter] = useState<'ALL' | 'Inside Bar Breakout' | 'EMA Momentum Cross' | 'RSI Swing Divergence'>('ALL');
  const [biasFilter, setBiasFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for bias badges
  const bullishCount = setups.filter(s => s.bias === 'BULLISH').length;
  const bearishCount = setups.filter(s => s.bias === 'BEARISH').length;

  const filteredSetups = setups.filter(s => {
    if (biasFilter !== 'ALL' && s.bias !== biasFilter) return false;
    if (strategyFilter !== 'ALL' && s.strategyName !== strategyFilter) return false;
    if (
      searchQuery.trim() &&
      !s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.stockName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-5">
      {/* Header with Title & Market Bias Sentiment Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              Active Strategy Setups & Invalidation Levels
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {setups.length} Setups Generated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithmic trade parameters calculated from live consolidation boundaries, moving average trajectory, and RSI swing divergence.
          </p>
        </div>

        {/* Primary Bias Filter (BULLISH vs BEARISH) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800 shrink-0">
          <span className="text-[10px] text-slate-400 font-semibold px-2 flex items-center gap-1 uppercase tracking-wider">
            <Filter className="w-3 h-3 text-slate-400" />
            Bias:
          </span>
          <button
            onClick={() => setBiasFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              biasFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All ({setups.length})
          </button>
          <button
            onClick={() => setBiasFilter('BULLISH')}
            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
              biasFilter === 'BULLISH'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-950/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Bullish ({bullishCount})
          </button>
          <button
            onClick={() => setBiasFilter('BEARISH')}
            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
              biasFilter === 'BEARISH'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-400 hover:bg-rose-950/60'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Bearish ({bearishCount})
          </button>
        </div>
      </div>

      {/* Secondary Controls: Strategy Type Tabs & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Strategy Category Filter */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['ALL', 'Inside Bar Breakout', 'EMA Momentum Cross', 'RSI Swing Divergence'] as const).map(strat => (
            <button
              key={strat}
              onClick={() => setStrategyFilter(strat)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                strategyFilter === strat
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {strat === 'ALL' ? 'All Strategies' : strat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by symbol or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Setups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSetups.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Filter className="w-8 h-8 text-slate-600 mb-1" />
            <span className="font-semibold text-slate-400">No active trade setups match your filter criteria</span>
            <span className="text-[11px] text-slate-500">
              Try switching the bias filter to "All" or choosing another strategy.
            </span>
            {(biasFilter !== 'ALL' || strategyFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setBiasFilter('ALL');
                  setStrategyFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-2 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 rounded transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          filteredSetups.map((setup, idx) => (
            <div
              key={`${setup.symbol}-${idx}`}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm group"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm tracking-wide">
                        {setup.symbol}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          setup.bias === 'BULLISH'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {setup.bias === 'BULLISH' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {setup.bias}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                      {setup.stockName}
                    </div>
                  </div>

                  <span className="text-[11px] text-sky-400 font-mono font-semibold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                    R:R {setup.riskReward}
                  </span>
                </div>

                {/* Strategy Title */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-3">
                  {setup.strategyName === 'Inside Bar Breakout' && <Layers className="w-3.5 h-3.5 text-sky-400" />}
                  {setup.strategyName === 'EMA Momentum Cross' && <TrendingUp className="w-3.5 h-3.5 text-amber-400" />}
                  {setup.strategyName === 'RSI Swing Divergence' && <Activity className="w-3.5 h-3.5 text-purple-400" />}
                  {setup.strategyName}
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums mb-3">
                  <div className="bg-[#0b0f17] p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] font-sans text-slate-400 block">Trigger Entry</span>
                    <span className="font-bold text-white">₹{setup.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#0b0f17] p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] font-sans text-slate-400 block">Stop Loss</span>
                    <span className="font-bold text-rose-400">₹{setup.stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#0b0f17] p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] font-sans text-slate-400 block">Target 1</span>
                    <span className="font-bold text-emerald-400">₹{setup.target1.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#0b0f17] p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] font-sans text-slate-400 block">Target 2</span>
                    <span className="font-bold text-emerald-300">₹{setup.target2.toFixed(2)}</span>
                  </div>
                </div>

                {/* Technical Rationale */}
                <p className="text-[11px] text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {setup.rationale}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectStock(setup.symbol)}
                className="w-full py-2 bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                Inspect on Terminal Chart
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
