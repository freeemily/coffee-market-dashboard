const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const NEWS_API = "http://34.50.27.50:8000";

/* -------------------------- */
/* Mock Prediction (Temporary)
/* -------------------------- */

const mockPrediction = {
  shortTermProb: 58,
  shortTermDirection: "down",
  midTermDirection: "up",
  horizon: 14,
  modelName: "ARIMA-XGBoost",

  recommendation: "분할 매수",

  featureImportance: [
    {
      name: "Brazil Production",
      value: 31
    },
    {
      name: "USD/KRW",
      value: 22
    },
    {
      name: "Vietnam Export",
      value: 15
    },
    {
      name: "Inventory",
      value: 12
    }
  ]
};

/* -------------------------- */
/* Dashboard */
/* -------------------------- */

app.get("/api/dashboard", async (req, res) => {
  try {

    const [
      signalRes,
      newsRes,
      trendingRes,
      similarRes
    ] = await Promise.all([
      fetch(`${NEWS_API}/news/signal?days=30`),
      fetch(`${NEWS_API}/news/today`),
      fetch(`${NEWS_API}/news/trending?days=7`),
      fetch(`${NEWS_API}/news/similar/today?top_n=3`)
    ]);

    const signal =
      signalRes.ok
        ? await signalRes.json()
        : null;

    const news =
      newsRes.ok
        ? await newsRes.json()
        : { news: [] };

    const trending =
      trendingRes.ok
        ? await trendingRes.json()
        : { trending: [] };

    const similar =
      similarRes.ok
        ? await similarRes.json()
        : { results: [] };

    res.json({
      prediction: mockPrediction,

      market: {
        signal,
        trending: trending.trending || [],
        news: news.news || [],
        similarEvents:
          similar.results || []
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Dashboard API Error"
    });

  }
});

/* -------------------------- */
/* Search */
/* -------------------------- */

app.get("/api/search", async (req, res) => {

  try {

    const query = req.query.q;

    const response = await fetch(
      `${NEWS_API}/news/search?q=${encodeURIComponent(query)}&top_k=10`
    );

    const data = await response.json();

    res.json(data);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Search Error"
    });

  }

});

/* -------------------------- */
/* Similar Search */
/* -------------------------- */

app.get("/api/similar", async (req, res) => {

  try {

    const query = req.query.q;

    const response = await fetch(
      `${NEWS_API}/news/similar?q=${encodeURIComponent(query)}&top_k=5`
    );

    const data = await response.json();

    res.json(data);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Similar Search Error"
    });

  }

});

/* -------------------------- */
/* Health Check */
/* -------------------------- */

app.get("/", (_, res) => {
  res.send("Coffee Intelligence Backend Running");
});

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});