import express from 'express';

const app = express();
app.use(express.json());

const port = Number(process.env.PORT ?? 3001);
const quoteSymbols = ['BTCUSD', 'ETHUSD', 'NQ', 'ES', 'XAUUSD', 'XAGUSD', 'USOIL', 'DXY', 'EURUSD', 'GBPUSD', 'USDCHF', 'USDJPY', 'USDCAD'];

function nowIso() {
  return new Date().toISOString();
}

function mockQuotes() {
  return quoteSymbols.map((symbol, index) => ({
    symbol,
    price: Number((100 + index * 7.31 + Math.random() * 3).toFixed(symbol.includes('USD') && !['BTCUSD', 'ETHUSD'].includes(symbol) ? 4 : 2)),
    change24h: Number(((Math.random() - 0.5) * 2).toFixed(2)),
    source: process.env.OANDA_API_KEY ? 'oanda' : 'fallback',
    updatedAt: nowIso(),
  }));
}

app.get('/api/quotes', (_req, res) => {
  res.json({
    updatedAt: nowIso(),
    source: process.env.OANDA_API_KEY ? 'oanda-primary-fallback-enabled' : 'fallback-only',
    quotes: mockQuotes(),
  });
});

app.get('/api/finance/news', (_req, res) => {
  res.json({
    updatedAt: nowIso(),
    items: [
      {
        title: 'Makro akışları bugün piyasa fiyatlamasını yönlendiriyor.',
        category: 'Jeopolitik',
        summary: 'Veri, merkez bankası ve risk iştahı ekseninde oluşturulmuş canlı şablon yanıt.',
        source: 'aggregator',
        publishedAt: nowIso(),
      },
      {
        title: 'AI ve çip tarafında haber akışı yatırımcı odağını koruyor.',
        category: 'Teknoloji',
        summary: 'Bu uç nokta canlı haber sağlayıcılarıyla değiştirilmeye hazırdır.',
        source: 'aggregator',
        publishedAt: nowIso(),
      },
    ],
  });
});

app.get('/api/calendar/events', (_req, res) => {
  res.json({
    updatedAt: nowIso(),
    events: [
      {
        timeTR: '14:00',
        country: 'US',
        name: 'High impact macro event placeholder',
        forecast: '-',
        previous: '-',
        actual: '-',
        impact: 'Yüksek volatilite penceresi',
      },
    ],
  });
});

app.get('/api/cron/status', (_req, res) => {
  res.json({
    ok: true,
    updatedAt: nowIso(),
    jobs: [
      { name: 'daily-bulletin', status: 'idle', lastRunAt: null },
      { name: 'weekly-open-bulletin', status: 'idle', lastRunAt: null },
      { name: 'cot-report', status: 'idle', lastRunAt: null },
    ],
  });
});

app.post('/api/cron/trigger', (req, res) => {
  res.json({
    ok: true,
    triggeredAt: nowIso(),
    request: req.body ?? {},
    message: 'Cron trigger accepted.',
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
