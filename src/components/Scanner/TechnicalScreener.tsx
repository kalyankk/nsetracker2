import React, { useState } from 'react';
import { StockMetadata } from '../../types/stock';
import { Filter, Search, ArrowUpRight, ArrowDownRight, Layers, Zap, TrendingUp, BarChart2 } from 'lucide-react';

interface ScreenerProps {
  stocks: StockMetadata[];
  onSelectStock: (symbol: string) => void;
  selectedSymbol: string;
}

type FilterCategory = 'ALL' | 'INSIDE_BAR' | 'BREAKOUT' | 'EMA_CROSS' | 'RSI_DIV' | 'VOLUME_SURGE';

export const TechnicalScreener: React.FC<ScreenerProps> = ({
  stocks,
  onSelectStock,
  selectedSymbol,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter stocks
  const filteredStocks = stocks.filter(stock => {
    // Search query match
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'INSIDE_BAR') {
      return stock.latestSignal?.type === 'INSIDE_BAR';
    }
    if (activeFilter === 'BREAKOUT') {
      return (
        stock.latestSignal?.type === 'BULLISH_BREAKOUT' ||
        stock.latestSignal?.type === 'BEARISH_BREAKOUT'
      );
    }
    if (activeFilter === 'EMA_CROSS') {
      return (
        stock.latestSignal?.type === 'EMA_BULL_CROSS' ||
        stock.latestSignal?.type === 'EMA_BEAR_CROSS'
      );
    }
    if (activeFilter === 'RSI_DIV') {
      return (
        stock.latestSignal?.type === 'RSI_BULL_DIV' ||
        stock.latestSignal?.type === 'RSI_BEAR_DIV'
      );
    }
    if (activeFilter === 'VOLUME_SURGE') {
      return stock.volume >= stock.avgVolume * 1.4;
    }
    return true;
  });

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* 1. Header & Strategy Filter Tabs */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            NSE Technical Screener & Pattern Radar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated scanning across Indian equities for range compression coils, breakouts, EMA crossovers, and RSI divergences.
          </p>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter symbols or sector..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeFilter === 'ALL'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          All Scanned ({stocks.length})
        </button>

        <button
          onClick={() => setActiveFilter('INSIDE_BAR')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeFilter === 'INSIDE_BAR'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Inside Bar Coils
        </button>

        <button
          onClick={() => setActiveFilter('BREAKOUT')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeFilter === 'BREAKOUT'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Breakouts / Breakdowns
        </button>

        <button
          onClick={() => setActiveFilter('EMA_CROSS')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeFilter === 'EMA_CROSS'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          EMA Crossovers (9/21 & 50/200)
        </button>

        <button
          onClick={() => setActiveFilter('RSI_DIV')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeFilter === 'RSI_DIV'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          RSI Divergences
        </button>

        <button
          onClick={() => setActiveFilter('VOLUME_SURGE')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeFilter === 'VOLUME_SURGE'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Volume Surges (&gt;1.4x)
        </button>
      </div>

      {/* 2. High-Density Screener Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0b0f17] text-slate-400 border-b border-slate-800 font-mono text-[11px]">
            <tr>
              <th className="px-4 py-2.5">Symbol / Company</th>
              <th className="px-4 py-2.5 text-right">LTP (₹)</th>
              <th className="px-4 py-2.5 text-right">Change %</th>
              <th className="px-4 py-2.5">Detected Setup / Pattern</th>
              <th className="px-4 py-2.5 text-right">Volume / Ratio</th>
              <th className="px-4 py-2.5">Technical Bias</th>
              <th className="px-4 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No stocks match the selected scanner criteria.
                </td>
              </tr>
            ) : (
              filteredStocks.map(stock => {
                const isSelected = stock.symbol === selectedSymbol;
                const isPositive = stock.change >= 0;
                const volRatio = (stock.volume / stock.avgVolume).toFixed(1);
                const signal = stock.latestSignal;

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock.symbol)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-950/30 border-l-2 border-l-sky-500' : ''
                    }`}
                  >
                    {/* Symbol & Name */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-white tracking-wide">{stock.symbol}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {stock.name}
                      </div>
                    </td>

                    {/* LTP */}
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-100">
                      ₹{stock.price.toFixed(2)}
                    </td>

                    {/* Change % */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Setup / Signal */}
                    <td className="px-4 py-3">
                      {signal ? (
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-xs ${
                              signal.bias === 'BULLISH'
                                ? 'text-emerald-300'
                                : signal.bias === 'BEARISH'
                                ? 'text-rose-300'
                                : 'text-sky-300'
                            }`}
                          >
                            {signal.label}
                          </span>
                          <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[280px]">
                            {signal.description}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">In Range</span>
                      )}
                    </td>

                    {/* Volume & Ratio */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <div className="text-slate-200">
                        {(stock.volume / 100000).toFixed(1)}L
                      </div>
                      <div
                        className={`text-[10px] ${
                          Number(volRatio) >= 1.5
                            ? 'text-amber-400 font-bold'
                            : Number(volRatio) <= 0.6
                            ? 'text-sky-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {volRatio}x 20SMA {Number(volRatio) <= 0.6 ? '(Dry-up)' : ''}
                      </div>
                    </td>

                    {/* Bias */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          signal?.bias === 'BULLISH'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : signal?.bias === 'BEARISH'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {signal?.bias || 'NEUTRAL'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectStock(stock.symbol);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 rounded transition-colors"
                      >
                        View Chart
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
