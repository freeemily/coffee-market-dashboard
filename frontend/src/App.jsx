import { useEffect, useState } from "react";
import "./App.css";

const WEB_BACKEND_URL =
  "https://coffee-market-dashboard-production.up.railway.app";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeInsight, setActiveInsight] =
    useState("feature");

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

      setSearchResult(data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading Dashboard...
      </div>
    );
  }

  const marketSnapshot =
    dashboard?.marketSnapshot || {};

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

  const strategyCell =
    `${forecast.mid_term_direction}_${forecast.short_term_direction}`;

  return (
    <div className="dashboard-page">

      <header className="header">

        <div>

          <div className="header-badge">
            Coffee Market Intelligence
          </div>

          <h1>
            생두 구매 의사결정 플랫폼
          </h1>

          <p>
            뉴스 · 시장 데이터 · AI 예측을
            통합한 의사결정 대시보드
          </p>

        </div>

      </header>

      <section className="snapshot-row">

        <div className="snapshot-card">
          <span>
            ICE Arabica
          </span>

          <h2>
            {marketSnapshot.arabica_close}
          </h2>

          <p>
            {marketSnapshot.arabica_pct_change}%
          </p>
        </div>

        <div className="snapshot-card">
          <span>
            USD/KRW
          </span>

          <h2>
            {marketSnapshot.usdkrw}
          </h2>

          <p>
            {marketSnapshot.usdkrw_pct_change}%
          </p>
        </div>

        <div className="snapshot-card">
          <span>
            News Signal
          </span>

          <h2>
            {signal.market_signal ||
              "-"}
          </h2>

          <p>
            Sentiment :
            {" "}
            {signal.avg_sentiment ??
              "-"}
          </p>
        </div>

        <div className="snapshot-card">
          <span>
            AI Forecast
          </span>

          <h2>
            {forecast.probability_up}%
          </h2>

          <p>
            {
              forecast.short_term_direction
            }
          </p>
        </div>

      </section>

      <section className="forecast-layout">

        <div className="forecast-panel">

          <div className="panel-header">
            <h2>
              Price Outlook
            </h2>
          </div>

          <div className="chart-card">

            <div className="chart-overlay">

              <div className="overlay-box">

                <span>
                  상승확률
                </span>

                <strong>
                  {
                    forecast.probability_up
                  }
                  %
                </strong>

              </div>

              <div className="overlay-box">

                <span>
                  방향
                </span>

                <strong>
                  {
                    forecast.short_term_direction
                  }
                </strong>

              </div>

              <div className="overlay-box">

                <span>
                  기간
                </span>

                <strong>
                  {
                    forecast.mid_term_period
                  }
                  일
                </strong>

              </div>

            </div>

            <div className="fake-chart-large">

              <div className="grid-lines" />

              <div className="actual-line" />

              <div className="forecast-line" />

            </div>

          </div>

        </div>

        <div className="strategy-panel">

          <h2>
            매입 전략 매트릭스
          </h2>

          <div className="matrix-grid">

            <div
              className={`matrix-cell ${
                strategyCell ===
                "UP_UP"
                  ? "active"
                  : ""
              }`}
            >
              즉시 선매입
            </div>

            <div
              className={`matrix-cell ${
                strategyCell ===
                "UP_DOWN"
                  ? "active"
                  : ""
              }`}
            >
              분할 매수
            </div>

            <div
              className={`matrix-cell ${
                strategyCell ===
                "DOWN_UP"
                  ? "active"
                  : ""
              }`}
            >
              헤징 검토
            </div>

            <div
              className={`matrix-cell ${
                strategyCell ===
                "DOWN_DOWN"
                  ? "active"
                  : ""
              }`}
            >
              매입 보류
            </div>

          </div>
                    <div className="strategy-status">

            <div className="status-label">
              현재 모델 시그널
            </div>

            <div className="status-value">
              {forecast.mid_term_direction}
              {" / "}
              {forecast.short_term_direction}
            </div>

          </div>

        </div>

      </section>

      <section className="content-layout">

        <div className="news-panel">

          <div className="panel-header">

            <h2>
              Market News
            </h2>

            <span>
              {news.length} Articles
            </span>

          </div>

          <div className="news-list">

            {news.map((item) => {

              const sentiment =
                item.sentiment_score > 0.6
                  ? "positive"
                  : item.sentiment_score < 0.4
                  ? "negative"
                  : "neutral";

              return (
                <div
                  key={item.id}
                  className="news-card"
                >

                  <div className="news-top">

                    <span className="source">
                      {item.source}
                    </span>

                    <span
                      className={`sentiment ${sentiment}`}
                    >
                      {sentiment}
                    </span>

                  </div>

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.summary}
                  </p>

                  <div className="entity-list">

                    {(item.named_entities || [])
                      .slice(0, 5)
                      .map((entity, idx) => (
                        <span
                          key={idx}
                          className="entity-tag"
                        >
                          {entity}
                        </span>
                      ))}

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        <div className="insight-panel">

          <div className="insight-tabs">

            <button
              className={
                activeInsight === "feature"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveInsight(
                  "feature"
                )
              }
            >
              Feature
            </button>

            <button
              className={
                activeInsight === "trending"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveInsight(
                  "trending"
                )
              }
            >
              Trending
            </button>

            <button
              className={
                activeInsight === "similar"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveInsight(
                  "similar"
                )
              }
            >
              Similar
            </button>

          </div>

          {activeInsight ===
            "feature" && (

            <div className="feature-panel">

              {(
                forecast.feature_importance ||
                []
              ).map((item) => (

                <div
                  key={item.feature}
                  className="feature-item"
                >

                  <div className="feature-header">

                    <span>
                      {item.feature}
                    </span>

                    <strong>
                      {item.importance}%
                    </strong>

                  </div>

                  <div className="progress">

                    <div
                      className="progress-fill"
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

          )}

          {activeInsight ===
            "trending" && (

            <div className="trending-panel">

              {trending.map(
                (item) => (

                  <div
                    key={item.entity}
                    className="trend-row"
                  >

                    <span>
                      {item.entity}
                    </span>

                    <strong>
                      {item.count}
                    </strong>

                  </div>

                )
              )}

            </div>

          )}

          {activeInsight ===
            "similar" && (

            <div className="similar-panel">

              {similarEvents.map(
                (item, idx) => (

                  <div
                    key={idx}
                    className="similar-item"
                  >

                    <h4>
                      {
                        item
                          .today_article
                          ?.title
                      }
                    </h4>

                    <p>
                      {
                        item
                          .similar_past
                          ?.title
                      }
                    </p>

                    <div className="price-boxes">

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

          )}

        </div>

      </section>
            <section className="search-panel">

        <div className="panel-header">

          <h2>
            News Search
          </h2>

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
            placeholder="브라질 가뭄, 베트남 생산량..."
          />

          <button
            type="submit"
          >
            검색
          </button>

        </form>

        <div className="search-results">

          {searchResult.map(
            (item) => (

              <div
                key={item.id}
                className="search-card"
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

      </section>

    </div>
  );
}