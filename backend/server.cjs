const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL 연동 패키지 추가

const app = express();

const PORT = process.env.PORT || 3001;
const NEWS_API_BASE = process.env.NEWS_API_BASE || 'http://34.50.27.50:8000';

app.use(cors());
app.use(express.json());

// PostgreSQL DB 연결 풀(Pool) 설정
const pool = new Pool({
  host: '34.158.197.17',
  port: 5432,
  database: 'coffee_db',
  user: 'web',
  password: 'u*NE32YDe+xM([9/',
});

async function proxyNews(path, res) {
  try {
    const url = `${NEWS_API_BASE}${path}`;
    console.log('[proxy]', url);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 10000);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text();
      console.error('[proxy error]', response.status, text);
      return res.status(response.status).json({
        error: text,
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('[proxy catch]', err);
    return res.status(502).json({
      error: 'News API unavailable',
      detail: err.message,
    });
  }
}

// ---- 기존 뉴스 API 프록시 라우터 ----
app.get('/api/news/today', (req, res) => {
  proxyNews('/news/today', res);
});

app.get('/api/news/signal', (req, res) => {
  proxyNews(`/news/signal?days=${req.query.days || 30}`, res);
});

app.get('/api/news/trending', (req, res) => {
  proxyNews(`/news/trending?days=${req.query.days || 7}`, res);
});

app.get('/api/news/similar/today', (req, res) => {
  proxyNews(`/news/similar/today?top_n=${req.query.top_n || 3}`, res);
});

app.get('/api/news/search', (req, res) => {
  proxyNews(`/news/search?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 5}`, res);
});

app.get('/api/news/similar', (req, res) => {
  proxyNews(`/news/similar?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 3}`, res);
});

// ---- 🚀 새롭게 추가된 예측 모델 DB 연동 라우터 ----
app.get('/api/predictions/latest', async (req, res) => {
  try {
    // 단기 예측 (horizon: 1) 최신 데이터 조회
    const shortRes = await pool.query(
      'SELECT * FROM coffee_predictions WHERE horizon = 1 ORDER BY predicted_at DESC LIMIT 1'
    );
    
    // 중장기 예측 (horizon: 20) 최신 데이터 조회
    const midRes = await pool.query(
      'SELECT * FROM coffee_predictions WHERE horizon = 20 ORDER BY predicted_at DESC LIMIT 1'
    );

    res.json({
      short: shortRes.rows[0] || null,
      mid: midRes.rows[0] || null
    });
  } catch (err) {
    console.error('DB query error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ---- 상태 체크 라우터 ----
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Bean Pulse backend running on port ${PORT}`);
});