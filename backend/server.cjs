const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 3001;
const NEWS_API_BASE = 'http://34.50.27.50:8000';

// 모든 오리진 허용 (Railway 배포 환경 대응)
app.use(cors());
app.use(express.json());

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
    res.json(data);
  } catch (err) {
    console.error('[proxy catch]', err.message);
    res.status(502).json({ error: 'News API unavailable', detail: err.message });
  }
}

app.get('/api/news/today',        (req, res) => proxyNews('/news/today', res));
app.get('/api/news/signal',       (req, res) => proxyNews(`/news/signal?days=${req.query.days || 30}`, res));
app.get('/api/news/trending',     (req, res) => proxyNews(`/news/trending?days=${req.query.days || 7}`, res));
app.get('/api/news/similar/today',(req, res) => proxyNews(`/news/similar/today?top_n=${req.query.top_n || 3}`, res));
app.get('/api/news/search',       (req, res) => proxyNews(`/news/search?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 5}`, res));
app.get('/api/news/similar',      (req, res) => proxyNews(`/news/similar?q=${encodeURIComponent(req.query.q || '')}&top_k=${req.query.top_k || 3}`, res));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Bean Pulse backend running on port ${PORT}`));
