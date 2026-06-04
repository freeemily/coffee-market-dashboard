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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const searchNews = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const res = await fetch(
      `${WEB_BACKEND_URL}/api/search?q=${encodeURIComponent(searchQuery)}`
    );
    const data = await res.json();
    setSearchResult(data.results || []);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const signal = dashboard?.marketSignal;
  const news = (dashboard?.latestNews || []).slice(0, 6);
  const sentimentTrend = dashboard?.sentimentTrend || [];

  return (
    <div className="app">

      {/* TOP HEADER */}
      <header className="topbar">
        <div className="brand">BeanPulse</div>
        <div className="subtitle">
          Coffee Market Intelligence Dashboard
        </div>
      </header>

      {/* MARKET SNAPSHOT */}
      <section className="snapshot">
        <div className="card">
          <div className="label">시장 상태</div>
          <div className="value">{signal || "neutral"}</div>
        </div>

        <div className="card">
          <div className="label">뉴스 감성</div>
          <div className="value">
            {sentimentTrend.length
              ? "LIVE"
              : "NO DATA"}
          </div>
        </div>

        <div className="card">
          <div className="label">모델 상태</div>
          <div className="value">PENDING</div>
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="grid">

        {/* LEFT */}
        <div className="left">

          <div className="panel">
            <h3>가격 차트</h3>
            <div className="chart-box">
              <div className="chart-line" />
              <div className="chart-line forecast" />
            </div>
            <div className="hint">
              모델 연결 시 실제 예측 라인이 표시됩니다
            </div>
          </div>

          <div className="panel">
            <h3>시장 뉴스</h3>
            <div className="news-list">
              {news.map((n) => (
                <div key={n.id} className="news-item">
                  <div className="news-source">{n.source}</div>
                  <div className="news-title">{n.title}</div>
                  <div className="news-date">{n.date}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="right">

          <div className="panel">
            <h3>매입 전략</h3>
            <div className="strategy">
              <div>즉시 매수</div>
              <div>분할 매수</div>
              <div>대기</div>
              <div>헤지</div>
            </div>

            <div className="hint">
              모델 API 연결 후 자동 추천됩니다
            </div>
          </div>

          <div className="panel">
            <h3>AI 모델</h3>
            <div className="placeholder">
              short_term_prob / mid_term_direction<br />
              (API 연결 전)
            </div>
          </div>

        </div>
      </section>

      {/* SEARCH */}
      <section className="panel full">
        <h3>뉴스 검색</h3>

        <form onSubmit={searchNews} className="search">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="브라질 가뭄"
          />
          <button>검색</button>
        </form>

        <div className="search-result">
          {searchResult.map((r) => (
            <div key={r.id} className="search-item">
              <div>{r.title}</div>
              <span>{r.source}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}