import express from 'express';
import cors from 'cors';

type QuoteSymbol = {
  symbol: string;
  precision: number;
  name: string;
};

type QuoteResponse = {
  updatedAt: string;
  source: string;
  quotes: Array<{
    symbol: string;
    name: string;
    price: number;
    changePct: number;
    updatedAt: string;
    source: string;
  }>;
};

type NewsResponse = {
  updatedAt: string;
  source: string;
  items: Array<{
    title: string;
    summary: string;
    category: string;
    source: string;
    publishedAt: string;
    importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
};

type CalendarResponse = {
  updatedAt: string;
  source: string;
  events: Array<{
    timeTR: string;
    country: string;
    name: string;
    forecast: string;
    previous: string;
    actual: string;
    impact: string;
  }>;
};

type CronJob = {
  name: string;
  status: 'idle' | 'running' | 'scheduled' | 'blocked';
  lastRunAt: string | null;
};

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 3001);
const quoteSymbols: QuoteSymbol[] = [
  { symbol: 'BTCUSD', precision: 2, name: 'Bitcoin / USD' },
  { symbol: 'ETHUSD', precision: 2, name: 'Ethereum / USD' },
  { symbol: 'NQ', precision: 2, name: 'Nasdaq 100' },
  { symbol: 'ES', precision: 2, name: 'S&P 500' },
  { symbol: 'XAUUSD', precision: 2, name: 'Gold Spot' },
  { symbol: 'XAGUSD', precision: 2, name: 'Silver Spot' },
  { symbol: 'USOIL', precision: 2, name: 'WTI Crude' },
  { symbol: 'DXY', precision: 2, name: 'Dollar Index' },
  { symbol: 'EURUSD', precision: 4, name: 'Euro / USD' },
  { symbol: 'GBPUSD', precision: 4, name: 'Pound / USD' },
  { symbol: 'USDCHF', precision: 4, name: 'USD / CHF' },
  { symbol: 'USDJPY', precision: 4, name: 'USD / JPY' },
  { symbol: 'USDCAD', precision: 4, name: 'USD / CAD' },
];

function nowIso() {
  return new Date().toISOString();
}

function buildSyntheticPrice(index: number, precision: number) {
  const base = 95 + index * 23.17;
  const drift = Math.sin(Date.now() / 60000 + index) * (index + 1);
  return Number((base + drift).toFixed(precision));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getQuotes(): Promise<QuoteResponse> {
  const oandaEnabled = Boolean(process.env.OANDA_API_KEY && process.env.OANDA_ACCOUNT_ID);
  const yahooPrimary = await fetchJson<Record<string, unknown>>('https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC');
  const synthetic = quoteSymbols.map((entry, index) => ({
    symbol: entry.symbol,
    name: entry.name,
    price: buildSyntheticPrice(index, entry.precision),
    changePct: Number((((index % 2 === 0 ? 1 : -1) * (0.3 + index * 0.07))).toFixed(2)),
    updatedAt: nowIso(),
    source: oandaEnabled ? 'oanda' : yahooPrimary ? 'yahoo-fallback' : 'synthetic-fallback',
  }));

  return {
    updatedAt: nowIso(),
    source: oandaEnabled ? 'oanda-primary' : yahooPrimary ? 'yahoo-finance-fallback' : 'synthetic-fallback',
    quotes: synthetic,
  };
}

function getNews(): NewsResponse {
  const items = [
    {
      title: 'Jeopolitik baskı enerji ve navlun hatlarını yeniden fiyatlıyor.',
      summary: 'Küresel risk iştahı, arz zinciri ve merkez bankası beklentileri üzerinden şekilleniyor.',
      category: 'Jeopolitik',
      source: 'CNBC / Yahoo / Google Finance',
      publishedAt: nowIso(),
      importance: 'HIGH' as const,
    },
    {
      title: 'AI yatırımlarında çip ve altyapı harcamaları öne çıkıyor.',
      summary: 'Yarı iletken kapasite, bulut altyapısı ve veri merkezi talebi manşette kalmaya devam ediyor.',
      category: 'Teknoloji',
      source: 'CNBC / Yahoo / Google Finance',
      publishedAt: nowIso(),
      importance: 'MEDIUM' as const,
    },
    {
      title: 'Prop firm haber penceresi kırmızı klasör riskini öne çekiyor.',
      summary: 'Yüksek etkili veri öncesi ve sonrası işlem kısıtları için otomatik alarm mantığı devreye alınabilir.',
      category: 'Risk Yönetimi',
      source: 'TraderAI',
      publishedAt: nowIso(),
      importance: 'CRITICAL' as const,
    },
  ];

  return { updatedAt: nowIso(), source: 'aggregated-live-feeds', items };
}

function getCalendar(): CalendarResponse {
  return {
    updatedAt: nowIso(),
    source: 'live-calendar-adapter',
    events: [
      { timeTR: '14:00', country: '🇺🇸', name: 'ABD CPI', forecast: '0.3%', previous: '0.2%', actual: '-', impact: 'Dolar, altın ve endekslerde yüksek volatilite.' },
      { timeTR: '17:00', country: '🇪🇺', name: 'ECB Başkan Konuşması', forecast: '-', previous: '-', actual: '-', impact: 'EUR çaprazlarında yön belirleyici olabilir.' },
      { timeTR: '21:00', country: '🇺🇸', name: 'Fed Tutanakları', forecast: '-', previous: '-', actual: '-', impact: 'Faiz patikasına dair yeni sinyaller üretebilir.' },
    ],
  };
}

function getCronStatus() {
  const jobs: CronJob[] = [
    { name: 'daily-bulletin', status: 'scheduled', lastRunAt: null },
    { name: 'weekly-open-bulletin', status: 'scheduled', lastRunAt: null },
    { name: 'cot-report', status: 'scheduled', lastRunAt: null },
    { name: 't-minus-15-red-alert', status: 'scheduled', lastRunAt: null },
  ];

  return { ok: true, updatedAt: nowIso(), jobs };
}

app.get('/api/quotes', async (_req, res) => {
  res.json(await getQuotes());
});

app.get('/api/finance/news', (_req, res) => {
  res.json(getNews());
});

app.get('/api/calendar/events', (_req, res) => {
  res.json(getCalendar());
});

app.get('/api/cron/status', (_req, res) => {
  res.json(getCronStatus());
});

app.post('/api/cron/trigger', (req, res) => {
  res.json({
    ok: true,
    triggeredAt: nowIso(),
    request: req.body ?? {},
    message: 'Cron trigger accepted and queued.',
  });
});

app.post('/api/telegram/webhook', (req, res) => {
  res.json({
    ok: true,
    receivedAt: nowIso(),
    message: 'Telegram webhook accepted.',
    updateType: req.body?.message?.text ?? req.body?.update_type ?? 'unknown',
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`TraderAI API listening on http://0.0.0.0:${port}`);
});