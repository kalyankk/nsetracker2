import React, { useState, useEffect } from 'react';
import { StockMetadata } from '../../types/stock';
import { searchNSESymbols } from '../../services/nseData';
import { Search, Plus, TrendingUp, TrendingDown, Layers, Sparkles, X, Loader2, Trash2, RotateCcw } from 'lucide-react';

interface WatchlistProps {
  stocks: StockMetadata[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  onAddStock: (symbol: string, name: string) => void;
  onRemoveStock: (symbol: string) => void;
  onResetWatchlist?: () => void;
}

export const WatchlistSidebar: React.FC<WatchlistProps> = ({
  stocks,
  selectedSymbol,
  onSelectStock,
  onAddStock,
  onRemoveStock,
  onResetWatchlist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'BREAKOUT' | 'BANK' | 'TECH' | 'FIN'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New stock form state
  const [newSymbol, setNewSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Live search debounce
  useEffect(() => {
    if (!newSymbol.trim() || newSymbol.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchNSESymbols(newSymbol.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [newSymbol]);

  const filteredStocks = stocks.filter(s => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'BREAKOUT') {
      return (
        s.latestSignal?.type === 'BULLISH_BREAKOUT' ||
        s.latestSignal?.type === 'BEARISH_BREAKOUT' ||
        s.latestSignal?.type === 'INSIDE_BAR'
      );
    }
    if (selectedCategory === 'BANK') return s.sector.toLowerCase().includes('bank') || s.symbol.includes('BANK');
    if (selectedCategory === 'TECH') return ['AVANTEL', 'BBOX', 'NAZARA', 'AVALON'].includes(s.symbol) || s.sector.toLowerCase().includes('tech');
    if (selectedCategory === 'FIN') return ['CDSL', 'NORTHARC', 'SOUTHBANK', 'KTKBANK', 'DCBBANK'].includes(s.symbol) || s.sector.toLowerCase().includes('fin');
    return true;
  });

  const handleSelectSearchResult = (item: { symbol: string; name: string }) => {
    onAddStock(item.symbol, item.name);
    setNewSymbol('');
    setSearchResults([]);
    setShowAddModal(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const sym = newSymbol.trim().toUpperCase();
    onAddStock(sym, `${sym} Ltd`);
    setNewSymbol('');
    setSearchResults([]);
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] border-r border-slate-800 w-full md:w-[320px] select-none">
      {/* 1. Header & Add Ticker */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
            NSE Watchlist
          </h2>
          <div className="text-[11px] text-slate-400">
            {stocks.length} instruments monitored
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onResetWatchlist && (
            <button
              onClick={onResetWatchlist}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="Reset Watchlist to Default NSE 50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Symbol
          </button>
        </div>
      </div>

      {/* 2. Search & Categories */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search NSE stock..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
          {(['ALL', 'BREAKOUT', 'BANK', 'TECH', 'FIN'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'BREAKOUT'
                ? '⚡ Breakouts'
                : cat === 'ALL'
                ? 'All (18)'
                : cat === 'BANK'
                ? 'Banks'
                : cat === 'TECH'
                ? 'Tech & EMS'
                : 'Finance'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Stock List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredStocks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-2.5">
            <div>No instruments found in watchlist.</div>
            {onResetWatchlist && (
              <button
                type="button"
                onClick={onResetWatchlist}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Default NSE Universe
              </button>
            )}
          </div>
        ) : (
          filteredStocks.map(stock => {
            const isSelected = stock.symbol === selectedSymbol;
            const isPositive = stock.change >= 0;
            const signal = stock.latestSignal;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className={`p-3 cursor-pointer transition-colors relative group hover:bg-slate-800/50 ${
                  isSelected
                    ? 'bg-slate-800/80 border-l-4 border-l-sky-500'
                    : 'bg-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs tracking-wide">
                        {stock.symbol}
                      </span>
                      {signal?.type === 'INSIDE_BAR' && (
                        <span className="text-[10px] text-sky-400 bg-sky-950/80 px-1 py-0.2 rounded font-mono">
                          IB Coil
                        </span>
                      )}
                      {signal?.type === 'BULLISH_BREAKOUT' && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1 py-0.2 rounded font-mono">
                          ▲ Breakout
                        </span>
                      )}
                      {signal?.type === 'BEARISH_BREAKOUT' && (
                        <span className="text-[10px] text-rose-400 bg-rose-950/80 px-1 py-0.2 rounded font-mono">
                          ▼ Breakdown
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {stock.name}
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-100">
                        ₹{stock.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </div>

                    {/* Remove Stock Button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveStock(stock.symbol);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all ml-0.5"
                      title={`Remove ${stock.symbol} from watchlist`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtext info: volume and active setup tag */}
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-800/40 text-[10px] text-slate-400 font-mono">
                  <span>Vol: {(stock.volume / 100000).toFixed(1)}L</span>
                  <span className="truncate max-w-[150px] text-slate-400">
                    {signal?.label || stock.sector}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Add Custom Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Add NSE Instrument</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Search NSE Symbol or Company Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type symbol: e.g. BEL, IRFC, SUZLON, TRENT..."
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-md text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-sky-400" />
                  )}
                </div>
              </div>

              {/* Real-time search results */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-md bg-slate-900/90">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <span className="font-bold text-white group-hover:text-sky-400">{item.symbol}</span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[280px]">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800 font-mono">
                        + Add
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {newSymbol.trim() && searchResults.length === 0 && !isSearching && (
                <div className="p-3 bg-slate-900/50 rounded-md border border-slate-800 text-slate-400 text-[11px]">
                  <span>No exact search matches. You can directly add <strong className="text-white font-mono">{newSymbol.toUpperCase()}</strong> to fetch its live NSE chart.</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                {newSymbol.trim() && (
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    className="px-4 py-1.5 bg-sky-500 text-white font-semibold rounded hover:bg-sky-400 transition-colors"
                  >
                    Track {newSymbol.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
