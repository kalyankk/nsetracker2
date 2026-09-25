import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Candle, TechnicalIndicators, InsideBarPattern, Timeframe } from '../../types/stock';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Layers, Activity, TrendingUp } from 'lucide-react';

interface ChartProps {
  symbol: string;
  stockName: string;
  candles: Candle[];
  indicators: TechnicalIndicators;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const InteractiveChart: React.FC<ChartProps> = ({
  symbol,
  stockName,
  candles,
  indicators,
  timeframe,
  onTimeframeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport / zoom / pan state
  const [visibleCount, setVisibleCount] = useState<number>(65);
  const [offsetIndex, setOffsetIndex] = useState<number>(0); // 0 means latest candles visible on right
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Indicator visibility toggles
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showInsideBars, setShowInsideBars] = useState(true);
  const [showBreakoutArrows, setShowBreakoutArrows] = useState(true);
  const [showDivergenceLines, setShowDivergenceLines] = useState(true);
  const [showVolumePanel, setShowVolumePanel] = useState(true);
  const [showRSIPanel, setShowRSIPanel] = useState(true);

  // Ensure offsetIndex stays valid as candles change
  useEffect(() => {
    setOffsetIndex(0);
  }, [symbol, timeframe]);

  // Sliced candles based on zoom and pan
  const maxOffset = Math.max(0, candles.length - visibleCount);
  const clampedOffset = Math.min(Math.max(0, offsetIndex), maxOffset);

  const startIndex = Math.max(0, candles.length - visibleCount - clampedOffset);
  const endIndex = Math.min(candles.length, startIndex + visibleCount);

  const visibleCandles = useMemo(() => {
    return candles.slice(startIndex, endIndex);
  }, [candles, startIndex, endIndex]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration
    const paddingRight = 68; // Price scale
    const paddingLeft = 12;
    const chartWidth = width - paddingLeft - paddingRight;

    // Vertical partition heights
    const volumeHeightRatio = showVolumePanel ? 0.20 : 0;
    const rsiHeightRatio = showRSIPanel ? 0.22 : 0;
    const priceHeightRatio = 1 - volumeHeightRatio - rsiHeightRatio;

    const priceTop = 24;
    const priceBottom = height * priceHeightRatio - 12;
    const priceChartHeight = priceBottom - priceTop;

    const volTop = showVolumePanel ? priceBottom + 16 : 0;
    const volBottom = showVolumePanel ? volTop + height * volumeHeightRatio - 24 : 0;
    const volChartHeight = volBottom - volTop;

    const rsiTop = showRSIPanel ? (showVolumePanel ? volBottom + 16 : priceBottom + 16) : 0;
    const rsiBottom = showRSIPanel ? height - 24 : 0;
    const rsiChartHeight = rsiBottom - rsiTop;

    // Background fill
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, height);

    // Candle geometry
    const n = visibleCandles.length;
    const candleSlotWidth = chartWidth / n;
    const candleWidth = Math.max(2, Math.min(24, candleSlotWidth * 0.72));

    // Calculate Price Min & Max within visible window
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Also include EMAs in bounds if enabled
    for (let i = startIndex; i < endIndex; i++) {
      if (showEMA9 && indicators.ema9[i] !== null) {
        minPrice = Math.min(minPrice, indicators.ema9[i]!);
        maxPrice = Math.max(maxPrice, indicators.ema9[i]!);
      }
      if (showEMA21 && indicators.ema21[i] !== null) {
        minPrice = Math.min(minPrice, indicators.ema21[i]!);
        maxPrice = Math.max(maxPrice, indicators.ema21[i]!);
      }
      if (showEMA50 && indicators.ema50[i] !== null) {
        minPrice = Math.min(minPrice, indicators.ema50[i]!);
        maxPrice = Math.max(maxPrice, indicators.ema50[i]!);
      }
      if (showEMA200 && indicators.ema200[i] !== null) {
        minPrice = Math.min(minPrice, indicators.ema200[i]!);
        maxPrice = Math.max(maxPrice, indicators.ema200[i]!);
      }
    }

    // Add breathing room to price scale
    const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    const getYForPrice = (p: number) => {
      return priceBottom - ((p - minPrice) / (maxPrice - minPrice)) * priceChartHeight;
    };

    const getXForIndex = (i: number) => {
      return paddingLeft + (i + 0.5) * candleSlotWidth;
    };

    // 1. Draw Grid Lines & Price Scale
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    const numPriceSteps = 6;
    for (let s = 0; s <= numPriceSteps; s++) {
      const p = minPrice + (s / numPriceSteps) * (maxPrice - minPrice);
      const y = getYForPrice(p);

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Right-side price labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`₹${p.toFixed(1)}`, width - paddingRight + 8, y + 3);
    }

    // Vertical Date Grid Lines
    const dateInterval = Math.max(4, Math.floor(n / 7));
    for (let i = 0; i < n; i += dateInterval) {
      const x = getXForIndex(i);
      ctx.beginPath();
      ctx.moveTo(x, priceTop);
      ctx.lineTo(x, height - 16);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const c = visibleCandles[i];
      if (c) {
        ctx.fillText(c.date.split(' ').slice(0, 2).join(' '), x, height - 4);
      }
    }

    // 2. Draw Inside Bar / Mother Bar Consolidation Boxes
    if (showInsideBars) {
      let activeMother: InsideBarPattern | null = null;
      let startBoxIdx: number | null = null;

      for (let i = 0; i < n; i++) {
        const globalIdx = startIndex + i;
        const pattern = indicators.insideBars.get(globalIdx);

        if (pattern?.isMotherBar) {
          activeMother = pattern;
          startBoxIdx = i;
        } else if (pattern?.isInsideBar && activeMother && startBoxIdx !== null) {
          // If this is the last inside bar or end of visible slice, draw shaded consolidation range
          const isNextInside = indicators.insideBars.get(globalIdx + 1)?.isInsideBar;
          if (!isNextInside || i === n - 1) {
            const x1 = getXForIndex(startBoxIdx) - candleSlotWidth * 0.45;
            const x2 = getXForIndex(i) + candleSlotWidth * 0.45;
            const yHigh = getYForPrice(activeMother.motherHigh!);
            const yLow = getYForPrice(activeMother.motherLow!);

            // Shaded range
            ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.fillRect(x1, yHigh, x2 - x1, yLow - yHigh);

            // Mother Bar bounds
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x1, yHigh, x2 - x1, yLow - yHigh);
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = '#38bdf8';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Coil Range (₹${(activeMother.motherHigh! - activeMother.motherLow!).toFixed(1)})`, x1 + 4, yHigh - 4);

            activeMother = null;
            startBoxIdx = null;
          }
        }
      }
    }

    // 3. Draw Candlesticks
    for (let i = 0; i < n; i++) {
      const c = visibleCandles[i];
      const globalIdx = startIndex + i;
      const x = getXForIndex(i);

      const isBull = c.close >= c.open;
      const candleColor = isBull ? '#10b981' : '#ef4444';
      const wickColor = isBull ? '#34d399' : '#f87171';

      const yOpen = getYForPrice(c.open);
      const yClose = getYForPrice(c.close);
      const yHigh = getYForPrice(c.high);
      const yLow = getYForPrice(c.low);

      // Wick
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Inside Bar Highlight Badge
      const pattern = indicators.insideBars.get(globalIdx);
      if (showInsideBars && pattern?.isInsideBar) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, yHigh - 7, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Breakout Indicators
      if (showBreakoutArrows && pattern?.breakout?.occurred) {
        const isBullBreak = pattern.breakout.type === 'bullish';
        const arrowY = isBullBreak ? yHigh - 16 : yLow + 16;

        ctx.fillStyle = isBullBreak ? '#10b981' : '#ef4444';
        ctx.beginPath();
        if (isBullBreak) {
          ctx.moveTo(x, arrowY - 8);
          ctx.lineTo(x - 5, arrowY);
          ctx.lineTo(x + 5, arrowY);
        } else {
          ctx.moveTo(x, arrowY + 8);
          ctx.lineTo(x - 5, arrowY);
          ctx.lineTo(x + 5, arrowY);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // 4. Draw EMAs
    const drawLineSeries = (data: (number | null)[], color: string, lineWidth: number = 1.5) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < n; i++) {
        const globalIdx = startIndex + i;
        const val = data[globalIdx];
        if (val === null) continue;

        const x = getXForIndex(i);
        const y = getYForPrice(val);

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    if (showEMA9) drawLineSeries(indicators.ema9, '#06b6d4', 1.6);
    if (showEMA21) drawLineSeries(indicators.ema21, '#f59e0b', 1.6);
    if (showEMA50) drawLineSeries(indicators.ema50, '#8b5cf6', 1.8);
    if (showEMA200) drawLineSeries(indicators.ema200, '#f43f5e', 2.0);

    // 5. Draw EMA Crossovers
    indicators.emaCrossovers.forEach(cross => {
      if (cross.index >= startIndex && cross.index < endIndex) {
        const localIdx = cross.index - startIndex;
        const x = getXForIndex(localIdx);
        const y = getYForPrice(cross.price);
        const isBull = cross.type.includes('bullish') || cross.type.includes('golden');

        ctx.fillStyle = isBull ? '#10b981' : '#ef4444';
        ctx.strokeStyle = '#0b0f17';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isBull ? '#34d399' : '#f87171';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isBull ? '▲ Cross' : '▼ Cross', x, isBull ? y - 10 : y + 15);
      }
    });

    // 6. Draw RSI Divergence lines on Price chart
    if (showDivergenceLines) {
      indicators.rsiDivergences.forEach(div => {
        if (
          (div.fromIndex >= startIndex && div.fromIndex < endIndex) ||
          (div.toIndex >= startIndex && div.toIndex < endIndex)
        ) {
          const x1 = getXForIndex(div.fromIndex - startIndex);
          const y1 = getYForPrice(div.fromPrice);
          const x2 = getXForIndex(div.toIndex - startIndex);
          const y2 = getYForPrice(div.toPrice);

          ctx.strokeStyle = div.type === 'bullish' ? '#10b981' : '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = div.type === 'bullish' ? '#10b981' : '#ef4444';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            div.type === 'bullish' ? 'Bullish Div' : 'Bearish Div',
            (x1 + x2) / 2,
            (y1 + y2) / 2 - 8
          );
        }
      });
    }

    // 7. Draw Volume Sub-Panel
    if (showVolumePanel) {
      // Panel separator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, volTop - 8);
      ctx.lineTo(width - paddingRight, volTop - 8);
      ctx.stroke();

      // Panel label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('VOLUME & 20 SMA', paddingLeft + 4, volTop + 10);

      const maxVolScale = maxVol * 1.15 || 1;
      const getYForVol = (v: number) => {
        return volBottom - (v / maxVolScale) * volChartHeight;
      };

      // Volume bars
      for (let i = 0; i < n; i++) {
        const c = visibleCandles[i];
        const globalIdx = startIndex + i;
        const x = getXForIndex(i);
        const yVol = getYForVol(c.volume);
        const barHeight = volBottom - yVol;

        const isBull = c.close >= c.open;
        const isSpike = indicators.volumeSpikes[globalIdx];
        const isDryUp = indicators.volumeDryUps[globalIdx];

        if (isSpike) {
          ctx.fillStyle = isBull ? '#34d399' : '#f87171'; // High conviction highlight
        } else if (isDryUp) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; // Compression dry-up
        } else {
          ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        }

        ctx.fillRect(x - candleWidth / 2, yVol, candleWidth, barHeight);
      }

      // Volume SMA 20 Line
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      let startedVolSMA = false;
      for (let i = 0; i < n; i++) {
        const globalIdx = startIndex + i;
        const sma = indicators.volumeSMA20[globalIdx];
        if (sma === null) continue;
        const x = getXForIndex(i);
        const y = getYForVol(sma);
        if (!startedVolSMA) {
          ctx.moveTo(x, y);
          startedVolSMA = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Right axis label for volume
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${(maxVol / 100000).toFixed(0)}L`, width - paddingRight + 8, volTop + 14);
      ctx.fillText('0', width - paddingRight + 8, volBottom);
    }

    // 8. Draw RSI Sub-Panel
    if (showRSIPanel) {
      // Panel separator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, rsiTop - 8);
      ctx.lineTo(width - paddingRight, rsiTop - 8);
      ctx.stroke();

      const getYForRSI = (val: number) => {
        return rsiBottom - (val / 100) * rsiChartHeight;
      };

      const y70 = getYForRSI(70);
      const y30 = getYForRSI(30);
      const y50 = getYForRSI(50);

      // Overbought / Oversold zones
      ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
      ctx.fillRect(paddingLeft, rsiTop, chartWidth, y70 - rsiTop);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.fillRect(paddingLeft, y30, chartWidth, rsiBottom - y30);

      // 70 & 30 Reference lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y70);
      ctx.lineTo(width - paddingRight, y70);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y30);
      ctx.lineTo(width - paddingRight, y30);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y50);
      ctx.lineTo(width - paddingRight, y50);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right axis labels
      ctx.fillStyle = '#ef4444';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('70 OB', width - paddingRight + 8, y70 + 3);

      ctx.fillStyle = '#64748b';
      ctx.fillText('50', width - paddingRight + 8, y50 + 3);

      ctx.fillStyle = '#10b981';
      ctx.fillText('30 OS', width - paddingRight + 8, y30 + 3);

      // RSI Label
      ctx.fillStyle = '#a855f7';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('RSI (14)', paddingLeft + 4, rsiTop + 10);

      // RSI Line
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      let startedRSI = false;
      for (let i = 0; i < n; i++) {
        const globalIdx = startIndex + i;
        const rsiVal = indicators.rsi14[globalIdx];
        if (rsiVal === null) continue;
        const x = getXForIndex(i);
        const y = getYForRSI(rsiVal);
        if (!startedRSI) {
          ctx.moveTo(x, y);
          startedRSI = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // RSI Divergence lines on RSI chart
      if (showDivergenceLines) {
        indicators.rsiDivergences.forEach(div => {
          if (
            (div.fromIndex >= startIndex && div.fromIndex < endIndex) ||
            (div.toIndex >= startIndex && div.toIndex < endIndex)
          ) {
            const x1 = getXForIndex(div.fromIndex - startIndex);
            const y1 = getYForRSI(div.fromRsi);
            const x2 = getXForIndex(div.toIndex - startIndex);
            const y2 = getYForRSI(div.toRsi);

            ctx.strokeStyle = div.type === 'bullish' ? '#10b981' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Divergence nodes
            ctx.fillStyle = div.type === 'bullish' ? '#10b981' : '#ef4444';
            ctx.beginPath();
            ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
            ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    }

    // 9. Draw Crosshair Hover Guides
    if (crosshairPos && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n) {
      const x = getXForIndex(hoverIndex);
      const hoveredCandle = visibleCandles[hoverIndex];

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line across all panes
      ctx.beginPath();
      ctx.moveTo(x, priceTop);
      ctx.lineTo(x, height - 16);
      ctx.stroke();

      // Horizontal price line
      if (crosshairPos.y <= priceBottom) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft, crosshairPos.y);
        ctx.lineTo(width - paddingRight, crosshairPos.y);
        ctx.stroke();

        // Price badge on right axis
        const hoverPrice = maxPrice - ((crosshairPos.y - priceTop) / priceChartHeight) * (maxPrice - minPrice);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(width - paddingRight + 4, crosshairPos.y - 8, 62, 16);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`₹${hoverPrice.toFixed(1)}`, width - paddingRight + 6, crosshairPos.y + 4);
      }

      ctx.setLineDash([]);
    }
  }, [
    visibleCandles,
    startIndex,
    endIndex,
    indicators,
    showEMA9,
    showEMA21,
    showEMA50,
    showEMA200,
    showInsideBars,
    showBreakoutArrows,
    showDivergenceLines,
    showVolumePanel,
    showRSIPanel,
    crosshairPos,
    hoverIndex,
  ]);

  // Mouse / Touch Event Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrosshairPos({ x, y });

    // Handle Panning Drag
    if (isDragging) {
      const deltaX = x - dragStartX;
      const candlesShifted = Math.round(deltaX / (rect.width / visibleCount));
      if (candlesShifted !== 0) {
        setOffsetIndex(prev => Math.min(Math.max(0, prev + candlesShifted), maxOffset));
        setDragStartX(x);
      }
      return;
    }

    // Determine hovered candle index
    const chartWidth = rect.width - 12 - 68;
    const candleSlotWidth = chartWidth / visibleCandles.length;
    const idx = Math.floor((x - 12) / candleSlotWidth);
    if (idx >= 0 && idx < visibleCandles.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setDragStartX(e.clientX - rect.left);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCrosshairPos(null);
    setHoverIndex(null);
  };

  // Mobile Touch Gestures for Android
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setDragStartX(x);
        setCrosshairPos({ x, y });

        const chartWidth = rect.width - 12 - 68;
        const candleSlotWidth = chartWidth / visibleCandles.length;
        const idx = Math.floor((x - 12) / candleSlotWidth);
        if (idx >= 0 && idx < visibleCandles.length) {
          setHoverIndex(idx);
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setCrosshairPos({ x, y });

      if (isDragging) {
        const deltaX = x - dragStartX;
        const candleSlot = rect.width / visibleCount;
        const candlesShifted = Math.round(deltaX / candleSlot);
        if (candlesShifted !== 0) {
          setOffsetIndex(prev => Math.min(Math.max(0, prev + candlesShifted), maxOffset));
          setDragStartX(x);
        }
      }

      const chartWidth = rect.width - 12 - 68;
      const candleSlotWidth = chartWidth / visibleCandles.length;
      const idx = Math.floor((x - 12) / candleSlotWidth);
      if (idx >= 0 && idx < visibleCandles.length) {
        setHoverIndex(idx);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCount(prev => Math.max(25, prev - 5));
    } else {
      // Zoom out
      setVisibleCount(prev => Math.min(candles.length, prev + 5));
    }
  };

  // Inspect data of currently hovered candle (or latest candle)
  const inspectedIdx = hoverIndex !== null ? startIndex + hoverIndex : candles.length - 1;
  const inspectedCandle = candles[inspectedIdx] || candles[candles.length - 1];
  const inspectedChange = inspectedCandle ? inspectedCandle.close - inspectedCandle.open : 0;
  const inspectedChangePct = inspectedCandle && inspectedCandle.open ? (inspectedChange / inspectedCandle.open) * 100 : 0;

  const currentInsidePattern = indicators.insideBars.get(inspectedIdx);
  const currentRSI = indicators.rsi14[inspectedIdx];
  const currentEma9 = indicators.ema9[inspectedIdx];
  const currentEma21 = indicators.ema21[inspectedIdx];
  const currentEma50 = indicators.ema50[inspectedIdx];
  const currentEma200 = indicators.ema200[inspectedIdx];
  const currentVolSMA = indicators.volumeSMA20[inspectedIdx];

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] text-slate-200 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0f172a]/95 border-b border-slate-800 gap-3 text-xs">
        {/* Left: Symbol & Timeframes */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white tracking-wide">{symbol}</span>
            <span className="text-slate-400 hidden sm:inline">· {stockName}</span>
          </div>

          <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800">
            {(['1D', '1W', '1M'] as Timeframe[]).map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  timeframe === tf
                    ? 'bg-sky-500 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Live Indicator Overlays Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowInsideBars(!showInsideBars)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showInsideBars
                ? 'bg-sky-950/80 text-sky-400 border-sky-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Inside Bars / Coils
          </button>

          <button
            onClick={() => setShowBreakoutArrows(!showBreakoutArrows)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showBreakoutArrows
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Breakout Signals
          </button>

          <button
            onClick={() => setShowEMA9(!showEMA9)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showEMA9
                ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            EMA 9
          </button>

          <button
            onClick={() => setShowEMA21(!showEMA21)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showEMA21
                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            EMA 21
          </button>

          <button
            onClick={() => setShowEMA50(!showEMA50)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showEMA50
                ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            EMA 50
          </button>

          <button
            onClick={() => setShowEMA200(!showEMA200)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showEMA200
                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            EMA 200
          </button>

          <button
            onClick={() => setShowDivergenceLines(!showDivergenceLines)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showDivergenceLines
                ? 'bg-purple-950/80 text-purple-400 border-purple-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            RSI Divergences
          </button>

          <button
            onClick={() => setShowVolumePanel(!showVolumePanel)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showVolumePanel
                ? 'bg-yellow-950/80 text-yellow-400 border-yellow-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Volume MA
          </button>

          <button
            onClick={() => setShowRSIPanel(!showRSIPanel)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
              showRSIPanel
                ? 'bg-violet-950/80 text-violet-400 border-violet-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            RSI Panel
          </button>
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVisibleCount(prev => Math.max(25, prev - 10))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVisibleCount(prev => Math.min(candles.length, prev + 10))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setVisibleCount(65);
              setOffsetIndex(0);
            }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Real-time OHLCV & Technical Inspector Bar */}
      {inspectedCandle && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-[11px] font-mono tabular-nums">
          <span className="text-slate-400">{inspectedCandle.date}</span>
          <div className="flex items-center gap-3">
            <span>O: <span className="text-white font-semibold">₹{inspectedCandle.open.toFixed(2)}</span></span>
            <span>H: <span className="text-emerald-400 font-semibold">₹{inspectedCandle.high.toFixed(2)}</span></span>
            <span>L: <span className="text-rose-400 font-semibold">₹{inspectedCandle.low.toFixed(2)}</span></span>
            <span>C: <span className={`font-semibold ${inspectedChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₹{inspectedCandle.close.toFixed(2)}</span></span>
            <span className={inspectedChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              ({inspectedChange >= 0 ? '+' : ''}{inspectedChangePct.toFixed(2)}%)
            </span>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-800 pl-3 text-slate-400">
            <span>Vol: <span className="text-amber-300">{(inspectedCandle.volume / 100000).toFixed(1)}L</span></span>
            {currentVolSMA && <span>SMA: <span className="text-amber-500/90">{(currentVolSMA / 100000).toFixed(1)}L</span></span>}
            {currentRSI !== null && currentRSI !== undefined && (
              <span>RSI: <span className={`font-bold ${currentRSI >= 70 ? 'text-rose-400' : currentRSI <= 30 ? 'text-emerald-400' : 'text-purple-400'}`}>{currentRSI.toFixed(1)}</span></span>
            )}
            {showEMA9 && currentEma9 !== null && currentEma9 !== undefined && (
              <span className="text-cyan-400">E9: ₹{currentEma9.toFixed(1)}</span>
            )}
            {showEMA21 && currentEma21 !== null && currentEma21 !== undefined && (
              <span className="text-amber-400">E21: ₹{currentEma21.toFixed(1)}</span>
            )}
          </div>

          {/* Pattern alerts for hovered candle */}
          {currentInsidePattern && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              {currentInsidePattern.isInsideBar && (
                <span className="text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
                  Inside Bar #{currentInsidePattern.insideBarNumber}
                </span>
              )}
              {currentInsidePattern.isMotherBar && (
                <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
                  Mother Bar [₹{currentInsidePattern.motherLow?.toFixed(1)} - ₹{currentInsidePattern.motherHigh?.toFixed(1)}]
                </span>
              )}
              {currentInsidePattern.breakout?.occurred && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                  currentInsidePattern.breakout.type === 'bullish' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                }`}>
                  {currentInsidePattern.breakout.type === 'bullish' ? '▲ Bullish Breakout' : '▼ Bearish Breakdown'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Interactive Chart Canvas */}
      <div ref={containerRef} className="relative flex-1 w-full min-h-[360px] md:min-h-[480px] cursor-crosshair select-none overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
          className="absolute inset-0 w-full h-full block"
        />
      </div>

      {/* 4. Chart Bottom Info Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f172a] border-t border-slate-800/80 text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> EMA 9
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> EMA 21
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> RSI 14
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Inside Bar Box
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Breakout
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span>Scroll to Zoom · Drag to Pan · NSE Market Hours: 09:15 - 15:30 IST</span>
        </div>
      </div>
    </div>
  );
};
