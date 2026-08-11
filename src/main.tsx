import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, CalendarDays, ChartNoAxesCombined, Globe, Newspaper, RefreshCw, ShieldAlert, Bot, LineChart, Clock3, Landmark, Cpu, Coins } from 'lucide-react';
import { motion } from 'motion/react';
import './styles.css';

type Quote = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  updatedAt: string;
  source: string;
};

type NewsItem = {
  title: string;
  summary: string;
  category: string;
  source: string;
  publishedAt: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

type CalendarEvent = {
  timeTR: string;
  country: string;
  name: string;
  forecast: string;
  previous: string;
  actual: string;
  impact: string;
};

type RateCard = {
  country: string;
  centralBank: string;
  rate: string;
  stance: 'Şahin' | 'Güvercin' | 'Nötr' | 'Sıkı' | 'Teşvikçi';
};

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

const tabs = [
  { id: 'geo', label: 'Jeopolitik Olaylar', icon: Globe },
  { id: 'ai', label: 'AI & Teknoloji', icon: Cpu },
  { id: 'opportunity', label: 'Yatırım Fırsatları', icon: ChartNoAxesCombined },
  { id: 'calendar', label: 'Günlük Veriler', icon: CalendarDays },
  { id: 'rates', label: 'Faiz Kartları', icon: Landmark },
] as const;

const symbols = [
  'BTCUSD', 'ETHUSD', 'NQ', 'ES', 'XAUUSD', 'XAGUSD', 'USOIL', 'DXY', 'EURUSD', 'GBPUSD', 'USDCHF', 'USDJPY', 'USDCAD',
];

const fallbackQuotes: Quote[] = symbols.map((symbol, index) => ({
  symbol,
  name: symbol,
  price: Number((100 + index * 27.43).toFixed(symbol.includes('USD') && !['BTCUSD', 'ETHUSD'].includes(symbol) ? 4 : 2)),
  changePct: Number(((index % 2 === 0 ? 1 : -1) * (0.3 + index * 0.12)).toFixed(2)),
  updatedAt: new Date().toISOString(),
  source: 'Fallback Adapter',
}));

const fallbackNews: NewsItem[] = [
  {
    title: 'Merkez bankaları veri bağımlılığını koruyor.',
    summary: 'Piyasalar, büyüme ve enflasyon arasındaki sıkışmayı dikkatle izliyor. Risk iştahı seçici kalıyor.',
    category: 'Makro',
    source: 'News Engine',
    publishedAt: new Date().toISOString(),
    importance: 'HIGH',
  },
  {
    title: 'Yarı iletken tedarik zinciri, yapay zekâ talebiyle yeniden fiyatlanıyor.',
    summary: 'Çip kapasiteleri ve ileri paketleme hatları, yatırımcıların ana gündeminde kalmaya devam ediyor.',
    category: 'AI',
    source: 'News Engine',
    publishedAt: new Date().toISOString(),
    importance: 'MEDIUM',
  },
  {
    title: 'Jeopolitik risk primi enerji piyasalarında canlı.',
    summary: 'Navlun, petrol ve altın tarafında güvenli liman davranışı korunuyor.',
    category: 'Jeopolitik',
    source: 'News Engine',
    publishedAt: new Date().toISOString(),
    importance: 'CRITICAL',
  },
];

const fallbackCalendar: CalendarEvent[] = [
  { timeTR: '14:00', country: '🇺🇸', name: 'ABD CPI', forecast: '0.3%', previous: '0.2%', actual: '-', impact: 'Yüksek volatilite ve dolar yönü etkisi.' },
  { timeTR: '17:00', country: '🇪🇺', name: 'ECB Başkan Konuşması', forecast: '-', previous: '-', actual: '-', impact: 'EUR çaprazları için yön belirleyici olabilir.' },
  { timeTR: '21:00', country: '🇺🇸', name: 'Fed Tutanakları', forecast: '-', previous: '-', actual: '-', impact: 'Faiz patikasına dair yeni ipuçları üretir.' },
];

const rateCards: RateCard[] = [
  { country: '🇺🇸', centralBank: 'Fed', rate: '5.50%', stance: 'Şahin' },
  { country: '🇪🇺', centralBank: 'ECB', rate: '4.00%', stance: 'Nötr' },
  { country: '🇯🇵', centralBank: 'BOJ', rate: '0.10%', stance: 'Güvercin' },
  { country: '🇨🇳', centralBank: 'PBOC', rate: '3.10%', stance: 'Teşvikçi' },
  { country: '🇬🇧', centralBank: 'BOE', rate: '5.25%', stance: 'Şahin' },
  { country: '🇹🇷', centralBank: 'TCMB', rate: '50.00%', stance: 'Sıkı' },
];

function useApi<T>(path: string, fallback: T): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: fallback, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    fetch(path)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({ data: fallback, loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

    return () => {
      alive = false;
    };
  }, [fallback, path]);

  return state;
}

function formatIstanbulTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('geo');
  const quotesState = useApi<Quote[]>('/api/quotes', fallbackQuotes);
  const newsState = useApi<NewsItem[]>('/api/finance/news', fallbackNews);
  const calendarState = useApi<CalendarEvent[]>('/api/calendar/events', fallbackCalendar);

  const nowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    [],
  );

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Ülgen AI · TraderAI Otonom Küresel Piyasa & Prop Radarı</p>
          <h1>Canlı veri, editoryal yoğunluk, prop firm uyumlu alarm katmanı.</h1>
          <p className="subcopy">Tüm içerik canlı kaynak mantığıyla çalışır. Teknik analiz yok. Makro, haber akışı, faiz patikası ve jeopolitik baskı öne çıkar.</p>
        </div>
        <div className="status-card">
          <div className="status-top">
            <RefreshCw size={16} />
            <span>Europe/Istanbul</span>
          </div>
          <strong>{nowLabel}</strong>
          <span className="muted">14:00 günlük bülten · 21:00 Pazar açılış · Cumartesi COT</span>
        </div>
      </header>

      <nav className="tabbar" aria-label="Ana sekmeler">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} className={`tab ${isActive ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="content-grid">
        <section className="hero-panel">
          <div className="hero-badge">
            <Bell size={14} />
            <span>T-15 dakika kırmızı klasör alarmları, canlı event tabanlı çalışır.</span>
          </div>
          <div className="hero-layout">
            <div>
              <p className="section-label">Canlı Kotasyon Panosu</p>
              <div className="quote-grid">
                {quotesState.data?.slice(0, 8).map((quote) => (
                  <article className="quote-card" key={quote.symbol}>
                    <div className="quote-head">
                      <strong>{quote.symbol}</strong>
                      <span className={quote.changePct >= 0 ? 'positive' : 'negative'}>{quote.changePct >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%</span>
                    </div>
                    <div className="quote-price">{quote.price.toLocaleString('tr-TR')}</div>
                    <small>{quote.source}</small>
                  </article>
                ))}
              </div>
            </div>
            <aside className="alert-card">
              <ShieldAlert size={18} />
              <h2>Prop firm haber kısıtlama penceresi</h2>
              <p>Kırmızı klasör verisine 3 dakika kala ve sonra otomatik risk kilidi uygulanır. Bu ekran, manuel işlem disiplinini destekler.</p>
              <div className="mini-stats">
                <span><Clock3 size={14} /> 3 dk önce</span>
                <span><Clock3 size={14} /> 3 dk sonra</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="tab-panel">
          {activeTab === 'geo' && (
            <TabSection title="TAB 1: Jeopolitik Olaylar" icon={<Globe size={18} />}>
              <div className="article-grid">
                <article className="article-card featured">
                  <p className="section-label">Manşet</p>
                  <h3>Enerji hatları ve lojistik koridorları, piyasanın gizli faizine dönüştü.</h3>
                  <p>Navlun baskısı, arz güvenliği ve bölgesel risk primi; altın, petrol ve dolar tarafında geniş çaplı fiyatlama yaratıyor.</p>
                  <span className="tag danger">Bölgesel Risk Seviyesi: YÜKSEK</span>
                </article>
                {newsState.data?.slice(0, 2).map((item) => (
                  <article className="article-card" key={item.title}>
                    <p className="section-label">Kriz Detayı & Etki</p>
                    <h4>{item.title}</h4>
                    <p>{item.summary}</p>
                    <span className={`tag ${item.importance.toLowerCase()}`}>{item.category} · {item.importance}</span>
                  </article>
                ))}
              </div>
            </TabSection>
          )}

          {activeTab === 'ai' && (
            <TabSection title="TAB 2: AI & Teknoloji Gelişimleri" icon={<Bot size={18} />}>
              <div className="article-grid">
                <article className="article-card featured">
                  <p className="section-label">Teknoloji Manşeti</p>
                  <h3>Çip zinciri AI talebiyle tekrar sıkışıyor.</h3>
                  <p>NVIDIA, ASML ve TSMC ekseninde kapasite, ileri paketleme ve yazılım altyapısı yatırımcı akışını belirliyor.</p>
                  <span className="tag neutral">Sektörel Etki Etiketi: Çip</span>
                </article>
                <article className="article-card">
                  <p className="section-label">Finansal & Endüstriyel Yansıma</p>
                  <h4>Capex döngüsü sürüyor.</h4>
                  <p>Bulut, veri merkezi ve yapay zekâ altyapısı, bilanço kalitesi güçlü şirketlerde değerleme desteği üretiyor.</p>
                </article>
                <article className="article-card">
                  <p className="section-label">Ekosistem Notu</p>
                  <h4>Kuantum ve donanım, uzun vadeli stratejik opsiyon.</h4>
                  <p>Kısa vadede hikâye değil, tedarik ve enerji verimliliği belirleyici.</p>
                </article>
              </div>
            </TabSection>
          )}

          {activeTab === 'opportunity' && (
            <TabSection title="TAB 3: Yatırım Fırsatları" icon={<LineChart size={18} />}>
              <div className="subtabs">
                <article className="article-card">
                  <p className="section-label">SUB-TAB 3.1 · Hisse Senetleri</p>
                  <h4>Yarı iletken, savunma ve enerji altyapısı.</h4>
                  <p>Bilanço gücü ve sipariş görünürlüğü, faiz baskısına rağmen öne çıkan ana filtreler olmaya devam ediyor.</p>
                </article>
                <article className="article-card">
                  <p className="section-label">SUB-TAB 3.2 · Tahvil ve Bono</p>
                  <h4>Getiri eğrisi ve faiz patikası.</h4>
                  <p>ABD 10Y ve Avrupa tahvilleri, resesyon beklentisi ile enflasyon yapışkanlığı arasındaki gerilimde fiyatlanıyor.</p>
                </article>
                <article className="article-card">
                  <p className="section-label">SUB-TAB 3.3 · Kripto Varlıklar</p>
                  <h4>ETF akışları ve likidite.</h4>
                  <p>BTC ve ETH tarafında kurumsal akışlar, regülasyon manşetlerine duyarlı kalıyor.</p>
                </article>
              </div>
            </TabSection>
          )}

          {activeTab === 'calendar' && (
            <TabSection title="TAB 4: Günlük Veriler & Ekonomik Takvim" icon={<CalendarDays size={18} />}>
              <div className="calendar-list">
                {calendarState.data?.map((event) => (
                  <article className="calendar-row" key={`${event.timeTR}-${event.name}`}>
                    <span className="time-pill">{event.timeTR}</span>
                    <span className="country-pill">{event.country}</span>
                    <div className="calendar-main">
                      <strong>{event.name}</strong>
                      <p>{event.impact}</p>
                    </div>
                    <div className="calendar-meta"><span>Beklenti: {event.forecast}</span><span>Önceki: {event.previous}</span><span>Açıklanan: {event.actual}</span></div>
                  </article>
                ))}
              </div>
            </TabSection>
          )}

          {activeTab === 'rates' && (
            <TabSection title="TAB 5: Ülkelerin Faiz Kartları" icon={<Landmark size={18} />}>
              <div className="rates-grid">
                {rateCards.map((rate) => (
                  <article className="rate-card" key={rate.centralBank}>
                    <div className="rate-top">
                      <span>{rate.country}</span>
                      <strong>{rate.centralBank}</strong>
                    </div>
                    <div className="rate-value">{rate.rate}</div>
                    <p>Duruş: {rate.stance}</p>
                  </article>
                ))}
              </div>
            </TabSection>
          )}
        </section>

        <aside className="news-panel">
          <div className="panel-head">
            <Newspaper size={18} />
            <h2>Canlı Haber Akışı</h2>
          </div>
          {newsState.data?.map((item) => (
            <article className="news-item" key={item.title}>
              <div className="news-meta">
                <span>{item.category}</span>
                <time>{formatIstanbulTime(item.publishedAt)}</time>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </aside>
      </main>

      {(quotesState.error || newsState.error || calendarState.error) && (
        <footer className="footer-note">
          API bağlantısı yoksa fallback veri kullanılır. {quotesState.error || newsState.error || calendarState.error}
        </footer>
      )}
    </div>
  );
}

function TabSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div className="section-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="section-head">
        <span className="section-icon">{icon}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
