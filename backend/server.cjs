const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const PORT = process.env.PORT || 3001;
const NEWS_API_BASE = process.env.NEWS_API_BASE ||  'http://34.22.105.171:8000';

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

app.use(cors());
app.use(express.json());

// ── News API 프록시 ──────────────────────────────────────
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

app.get('/api/news/today',        (req, res) => proxyNews('/news/today', res));
app.get('/api/news/signal',       (req, res) => proxyNews(`/news/signal?days=${req.query.days || 30}`, res));
app.get('/api/news/trending',     (req, res) => proxyNews(`/news/trending?days=${req.query.days || 7}`, res));
app.get('/api/news/similar/today',(req, res) => proxyNews(`/news/similar/today?top_n=${req.query.top_n || 3}`, res));
app.get('/api/news/search',       (req, res) => proxyNews(`/news/search?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 5}`, res));
app.get('/api/news/similar',      (req, res) => proxyNews(`/news/similar?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 3}`, res));

// ── 모델 예측 API ────────────────────────────────────────
app.get('/api/prediction/latest', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (horizon)
        id, predicted_at, prediction_for_date, last_data_date,
        horizon, direction, direction_label, probability_up,
        arima_features, base_features, feature_importance, config
      FROM coffee_predictions
      ORDER BY horizon, predicted_at DESC
    `);
    return res.json({ predictions: rows });
  } catch (err) {
    return res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

app.get('/api/prediction/short', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (horizon)
        id, predicted_at, prediction_for_date, last_data_date,
        horizon, direction, direction_label, probability_up,
        arima_features, base_features, feature_importance
      FROM coffee_predictions
      WHERE horizon BETWEEN 1 AND 5
      ORDER BY horizon, predicted_at DESC
    `);
    return res.json({ predictions: rows });
  } catch (err) {
    return res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

app.get('/api/prediction/mid', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (horizon)
        id, predicted_at, prediction_for_date, last_data_date,
        horizon, direction, direction_label, probability_up,
        arima_features, base_features, feature_importance
      FROM coffee_predictions
      WHERE horizon >= 14
      ORDER BY horizon, predicted_at DESC
    `);
    return res.json({ predictions: rows });
  } catch (err) {
    return res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── 시장 데이터 (ICE 가격, 환율) ─────────────────────────
app.get('/api/market/latest', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT date, arabica_close, arabica_pct_change, usdkrw, usdkrw_pct_change
      FROM market_daily
      ORDER BY date DESC
      LIMIT 1
    `);
    return res.json({ market: rows[0] || null });
  } catch (err) {
    return res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── 데일리 브리핑 DB 조회 ────────────────────────────────
app.get('/api/briefing/latest', async (req, res) => {
  try {
    // daily_briefing 테이블의 컬럼 목록을 먼저 확인
    const colRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'daily_briefing'
      ORDER BY ordinal_position
    `);
    const cols = colRes.rows.map(r => r.column_name);

    // 최신 row 조회 (created_at 또는 briefing_date 기준)
    const orderCol = cols.includes('created_at') ? 'created_at'
                   : cols.includes('briefing_date') ? 'briefing_date'
                   : cols.includes('date') ? 'date'
                   : 'id';

    const { rows } = await pool.query(
      `SELECT * FROM daily_briefing ORDER BY ${orderCol} DESC LIMIT 1`
    );

    if (!rows.length) return res.json({ briefing: null, columns: cols });
    return res.json({ briefing: rows[0], columns: cols });
  } catch (err) {
    return res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

// ── Anthropic 브리핑 프록시 ──────────────────────────────
app.post('/api/briefing', async (req, res) => {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' });
  }
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt 필드가 필요합니다.' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join('');
    return res.json({ text });
  } catch (err) {
    console.error('[briefing error]', err);
    return res.status(502).json({ error: err.message });
  }
});

// ── Health ───────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch (_) {}
  res.json({ status: 'ok', db: dbOk ? 'connected' : 'error', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Bean Pulse backend running on port ${PORT}`);
});
