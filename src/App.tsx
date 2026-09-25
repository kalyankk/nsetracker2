import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { WatchlistSidebar } from './components/Watchlist/WatchlistSidebar';
import { InteractiveChart } from './components/Chart/InteractiveChart';
import { TechnicalSummaryCards } from './components/Analysis/TechnicalSummaryCards';
import { TechnicalScreener } from './components/Scanner/TechnicalScreener';
import { TradeSetupsList } from './components/Signals/TradeSetupsList';
import { StrategyGuideModal } from './components/StrategyGuideModal';
import { AndroidInstallBanner } from './components/Mobile/AndroidInstallBanner';
import { MobileBottomNav } from './components/Mobile/MobileBottomNav';
import {
  INITIAL_NSE_STOCKS,
  NSEStockProfile,
  fetchNSEChart,
  fetchNSEBatchCharts,
  buildStrategySetups,
} from './services/nseData';
import { computeAllIndicators } from './utils/technicalAnalysis';
import { Candle, StockMetadata, StrategySetup, Timeframe } from './types/stock';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const WATCHLIST_STORAGE_KEY = 'nse_terminal_watchlist_profiles_v3';
const SELECTED_SYMBOL_STORAGE_KEY = 'nse_terminal_selected_symbol_v3';

export default function App() {
  // Navigation & View State: Supports Mobile Watchlist View & Bottom Nav
  const [activeView, setActiveView] = useState<'watchlist' | 'chart' | 'screener' | 'setups'>('chart');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Stock Selection & Timeframe with localStorage persistence
  const [stockProfiles, setStockProfiles] = useState<NSEStockProfile[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load watchlist from localStorage', e);
    }
    return INITIAL_NSE_STOCKS;
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_SYMBOL_STORAGE_KEY);
      if (saved && typeof saved === 'string') {
        return saved;
      }
    } catch (e) {}
    return 'AVANTEL';
  });

  const [timeframe, setTimeframe] = useState<Timeframe>('1D');

  // Persist watchlist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(stockProfiles));
    } catch (e) {
      console.warn('Failed to save watchlist to localStorage', e);
    }
  }, [stockProfiles]);

  // Persist selected symbol to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_SYMBOL_STORAGE_KEY, selectedSymbol);
    } catch (e) {}
  }, [selectedSymbol]);

  // Automated Watchlist Data Store: Candles for ALL watchlist items
  const [candlesBySymbol, setCandlesBySymbol] = useState<Record<string, Candle[]>>({});
  const [allStockMetadata, setAllStockMetadata] = useState<StockMetadata[]>([]);

  // Active Display State
  const [currentCandles, setCurrentCandles] = useState<Candle[]>([]);
  const [currentStockMetadata, setCurrentStockMetadata] = useState<StockMetadata | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Auto-refresh toggle
  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState<boolean>(true);

  // Automated Batch Loader: Fetches full candlestick data and computes setups for ALL watchlist stocks
  const loadAllWatchlistData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingChart(true);
    setChartError(null);

    try {
      const symbols = stockProfiles.map(p => p.symbol);
      const batchData = await fetchNSEBatchCharts(symbols, timeframe);

      if (batchData.length > 0) {
        const newCandlesMap: Record<string, Candle[]> = {};
        const newMetaList: StockMetadata[] = [];

        batchData.forEach(item => {
          newCandlesMap[item.symbol] = item.candles;
          newMetaList.push(item.metadata);
        });

        setCandlesBySymbol(prev => ({ ...prev, ...newCandlesMap }));
        setAllStockMetadata(newMetaList);

        // Update currently selected stock immediately
        const activeItem = batchData.find(b => b.symbol === selectedSymbol) || batchData[0];
        if (activeItem) {
          setCurrentCandles(activeItem.candles);
          setCurrentStockMetadata(activeItem.metadata);
        }
      }
    } catch (err: any) {
      console.error('Error loading watchlist data:', err);
      setChartError(err.message || 'Failed to load live NSE data');
    } finally {
      if (!isSilent) setIsLoadingChart(false);
    }
  }, [stockProfiles, timeframe, selectedSymbol]);

  // Initial load
  useEffect(() => {
    loadAllWatchlistData(false);
  }, [timeframe]); // Re-runs on timeframe change

  // When active symbol changes, switch instantly from preloaded candle store
  useEffect(() => {
    const existingCandles = candlesBySymbol[selectedSymbol];
    const existingMeta = allStockMetadata.find(s => s.symbol === selectedSymbol);

    if (existingCandles && existingCandles.length > 0 && existingMeta) {
      setCurrentCandles(existingCandles);
      setCurrentStockMetadata(existingMeta);
    } else {
      // If not yet in cache, fetch it individually
      fetchNSEChart(selectedSymbol, timeframe)
        .then(({ metadata, candles }) => {
          setCurrentCandles(candles);
          setCurrentStockMetadata(metadata);
          setCandlesBySymbol(prev => ({ ...prev, [selectedSymbol]: candles }));
          setAllStockMetadata(prev => {
            const idx = prev.findIndex(s => s.symbol === metadata.symbol);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = metadata;
              return copy;
            }
            return [metadata, ...prev];
          });
        })
        .catch(err => setChartError(err.message));
    }
  }, [selectedSymbol]);

  // Live Auto-Refresh Interval
  useEffect(() => {
    if (!isLiveAutoRefresh) return;

    const interval = setInterval(() => {
      loadAllWatchlistData(true);
    }, 15000); // Poll every 15s

    return () => clearInterval(interval);
  }, [isLiveAutoRefresh, loadAllWatchlistData]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadAllWatchlistData(false);
    setIsRefreshing(false);
  };

  // Compute indicators for active candles on the chart
  const currentIndicators = useMemo(() => {
    return computeAllIndicators(currentCandles);
  }, [currentCandles]);

  // Active stock setups
  const currentStockSetups = useMemo(() => {
    if (!currentStockMetadata) return [];
    return buildStrategySetups(currentStockMetadata, currentCandles);
  }, [currentStockMetadata, currentCandles]);

  // AUTOMATED Trade Setups for EVERY single item in the watchlist!
  const allStrategySetups = useMemo(() => {
    const setups: StrategySetup[] = [];

    allStockMetadata.forEach(stock => {
      const candles = candlesBySymbol[stock.symbol];
      if (candles && candles.length > 0) {
        const stockSetups = buildStrategySetups(stock, candles);
        setups.push(...stockSetups);
      }
    });

    return setups;
  }, [allStockMetadata, candlesBySymbol]);

  // Handle adding custom stock
  const handleAddStock = async (symbol: string, name: string) => {
    const clean = symbol.trim().toUpperCase();
    if (!stockProfiles.some(p => p.symbol === clean)) {
      const newProfile: NSEStockProfile = {
        symbol: clean,
        name,
        sector: clean.includes('BANK') ? 'Banking' : 'NSE Equities',
      };
      setStockProfiles(prev => [newProfile, ...prev]);

      try {
        setIsLoadingChart(true);
        const { metadata, candles } = await fetchNSEChart(clean, timeframe);
        setCandlesBySymbol(prev => ({ ...prev, [clean]: candles }));
        setAllStockMetadata(prev => [metadata, ...prev]);
        setCurrentCandles(candles);
        setCurrentStockMetadata(metadata);
        setSelectedSymbol(clean);
      } catch (err: any) {
        setChartError(err.message);
      } finally {
        setIsLoadingChart(false);
      }
    } else {
      setSelectedSymbol(clean);
    }
  };

  const handleRemoveStock = (symbolToRemove: string) => {
    setStockProfiles(prev => {
      const nextProfiles = prev.filter(p => p.symbol !== symbolToRemove);
      if (selectedSymbol === symbolToRemove && nextProfiles.length > 0) {
        setSelectedSymbol(nextProfiles[0].symbol);
      }
      return nextProfiles;
    });

    setAllStockMetadata(prev => prev.filter(s => s.symbol !== symbolToRemove));
    setCandlesBySymbol(prev => {
      const copy = { ...prev };
      delete copy[symbolToRemove];
      return copy;
    });
  };

  const handleResetWatchlist = () => {
    setStockProfiles(INITIAL_NSE_STOCKS);
    setSelectedSymbol('AVANTEL');
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(INITIAL_NSE_STOCKS));
      localStorage.setItem(SELECTED_SYMBOL_STORAGE_KEY, 'AVANTEL');
    } catch (e) {}
  };

  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    // On mobile or when selecting, switch to chart view
    setActiveView('chart');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f17] text-slate-100 antialiased">
      {/* Android Mobile Install Banner */}
      <AndroidInstallBanner />

      {/* 1. Header (Mobile & Desktop Responsive) */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        isLiveAutoRefresh={isLiveAutoRefresh}
        onToggleLiveAutoRefresh={() => setIsLiveAutoRefresh(prev => !prev)}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onOpenGuide={() => setIsGuideOpen(true)}
        selectedSymbol={selectedSymbol}
      />

      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Watchlist Sidebar (hidden on mobile) */}
        <aside className="hidden md:block shrink-0">
          <WatchlistSidebar
            stocks={allStockMetadata}
            selectedSymbol={selectedSymbol}
            onSelectStock={handleSelectStock}
            onAddStock={handleAddStock}
            onRemoveStock={handleRemoveStock}
            onResetWatchlist={handleResetWatchlist}
          />
        </aside>

        {/* Center Main Display (with padding bottom on mobile for Bottom Navigation Bar) */}
        <main className="flex-1 overflow-y-auto p-2.5 md:p-4 pb-20 md:pb-4 space-y-4">
          {/* Mobile-Only Dedicated Watchlist Screen */}
          {activeView === 'watchlist' && (
            <div className="md:hidden h-full flex flex-col">
              <WatchlistSidebar
                stocks={allStockMetadata}
                selectedSymbol={selectedSymbol}
                onSelectStock={handleSelectStock}
                onAddStock={handleAddStock}
                onRemoveStock={handleRemoveStock}
                onResetWatchlist={handleResetWatchlist}
              />
            </div>
          )}

          {/* Interactive Chart Screen (Mobile & Desktop) */}
          {(activeView === 'chart' || (activeView === 'watchlist' && typeof window !== 'undefined' && window.innerWidth >= 768)) && (
            <div className="space-y-4 max-w-[1600px] mx-auto">
              {/* Error Alert */}
              {chartError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{chartError}</span>
                  </div>
                  <button
                    onClick={() => loadAllWatchlistData(false)}
                    className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded font-semibold transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Chart Container */}
              <div className="h-[460px] md:h-[620px] w-full relative">
                {isLoadingChart && currentCandles.length === 0 && (
                  <div className="absolute inset-0 z-20 bg-[#0b0f17]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-slate-300 rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                    <span className="text-xs font-mono">Loading Real NSE Market Charts & Setups...</span>
                  </div>
                )}

                {currentStockMetadata && currentCandles.length > 0 && (
                  <InteractiveChart
                    symbol={currentStockMetadata.symbol}
                    stockName={currentStockMetadata.name}
                    candles={currentCandles}
                    indicators={currentIndicators}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                  />
                )}
              </div>

              {/* 4-Pillar Deep Dive: Inside Bar, EMA Cross, RSI Divergence, Volume Profile */}
              {currentStockMetadata && currentCandles.length > 0 && (
                <TechnicalSummaryCards
                  stock={currentStockMetadata}
                  candles={currentCandles}
                  indicators={currentIndicators}
                  setups={currentStockSetups}
                />
              )}
            </div>
          )}

          {/* Technical Screener Screen */}
          {activeView === 'screener' && (
            <div className="max-w-[1600px] mx-auto">
              <TechnicalScreener
                stocks={allStockMetadata}
                onSelectStock={handleSelectStock}
                selectedSymbol={selectedSymbol}
              />
            </div>
          )}

          {/* Automated Trade Setups Screen */}
          {activeView === 'setups' && (
            <div className="max-w-[1600px] mx-auto">
              <TradeSetupsList
                setups={allStrategySetups}
                onSelectStock={handleSelectStock}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Android Bottom Navigation Bar (Tabs: Watchlist, Charts, Setups, Screener) */}
      <MobileBottomNav
        activeView={activeView}
        onViewChange={setActiveView}
        setupsCount={allStrategySetups.length}
      />

      {/* Strategy Handbook Modal */}
      <StrategyGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
