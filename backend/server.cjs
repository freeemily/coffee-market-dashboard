const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const PORT = process.env.PORT || 3001;
const NEWS_API_BASE = process.env.NEWS_API_BASE || 'http://34.50.27.50:8000';

// PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

// DB 연결 확인
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] 연결 실패:', err.message);
  } else {
    console.log('[DB] 연결 성공');
    release();
  }
});

app.use(cors());
app.use(express.json());

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

      console.error(
        '[proxy error]',
        response.status,
        text
      );

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

app.get('/api/news/today', (req, res) => {
  proxyNews('/news/today', res);
});

app.get('/api/news/signal', (req, res) => {
  proxyNews(
    `/news/signal?days=${req.query.days || 30}`,
    res
  );
});

app.get('/api/news/trending', (req, res) => {
  proxyNews(
    `/news/trending?days=${req.query.days || 7}`,
    res
  );
});

app.get('/api/news/similar/today', (req, res) => {
  proxyNews(
    `/news/similar/today?top_n=${req.query.top_n || 3}`,
    res
  );
});

app.get('/api/news/search', (req, res) => {
  proxyNews(
    `/news/search?q=${encodeURIComponent(
      req.query.q || ''
    )}&top_k=${req.query.top_k || 5}`,
    res
  );
});

app.get('/api/news/similar', (req, res) => {
  proxyNews(
    `/news/similar?q=${encodeURIComponent(
      req.query.q || ''
    )}&top_k=${req.query.top_k || 3}`,
    res
  );
});

// 예측 모델 API — DB에서 최신 예측 1건 반환
// horizon: 1 (단기) | 20 (중장기)
app.get('/api/prediction', async (req, res) => {
  const horizon = parseInt(req.query.horizon, 10);
  if (horizon !== 1 && horizon !== 20) {
    return res.status(400).json({ error: 'horizon must be 1 or 20' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT
         id, predicted_at, prediction_for_date, last_data_date,
         horizon, direction, direction_label, probability_up,
         arima_features, base_features, feature_importance, config
       FROM coffee_predictions
       WHERE horizon = $1
       ORDER BY predicted_at DESC
       LIMIT 1`,
      [horizon]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No prediction found', horizon });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('[prediction error]', err);
    return res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(
    `Bean Pulse backend running on port ${PORT}`
  );
});
