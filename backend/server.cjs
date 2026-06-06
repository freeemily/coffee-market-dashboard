const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const PORT = process.env.PORT || 3001;
const NEWS_API_BASE = process.env.NEWS_API_BASE || 'http://34.50.27.50:8000';

// PostgreSQL 연결 (Google Cloud SQL)
const pool = new Pool({
  host: process.env.DB_HOST || '/cloudsql/project-d4efc2a1-f0de-417c-953:asia-northeast3:coffee-project-new',
  user: process.env.DB_USER || 'web',
  password: process.env.DB_PASSWORD || 'u*NE32YDe+xM([9/',
  database: process.env.DB_NAME || 'coffee_db',
  // TCP 직접 연결용 (로컬 개발 또는 Cloud Run 외부)
  ...(process.env.DB_HOST_TCP ? {
    host: process.env.DB_HOST_TCP,
    port: parseInt(process.env.DB_PORT || '5432'),
  } : {}),
});

app.use(cors());
app.use(express.json());

// ── DB 헬퍼 ────────────────────────────────────────────────

async function queryDB(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// ── DB 엔드포인트 ───────────────────────────────────────────

// 최신 시장 데이터 (market_daily 최근 N일)
app.get('/api/market/latest', async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  try {
    const rows = await queryDB(
      `SELECT date, arabica_close, arabica_pct_change, usdkrw, usdkrw_pct_change
       FROM market_daily
       ORDER BY date DESC
       LIMIT $1`,
      [days]
    );
    // RSI(14) 계산: 최근 14일 등락률 기반
    const closes = rows.map(r => r.arabica_close).reverse(); // 오래된 것부터
    const rsi = calcRSI(closes, 14);
    const latest = rows[0] || null;
    res.json({
      latest,
      rsi14: rsi !== null ? parseFloat(rsi.toFixed(2)) : null,
      history: rows.reverse(), // 오래된 것부터 정렬
    });
  } catch (err) {
    console.error('[DB market/latest]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 뉴스 feature 데이터 (news_daily_features 최근 N일)
app.get('/api/features/news', async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  try {
    const rows = await queryDB(
      `SELECT date, num_articles, avg_sentiment, top_entities, created_at
       FROM news_daily_features
       ORDER BY date DESC
       LIMIT $1`,
      [days]
    );
    const latest = rows[0] || null;
    res.json({
      latest,
      history: rows.reverse(),
    });
  } catch (err) {
    console.error('[DB features/news]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── RSI 계산 유틸 ───────────────────────────────────────────

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── 뉴스 API 프록시 ─────────────────────────────────────────

async function proxyNews(path, res) {
  try {
    const url = `${NEWS_API_BASE}${path}`;
    console.log('[proxy]', url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      const text = await response.text();
      console.error('[proxy error]', response.status, text);
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('[proxy catch]', err);
    return res.status(502).json({ error: 'News API unavailable', detail: err.message });
  }
}

app.get('/api/news/today', (req, res) => proxyNews('/news/today', res));
app.get('/api/news/signal', (req, res) => proxyNews(`/news/signal?days=${req.query.days || 30}`, res));
app.get('/api/news/trending', (req, res) => proxyNews(`/news/trending?days=${req.query.days || 7}`, res));
app.get('/api/news/similar/today', (req, res) => proxyNews(`/news/similar/today?top_n=${req.query.top_n || 3}`, res));
app.get('/api/news/search', (req, res) => proxyNews(`/news/search?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 5}`, res));
app.get('/api/news/similar', (req, res) => proxyNews(`/news/similar?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 3}`, res));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Bean Pulse backend running on port ${PORT}`));
