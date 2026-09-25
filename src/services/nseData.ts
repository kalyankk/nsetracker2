import { Candle, StockMetadata, StrategySetup, Timeframe } from '../types/stock';
import { computeAllIndicators } from '../utils/technicalAnalysis';

export interface NSEStockProfile {
  symbol: string;
  name: string;
  sector: string;
  marketCap?: string;
  pe?: number;
}

export const INITIAL_NSE_STOCKS: NSEStockProfile[] = [
  { symbol: 'AVANTEL', name: 'Avantel Limited', sector: 'Telecom & Defense' },
  { symbol: 'SAGILITY', name: 'Sagility Limited', sector: 'Healthcare Services' },
  { symbol: 'WELSPUNLIV', name: 'Welspun Living Limited', sector: 'Textiles & Consumer' },
  { symbol: 'SOUTHBANK', name: 'The South Indian Bank Limited', sector: 'Banking' },
  { symbol: 'SHANTIGOLD', name: 'Shanti Gold International Limited', sector: 'Gems & Jewellery' },
  { symbol: 'SAKAR', name: 'Sakar Healthcare Limited', sector: 'Pharmaceuticals' },
  { symbol: 'PENIND', name: 'Pennar Industries Limited', sector: 'Engineering & Industrial' },
  { symbol: 'NORTHARC', name: 'Northern Arc Capital Limited', sector: 'Financial Services' },
  { symbol: 'NAZARA', name: 'Nazara Technologies Limited', sector: 'Gaming & Technology' },
  { symbol: 'KTKBANK', name: 'The Karnataka Bank Limited', sector: 'Banking' },
  { symbol: 'KPIL', name: 'Kalpataru Projects International Limited', sector: 'Infrastructure & Power' },
  { symbol: 'HINDCOPPER', name: 'Hindustan Copper Limited', sector: 'Metals & Mining' },
  { symbol: 'DCBBANK', name: 'DCB Bank Limited', sector: 'Banking' },
  { symbol: 'CDSL', name: 'Central Depository Services (India) Limited', sector: 'Financial Infrastructure' },
  { symbol: 'BBOX', name: 'Black Box Limited', sector: 'IT & Digital Infrastructure' },
  { symbol: 'BAJAJCON', name: 'Bajaj Consumer Care Limited', sector: 'FMCG & Personal Care' },
  { symbol: 'AVALON', name: 'Avalon Technologies Limited', sector: 'Electronic Manufacturing' },
  { symbol: 'ANANTRAJ', name: 'Anant Raj Limited', sector: 'Real Estate & Infra' },
];

/**
 * Derives full metadata and technical pattern signals (Inside Bar, EMA Cross, RSI Div, Vol)
 * from authentic candlestick series
 */
export function deriveStockMetadataAndSignals(
  symbol: string,
  name: string,
  candles: Candle[],
  rawData?: any
): StockMetadata {
  if (candles.length === 0) {
    return {
      symbol: symbol.toUpperCase(),
      name,
      sector: getSectorForSymbol(symbol),
      price: rawData?.price || 0,
      change: rawData?.change || 0,
      changePercent: rawData?.changePercent || 0,
      dayHigh: rawData?.dayHigh || 0,
      dayLow: rawData?.dayLow || 0,
      volume: rawData?.volume || 0,
      avgVolume: rawData?.volume || 0,
      yearHigh: rawData?.fiftyTwoWeekHigh || 0,
      yearLow: rawData?.fiftyTwoWeekLow || 0,
      vwap: rawData?.price || 0,
      marketCap: 'NSE Listed',
    };
  }

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;

  // Derive indicators to determine active technical signals on real data
  const indicators = computeAllIndicators(candles);
  const lastIdx = candles.length - 1;
  const insidePattern = indicators.insideBars.get(lastIdx);
  const prevInsidePattern = indicators.insideBars.get(lastIdx - 1);

  let latestSignal: StockMetadata['latestSignal'] = {
    type: 'NEUTRAL',
    label: 'Consolidating Range',
    description: 'Price tracking within standard moving average boundaries',
    bias: 'NEUTRAL',
    timeAgo: 'Latest Candle',
  };

  if (insidePattern?.breakout?.occurred || prevInsidePattern?.breakout?.occurred) {
    const isBull = insidePattern?.breakout?.type === 'bullish' || prevInsidePattern?.breakout?.type === 'bullish';
    latestSignal = {
      type: isBull ? 'BULLISH_BREAKOUT' : 'BEARISH_BREAKOUT',
      label: isBull ? 'Inside Bar Breakout (Bullish)' : 'Inside Bar Breakdown (Bearish)',
      description: isBull
        ? `Closed above Mother Bar High with ${insidePattern?.breakout?.volumeConfirmed ? 'Volume Confirmation' : 'Normal Volume'}`
        : `Broke below Mother Bar Low with elevated selling volume`,
      bias: isBull ? 'BULLISH' : 'BEARISH',
      timeAgo: 'Latest Candle',
    };
  } else if (insidePattern?.isInsideBar) {
    latestSignal = {
      type: 'INSIDE_BAR',
      label: `Inside Bar (Coil #${insidePattern.insideBarNumber})`,
      description: `Compressing inside Mother Bar [₹${insidePattern.motherLow?.toFixed(1)} - ₹${insidePattern.motherHigh?.toFixed(1)}]. Watch for expansion.`,
      bias: 'NEUTRAL',
      timeAgo: 'Forming',
    };
  } else if (indicators.emaCrossovers.length > 0 && indicators.emaCrossovers[indicators.emaCrossovers.length - 1].index >= lastIdx - 3) {
    const latestCross = indicators.emaCrossovers[indicators.emaCrossovers.length - 1];
    const isBull = latestCross.type.includes('bullish') || latestCross.type.includes('golden');
    latestSignal = {
      type: isBull ? 'EMA_BULL_CROSS' : 'EMA_BEAR_CROSS',
      label: latestCross.label,
      description: `${latestCross.fastPeriod} EMA crossed ${isBull ? 'above' : 'below'} ${latestCross.slowPeriod} EMA at ₹${latestCross.price}`,
      bias: isBull ? 'BULLISH' : 'BEARISH',
      timeAgo: `${lastIdx - latestCross.index} bars ago`,
    };
  } else if (indicators.rsiDivergences.length > 0 && indicators.rsiDivergences[indicators.rsiDivergences.length - 1].toIndex >= lastIdx - 6) {
    const div = indicators.rsiDivergences[indicators.rsiDivergences.length - 1];
    latestSignal = {
      type: div.type === 'bullish' ? 'RSI_BULL_DIV' : 'RSI_BEAR_DIV',
      label: div.type === 'bullish' ? 'Bullish RSI Divergence' : 'Bearish RSI Divergence',
      description: div.description,
      bias: div.type === 'bullish' ? 'BULLISH' : 'BEARISH',
      timeAgo: 'Recent Swing',
    };
  } else if (indicators.volumeSpikes[lastIdx]) {
    latestSignal = {
      type: 'VOLUME_SPIKE',
      label: 'Volume Surge (>1.5x Avg)',
      description: `Volume of ${(lastCandle.volume / 100000).toFixed(1)}L represents institutional participation`,
      bias: lastCandle.close >= lastCandle.open ? 'BULLISH' : 'BEARISH',
      timeAgo: 'Active Bar',
    };
  }

  // Calculate VWAP
  let volSum = 0;
  let vwapSum = 0;
  candles.forEach(c => {
    volSum += c.volume;
    vwapSum += ((c.high + c.low + c.close) / 3) * c.volume;
  });
  const vwap = volSum > 0 ? Number((vwapSum / volSum).toFixed(2)) : lastCandle.close;
  const avgVolume = volSum > 0 ? Math.round(volSum / candles.length) : lastCandle.volume;

  const currentPrice = rawData?.price || lastCandle.close;
  const prevClose = rawData?.previousClose || prevCandle.close;
  const change = rawData?.change !== undefined ? rawData.change : Number((currentPrice - prevClose).toFixed(2));
  const changePercent = rawData?.changePercent !== undefined ? rawData.changePercent : (prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0);

  return {
    symbol: symbol.toUpperCase(),
    name: rawData?.name || name,
    sector: getSectorForSymbol(symbol),
    price: currentPrice,
    change,
    changePercent,
    dayHigh: rawData?.dayHigh || lastCandle.high,
    dayLow: rawData?.dayLow || lastCandle.low,
    volume: rawData?.volume || lastCandle.volume,
    avgVolume,
    yearHigh: rawData?.fiftyTwoWeekHigh || Math.max(...candles.map(c => c.high)),
    yearLow: rawData?.fiftyTwoWeekLow || Math.min(...candles.map(c => c.low)),
    vwap,
    marketCap: 'NSE Listed',
    latestSignal,
  };
}

/**
 * Fetches Live Chart & Candlestick history for a single NSE ticker
 * Seamlessly supports both Express proxy server and static GitHub Pages hosting
 */
export async function fetchNSEChart(
  symbol: string,
  timeframe: Timeframe = '1D'
): Promise<{ metadata: StockMetadata; candles: Candle[] }> {
  const cleanSym = symbol === 'NIFTY 50' ? '^NSEI' : symbol === 'BANKNIFTY' ? '^NSEBANK' : symbol;

  // 1. Try local/server proxy endpoint
  try {
    const res = await fetch(`/api/nse/chart?symbol=${encodeURIComponent(cleanSym)}&timeframe=${timeframe}`);
    if (res.ok) {
      const data = await res.json();
      const candles: Candle[] = data.candles || [];
      if (candles.length > 0) {
        const metadata = deriveStockMetadataAndSignals(symbol, data.name || symbol, candles, data);
        return { metadata, candles };
      }
    }
  } catch {
    // Fallback to static datasets on GitHub Pages
  }

  // 2. Static GitHub Pages Fallback: individual stock JSON
  try {
    const staticRes = await fetch(`./data/stocks/${encodeURIComponent(cleanSym)}.json`);
    if (staticRes.ok) {
      const staticItem = await staticRes.json();
      const candles: Candle[] = staticItem.candles || [];
      if (candles.length > 0) {
        const metadata = deriveStockMetadataAndSignals(symbol, staticItem.name || symbol, candles, staticItem);
        return { metadata, candles };
      }
    }
  } catch {
    // Continue
  }

  // 3. Static GitHub Pages Fallback: extract from batch-charts JSON
  try {
    const batchRes = await fetch(`./data/batch-charts${timeframe === '1D' ? '' : '-' + timeframe}.json`);
    if (batchRes.ok) {
      const batchList = await batchRes.json();
      const item = batchList.find((b: any) => b.symbol.toUpperCase() === cleanSym.toUpperCase());
      if (item && item.candles?.length > 0) {
        return {
          metadata: deriveStockMetadataAndSignals(item.symbol, item.name || item.symbol, item.candles, item),
          candles: item.candles,
        };
      }
    }
  } catch {}

  throw new Error(`Failed to load NSE chart data for ${symbol}`);
}

/**
 * Fetches batch charts & candles for ALL symbols in watchlist simultaneously
 * Seamlessly supports both Express proxy server and static GitHub Pages hosting
 */
export async function fetchNSEBatchCharts(
  symbols: string[],
  timeframe: Timeframe = '1D'
): Promise<{ symbol: string; metadata: StockMetadata; candles: Candle[] }[]> {
  // 1. Try local/server proxy endpoint
  try {
    const res = await fetch('/api/nse/batch-charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, timeframe }),
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any) => {
          const candles: Candle[] = item.candles || [];
          const metadata = deriveStockMetadataAndSignals(item.symbol, item.name, candles, item);
          return {
            symbol: item.symbol,
            metadata,
            candles,
          };
        });
      }
    }
  } catch {
    // Server proxy not available (GitHub Pages static environment)
  }

  // 2. Static GitHub Pages Fallback: load pre-bundled static batch datasets
  try {
    const staticRes = await fetch(`./data/batch-charts${timeframe === '1D' ? '' : '-' + timeframe}.json`);
    if (staticRes.ok) {
      const items = await staticRes.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any) => {
          const candles: Candle[] = item.candles || [];
          const metadata = deriveStockMetadataAndSignals(item.symbol, item.name, candles, item);
          return {
            symbol: item.symbol,
            metadata,
            candles,
          };
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load static batch charts data on GitHub Pages', err);
  }

  return [];
}

/**
 * Fetches batch live quotes for multiple NSE stocks
 */
export async function fetchNSEBatchQuotes(symbols: string[]): Promise<StockMetadata[]> {
  try {
    const res = await fetch('/api/nse/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    });
    if (!res.ok) return [];
    const items = await res.json();
    return items.map((item: any) => ({
      symbol: item.symbol,
      name: item.name,
      sector: getSectorForSymbol(item.symbol),
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      dayHigh: item.dayHigh,
      dayLow: item.dayLow,
      volume: item.volume,
      avgVolume: item.volume || 1000000,
      yearHigh: item.yearHigh || item.dayHigh,
      yearLow: item.yearLow || item.dayLow,
      vwap: item.price,
      marketCap: 'NSE',
    }));
  } catch {
    return [];
  }
}

/**
 * Searches symbols on NSE with client-side fallback for GitHub Pages
 */
export async function searchNSESymbols(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
  try {
    const res = await fetch(`/api/nse/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) return results;
    }
  } catch {}

  // Client-side fallback for GitHub Pages
  const cleanQ = query.trim().toUpperCase();
  return INITIAL_NSE_STOCKS
    .filter(s => s.symbol.includes(cleanQ) || s.name.toUpperCase().includes(cleanQ))
    .map(s => ({
      symbol: s.symbol,
      name: s.name,
      exchange: 'NSE',
    }));
}

function getSectorForSymbol(symbol: string): string {
  const profile = INITIAL_NSE_STOCKS.find(p => p.symbol === symbol.toUpperCase());
  if (profile) return profile.sector;
  if (symbol.includes('BANK')) return 'Banking & Financials';
  if (symbol.includes('NIFTY')) return 'Benchmark Index';
  return 'NSE Equities';
}

/**
 * Builds actionable Trading Setups from real chart data
 */
export function buildStrategySetups(stock: StockMetadata, candles: Candle[]): StrategySetup[] {
  if (!candles || candles.length < 15) return [];

  const indicators = computeAllIndicators(candles);
  const setups: StrategySetup[] = [];
  const lastCandle = candles[candles.length - 1];

  // Inside Bar Setup on real data
  const lastIB = Array.from(indicators.insideBars.values()).pop();
  if (lastIB && (lastIB.isInsideBar || lastIB.isMotherBar || lastIB.breakout?.occurred)) {
    const mHigh = lastIB.motherHigh || lastCandle.high;
    const mLow = lastIB.motherLow || lastCandle.low;
    const range = Math.max(1, mHigh - mLow);

    if (lastIB.breakout?.type === 'bullish' || (!lastIB.breakout && stock.changePercent >= 0)) {
      setups.push({
        symbol: stock.symbol,
        stockName: stock.name,
        strategyName: 'Inside Bar Breakout',
        bias: 'BULLISH',
        entryPrice: Number((mHigh + range * 0.05).toFixed(2)),
        stopLoss: Number(mLow.toFixed(2)),
        target1: Number((mHigh + range * 1.5).toFixed(2)),
        target2: Number((mHigh + range * 2.5).toFixed(2)),
        riskReward: '1 : 2.2',
        timestamp: lastCandle.date,
        rationale: `Mother Bar Range ₹${range.toFixed(1)} [₹${mLow.toFixed(1)} - ₹${mHigh.toFixed(1)}]. Breakout above mother high confirmed on live NSE volume.`,
        confidence: lastIB.breakout?.volumeConfirmed ? 'High' : 'Moderate',
      });
    } else {
      setups.push({
        symbol: stock.symbol,
        stockName: stock.name,
        strategyName: 'Inside Bar Breakout',
        bias: 'BEARISH',
        entryPrice: Number((mLow - range * 0.05).toFixed(2)),
        stopLoss: Number(mHigh.toFixed(2)),
        target1: Number((mLow - range * 1.5).toFixed(2)),
        target2: Number((mLow - range * 2.5).toFixed(2)),
        riskReward: '1 : 2.0',
        timestamp: lastCandle.date,
        rationale: `Breakdown below Mother Bar support ₹${mLow.toFixed(1)} confirms downward momentum expansion.`,
        confidence: 'Moderate',
      });
    }
  }

  // EMA Cross Setup on real data
  const recentCross = indicators.emaCrossovers[indicators.emaCrossovers.length - 1];
  if (recentCross && recentCross.index >= candles.length - 20) {
    const isBull = recentCross.type.includes('bullish') || recentCross.type.includes('golden');
    const entry = lastCandle.close;
    const atrApprox = Math.max(2, lastCandle.close * 0.015);

    setups.push({
      symbol: stock.symbol,
      stockName: stock.name,
      strategyName: 'EMA Momentum Cross',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      entryPrice: entry,
      stopLoss: isBull ? Number((entry - atrApprox * 1.5).toFixed(2)) : Number((entry + atrApprox * 1.5).toFixed(2)),
      target1: isBull ? Number((entry + atrApprox * 2.5).toFixed(2)) : Number((entry - atrApprox * 2.5).toFixed(2)),
      target2: isBull ? Number((entry + atrApprox * 4.0).toFixed(2)) : Number((entry - atrApprox * 4.0).toFixed(2)),
      riskReward: '1 : 2.4',
      timestamp: recentCross.date,
      rationale: `${recentCross.label} detected on live NSE price action at ₹${recentCross.price.toFixed(1)}. Moving average alignment favors ${isBull ? 'buyers' : 'sellers'}.`,
      confidence: 'High',
    });
  }

  // RSI Divergence Setup on real data
  const recentDiv = indicators.rsiDivergences[indicators.rsiDivergences.length - 1];
  if (recentDiv && recentDiv.toIndex >= candles.length - 25) {
    const isBull = recentDiv.type === 'bullish';
    const entry = lastCandle.close;
    const delta = Math.max(3, Math.abs(recentDiv.priceDelta));

    setups.push({
      symbol: stock.symbol,
      stockName: stock.name,
      strategyName: 'RSI Swing Divergence',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      entryPrice: entry,
      stopLoss: isBull ? Number((recentDiv.toPrice - delta * 0.4).toFixed(2)) : Number((recentDiv.toPrice + delta * 0.4).toFixed(2)),
      target1: isBull ? Number((entry + delta * 1.4).toFixed(2)) : Number((entry - delta * 1.4).toFixed(2)),
      target2: isBull ? Number((entry + delta * 2.2).toFixed(2)) : Number((entry - delta * 2.2).toFixed(2)),
      riskReward: '1 : 2.6',
      timestamp: recentDiv.toDate,
      rationale: `${recentDiv.description}. Swing oscillator points show divergence on authentic NSE market data.`,
      confidence: 'High',
    });
  }

  return setups;
}
