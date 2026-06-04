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

  const market = dashboard?.market || {};
  const signal = market?.signal || {};
  const news = market?.news || [];
  const trending = market?.trending || [];
  const similarEvents = market?.similarEvents || [];
  const forecast = dashboard?.forecast;

  return (
    <div className="app">

      {/* TOP BAR */}
      <header className="topbar">
        <div className="logo">BEAN PULSE</div>
        <div className="sub">생두 시장 인텔리전스</div>
      </header>

      {/* KPI */}
      <section className="kpiGrid">

        <div className="kpiCard">
          <div className="kpiLabel">시장 상태</div>
          <div className="kpiValue">{signal.market_signal || "-"}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">평균 감성</div>
          <div className="kpiValue">{signal.avg_sentiment ?? "-"}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">뉴스</div>
          <div className="kpiValue">{news.length}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">모델 상태</div>
          <div className="kpiValue">
            {forecast ? "READY" : "WAIT"}
          </div>
        </div>

      </section>

      {/* MAIN */}
      <section className="mainGrid">

        {/* LEFT - BRIEF */}
        <div className="panel dark">

          <div className="panelTitle">AI 브리핑</div>

          <div className="briefBox">
            <div className="scroll">
              {news.slice(0, 6).map((n) => (
                <div key={n.id} className="briefItem">
                  <div className="briefTitle">{n.title}</div>
                  <div className="briefMeta">{n.source}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT - CHART + STRATEGY */}
        <div className="panel">

          <div className="panelTitle">가격 흐름 + 모델</div>

          <div className="chartBox">
            <div className="fakeLineA"></div>
            <div className="fakeLineB"></div>
          </div>

          <div className="strategyBox">

            <div className="strategy">
              <span>단기↑ / 장기↑</span>
              <b>선매입</b>
            </div>

            <div className="strategy">
              <span>단기↓ / 장기↑</span>
              <b>분할매수</b>
            </div>

            <div className="strategy">
              <span>단기↓ / 장기↓</span>
              <b>대기</b>
            </div>

          </div>

        </div>

      </section>

      {/* NEWS */}
      <section className="panel">

        <div className="panelTitleRow">
          <div className="panelTitle">뉴스 피드</div>
        </div>

        <div className="newsGrid">

          {news.map((n) => (
            <div key={n.id} className="newsCard">
              <div className="newsSource">{n.source}</div>
              <div className="newsTitle">{n.title}</div>
              <div className="newsDesc">{n.summary}</div>
            </div>
          ))}

        </div>

      </section>

      {/* SEARCH */}
      <section className="panel">

        <div className="panelTitle">뉴스 검색</div>

        <form className="search" onSubmit={searchNews}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="브라질 가뭄"
          />
          <button>검색</button>
        </form>

        <div className="searchResult">
          {searchResult.map((r) => (
            <div key={r.id} className="searchItem">
              {r.title}
            </div>
          ))}
        </div>

      </section>

    </div>
  );
}