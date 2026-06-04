import { useEffect, useState } from "react";
import "./App.css";

const WEB_BACKEND_URL =
  "https://coffee-market-dashboard-production.up.railway.app";

export default function App() {
  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResult, setSearchResult] =
    useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch(
        `${WEB_BACKEND_URL}/api/dashboard`
      );

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
        `${WEB_BACKEND_URL}/api/search?q=${encodeURIComponent(
          searchQuery
        )}`
      );

      const data = await res.json();

      setSearchResult(
        data.results || []
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  const market =
    dashboard?.market || {};

  const signal =
    market.signal || {};

  const news =
    market.news || [];

  const trending =
    market.trending || [];

  const similarEvents =
    market.similarEvents || [];

  const forecast =
    dashboard?.forecast || {};

  const marketSnapshot =
    dashboard?.marketSnapshot || {};

  const topEntities =
    marketSnapshot.top_entities || [
      "Brazil",
      "Vietnam",
      "Robusta",
      "Export",
      "Frost",
      "Supply",
      "Weather"
    ];

  return (
    <div className="dashboard">

      <header className="topbar">

        <div>

          <div className="logo-badge">
            Coffee Market Intelligence
          </div>

          <h1>
            Green Bean Procurement Dashboard
          </h1>

        </div>

        <div className="update-box">

          <div>
            Last Update
          </div>

          <strong>
            {new Date().toLocaleDateString()}
          </strong>

        </div>

      </header>

      <section className="snapshot-grid">

        <div className="snapshot primary">

          <span>
            ICE Arabica
          </span>

          <h2>
            {marketSnapshot.arabica_close ??
              "274.45"}
          </h2>

          <p>
            {marketSnapshot.arabica_pct_change ??
              "+0.44"}
            %
          </p>

        </div>

        <div className="snapshot">

          <span>
            USD/KRW
          </span>

          <h2>
            {marketSnapshot.usdkrw ??
              "1378.2"}
          </h2>

          <p>
            {marketSnapshot.usdkrw_pct_change ??
              "-0.12"}
            %
          </p>

        </div>

        <div className="snapshot">

          <span>
            News Volume
          </span>

          <h2>
            {marketSnapshot.num_articles ??
              news.length}
          </h2>

          <p>
            Articles
          </p>

        </div>

        <div className="snapshot">

          <span>
            Sentiment
          </span>

          <h2>
            {marketSnapshot.avg_sentiment ??
              signal.avg_sentiment ??
              0.64}
          </h2>

          <p>
            Daily Average
          </p>

        </div>

      </section>
            <section className="main-grid">

        <div className="price-panel">

          <div className="panel-head">

            <div>

              <h2>
                Price Intelligence
              </h2>

              <span>
                30 Day Market Trend
              </span>

            </div>

            <div className="trend-chip up">
              +58%
            </div>

          </div>

          <div className="chart-area">

            <div className="chart-grid-bg" />

            <div className="chart-line actual" />

            <div className="chart-line forecast" />

            <div className="forecast-zone" />

          </div>

          <div className="chart-metrics">

            <div>

              <span>
                Tomorrow
              </span>

              <strong>
                {forecast.probability_up ??
                  58}
                %
              </strong>

            </div>

            <div>

              <span>
                Short Term
              </span>

              <strong>
                {forecast.short_term_direction ??
                  "UP"}
              </strong>

            </div>

            <div>

              <span>
                Mid Term
              </span>

              <strong>
                {forecast.mid_term_direction ??
                  "UP"}
              </strong>

            </div>

            <div>

              <span>
                Horizon
              </span>

              <strong>
                {forecast.mid_term_period ??
                  14}
                d
              </strong>

            </div>

          </div>

        </div>

        <div className="strategy-panel">

          <div className="panel-head">

            <div>

              <h2>
                AI Decision
              </h2>

              <span>
                Procurement Strategy
              </span>

            </div>

          </div>

          <div className="signal-box">

            <div className="signal-label">
              Recommended
            </div>

            <div className="signal-value">
              분할 매수
            </div>

          </div>

          <div className="matrix">

            <div className="matrix-header">
              상승
            </div>

            <div className="matrix-header">
              하락
            </div>

            <div className="matrix-side">
              상승
            </div>

            <div className="matrix-cell active">
              즉시 선매입
            </div>

            <div className="matrix-cell">
              분할 매수
            </div>

            <div className="matrix-side">
              하락
            </div>

            <div className="matrix-cell">
              헤징 검토
            </div>

            <div className="matrix-cell">
              매입 보류
            </div>

          </div>

          <div className="strategy-summary">

            <strong>
              Model Summary
            </strong>

            <p>
              단기 상승 가능성이
              우세하며 중기 추세 또한
              상승 방향으로
              판단됩니다.
            </p>

          </div>

        </div>

      </section>

      <section className="monitor-grid">

        <div className="news-monitor">

          <div className="panel-head">

            <h2>
              Market News
            </h2>

            <span>
              {news.length}
              {" "}
              articles
            </span>

          </div>

          <div className="news-feed">

            {news
              .slice(0, 10)
              .map((item) => {

                const sentiment =
                  item.sentiment_score >
                  0.6
                    ? "positive"
                    : item.sentiment_score <
                      0.4
                    ? "negative"
                    : "neutral";

                return (
                  <div
                    key={item.id}
                    className="news-row"
                  >

                    <div
                      className={`news-dot ${sentiment}`}
                    />

                    <div className="news-content">

                      <div className="news-title">
                        {item.title}
                      </div>

                      <div className="news-source">
                        {item.source}
                      </div>

                    </div>

                  </div>
                );
              })}

          </div>

          <div className="news-footer">

            +
            {" "}
            {Math.max(
              news.length - 10,
              0
            )}
            {" "}
            more articles

          </div>

        </div>
                <div className="insight-stack">

          <div className="feature-panel">

            <div className="panel-head">

              <h2>
                Market Drivers
              </h2>

              <span>
                Feature Importance
              </span>

            </div>

            {(forecast.feature_importance ||
              [
                {
                  feature:
                    "USD/KRW",
                  importance: 31,
                },
                {
                  feature:
                    "News Sentiment",
                  importance: 24,
                },
                {
                  feature:
                    "Arabica Futures",
                  importance: 18,
                },
                {
                  feature:
                    "Brazil Supply",
                  importance: 15,
                },
                {
                  feature:
                    "Weather Risk",
                  importance: 12,
                },
              ]).map((item) => (

              <div
                key={item.feature}
                className="feature-row"
              >

                <div className="feature-top">

                  <span>
                    {item.feature}
                  </span>

                  <strong>
                    {item.importance}
                    %
                  </strong>

                </div>

                <div className="feature-bar">

                  <div
                    className="feature-fill"
                    style={{
                      width:
                        item.importance +
                        "%",
                    }}
                  />

                </div>

              </div>

            ))}

          </div>

          <div className="entity-panel">

            <div className="panel-head">

              <h2>
                Top Entities
              </h2>

              <span>
                News Daily Feature
              </span>

            </div>

            <div className="entity-cloud">

              {topEntities.map(
                (entity, idx) => (

                  <div
                    key={idx}
                    className="entity-chip"
                  >
                    {entity}
                  </div>

                )
              )}

            </div>

          </div>

        </div>

      </section>

      <section className="bottom-grid">

        <div className="similar-panel-large">

          <div className="panel-head">

            <h2>
              Similar Historical Events
            </h2>

            <span>
              News Similarity
            </span>

          </div>

          <div className="similar-list">

            {similarEvents
              .slice(0, 5)
              .map(
                (item, index) => (

                  <div
                    key={index}
                    className="similar-row"
                  >

                    <div className="similar-left">

                      <div className="similar-current">

                        {
                          item
                            .today_article
                            ?.title
                        }

                      </div>

                      <div className="arrow">
                        ↓
                      </div>

                      <div className="similar-past">

                        {
                          item
                            .similar_past
                            ?.title
                        }

                      </div>

                    </div>

                    <div className="similar-right">

                      <div>
                        +1D

                        <strong>

                          {
                            item
                              .similar_past
                              ?.price_changes?.[
                              "+1d"
                            ]
                              ?.arabica_pct
                          }
                          %

                        </strong>

                      </div>

                      <div>
                        +3D

                        <strong>

                          {
                            item
                              .similar_past
                              ?.price_changes?.[
                              "+3d"
                            ]
                              ?.arabica_pct
                          }
                          %

                        </strong>

                      </div>

                      <div>
                        +5D

                        <strong>

                          {
                            item
                              .similar_past
                              ?.price_changes?.[
                              "+5d"
                            ]
                              ?.arabica_pct
                          }
                          %

                        </strong>

                      </div>

                    </div>

                  </div>

                )
              )}

          </div>

        </div>
                <div className="search-panel">

          <div className="panel-head">

            <h2>
              News Search
            </h2>

            <span>
              Semantic Search
            </span>

          </div>

          <form
            className="search-form"
            onSubmit={searchNews}
          >

            <input
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              placeholder="Brazil drought"
            />

            <button>
              Search
            </button>

          </form>

          <div className="search-results">

            {searchResult.map(
              (item) => (

                <div
                  key={item.id}
                  className="search-item"
                >

                  <h4>
                    {item.title}
                  </h4>

                  <p>
                    {item.description}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </section>

    </div>
  );
}