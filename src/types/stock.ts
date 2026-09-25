export interface Candle {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1D' | '1W' | '1M';

export interface InsideBarPattern {
  candleIndex: number;
  isInsideBar: boolean;
  isMotherBar: boolean;
  motherBarIndex: number | null;
  insideBarNumber: number; // 1 for first IB, 2 for second IB (double), etc.
  motherHigh: number | null;
  motherLow: number | null;
  isNR7?: boolean; // Narrowest range in 7 bars
  breakout: {
    occurred: boolean;
    type: 'bullish' | 'bearish' | null;
    breakoutBarIndex: number | null;
    breakoutPrice: number | null;
    volumeConfirmed: boolean;
  } | null;
}

export interface EMACrossover {
  index: number;
  type: 'bullish_9_21' | 'bearish_9_21' | 'golden_50_200' | 'death_50_200';
  fastPeriod: number;
  slowPeriod: number;
  price: number;
  date: string;
  label: string;
}

export interface RSIDivergence {
  id: string;
  type: 'bullish' | 'bearish';
  fromIndex: number;
  toIndex: number;
  fromDate: string;
  toDate: string;
  fromPrice: number;
  toPrice: number;
  fromRsi: number;
  toRsi: number;
  priceDelta: number;
  rsiDelta: number;
  confirmed: boolean;
  description: string;
}

export interface TechnicalIndicators {
  ema9: (number | null)[];
  ema21: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  rsi14: (number | null)[];
  volumeSMA20: (number | null)[];
  insideBars: Map<number, InsideBarPattern>;
  emaCrossovers: EMACrossover[];
  rsiDivergences: RSIDivergence[];
  volumeSpikes: boolean[];
  volumeDryUps: boolean[];
}

export interface StockMetadata {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  yearHigh: number;
  yearLow: number;
  vwap: number;
  marketCap: string;
  latestSignal?: {
    type: 'INSIDE_BAR' | 'BULLISH_BREAKOUT' | 'BEARISH_BREAKOUT' | 'EMA_BULL_CROSS' | 'EMA_BEAR_CROSS' | 'RSI_BULL_DIV' | 'RSI_BEAR_DIV' | 'VOLUME_SPIKE' | 'NEUTRAL';
    label: string;
    description: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    timeAgo: string;
  };
}

export interface StrategySetup {
  symbol: string;
  stockName: string;
  strategyName: 'Inside Bar Breakout' | 'EMA Momentum Cross' | 'RSI Swing Divergence' | 'High Volume Compression';
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: string;
  timestamp: string;
  rationale: string;
  confidence: 'High' | 'Moderate' | 'Speculative';
}
