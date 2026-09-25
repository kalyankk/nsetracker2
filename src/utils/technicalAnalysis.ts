import { Candle, InsideBarPattern, EMACrossover, RSIDivergence, TechnicalIndicators } from '../types/stock';

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  const k = 2 / (period + 1);

  // Initialize with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEMA = sum / period;
  result[period - 1] = Number(prevEMA.toFixed(2));

  // Compute subsequent EMAs
  for (let i = period; i < candles.length; i++) {
    const currentEMA = candles[i].close * k + prevEMA * (1 - k);
    result[i] = Number(currentEMA.toFixed(2));
    prevEMA = currentEMA;
  }

  return result;
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's Smoothing
 */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  // First period average gain & loss
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  // Subsequent Wilder's smoothed values
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  return result;
}

/**
 * Calculates Simple Moving Average of Volume
 */
export function calculateVolumeSMA(candles: Candle[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].volume;
  }
  result[period - 1] = Math.round(sum / period);

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].volume - candles[i - period].volume;
    result[i] = Math.round(sum / period);
  }

  return result;
}

/**
 * Detects Inside Bar Patterns, Mother Bars, and Breakouts
 * An inside bar occurs when High[i] <= High[mother] and Low[i] >= Low[mother].
 * Consecutive inside bars form multi-bar consolidation coils.
 * A breakout occurs when a subsequent candle closes outside the mother bar's range.
 */
export function detectInsideBars(candles: Candle[], volumeSMA: (number | null)[]): Map<number, InsideBarPattern> {
  const patterns = new Map<number, InsideBarPattern>();
  if (candles.length < 2) return patterns;

  // Track NR7 (Narrowest Range in 7 days)
  const ranges = candles.map(c => c.high - c.low);
  const isNR7 = (idx: number) => {
    if (idx < 6) return false;
    const currentRange = ranges[idx];
    for (let j = idx - 6; j < idx; j++) {
      if (ranges[j] <= currentRange) return false;
    }
    return true;
  };

  let currentMotherIdx: number | null = null;
  let insideCount = 0;

  for (let i = 1; i < candles.length; i++) {
    const prevCandle = candles[i - 1];
    const currCandle = candles[i];

    // Check if current candle is an inside bar relative to the active mother bar or previous candle
    const testMotherIdx = currentMotherIdx !== null ? currentMotherIdx : (i - 1);
    const motherCandle = candles[testMotherIdx];

    const isInside = currCandle.high <= motherCandle.high && currCandle.low >= motherCandle.low;

    if (isInside) {
      if (currentMotherIdx === null) {
        currentMotherIdx = i - 1;
        // Mark mother bar
        patterns.set(currentMotherIdx, {
          candleIndex: currentMotherIdx,
          isInsideBar: false,
          isMotherBar: true,
          motherBarIndex: null,
          insideBarNumber: 0,
          motherHigh: candles[currentMotherIdx].high,
          motherLow: candles[currentMotherIdx].low,
          isNR7: isNR7(currentMotherIdx),
          breakout: null,
        });
      }

      insideCount++;
      patterns.set(i, {
        candleIndex: i,
        isInsideBar: true,
        isMotherBar: false,
        motherBarIndex: currentMotherIdx,
        insideBarNumber: insideCount,
        motherHigh: motherCandle.high,
        motherLow: motherCandle.low,
        isNR7: isNR7(i),
        breakout: null,
      });
    } else {
      // If we had an active mother bar, check if this bar broke out!
      if (currentMotherIdx !== null) {
        const motherHigh = candles[currentMotherIdx].high;
        const motherLow = candles[currentMotherIdx].low;
        const volAvg = volumeSMA[i] || 1;
        const isVolConfirmed = currCandle.volume > volAvg * 1.2;

        if (currCandle.close > motherHigh) {
          // Bullish Breakout!
          const motherPattern = patterns.get(currentMotherIdx);
          if (motherPattern) {
            motherPattern.breakout = {
              occurred: true,
              type: 'bullish',
              breakoutBarIndex: i,
              breakoutPrice: currCandle.close,
              volumeConfirmed: isVolConfirmed,
            };
          }
          patterns.set(i, {
            candleIndex: i,
            isInsideBar: false,
            isMotherBar: false,
            motherBarIndex: currentMotherIdx,
            insideBarNumber: 0,
            motherHigh,
            motherLow,
            isNR7: isNR7(i),
            breakout: {
              occurred: true,
              type: 'bullish',
              breakoutBarIndex: i,
              breakoutPrice: currCandle.close,
              volumeConfirmed: isVolConfirmed,
            },
          });
        } else if (currCandle.close < motherLow) {
          // Bearish Breakdown!
          const motherPattern = patterns.get(currentMotherIdx);
          if (motherPattern) {
            motherPattern.breakout = {
              occurred: true,
              type: 'bearish',
              breakoutBarIndex: i,
              breakoutPrice: currCandle.close,
              volumeConfirmed: isVolConfirmed,
            };
          }
          patterns.set(i, {
            candleIndex: i,
            isInsideBar: false,
            isMotherBar: false,
            motherBarIndex: currentMotherIdx,
            insideBarNumber: 0,
            motherHigh,
            motherLow,
            isNR7: isNR7(i),
            breakout: {
              occurred: true,
              type: 'bearish',
              breakoutBarIndex: i,
              breakoutPrice: currCandle.close,
              volumeConfirmed: isVolConfirmed,
            },
          });
        }
      }

      // Reset consolidation tracking
      currentMotherIdx = null;
      insideCount = 0;
    }
  }

  return patterns;
}

/**
 * Detects EMA Crossovers (e.g. 9 crosses 21, or 50 crosses 200)
 */
export function detectEMACrossovers(
  candles: Candle[],
  emaFast: (number | null)[],
  emaSlow: (number | null)[],
  fastPeriod: number,
  slowPeriod: number
): EMACrossover[] {
  const crossovers: EMACrossover[] = [];
  const startIdx = Math.max(fastPeriod, slowPeriod);

  for (let i = startIdx; i < candles.length; i++) {
    const prevFast = emaFast[i - 1];
    const prevSlow = emaSlow[i - 1];
    const currFast = emaFast[i];
    const currSlow = emaSlow[i];

    if (prevFast === null || prevSlow === null || currFast === null || currSlow === null) {
      continue;
    }

    // Bullish Crossover (Fast crosses above Slow)
    if (prevFast <= prevSlow && currFast > currSlow) {
      const isGolden = fastPeriod === 50 && slowPeriod === 200;
      crossovers.push({
        index: i,
        type: isGolden ? 'golden_50_200' : 'bullish_9_21',
        fastPeriod,
        slowPeriod,
        price: candles[i].close,
        date: candles[i].date,
        label: isGolden ? `Golden Cross (50/200)` : `Bullish EMA Cross (${fastPeriod}/${slowPeriod})`,
      });
    }

    // Bearish Crossover (Fast crosses below Slow)
    if (prevFast >= prevSlow && currFast < currSlow) {
      const isDeath = fastPeriod === 50 && slowPeriod === 200;
      crossovers.push({
        index: i,
        type: isDeath ? 'death_50_200' : 'bearish_9_21',
        fastPeriod,
        slowPeriod,
        price: candles[i].close,
        date: candles[i].date,
        label: isDeath ? `Death Cross (50/200)` : `Bearish EMA Cross (${fastPeriod}/${slowPeriod})`,
      });
    }
  }

  return crossovers;
}

/**
 * Detects RSI Divergences (Regular Bullish and Bearish Divergences)
 * Finds swing highs and swing lows using local fractal peaks, then checks
 * if price slope opposes RSI slope.
 */
export function detectRSIDivergence(candles: Candle[], rsiValues: (number | null)[]): RSIDivergence[] {
  const divergences: RSIDivergence[] = [];
  const lookback = 3; // Fractal lookback
  const minBarsApart = 4;
  const maxBarsApart = 35;

  interface SwingPoint {
    index: number;
    price: number;
    rsi: number;
    date: string;
  }

  const swingLows: SwingPoint[] = [];
  const swingHighs: SwingPoint[] = [];

  // 1. Identify swing lows and swing highs
  for (let i = lookback; i < candles.length - lookback; i++) {
    const rsi = rsiValues[i];
    if (rsi === null) continue;

    // Check Swing Low
    let isSwingLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].low < candles[i].low || candles[i + j].low < candles[i].low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swingLows.push({ index: i, price: candles[i].low, rsi, date: candles[i].date });
    }

    // Check Swing High
    let isSwingHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high > candles[i].high || candles[i + j].high > candles[i].high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swingHighs.push({ index: i, price: candles[i].high, rsi, date: candles[i].date });
    }
  }

  // 2. Identify Regular Bullish Divergence (Price Lower Low + RSI Higher Low)
  for (let j = 1; j < swingLows.length; j++) {
    const prevLow = swingLows[j - 1];
    const currLow = swingLows[j];
    const barDiff = currLow.index - prevLow.index;

    if (barDiff >= minBarsApart && barDiff <= maxBarsApart) {
      // Price makes lower low, RSI makes higher low
      const priceDelta = currLow.price - prevLow.price;
      const rsiDelta = currLow.rsi - prevLow.rsi;

      if (priceDelta < 0 && rsiDelta > 2.5 && (prevLow.rsi <= 40 || currLow.rsi <= 45)) {
        divergences.push({
          id: `bull-div-${prevLow.index}-${currLow.index}`,
          type: 'bullish',
          fromIndex: prevLow.index,
          toIndex: currLow.index,
          fromDate: prevLow.date,
          toDate: currLow.date,
          fromPrice: prevLow.price,
          toPrice: currLow.price,
          fromRsi: prevLow.rsi,
          toRsi: currLow.rsi,
          priceDelta,
          rsiDelta,
          confirmed: true,
          description: `Bullish Divergence: Price dropped ₹${Math.abs(priceDelta).toFixed(1)} while RSI climbed +${rsiDelta.toFixed(1)} pts`,
        });
      }
    }
  }

  // 3. Identify Regular Bearish Divergence (Price Higher High + RSI Lower High)
  for (let j = 1; j < swingHighs.length; j++) {
    const prevHigh = swingHighs[j - 1];
    const currHigh = swingHighs[j];
    const barDiff = currHigh.index - prevHigh.index;

    if (barDiff >= minBarsApart && barDiff <= maxBarsApart) {
      // Price makes higher high, RSI makes lower high
      const priceDelta = currHigh.price - prevHigh.price;
      const rsiDelta = currHigh.rsi - prevHigh.rsi;

      if (priceDelta > 0 && rsiDelta < -2.5 && (prevHigh.rsi >= 60 || currHigh.rsi >= 55)) {
        divergences.push({
          id: `bear-div-${prevHigh.index}-${currHigh.index}`,
          type: 'bearish',
          fromIndex: prevHigh.index,
          toIndex: currHigh.index,
          fromDate: prevHigh.date,
          toDate: currHigh.date,
          fromPrice: prevHigh.price,
          toPrice: currHigh.price,
          fromRsi: prevHigh.rsi,
          toRsi: currHigh.rsi,
          priceDelta,
          rsiDelta,
          confirmed: true,
          description: `Bearish Divergence: Price rose +₹${priceDelta.toFixed(1)} while RSI fell ${rsiDelta.toFixed(1)} pts`,
        });
      }
    }
  }

  return divergences;
}

/**
 * Computes all technical indicators and signals for a candle series
 */
export function computeAllIndicators(candles: Candle[]): TechnicalIndicators {
  const ema9 = calculateEMA(candles, 9);
  const ema21 = calculateEMA(candles, 21);
  const ema50 = calculateEMA(candles, 50);
  const ema200 = calculateEMA(candles, 200);
  const rsi14 = calculateRSI(candles, 14);
  const volumeSMA20 = calculateVolumeSMA(candles, 20);

  const insideBars = detectInsideBars(candles, volumeSMA20);
  const crosses9_21 = detectEMACrossovers(candles, ema9, ema21, 9, 21);
  const crosses50_200 = detectEMACrossovers(candles, ema50, ema200, 50, 200);
  const emaCrossovers = [...crosses9_21, ...crosses50_200].sort((a, b) => a.index - b.index);

  const rsiDivergences = detectRSIDivergence(candles, rsi14);

  const volumeSpikes = candles.map((c, i) => {
    const sma = volumeSMA20[i];
    return sma !== null ? c.volume >= sma * 1.5 : false;
  });

  const volumeDryUps = candles.map((c, i) => {
    const sma = volumeSMA20[i];
    const isInside = insideBars.has(i) && insideBars.get(i)?.isInsideBar;
    return sma !== null && isInside ? c.volume <= sma * 0.65 : false;
  });

  return {
    ema9,
    ema21,
    ema50,
    ema200,
    rsi14,
    volumeSMA20,
    insideBars,
    emaCrossovers,
    rsiDivergences,
    volumeSpikes,
    volumeDryUps,
  };
}
