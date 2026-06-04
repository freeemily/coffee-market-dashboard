const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const NEWS_PIPELINE_URL =
  "http://34.50.27.50:8000";

/*
====================================
TEMP MOCK DATA
모델 API 들어오면 제거
====================================
*/

const mockForecast = {
  probability_up: 58,

  short_term_direction: "UP",

  mid_term_direction: "UP",

  mid_term_period: 14,

  model_name: "ARIMA + XGBoost",

  feature_importance: [
    {
      feature: "USD/KRW",
      importance: 31,
    },
    {
      feature: "News Sentiment",
      importance: 24,
    },
    {
      feature: "Arabica Futures",
      importance: 18,
    },
    {
      feature: "Brazil Supply",
      importance: 15,
    },
    {
      feature: "Weather Risk",
      importance: 12,
    },
  ],
};

const mockMarketSnapshot = {
  arabica_close: 274.45,

  arabica_pct_change: 0.44,

  usdkrw: 1378.2,

  usdkrw_pct_change: -0.12,
};

app.get("/api/dashboard", async (req, res) => {
  try {
    const [
      signalRes,
      newsRes,
      trendingRes,
      similarRes,
    ] = await Promise.all([
      fetch(
        `${NEWS_PIPELINE_URL}/news/signal?days=30`
      ),

      fetch(
        `${NEWS_PIPELINE_URL}/news/today`
      ),

      fetch(
        `${NEWS_PIPELINE_URL}/news/trending?days=7`
      ),

      fetch(
        `${NEWS_PIPELINE_URL}/news/similar/today?top_n=3`
      ),
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
      marketSnapshot:
        mockMarketSnapshot,

      market: {
        signal,

        news: news.news || [],

        trending:
          trending.trending || [],

        similarEvents:
          similar.results || [],
      },

      forecast: mockForecast,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Dashboard Load Error",
    });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;

    const result = await fetch(
      `${NEWS_PIPELINE_URL}/news/search?q=${encodeURIComponent(
        q
      )}&top_k=10`
    );

    const data = await result.json();

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Search Error",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Server Running : ${PORT}`
  );
});