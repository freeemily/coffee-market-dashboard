const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const NEWS_PIPELINE_URL = 'http://34.50.27.50:8000';

app.get('/api/dashboard', async (req, res) => {
  try {
    const [
      signalRes,
      newsRes,
      trendingRes,
      similarRes
    ] = await Promise.all([
      fetch(`${NEWS_PIPELINE_URL}/news/signal?days=30`),
      fetch(`${NEWS_PIPELINE_URL}/news/today`),
      fetch(`${NEWS_PIPELINE_URL}/news/trending?days=7`),
      fetch(`${NEWS_PIPELINE_URL}/news/similar/today?top_n=3`)
    ]);

    const signal = signalRes.ok
      ? await signalRes.json()
      : null;

    const news = newsRes.ok
      ? await newsRes.json()
      : { news: [] };

    const trending = trendingRes.ok
      ? await trendingRes.json()
      : { trending: [] };

    const similar = similarRes.ok
      ? await similarRes.json()
      : { results: [] };

    res.json({
      market: {
        signal,
        news: news.news || [],
        trending: trending.trending || [],
        similarEvents: similar.results || []
      },

      forecast: null
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Dashboard Load Error'
    });
  }
});

app.get('/api/search', async (req, res) => {
  try {

    const q = req.query.q;

    const result = await fetch(
      `${NEWS_PIPELINE_URL}/news/search?q=${encodeURIComponent(q)}&top_k=10`
    );

    const data = await result.json();

    res.json(data);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Search Error'
    });

  }
});

app.listen(PORT, () => {
  console.log(`Server Running : ${PORT}`);
});