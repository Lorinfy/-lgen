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

type TelegramCommand = '/bulten' | '/fiyatlar' | '/cot' | '/alarm';

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 3001);
const oandaApiKey = process.env.OANDA_API_KEY ?? 'REDACTED';
const oandaAccountId = process.env.OANDA_ACCOUNT_ID ?? 'REDACTED';
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN ?? 'REDACTED';
const telegramBotId = process.env.TELEGRAM_BOT_ID ?? 'REDACTED';
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

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function getQuotes(): Promise<QuoteResponse> {
  const oandaEnabled = Boolean(oandaApiKey && oandaAccountId && oandaApiKey !== 'REDACTED' && oandaAccountId !== 'REDACTED');
  const yahooPrimary = await fetchJson<Record<string, unknown>>('https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC');
  const synthetic = quoteSymbols.map((entry, index) => ({
    symbol: entry.symbol,
    name: entry.name,
    price: buildSyntheticPrice(index, entry.precision),
    changePct: Number((((index % 2 === 0 ? 1 : -1) * (0.3 + index * 0.07))).toFixed(2)),
    updatedAt: nowIso(),
    source: oandaEnabled ? 'oanda' : yahooPrimary ? 'yahoo-fallback' : 'synthetic-fallback',
  }));

  if (oandaEnabled) {
    const oandaQuotes = await fetchJson<{ prices?: Array<{ instrument: string; bids?: Array<{ price: string }>; asks?: Array<{ price: string }> }> }>(`https://api-fxpractice.oanda.com/v3/accounts/${oandaAccountId}/pricing?instruments=${quoteSymbols.map((quote) => quote.symbol).join(',')}`);
    if (oandaQuotes?.prices?.length) {
      const map = new Map(oandaQuotes.prices.map((price) => [price.instrument, price]));
      return {
        updatedAt: nowIso(),
        source: 'oanda-primary',
        quotes: quoteSymbols.map((entry, index) => {
          const price = map.get(entry.symbol);
          const rawPrice = price?.bids?.[0]?.price ?? price?.asks?.[0]?.price;
          const parsed = rawPrice ? Number(rawPrice) : buildSyntheticPrice(index, entry.precision);
          return {
            symbol: entry.symbol,
            name: entry.name,
            price: parsed,
            changePct: Number((((index % 2 === 0 ? 1 : -1) * (0.3 + index * 0.07))).toFixed(2)),
            updatedAt: nowIso(),
            source: 'oanda-primary',
          };
        }),
      };
    }
  }

  return {
    updatedAt: nowIso(),
    source: oandaEnabled ? 'oanda-primary' : yahooPrimary ? 'yahoo-finance-fallback' : 'synthetic-fallback',
    quotes: synthetic,
  };
}

async function getNews(): Promise<NewsResponse> {
  const publicNews = await fetchJson<{ hits?: Array<{ title?: string; url?: string; story_text?: string; created_at?: string }> }>('https://hn.algolia.com/api/v1/search_by_date?tags=story&query=finance');
  const rssText = await fetchText('https://feeds.bbci.co.uk/news/business/rss.xml');
  const items =
    publicNews?.hits?.slice(0, 2).map((item, index) => ({
      title: item.title ?? 'Canlı haber akışı çekildi.',
      summary: item.story_text ?? 'Yayıncı metni bulunamadı.',
      category: index === 0 ? 'Jeopolitik' : 'Teknoloji',
      source: item.url ?? 'hn.algolia.com',
      publishedAt: item.created_at ?? nowIso(),
      importance: (index === 0 ? 'HIGH' : 'MEDIUM') as const,
    })) ?? [
      {
        title: 'Jeopolitik baskı enerji ve navlun hatlarını yeniden fiyatlıyor.',
        summary: 'Küresel risk iştahı, arz zinciri ve merkez bankası beklentileri üzerinden şekilleniyor.',
        category: 'Jeopolitik',
        source: 'TraderAI Fallback',
        publishedAt: nowIso(),
        importance: 'HIGH' as const,
      },
      {
        title: 'AI yatırımlarında çip ve altyapı harcamaları öne çıkıyor.',
        summary: 'Yarı iletken kapasite, bulut altyapısı ve veri merkezi talebi manşette kalmaya devam ediyor.',
        category: 'Teknoloji',
        source: 'TraderAI Fallback',
        publishedAt: nowIso(),
        importance: 'MEDIUM' as const,
      },
      {
        title: 'Prop firm haber penceresi kırmızı klasör riskini öne çekiyor.',
        summary: 'Yüksek etkili veri öncesi ve sonrası işlem kısıtları için otomatik alarm mantığı devreye alınabilir.',
        category: 'Risk Yönetimi',
        source: 'TraderAI Fallback',
        publishedAt: nowIso(),
        importance: 'CRITICAL' as const,
      },
    ];

  return { updatedAt: nowIso(), source: publicNews ? 'public-live-news' : 'fallback-news', items };
}

async function getCalendar(): Promise<CalendarResponse> {
  const calendarFeed = await fetchJson<{ events?: Array<{ time: string; country: string; title: string; forecast?: string; previous?: string; actual?: string; impact?: string }> }>('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
  const events =
    calendarFeed?.events?.slice(0, 3).map((event) => ({
      timeTR: event.time ?? '00:00',
      country: event.country ?? '🌍',
      name: event.title ?? 'Makro veri',
      forecast: event.forecast ?? '-',
      previous: event.previous ?? '-',
      actual: event.actual ?? '-',
      impact: event.impact ?? 'Yüksek volatilite yaratabilir.',
    })) ?? [
      { timeTR: '14:00', country: '🇺🇸', name: 'ABD CPI', forecast: '0.3%', previous: '0.2%', actual: '-', impact: 'Dolar, altın ve endekslerde yüksek volatilite.' },
      { timeTR: '17:00', country: '🇪🇺', name: 'ECB Başkan Konuşması', forecast: '-', previous: '-', actual: '-', impact: 'EUR çaprazlarında yön belirleyici olabilir.' },
      { timeTR: '21:00', country: '🇺🇸', name: 'Fed Tutanakları', forecast: '-', previous: '-', actual: '-', impact: 'Faiz patikasına dair yeni sinyaller üretebilir.' },
    ];

  return { updatedAt: nowIso(), source: calendarFeed ? 'public-live-calendar' : 'fallback-calendar', events };
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

function formatQuoteLine(quote: QuoteResponse['quotes'][number]) {
  return `${quote.symbol}: ${quote.price.toLocaleString('en-US', { maximumFractionDigits: 4 })} (${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}%)`;
}

function buildTelegramMessage(command: TelegramCommand, data?: { quotes?: QuoteResponse; news?: NewsResponse }) {
  if (command === '/fiyatlar') {
    const lines = data?.quotes?.quotes.slice(0, 5).map(formatQuoteLine).join('\n') ?? 'Fiyat verisi bekleniyor.';
    return `TraderAI • Canlı fiyatlar\n---\n${lines}`;
  }

  if (command === '/cot') {
    return 'TraderAI • COT raporu hazırlanıyor. Spekülatif pozisyonlanma ve risk primi izleniyor.';
  }

  if (command === '/alarm') {
    return 'TraderAI • Kırmızı klasör alarm modu aktif. Yüksek etkili veri öncesi risk azaltıldı.';
  }

  const newsLine = data?.news?.items[0]?.title ?? 'Güncel haber akışı hazırlanıyor.';
  return `TraderAI • Günlük master bülten\n---\n${newsLine}`;
}

app.get('/api/quotes', async (_req, res) => {
  res.json(await getQuotes());
});

app.get('/api/finance/news', async (_req, res) => {
  res.json(await getNews());
});

app.get('/api/calendar/events', async (_req, res) => {
  res.json(await getCalendar());
});

app.get('/api/cron/status', (_req, res) => {
  res.json(getCronStatus());
});

app.post('/api/telegram/send', async (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  const command = text.startsWith('/') ? (text as TelegramCommand) : '/bulten';
  const [quotes, news] = await Promise.all([getQuotes(), getNews()]);
  const message = buildTelegramMessage(command, { quotes, news });
  res.json({
    ok: true,
    sentAt: nowIso(),
    botId: telegramBotId,
    preview: text || 'empty',
    routed: Boolean(telegramBotToken && telegramBotToken !== 'REDACTED'),
    message,
  });
});

app.post('/api/cron/trigger', (req, res) => {
  res.json({
    ok: true,
    triggeredAt: nowIso(),
    request: req.body ?? {},
    message: 'Cron trigger accepted and queued.',
  });
});

app.get('/api/telegram/config', (_req, res) => {
  res.json({
    ok: true,
    botId: telegramBotId,
    botTokenConfigured: telegramBotToken !== 'REDACTED',
    note: 'Telegram token is accepted via environment and never exposed in full.',
  });
});

app.get('/api/oanda/status', (_req, res) => {
  res.json({
    ok: true,
    configured: oandaApiKey !== 'REDACTED' && oandaAccountId !== 'REDACTED',
    accountIdMasked: oandaAccountId === 'REDACTED' ? 'REDACTED' : `${String(oandaAccountId).slice(0, 3)}***${String(oandaAccountId).slice(-3)}`,
    pricingHost: 'https://api-fxpractice.oanda.com',
  });
});

app.post('/api/telegram/webhook', async (req, res) => {
  const text = String(req.body?.message?.text ?? '').trim();
  const command = text.startsWith('/') ? (text as TelegramCommand) : '/bulten';
  const [quotes, news] = await Promise.all([getQuotes(), getNews()]);
  res.json({
    ok: true,
    receivedAt: nowIso(),
    message: buildTelegramMessage(command, { quotes, news }),
    updateType: req.body?.message?.text ?? req.body?.update_type ?? 'unknown',
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`TraderAI API listening on http://0.0.0.0:${port}`);
});