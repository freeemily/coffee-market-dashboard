// App.jsx

import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "";

const mockForecast = {
  shortTermProb: 58,
  shortTermDirection: "하락",
  midTermDirection: "상승",
  recommendation: "분할 매수",
  horizon: 14,
  featureImportance: [
    { name: "Brazil Production", value: 31 },
    { name: "USD/KRW", value: 22 },
    { name: "Vietnam Export", value: 15 },
    { name: "Global Inventory", value: 12 }
  ]
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!search.trim()) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(search)}`
      );

      const data = await res.json();

      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        Loading Coffee Intelligence...
      </div>
    );
  }

  const signal = dashboard?.market?.signal || {};
  const news = dashboard?.market?.news || [];
  const trending = dashboard?.market?.trending || [];
  const similarEvents = dashboard?.market?.similarEvents || [];

  return (
    <div className="app">

      <section className="hero">

        <div className="hero-content">

          <span className="hero-badge">
            Coffee Intelligence Platform
          </span>

          <h1>
            AI 기반 생두 구매
            <br />
            의사결정 플랫폼
          </h1>

          <p>
            가격 예측, 뉴스 분석, 과거 유사 사례를 통합하여
            최적의 생두 구매 시점을 제안합니다.
          </p>

          <div className="hero-stats">

            <div className="hero-stat">
              <strong>58%</strong>
              <span>단기 상승 확률</span>
            </div>

            <div className="hero-stat">
              <strong>14일</strong>
              <span>예측 기간</span>
            </div>

            <div className="hero-stat">
              <strong>상승</strong>
              <span>중장기 전망</span>
            </div>

          </div>

        </div>

        <div className="hero-graph">

          <div className="graph-placeholder">
            <div className="graph-line"></div>
            <div className="graph-line graph-line2"></div>
          </div>

        </div>

      </section>

      <section className="snapshot">

        <div className="snapshot-card">

          <span>Arabica Price</span>
          <h2>245.30¢</h2>
          <p className="positive">+1.14%</p>

        </div>

        <div className="snapshot-card">

          <span>USD / KRW</span>
          <h2>1340.50</h2>
          <p className="negative">-0.19%</p>

        </div>

        <div className="snapshot-card">

          <span>Market Signal</span>
          <h2>{signal.market_signal || "-"}</h2>
          <p>{signal.avg_sentiment || "-"}</p>

        </div>

      </section>

      <section className="forecast-layout">

        <div className="forecast-panel">

          <div className="section-header">
            <h2>Price Forecast</h2>
            <span>Forecast Model</span>
          </div>

          <div className="forecast-chart">

            <div className="chart-area">

              <div className="mock-line"></div>
              <div className="mock-line future"></div>

            </div>

            <div className="forecast-overlay">

              <div className="forecast-pill">
                단기 상승 확률 58%
              </div>

              <div className="forecast-pill">
                중장기 상승 전망
              </div>

            </div>

          </div>

        </div>

        <div className="strategy-panel">

          <div className="strategy-top">

            <span>추천 전략</span>

            <h2>
              {mockForecast.recommendation}
            </h2>

            <p>
              단기 하락 · 중장기 상승
            </p>

          </div>

          <div className="matrix">

            <div>즉시 매입</div>

            <div className="active">
              분할 매수
            </div>

            <div>헤징 검토</div>

            <div>매입 보류</div>

          </div>

        </div>

      </section>

      <section className="factors">

        <div className="section-header">
          <h2>AI Decision Factors</h2>
        </div>

        <div className="factor-list">

          {mockForecast.featureImportance.map((item) => (
            <div className="factor-row" key={item.name}>

              <div className="factor-title">
                {item.name}
              </div>

              <div className="factor-bar">
                <div
                  className="factor-fill"
                  style={{
                    width: `${item.value}%`
                  }}
                />
              </div>

              <div className="factor-value">
                {item.value}%
              </div>

            </div>
          ))}

        </div>

      </section>

      <section className="market-section">

        <div className="section-header">
          <h2>Market Intelligence</h2>
        </div>

        <div className="market-grid">

          <div className="market-card">

            <h3>Market Signal</h3>

            <div className="signal-box">
              {signal.market_signal || "-"}
            </div>

          </div>

          <div className="market-card">

            <h3>Trending Topics</h3>

            <div className="tag-list">

              {trending.map((item) => (
                <span key={item.entity} className="tag">
                  {item.entity}
                </span>
              ))}

            </div>

          </div>

        </div>

      </section>

      <section className="similar-section">

        <div className="section-header">
          <h2>Similar Historical Events</h2>
        </div>

        <div className="similar-grid">

          {similarEvents.map((item, idx) => (
            <div className="similar-card" key={idx}>

              <h4>
                {item.today_article?.title}
              </h4>

              <p>
                {
                  item.similar_past?.title
                }
              </p>

              <div className="similar-result">

                +5D :
                {" "}
                {
                  item.similar_past?.price_changes?.["+5d"]
                    ?.arabica_pct
                }
                %

              </div>

            </div>
          ))}

        </div>

      </section>

      <section className="news-section">

        <div className="section-header">
          <h2>Latest Coffee News</h2>
        </div>

        <div className="news-grid">

          {news.map((article) => (
            <div
              className="news-card"
              key={article.id}
            >

              <h3>
                {article.title}
              </h3>

              <p>
                {article.summary}
              </p>

              <div className="news-footer">

                <span>
                  {article.source}
                </span>

                <span>
                  {article.publish_date}
                </span>

              </div>

            </div>
          ))}

        </div>

      </section>

      <section className="search-section">

        <div className="section-header">
          <h2>Search Intelligence</h2>
        </div>

        <form
          className="search-form"
          onSubmit={handleSearch}
        >

          <input
            placeholder="Brazil drought..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <button>
            Search
          </button>

        </form>

        <div className="search-results">

          {searchResults.map((item) => (
            <div
              className="search-card"
              key={item.id}
            >

              <h4>
                {item.title}
              </h4>

              <p>
                {item.description}
              </p>

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}

export default App;