const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 8080;
const NEWS_PIPELINE_URL = 'http://34.50.27.50:8000';

app.get('/api/dashboard', async (req, res) => {
  try {
    const newsSentimentRes = await fetch(`${NEWS_PIPELINE_URL}/news/sentiment`);
    const newsSentimentData = newsSentimentRes.ok ? await newsSentimentRes.json() : null;

    const newsLatestRes = await fetch(`${NEWS_PIPELINE_URL}/news/latest?limit=5`);
    const newsLatestData = newsLatestRes.ok ? await newsLatestRes.json() : { news: [] };

    const formattedNews = (newsLatestData.news || []).map(art => ({
      id: art.id,
      title: art.title,
      date: art.publish_date || '-', 
      description: art.description,
      source: art.source
    }));

    res.json({
      historicalData: null, 
      prediction: null,
      marketSignal: newsSentimentData?.market_signal || 'neutral',
      sentimentTrend: newsSentimentData?.trend || [],
      latestNews: formattedNews
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  try {
    const searchRes = await fetch(`${NEWS_PIPELINE_URL}/news/search?q=${encodeURIComponent(query)}&top_k=5`);
    const searchData = await searchRes.json();
    res.json(searchData.results || []);
  } catch (error) {
    res.status(500).json({ error: "검색 중 오류가 발생했습니다." });
  }
});

app.get('/api/news/similar/:id', async (req, res) => {
  const articleId = req.params.id;
  try {
    const similarRes = await fetch(`${NEWS_PIPELINE_URL}/news/similar/${articleId}?top_k=4`);
    const similarData = await similarRes.json();
    res.json(similarData.similar || []);
  } catch (error) {
    res.status(500).json({ error: "연관 데이터 조회 중 오류가 발생했습니다." });
  }
});

app.listen(PORT, () => {
  console.log(`서버 구동중: 포트 ${PORT}`);
});