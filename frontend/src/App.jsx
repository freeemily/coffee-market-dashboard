// App.jsx

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
        데이터를 불러오는 중...
      </div>
    );
  }

  const market = dashboard?.market || {};

  const signal = market.signal || {};

  const news = market.news || [];

  const trending = market.trending || [];

  const similarEvents =
    market.similarEvents || [];

  const forecast = dashboard?.forecast;

  return (
    <div className="page">

      {/* HERO */}

      <section className="hero">

        <div className="hero-left">

          <div className="hero-badge">
            AI Coffee Intelligence
          </div>

          <h1>
            생두 구매 의사결정
            <br />
            플랫폼
          </h1>

          <p>
            가격 예측 모델과 시장 뉴스를
            결합하여 생두 구매 타이밍
            의사결정을 지원합니다.
          </p>

        </div>

        <div className="hero-right">

          <div className="hero-chart">

            <div className="chart-label">
              가격 추이 및 예측
            </div>

            <div className="fake-chart">
              <div className="line actual" />
              <div className="line predict" />
            </div>

          </div>

        </div>

      </section>

      {/* SNAPSHOT */}

      <section className="snapshot-grid">

        <div className="snapshot-card">
          <span>시장 심리</span>

          <h3>
            {signal.market_signal
              ? signal.market_signal.toUpperCase()
              : "-"}
          </h3>

          <p>
            평균 감성 :
            {" "}
            {signal.avg_sentiment ?? "-"}
          </p>
        </div>

        <div className="snapshot-card">
          <span>오늘 뉴스</span>

          <h3>
            {news.length}
          </h3>

          <p>
            수집 기사 수
          </p>
        </div>

        <div className="snapshot-card">
          <span>AI 모델</span>

          <h3>
            {forecast
              ? "연동 완료"
              : "연동 대기"}
          </h3>

          <p>
            모델 API 연결 상태
          </p>
        </div>

        <div className="snapshot-card">
          <span>트렌드</span>

          <h3>
            {trending.length}
          </h3>

          <p>
            주요 키워드
          </p>
        </div>

      </section>

      {/* MAIN */}

      <section className="main-layout">

        <div className="chart-panel">

          <div className="section-title">
            가격 분석
          </div>

          <div className="big-chart">

            <div className="chart-placeholder">

              <div className="line actual" />

              <div className="line predict" />

            </div>

          </div>

        </div>

        <div className="strategy-panel">

          <div className="section-title">
            매입 전략
          </div>

          <div className="strategy-grid">

            <div>
              즉시 선매입
            </div>

            <div>
              분할 매수
            </div>

            <div>
              헤징 검토
            </div>

            <div>
              매입 보류
            </div>

          </div>

          <div className="strategy-info">

            {forecast ? (
              <>
                모델 결과에 따라
                전략 자동 추천
              </>
            ) : (
              <>
                모델 API
                연동 대기중
              </>
            )}

          </div>

        </div>

      </section>

      {/* MODEL */}

      <section className="panel">

        <div className="section-title">
          AI 모델 결과
        </div>

        {!forecast && (
          <div className="waiting-box">

            모델 API 연동 후

            <br />

            단기 상승 확률,
            중장기 방향,
            Feature Importance가
            표시됩니다.

          </div>
        )}

      </section>

      {/* NEWS */}

      <section className="panel">

        <div className="section-header">

          <h2>
            시장 뉴스
          </h2>

        </div>

        <div className="news-grid">

          {news.map((item) => (
            <div
              className="news-card"
              key={item.id}
            >

              <div className="news-source">
                {item.source}
              </div>

              <h3>
                {item.title}
              </h3>

              <p>
                {item.summary}
              </p>

            </div>
          ))}

        </div>

      </section>

      {/* SIMILAR */}

      <section className="panel">

        <div className="section-title">
          유사 과거 사례
        </div>

        <div className="similar-grid">

          {similarEvents.map(
            (item, index) => (
              <div
                key={index}
                className="similar-card"
              >

                <h4>
                  {
                    item.today_article
                      ?.title
                  }
                </h4>

                <p>
                  {
                    item.similar_past
                      ?.title
                  }
                </p>

                <strong>

                  +5일 :

                  {" "}

                  {
                    item.similar_past
                      ?.price_changes?.[
                      "+5d"
                    ]?.arabica_pct
                  }

                  %

                </strong>

              </div>
            )
          )}

        </div>

      </section>

      {/* TREND */}

      <section className="panel">

        <div className="section-title">
          트렌딩 키워드
        </div>

        <div className="tag-container">

          {trending.map((item) => (
            <div
              key={item.entity}
              className="tag"
            >
              {item.entity}
            </div>
          ))}

        </div>

      </section>

      {/* SEARCH */}

      <section className="panel">

        <div className="section-title">
          뉴스 검색
        </div>

        <form
          onSubmit={searchNews}
          className="search-form"
        >

          <input
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            placeholder="브라질 가뭄"
          />

          <button>
            검색
          </button>

        </form>

        <div className="search-result">

          {searchResult.map((item) => (
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