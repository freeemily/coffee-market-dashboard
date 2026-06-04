import { useEffect, useState } from "react";
import "./App.css";

const WEB_BACKEND_URL =
  "https://coffee-market-dashboard-production.up.railway.app";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${WEB_BACKEND_URL}/api/dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchNews = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(
        `${WEB_BACKEND_URL}/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResult(data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const market = dashboard?.market || {};
  const signal = market.signal || {};
  const news = market.news || [];
  const trending = market.trending || [];
  const forecast = dashboard?.forecast;

  return (
    <div className="dashboard">

      {/* TOP BAR */}
      <div className="topbar">
        <div className="brand">BEAN PULSE</div>
        <div className="timestamp">2026.05.29 (Thu)</div>
      </div>

      {/* KPI ROW */}
      <div className="kpi-grid">

        <div className="kpi-card">
          <div className="kpi-title">ICE Arabica</div>
          <div className="kpi-value">274.45</div>
          <div className="kpi-sub up">+0.44%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">USD/KRW</div>
          <div className="kpi-value">1,378.50</div>
          <div className="kpi-sub down">-0.12%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Model Accuracy</div>
          <div className="kpi-value">58%</div>
          <div className="kpi-sub">ARIMA + XGB</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">News Sentiment</div>
          <div className="kpi-value">
            {signal.market_signal || "Neutral"}
          </div>
          <div className="kpi-sub warn">Weak Bias</div>
        </div>

      </div>

      {/* MAIN GRID */}
      <div className="main-grid">

        {/* LEFT COLUMN */}
        <div className="left-col">

          {/* AI BRIEF */}
          <div className="card">
            <div className="card-title">AI Daily Briefing</div>

            <div className="brief">
              <p>
                • Arabica prices show short-term upward pressure
              </p>
              <p>
                • Supply risk rising in Brazil due to weather conditions
              </p>
              <p>
                • USD strengthening slightly impacts import cost
              </p>
              <p>
                • Mid-term trend remains cautiously bullish
              </p>
            </div>
          </div>

          {/* NEWS */}
          <div className="card">
            <div className="card-title">News Feed</div>

            <div className="news-list">
              {news.slice(0, 6).map((item, i) => (
                <div className="news-item" key={i}>
                  <div className="news-title">{item.title}</div>
                  <div className="news-meta">{item.source}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="right-col">

          {/* CHART */}
          <div className="card large">
            <div className="card-title">Price Trend + Forecast</div>

            <div className="chart-box">
              <div className="line actual"></div>
              <div className="line predict"></div>
            </div>
          </div>

          {/* MATRIX */}
          <div className="card">
            <div className="card-title">Feature Impact</div>

            <div className="matrix">
              <div>USD/KRW</div>
              <div>31%</div>

              <div>News</div>
              <div>24%</div>

              <div>Futures</div>
              <div>18%</div>

              <div>Supply</div>
              <div>15%</div>
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM SEARCH */}
      <div className="card search-card">

        <div className="card-title">Search</div>

        <form onSubmit={searchNews} className="search">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news..."
          />
          <button>Search</button>
        </form>

        <div className="search-results">
          {searchResult.map((item, i) => (
            <div key={i} className="result">
              <div className="result-title">{item.title}</div>
              <div className="result-desc">{item.description}</div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}