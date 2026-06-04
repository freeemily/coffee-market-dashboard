import { useEffect, useState } from "react";
import "./App.css";

const WEB_BACKEND_URL =
  "https://coffee-market-dashboard-production.up.railway.app";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${WEB_BACKEND_URL}/api/dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const market = dashboard?.market || {};
  const signal = market.signal || {};
  const news = market.news || [];
  const trending = market.trending || [];
  const similar = market.similarEvents || [];

  return (
    <div className="page">

      {/* TOP STATUS BAR */}
      <div className="topbar">
        <div className={`badge ${signal.market_signal}`}>
          {signal.market_signal || "UNKNOWN"}
        </div>

        <div className="topbar-item">
          Sentiment: {signal.avg_sentiment ?? "-"}
        </div>

        <div className="topbar-item">
          News: {news.length}
        </div>

        <div className="topbar-item">
          Trends: {trending.length}
        </div>
      </div>

      {/* SNAPSHOT */}
      <section className="grid-3">

        <div className="card highlight">
          <h3>Market Direction</h3>
          <p>{signal.market_signal || "-"}</p>
        </div>

        <div className="card">
          <h3>News Pressure</h3>
          <p>{signal.avg_sentiment ?? "-"}</p>
        </div>

        <div className="card">
          <h3>Short-term Signal</h3>
          <p>Model Pending</p>
        </div>

      </section>

      {/* INTELLIGENCE FEED */}
      <section className="panel">

        <h2>Market Intelligence Feed</h2>

        <div className="feed">

          {news.slice(0, 5).map((n) => (
            <div key={n.id} className="feed-item">
              <div className="tag">{n.source}</div>
              <h4>{n.title}</h4>
              <p>{n.summary}</p>
            </div>
          ))}

          {similar.slice(0, 3).map((s, i) => (
            <div key={i} className="feed-item alt">
              <div className="tag">Historical Match</div>
              <h4>{s.today_article?.title}</h4>
              <p>{s.similar_past?.title}</p>
            </div>
          ))}

        </div>
      </section>

      {/* PRICE + MODEL */}
      <section className="panel split">

        <div>
          <h2>Price & Forecast</h2>
          <div className="chart-box">
            Price Chart (API 연결 예정)
          </div>
        </div>

        <div>
          <h2>Strategy</h2>

          <div className={`strategy ${signal.market_signal}`}>
            {signal.market_signal === "bullish" && "Aggressive Buying Bias"}
            {signal.market_signal === "bearish" && "Risk Reduction Mode"}
            {signal.market_signal === "neutral" && "Wait & Observe"}
          </div>
        </div>

      </section>

      {/* TREND */}
      <section className="panel">
        <h2>Trending</h2>
        <div className="tags">
          {trending.map((t) => (
            <span key={t.entity} className="tag">
              {t.entity}
            </span>
          ))}
        </div>
      </section>

    </div>
  );
}