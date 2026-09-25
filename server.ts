import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for NSE data
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds

function getYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean === 'NIFTY 50' || clean === 'NIFTY' || clean === '^NSEI') return '^NSEI';
  if (clean === 'BANKNIFTY' || clean === 'NIFTY BANK' || clean === '^NSEBANK') return '^NSEBANK';
  if (clean === 'TATAMOTORS') return 'TMCV.NS';
  if (clean.endsWith('.NS') || clean.startsWith('^')) return clean;
  if (clean === 'M&M') return 'M%26M.NS';
  return `${clean}.NS`;
}

// Map app timeframes to Yahoo intervals and ranges
function mapTimeframe(tf: string) {
  switch (tf) {
    case '1M':
      return { interval: '1mo', range: '5y' };
    case '1W':
      return { interval: '1wk', range: '3y' };
    case '1D':
    default:
      return { interval: '1d', range: '1y' };
  }
}

// Reusable function to fetch and format chart data
async function fetchSymbolChart(rawSymbol: string, timeframe: string = '1D') {
  const yahooSymbol = getYahooSymbol(rawSymbol);
  const { interval, range } = mapTimeframe(timeframe);

  const cacheKey = `chart_${yahooSymbol}_${interval}_${range}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  });

  if (!resp.ok) {
    return null;
  }

  const json = await resp.json();
  const result = json.chart?.result?.[0];

  if (!result) {
    return null;
  }

  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (
      closes[i] !== null &&
      closes[i] !== undefined &&
      opens[i] !== null &&
      opens[i] !== undefined &&
      highs[i] !== null &&
      highs[i] !== undefined &&
      lows[i] !== null &&
      lows[i] !== undefined
    ) {
      const d = new Date(timestamps[i] * 1000);
      const dateStr =
        timeframe === '1M'
          ? d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
          : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

      candles.push({
        timestamp: timestamps[i] * 1000,
        date: dateStr,
        open: Number(opens[i].toFixed(2)),
        high: Number(highs[i].toFixed(2)),
        low: Number(lows[i].toFixed(2)),
        close: Number(closes[i].toFixed(2)),
        volume: Math.round(volumes[i] || 0),
      });
    }
  }

  if (candles.length === 0) return null;

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;

  const regularMarketPrice = meta.regularMarketPrice || lastCandle.close;
  const previousClose = meta.chartPreviousClose || prevCandle.close;
  const change = Number((regularMarketPrice - previousClose).toFixed(2));
  const changePercent = previousClose ? Number(((change / previousClose) * 100).toFixed(2)) : 0;

  const responseData = {
    symbol: rawSymbol.toUpperCase(),
    yahooSymbol,
    name: meta.longName || meta.shortName || rawSymbol,
    currency: meta.currency || 'INR',
    price: regularMarketPrice,
    previousClose,
    change,
    changePercent,
    dayHigh: meta.regularMarketDayHigh || Math.max(...candles.map(c => c.high)),
    dayLow: meta.regularMarketDayLow || Math.min(...candles.map(c => c.low)),
    volume: meta.regularMarketVolume || lastCandle.volume,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
    candles,
  };

  cache.set(cacheKey, { timestamp: Date.now(), data: responseData });
  return responseData;
}

// Chart endpoint for single stock
app.get('/api/nse/chart', async (req, res) => {
  try {
    const rawSymbol = (req.query.symbol as string) || 'RELIANCE';
    const timeframe = (req.query.timeframe as string) || '1D';

    const data = await fetchSymbolChart(rawSymbol, timeframe);
    if (!data) {
      return res.status(404).json({ error: `No data returned for symbol ${rawSymbol}` });
    }

    res.json(data);
  } catch (err: any) {
    console.error('Error fetching NSE chart:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch chart data' });
  }
});

// Batch charts endpoint: fetches full candlestick series for ALL symbols in watchlist!
app.post('/api/nse/batch-charts', async (req, res) => {
  try {
    const symbols: string[] = req.body.symbols || [];
    const timeframe: string = req.body.timeframe || '1D';

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.json([]);
    }

    // Limit to 35 symbols
    const targetSymbols = symbols.slice(0, 35);
    const results = await Promise.all(
      targetSymbols.map(async sym => {
        try {
          return await fetchSymbolChart(sym, timeframe);
        } catch {
          return null;
        }
      })
    );

    res.json(results.filter(Boolean));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch quote endpoint
app.post('/api/nse/batch', async (req, res) => {
  try {
    const symbols: string[] = req.body.symbols || [];
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.json([]);
    }

    const targetSymbols = symbols.slice(0, 35);
    const results = await Promise.all(
      targetSymbols.map(async sym => {
        try {
          const chartData = await fetchSymbolChart(sym, '1D');
          if (!chartData) return null;
          return {
            symbol: chartData.symbol,
            name: chartData.name,
            price: chartData.price,
            change: chartData.change,
            changePercent: chartData.changePercent,
            dayHigh: chartData.dayHigh,
            dayLow: chartData.dayLow,
            volume: chartData.volume,
            yearHigh: chartData.fiftyTwoWeekHigh,
            yearLow: chartData.fiftyTwoWeekLow,
          };
        } catch {
          return null;
        }
      })
    );

    res.json(results.filter(Boolean));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search symbol endpoint
app.get('/api/nse/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) return res.json([]);

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });
    if (!resp.ok) return res.json([]);
    const json = await resp.json();
    const quotes = (json.quotes || [])
      .filter((item: any) => item.exchange === 'NSI' || item.symbol?.endsWith('.NS') || item.symbol?.startsWith('^'))
      .map((item: any) => ({
        symbol: item.symbol.replace('.NS', ''),
        name: item.longname || item.shortname || item.symbol,
        exchange: 'NSE',
      }));

    res.json(quotes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount Vite or static files
async function startServer() {
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NSE Terminal Server listening on port ${PORT}`);
  });
}

startServer();
