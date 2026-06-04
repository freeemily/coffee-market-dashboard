const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 3001;
const NEWS_API_BASE = 'http://34.50.27.50:8000';

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://coffee-market-dashboard-production-4b88.up.railway.app'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

async function proxyNews(path, res) {
  try {
    const url = `${NEWS_API_BASE}${path}`;
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('News API error:', err.message);
    res.status(502).json({ error: 'News API unavailable', detail: err.message });
  }
}

app.get('/api/news/today', (req, res) => proxyNews('/news/today', res));

app.get('/api/news/signal', (req, res) => {
  const days = req.query.days || 30;
  proxyNews(`/news/signal?days=${days}`, res);
});

app.get('/api/news/trending', (req, res) => {
  const days = req.query.days || 7;
  proxyNews(`/news/trending?days=${days}`, res);
});

app.get('/api/news/similar/today', (req, res) => {
  const top_n = req.query.top_n || 3;
  proxyNews(`/news/similar/today?top_n=${top_n}`, res);
});

app.get('/api/news/search', (req, res) => {
  const q = req.query.q || '';
  const top_k = req.query.top_k || 5;
  proxyNews(`/news/search?q=${encodeURIComponent(q)}&top_k=${top_k}`, res);
});

app.get('/api/news/similar', (req, res) => {
  const q = req.query.q || '';
  const top_k = req.query.top_k || 3;
  proxyNews(`/news/similar?q=${encodeURIComponent(q)}&top_k=${top_k}`, res);
});

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Bean Pulse backend running on port ${PORT}`);
});
