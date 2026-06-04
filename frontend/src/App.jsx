import { useEffect, useState } from "react";
import "./App.css";

const API_BASE =
  "https://coffee-market-dashboard-production.up.railway.app";

function App() {
  const [todayNews, setTodayNews] = useState([]);
  const [signal, setSignal] = useState(null);
  const [trending, setTrending] = useState([]);
  const [similarCases, setSimilarCases] = useState([]);

  const [prediction] = useState({
    probability: 58,
    direction: "상승",
    model: "ARIMA + XGBoost",
  });

  useEffect(() => {
    fetch(`${API_BASE}/news/today`)
      .then((res) => res.json())
      .then((data) => {
        setTodayNews(data.news || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/news/signal?days=30`)
      .then((res) => res.json())
      .then(setSignal)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/news/trending?days=7`)
      .then((res) => res.json())
      .then((data) => {
        setTrending(data.trending || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/news/similar/today?top_n=3`)
      .then((res) => res.json())
      .then((data) => {
        setSimilarCases(data.results || []);
      })
      .catch(console.error);
  }, []);

  const getSignalLabel = () => {
    if (!signal) return "-";

    switch (signal.market_signal) {
      case "bullish":
        return "강세";
      case "bearish":
        return "약세";
      default:
        return "중립";
    }
  };

  const getSignalColor = () => {
    if (!signal) return "#666";

    switch (signal.market_signal) {
      case "bullish":
        return "#22c55e";
      case "bearish":
        return "#ef4444";
      default:
        return "#f59e0b";
    }
  };

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="header">
        <div>
          <h1>BEAN PULSE</h1>
          <p>생두 시장 인텔리전스 플랫폼</p>
        </div>

        <div className="update-time">
          {new Date().toLocaleString("ko-KR")}
        </div>
      </header>

      {/* KPI */}
      <section className="kpi-grid">
        <div className="card">
          <h4>ICE 아라비카</h4>
          <h2>274.45</h2>
          <span>¢/lb</span>
        </div>

        <div className="card">
          <h4>USD/KRW</h4>
          <h2>1,378.5</h2>
          <span>원</span>
        </div>

        <div className="card">
          <h4>AI 예측</h4>
          <h2>{prediction.probability}%</h2>
          <span>{prediction.direction} 확률</span>
        </div>

        <div className="card">
          <h4>뉴스 시그널</h4>

          <h2
            style={{
              color: getSignalColor(),
            }}
          >
            {getSignalLabel()}
          </h2>

          <span>
            평균 감성 :
            {signal?.avg_sentiment?.toFixed(2)}
          </span>
        </div>
      </section>

      {/* MAIN */}
      <section className="top-section">
        {/* AI 브리핑 */}
        <div className="briefing-card">
          <div className="section-title">
            <h3>AI 데일리 브리핑</h3>
          </div>

          <div className="briefing-content">
            <p>
              최근 뉴스 감성은
              <strong
                style={{
                  color: getSignalColor(),
                }}
              >
                {" "}
                {getSignalLabel()}
              </strong>
              상태입니다.
            </p>

            <p>
              오늘 수집 기사 수 :
              <strong> {todayNews.length}건</strong>
            </p>

            <p>
              단기 모델은
              <strong> {prediction.probability}% </strong>
              상승 확률을 제시하고 있습니다.
            </p>

            <p>
              최근 시장 핵심 키워드 :
              <strong>
                {" "}
                {trending
                  .slice(0, 5)
                  .map((item) => item.entity)
                  .join(", ")}
              </strong>
            </p>
          </div>

          <div className="feature-tags">
            <span>ICE 선물가</span>
            <span>USD/KRW</span>
            <span>뉴스 감성</span>
            <span>ARIMA</span>
            <span>XGBoost</span>
          </div>
        </div>

        {/* 모델 */}
        <div className="prediction-card">
          <div className="section-title">
            <h3>모델 예측</h3>
          </div>

          <div className="prediction-center">
            <div className="probability-circle">
              <span>{prediction.probability}%</span>
            </div>

            <h2>{prediction.direction}</h2>

            <p>{prediction.model}</p>
          </div>

          <div className="prediction-desc">
            현재 모델 API 연동 전 단계입니다.
            <br />
            추후 DB 기반 예측 결과가 표시됩니다.
          </div>
        </div>
      </section>

      {/* 뉴스 */}
      <section className="news-feed">
        <div className="section-title">
          <h3>오늘 뉴스</h3>
        </div>

        {todayNews.length === 0 ? (
          <div className="empty">
            뉴스 데이터를 불러오는 중...
          </div>
        ) : (
          todayNews.map((item) => (
            <div className="news-item" key={item.id}>
              <div className="news-header">
                <h4>{item.title}</h4>

                <span className="source">
                  {item.source}
                </span>
              </div>

              <p>{item.summary}</p>

              <div className="news-meta">
                <span>{item.publish_date}</span>

                <span>
                  감성 :
                  {item.sentiment_score?.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </section>

      {/* 유사 사례 */}
      <section className="similar-section">
        <div className="section-title">
          <h3>유사 과거 사례</h3>
        </div>

        {similarCases.length === 0 ? (
          <div className="empty">
            데이터를 불러오는 중...
          </div>
        ) : (
          similarCases.map((item, index) => {
            const past = item.similar_past;

            return (
              <div className="similar-card" key={index}>
                <h4>{past.title}</h4>

                <p>
                  유사도 :
                  {(past.similarity * 100).toFixed(1)}%
                </p>

                <div className="similar-grid">
                  <div>
                    <strong>+1일</strong>

                    <span>
                      {
                        past.price_changes?.["+1d"]
                          ?.arabica_pct
                      }
                      %
                    </span>
                  </div>

                  <div>
                    <strong>+3일</strong>

                    <span>
                      {
                        past.price_changes?.["+3d"]
                          ?.arabica_pct
                      }
                      %
                    </span>
                  </div>

                  <div>
                    <strong>+5일</strong>

                    <span>
                      {
                        past.price_changes?.["+5d"]
                          ?.arabica_pct
                      }
                      %
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 트렌딩 */}
      <section className="trending-section">
        <div className="section-title">
          <h3>트렌딩 엔티티</h3>
        </div>

        <div className="tag-container">
          {trending.map((item) => (
            <div className="tag" key={item.entity}>
              {item.entity}
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 감성 추이 */}
      <section className="trend-table">
        <div className="section-title">
          <h3>최근 감성 추이</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>기사수</th>
              <th>평균감성</th>
              <th>주요 엔티티</th>
            </tr>
          </thead>

          <tbody>
            {signal?.trend?.map((item) => (
              <tr key={item.date}>
                <td>{item.date}</td>

                <td>{item.num_articles}</td>

                <td>
                  {item.avg_sentiment?.toFixed(2)}
                </td>

                <td>
                  {item.top_entities?.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="pipeline">
          <div>뉴스 수집</div>
          <div>→</div>
          <div>감성 분석</div>
          <div>→</div>
          <div>모델 예측</div>
          <div>→</div>
          <div>AI 브리핑</div>
          <div>→</div>
          <div>대시보드</div>
        </div>
      </footer>
    </div>
  );
}

export default App;