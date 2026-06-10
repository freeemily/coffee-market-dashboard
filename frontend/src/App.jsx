import { useState, useEffect, useCallback } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "https://coffee-market-dashboard-production.up.railway.app";

function sentimentLabel(score) {
  if (score === null || score === undefined) return { label: "중립", cls: "neutral" };
  if (score >= 0.6) return { label: "강세", cls: "bullish" };
  if (score >= 0.4) return { label: "중립", cls: "neutral" };
  return { label: "약세", cls: "bearish" };
}

function signalLabel(signal) {
  if (!signal) return { label: "–", cls: "neutral" };
  if (signal === "bullish") return { label: "강세", cls: "bullish" };
  if (signal === "bearish") return { label: "약세", cls: "bearish" };
  return { label: "중립", cls: "neutral" };
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function SentimentBar({ score }) {
  const pct = Math.round((score ?? 0.5) * 100);
  const cls = score >= 0.6 ? "bullish" : score < 0.4 ? "bearish" : "neutral";
  return (
    <div className="sentiment-bar-wrap">
      <div className="sentiment-bar">
        <div className={`sentiment-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`sentiment-val ${cls}`}>{pct}</span>
    </div>
  );
}

function NewsCard({ item, onClick }) {
  const sent = sentimentLabel(item.sentiment_score);
  const entities = Array.isArray(item.named_entities) ? item.named_entities.slice(0, 3) : [];
  return (
    <div className="news-card" onClick={() => onClick(item)}>
      <div className="news-card-header">
        <span className={`signal-badge ${sent.cls}`}>{sent.label}</span>
        <span className="news-date">{formatDate(item.publish_date)}</span>
      </div>
      <p className="news-title">{item.title}</p>
      <div className="news-footer">
        <span className="news-source">{item.source || item.meta_site_name || ""}</span>
        <div className="entity-tags">
          {entities.map((e) => <span key={e} className="entity-tag">{e}</span>)}
        </div>
      </div>
      {item.summary && <p className="news-summary">{item.summary}</p>}
    </div>
  );
}

function NewsModal({ item, onClose }) {
  if (!item) return null;
  const sent = sentimentLabel(item.sentiment_score);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <span className={`signal-badge ${sent.cls}`}>{sent.label}</span>
          <span className="news-date">{formatDate(item.publish_date)}</span>
        </div>
        <h2 className="modal-title">{item.title}</h2>
        <p className="modal-source">{item.source || item.meta_site_name}</p>
        {item.description && <p className="modal-desc">{item.description}</p>}
        {item.summary && (
          <div className="modal-summary">
            <span className="modal-summary-label">AI 요약</span>
            <p>{item.summary}</p>
          </div>
        )}
        <SentimentBar score={item.sentiment_score} />
        {Array.isArray(item.named_entities) && item.named_entities.length > 0 && (
          <div className="modal-entities">
            {item.named_entities.map((e) => <span key={e} className="entity-tag">{e}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function SimilarCard({ data }) {
  const { today_article, similar_past } = data;
  const sent = sentimentLabel(today_article?.sentiment_score);
  const changes = similar_past?.price_changes || {};
  return (
    <div className="similar-card">
      <div className="similar-today">
        <span className={`signal-badge ${sent.cls}`}>{today_article?.signal || sent.label}</span>
        <p className="similar-today-title">{today_article?.title}</p>
      </div>
      {similar_past && (
        <div className="similar-past">
          <div className="similar-past-header">
            <span className="similar-label">유사 과거 사건</span>
            <span className="similar-score">유사도 {(similar_past.similarity * 100).toFixed(0)}%</span>
          </div>
          <p className="similar-past-title">{similar_past.title}</p>
          <p className="similar-past-date">{similar_past.publish_date?.slice(0, 10)} · {similar_past.source}</p>
          {similar_past.base_price && (
            <div className="similar-base">
              <span>기준가 {similar_past.base_price.arabica_close?.toFixed(2)} ¢/lb</span>
              <span>환율 {similar_past.base_price.usdkrw?.toFixed(0)} ₩</span>
            </div>
          )}
          <div className="price-changes">
            {["+1d", "+3d", "+5d"].map((k) => {
              const c = changes[k];
              if (!c) return null;
              const up = c.arabica_pct >= 0;
              return (
                <div key={k} className="price-change-cell">
                  <span className="pc-label">{k}</span>
                  <span className={`pc-val ${up ? "bullish" : "bearish"}`}>
                    {up ? "+" : ""}{c.arabica_pct?.toFixed(2)}%
                  </span>
                  <span className="pc-price">{c.arabica_close?.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;
  const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const maxArticles = Math.max(...sorted.map((d) => d.num_articles), 1);
  return (
    <div className="trend-chart">
      <div className="trend-bars">
        {sorted.map((d) => {
          const sent = sentimentLabel(d.avg_sentiment);
          const h = Math.max(4, Math.round((d.num_articles / maxArticles) * 60));
          return (
            <div key={d.date} className="trend-bar-col"
              title={`${d.date}: ${d.num_articles}건, 감성 ${(d.avg_sentiment * 100).toFixed(0)}`}>
              <div className={`trend-bar-fill ${sent.cls}`} style={{ height: `${h}px` }} />
              <span className="trend-bar-label">{d.date?.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendingTags({ trending }) {
  if (!trending?.length) return null;
  const max = trending[0]?.count || 1;
  return (
    <div className="trending-tags">
      {trending.slice(0, 10).map((t) => (
        <span key={t.entity} className="trending-tag" style={{ opacity: 0.4 + 0.6 * (t.count / max) }}>
          {t.entity} <em>{t.count}</em>
        </span>
      ))}
    </div>
  );
}

function SearchBar({ onSearch }) {
  const [q, setQ] = useState("");
  return (
    <form className="search-bar" onSubmit={(e) => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }}>
      <input
        type="text"
        placeholder="뉴스 검색 (예: 브라질 서리, 베트남 생산량)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="search-input"
      />
      <button type="submit" className="search-btn">검색</button>
    </form>
  );
}

// 매입 전략 매트릭스: 모델 예측 데이터 기반으로 현재 상태 하이라이트
function PurchaseMatrix({ shortDir, midDir }) {
  // shortDir: "up" | "down" | null, midDir: "up" | "down" | null
  const cells = [
    { row: "mid_up",   col: "short_up",   label: "즉시 선매입",  cls: "action-buy" },
    { row: "mid_up",   col: "short_down", label: "분할 매수",    cls: "action-split" },
    { row: "mid_down", col: "short_up",   label: "리스크 헤징",  cls: "action-hedge" },
    { row: "mid_down", col: "short_down", label: "매입 보류",    cls: "action-hold" },
  ];

  const activeRow = midDir === "up" ? "mid_up" : midDir === "down" ? "mid_down" : null;
  const activeCol = shortDir === "up" ? "short_up" : shortDir === "down" ? "short_down" : null;

  return (
    <div className="matrix-section">
      <div className="matrix-title">매입 전략 매트릭스</div>
      <div className="matrix-grid">
        <div className="matrix-header" />
        <div className="matrix-header center">단기 ↑</div>
        <div className="matrix-header center">단기 ↓</div>
        {cells.slice(0, 2).map((cell) => {
          const isActive = activeRow === cell.row && activeCol === cell.col;
          return (
            <>
              {cell.col === "short_up" && (
                <div key={`label-${cell.row}`} className="matrix-rowlabel">
                  {cell.row === "mid_up" ? "중장기 ↑" : "중장기 ↓"}
                </div>
              )}
              <div key={`${cell.row}-${cell.col}`}
                className={`matrix-cell ${cell.cls}${isActive ? " matrix-active" : ""}`}>
                {isActive && <span className="matrix-active-dot">▶ </span>}
                {cell.label}
              </div>
            </>
          );
        })}
        {cells.slice(2, 4).map((cell) => {
          const isActive = activeRow === cell.row && activeCol === cell.col;
          return (
            <>
              {cell.col === "short_up" && (
                <div key={`label-${cell.row}`} className="matrix-rowlabel">
                  {cell.row === "mid_up" ? "중장기 ↑" : "중장기 ↓"}
                </div>
              )}
              <div key={`${cell.row}-${cell.col}`}
                className={`matrix-cell ${cell.cls}${isActive ? " matrix-active" : ""}`}>
                {isActive && <span className="matrix-active-dot">▶ </span>}
                {cell.label}
              </div>
            </>
          );
        })}
      </div>
      {(!shortDir || !midDir) && (
        <p className="matrix-note">모델 API 연동 후 현재 상태 자동 표시</p>
      )}
    </div>
  );
}

export default function App() {
  const [todayNews, setTodayNews] = useState([]);
  const [signal, setSignal] = useState(null);
  const [trending, setTrending] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState({ news: true, signal: true, trending: true, similar: true });
  const [error, setError] = useState({});
  const [activeTab, setActiveTab] = useState("news");
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  // 모델 예측 데이터
  const [modelPrediction, setModelPrediction] = useState({ short: null, mid: null, loading: true, error: null });

  const modelShortDir = modelPrediction.short
    ? (modelPrediction.short.direction === 1 ? 'up' : 'down')
    : null;
  const modelMidDir = modelPrediction.mid
    ? (modelPrediction.mid.direction === 1 ? 'up' : 'down')
    : null;
  const modelShortProb = modelPrediction.short?.probability_up ?? null;

  // 시장 데이터 (ICE 가격, 환율)
  const [market, setMarket] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchJSON = useCallback(async (path, onData, key) => {
    try {
      const url = `${API_BASE}${path}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data = await res.json();
      onData(data);
    } catch (e) {
      setError((prev) => ({ ...prev, [key]: e.message }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  useEffect(() => {
    fetchJSON("/api/news/today", (d) => setTodayNews(d.news || []), "news");
    fetchJSON("/api/news/signal?days=30", setSignal, "signal");
    fetchJSON("/api/news/trending?days=7", (d) => setTrending(d.trending || []), "trending");
    fetchJSON("/api/news/similar/today?top_n=3", (d) => setSimilar(d.results || []), "similar");

    // 시장 데이터 fetch
    fetch(`${API_BASE}/api/market/latest`)
      .then(r => r.json())
      .then(d => setMarket(d.market || null))
      .catch(() => {});

    // 모델 예측 fetch
    (async () => {
      try {
        const [shortRes, midRes] = await Promise.all([
          fetch(`${API_BASE}/api/prediction/short`),
          fetch(`${API_BASE}/api/prediction/mid`),
        ]);
        const shortData = await shortRes.json();
        const midData   = await midRes.json();

        // horizon=1 단기, horizon 중 가장 작은 중장기 대표값 사용
        const shortPred = shortData.predictions?.find(p => p.horizon === 1)
          ?? shortData.predictions?.[0] ?? null;
        const midPred   = midData.predictions?.find(p => p.horizon === 20)
          ?? midData.predictions?.[0] ?? null;

        setModelPrediction({ short: shortPred, mid: midPred, loading: false, error: null });
      } catch (e) {
        setModelPrediction(prev => ({ ...prev, loading: false, error: e.message }));
      }
    })();
  }, [fetchJSON]);

  const handleSearch = async (q) => {
    setSearchLoading(true);
    setActiveTab("search");
    try {
      const res = await fetch(`${API_BASE}/api/news/search?q=${encodeURIComponent(q)}&top_k=8`);
      const data = await res.json();
      setSearchResults({ q, items: data.results || [] });
    } catch (e) {
      setSearchResults({ q, items: [], error: e.message });
    } finally {
      setSearchLoading(false);
    }
  };

  const sig = signalLabel(signal?.market_signal);
  const avgSent = signal?.avg_sentiment;
  const todayCount = todayNews.length;

  const [briefing, setBriefing] = useState({ text: null, loading: true, error: null, generatedAt: null });

  // DB에서 최신 daily_briefing 조회
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/briefing/latest`);
        const data = await res.json();

        if (data.briefing) {
          const row = data.briefing;
          const text = row.content ?? null;
          const title = row.title ?? null;
          const generatedAt = row.briefing_date
            ? new Date(row.briefing_date)
            : row.created_at ? new Date(row.created_at) : null;

          if (text) {
            setBriefing({ text, title, loading: false, error: null, generatedAt });
            return;
          }
        }
        // DB에 데이터 없으면 로딩 해제 (정보 없음 표시)
        setBriefing(prev => ({ ...prev, loading: false }));
      } catch (e) {
        setBriefing(prev => ({ ...prev, loading: false }));
      }
    })();
  }, []);

  const nowStr = now.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo-dot" />
          <span className="logo-text">BEAN MARKET</span>
          <span className="logo-sub">생두 시장 지표</span>
        </div>
        <div className="header-right">
          <span className="header-time">{nowStr} KST 기준</span>
        </div>
      </header>

      <main className="main">
        <section className="kpi-row">
          <div className="kpi-card kpi-live">
            <span className="kpi-label">ICE 아라비카</span>
            <div className="kpi-value-row">
              {market ? (
                <span className="kpi-value">{market.arabica_close.toFixed(2)}</span>
              ) : (
                <span className="kpi-loading">로딩중...</span>
              )}
              <span className="kpi-unit">¢/lb</span>
            </div>
            <span className="kpi-note">
              {market ? `${market.trade_date || "최신"} 기준` : "시장 데이터 로딩중"}
            </span>
          </div>

          <div className="kpi-card kpi-live">
            <span className="kpi-label">USD/KRW</span>
            <div className="kpi-value-row">
              {market ? (
                <span className="kpi-value">{Math.round(market.usdkrw).toLocaleString()}</span>
              ) : (
                <span className="kpi-loading">로딩중...</span>
              )}
              <span className="kpi-unit">원</span>
            </div>
            <span className="kpi-note">
              {market ? `${market.trade_date || "최신"} 기준` : "시장 데이터 로딩중"}
            </span>
          </div>

          <div className={`kpi-card kpi-live ${modelShortDir === 'up' ? 'bullish' : modelShortDir === 'down' ? 'bearish' : ''}`}>
            <span className="kpi-label">단기 모델</span>
            <div className="kpi-value-row">
              {modelPrediction.loading ? (
                <span className="kpi-loading">로딩중...</span>
              ) : modelPrediction.error ? (
                <span className="kpi-error">연결 오류</span>
              ) : (
                <span className={`kpi-value sentiment-big ${modelShortDir === 'up' ? 'bullish' : 'bearish'}`}>
                  {modelShortProb !== null ? `${(modelShortProb * 100).toFixed(1)}%` : '–%'}
                </span>
              )}
            </div>
            <span className="kpi-note">
              {modelPrediction.short
                ? `${modelPrediction.short.direction_label || (modelShortDir === 'up' ? '상승' : '하락')} · ARIMA+XGB`
                : '상승 확률 · ARIMA+XGB'}
            </span>
          </div>

          <div className={`kpi-card kpi-live ${sig.cls}`}>
            <span className="kpi-label">뉴스 감성</span>
            <div className="kpi-value-row">
              {loading.signal ? (
                <span className="kpi-loading">로딩중...</span>
              ) : error.signal ? (
                <span className="kpi-error">연결 오류</span>
              ) : (
                <span className={`kpi-value sentiment-big ${sig.cls}`}>{sig.label}</span>
              )}
            </div>
            <span className="kpi-note">
              {!loading.signal && signal
                ? `${todayCount}건 분석 · 평균 ${avgSent ? (avgSent * 100).toFixed(0) : "–"}`
                : "24h 분석"}
            </span>
          </div>
        </section>

        <div className="grid-main">
          <div className="col-left">
            {/* AI 브리핑 */}
            <div className="section-card briefing-card">
              <div className="section-header">
                <span className="section-title">데일리 브리핑</span>
                {briefing.generatedAt && (
                  <span className="section-note">
                    {briefing.generatedAt.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) + " 발행"}
                  </span>
                )}
              </div>

              {briefing.loading ? (
                <div className="briefing-generating">
                  <div className="spinner" />
                  <span>브리핑을 불러오는 중입니다...</span>
                </div>
              ) : briefing.error ? (
                <div className="error-state small">브리핑 로드 실패: {briefing.error}</div>
              ) : briefing.text ? (
                <div className="briefing-content">
                  {briefing.title && (
                    <p className="briefing-title-db">{briefing.title}</p>
                  )}
                  <div className="briefing-text">
                    {briefing.text.split("\n\n").map((para, i) => {
                      const isLast = i === briefing.text.split("\n\n").length - 1;
                      if (isLast && para.includes("\n")) {
                        const [label, ...rest] = para.split("\n");
                        return (
                          <p key={i} className="briefing-para briefing-strategy">
                            <strong>{label}</strong><br />{rest.join(" ")}
                          </p>
                        );
                      }
                      return <p key={i} className="briefing-para">{para}</p>;
                    })}
                  </div>
                  <div className="briefing-features">
                    {[
                      { label: "ICE 선물가", val: market?.arabica_close?.toFixed(2) ? `${market.arabica_close.toFixed(2)}¢` : "–", cls: market?.arabica_pct_change > 0 ? "bullish" : market?.arabica_pct_change < 0 ? "bearish" : "" },
                      { label: "USD/KRW", val: market ? `${Math.round(market.usdkrw).toLocaleString()}₩` : "–", cls: market?.usdkrw >= 1400 ? "bearish" : "" },
                      { label: "RSI(14)", val: modelPrediction.short?.base_features?.coffee_rsi_14?.toFixed(1) ?? "–", cls: (() => { const r = modelPrediction.short?.base_features?.coffee_rsi_14; return r < 30 ? "bullish" : r > 70 ? "bearish" : ""; })() },
                      { label: "ARIMA 잔차", val: modelPrediction.short?.arima_features?.arima_resid_1d?.toFixed(4) ?? "–", cls: modelPrediction.short?.arima_features?.arima_resid_1d > 0 ? "bullish" : modelPrediction.short?.arima_features?.arima_resid_1d < 0 ? "bearish" : "" },
                      { label: "XGBoost", val: modelPrediction.short ? `${(modelPrediction.short.probability_up * 100).toFixed(1)}%` : "–", cls: modelShortDir === "up" ? "bullish" : modelShortDir === "down" ? "bearish" : "" },
                      { label: "뉴스 감성", val: avgSent ? `${(avgSent * 100).toFixed(0)}` : "–", cls: sig.cls },
                    ].map(f => (
                      <span key={f.label} className={`feature-tag feature-tag-colored ${f.cls}`}>{f.label} <em>{f.val}</em></span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="briefing-no-data">오늘 발행된 브리핑 정보가 없습니다.</div>
              )}
            </div>

            <SearchBar onSearch={handleSearch} />

            {/* 뉴스 피드 / 유사 과거 사건 탭 — 스크롤 박스 */}
            <div className="section-card news-section-card">
              <div className="tab-bar">
                <button className={`tab-btn ${activeTab === "news" ? "active" : ""}`} onClick={() => setActiveTab("news")}>
                  뉴스 피드
                  {todayCount > 0 && <span className="tab-count">{todayCount}</span>}
                </button>
                <button className={`tab-btn ${activeTab === "similar" ? "active" : ""}`} onClick={() => setActiveTab("similar")}>
                  유사 과거 사건
                </button>
                {searchResults && (
                  <button className={`tab-btn ${activeTab === "search" ? "active" : ""}`} onClick={() => setActiveTab("search")}>
                    검색: {searchResults.q}
                  </button>
                )}
              </div>

              <div className="news-scroll-area">
                {activeTab === "news" && (
                  <div className="news-list">
                    {loading.news ? (
                      <div className="loading-state"><div className="spinner" /><span>뉴스 로딩 중...</span></div>
                    ) : error.news ? (
                      <div className="error-state">
                        <strong>뉴스를 불러오지 못했습니다</strong>
                        <p>{error.news}</p>
                      </div>
                    ) : todayNews.length === 0 ? (
                      <div className="empty-state">오늘 수집된 뉴스가 없습니다.</div>
                    ) : (
                      todayNews.map((item) => <NewsCard key={item.id} item={item} onClick={setSelectedNews} />)
                    )}
                  </div>
                )}

                {activeTab === "similar" && (
                  <div className="similar-list">
                    {loading.similar ? (
                      <div className="loading-state"><div className="spinner" /><span>유사 사건 분석 중...</span></div>
                    ) : error.similar ? (
                      <div className="error-state">
                        <strong>데이터를 불러오지 못했습니다</strong>
                        <p>{error.similar}</p>
                      </div>
                    ) : similar.length === 0 ? (
                      <div className="empty-state">유사 과거 사건 데이터가 없습니다.</div>
                    ) : (
                      similar.map((item, i) => <SimilarCard key={i} data={item} />)
                    )}
                  </div>
                )}

                {activeTab === "search" && (
                  <div className="news-list">
                    {searchLoading ? (
                      <div className="loading-state"><div className="spinner" /><span>검색 중...</span></div>
                    ) : searchResults?.error ? (
                      <div className="error-state">{searchResults.error}</div>
                    ) : searchResults?.items?.length === 0 ? (
                      <div className="empty-state">검색 결과가 없습니다.</div>
                    ) : (
                      searchResults?.items?.map((item) => <NewsCard key={item.id} item={item} onClick={setSelectedNews} />)
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-right">
            {/* 가격 추이 + 모델 예측 */}
            <div className="section-card chart-card">
              <div className="section-header">
                <span className="section-title">모델 예측 + 매입전략</span>
              </div>

              {/* 단기 예측 */}
              <div className="pred-block">
                <div className="pred-block-header">
                  <span className="pred-block-title">단기 예측</span>
                  <span className="pred-block-meta">1일 후 · ARIMA+XGB</span>
                </div>
                {modelPrediction.loading ? (
                  <div className="chart-no-data-msg">예측 데이터 로딩 중...</div>
                ) : modelPrediction.short ? (() => {
                  const prob = modelPrediction.short.probability_up ?? 0.5;
                  const pct = Math.round(prob * 100);
                  const isUp = prob >= 0.5;
                  const rsi = modelPrediction.short?.base_features?.coffee_rsi_14;
                  const rsiPct = rsi != null ? Math.min(Math.max(rsi, 0), 100) : null;
                  const arima = modelPrediction.short?.arima_features?.arima_resid_1d;
                  const dir = modelPrediction.short.direction_label || (isUp ? '상승' : '하락');
                  return (
                    <div className="pred-body">
                      {/* 방향 + 확률 히어로 */}
                      <div className="pred-hero">
                        <span className={`pred-direction ${isUp ? 'bullish' : 'bearish'}`}>{dir}</span>
                        <span className={`pred-prob ${isUp ? 'bullish' : 'bearish'}`}>{pct}%</span>
                        {modelPrediction.short.prediction_for_date && (
                          <span className="pred-date">{modelPrediction.short.prediction_for_date.slice(0,10)} 기준</span>
                        )}
                      </div>
                      {/* 상승확률 바 */}
                      <div className="pred-metric">
                        <div className="pred-metric-label">
                          <span>상승확률</span>
                          <span className={isUp ? 'bullish' : 'bearish'}>{pct}%</span>
                        </div>
                        <div className="pred-bar-track">
                          <div className={`pred-bar-fill ${isUp ? 'bullish' : 'bearish'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {/* RSI */}
                      {rsiPct != null && (
                        <div className="pred-metric">
                          <div className="pred-metric-label">
                            <span>RSI <span className="pred-metric-sub">14일</span></span>
                            <span className={rsiPct < 30 ? 'bullish' : rsiPct > 70 ? 'bearish' : ''}>{rsi.toFixed(1)}</span>
                          </div>
                          <div className="pred-bar-track rsi-track">
                            <div className="rsi-zone-low" />
                            <div className="rsi-zone-high" />
                            <div className={`rsi-thumb ${rsiPct < 30 ? 'bullish' : rsiPct > 70 ? 'bearish' : 'neutral'}`}
                              style={{ left: `calc(${rsiPct}% - 5px)` }} />
                          </div>
                        </div>
                      )}
                      {/* ARIMA 잔차 */}
                      {arima != null && (
                        <div className="pred-stat-row">
                          <span className="pred-stat-label">ARIMA 잔차</span>
                          <span className={`pred-stat-val ${arima > 0 ? 'bullish' : 'bearish'}`}>
                            {arima > 0 ? '+' : ''}{arima.toFixed(4)}
                          </span>
                          <span className="pred-stat-note">{arima > 0 ? '상승 압력' : '하락 압력'}</span>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="chart-no-data-msg">단기 예측 데이터 없음</div>
                )}
              </div>

              {/* 중장기 예측 */}
              <div className="pred-block">
                <div className="pred-block-header">
                  <span className="pred-block-title">중장기 예측</span>
                  <span className="pred-block-meta">20일 후 · XGBoost</span>
                </div>
                {modelPrediction.loading ? (
                  <div className="chart-no-data-msg">예측 데이터 로딩 중...</div>
                ) : modelPrediction.mid ? (() => {
                  const prob = modelPrediction.mid.probability_up ?? 0.5;
                  const pct = Math.round(prob * 100);
                  const isUp = prob >= 0.5;
                  const dxy = modelPrediction.short?.base_features?.dxy_logret_5d;
                  const shortProb = modelPrediction.short?.probability_up;
                  const shortPct = shortProb != null ? Math.round(shortProb * 100) : null;
                  const dir = modelPrediction.mid.direction_label || (isUp ? '상승' : '하락');
                  return (
                    <div className="pred-body">
                      {/* 방향 + 확률 히어로 */}
                      <div className="pred-hero">
                        <span className={`pred-direction ${isUp ? 'bullish' : 'bearish'}`}>{dir}</span>
                        <span className={`pred-prob ${isUp ? 'bullish' : 'bearish'}`}>{pct}%</span>
                        {modelPrediction.mid.prediction_for_date && (
                          <span className="pred-date">{modelPrediction.mid.prediction_for_date.slice(0,10)} 기준</span>
                        )}
                      </div>
                      {/* 중장기 상승확률 바 */}
                      <div className="pred-metric">
                        <div className="pred-metric-label">
                          <span>상승확률 <span className="pred-metric-sub">20일</span></span>
                          <span className={isUp ? 'bullish' : 'bearish'}>{pct}%</span>
                        </div>
                        <div className="pred-bar-track">
                          <div className={`pred-bar-fill ${isUp ? 'bullish' : 'bearish'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {/* 단기 vs 중장기 비교 */}
                      {shortPct != null && (
                        <div className="pred-compare">
                          <span className="pred-metric-label-only">단기 vs 중장기</span>
                          <div className="pred-compare-bars">
                            <div className="pred-compare-item">
                              <div className="pred-bar-track">
                                <div className={`pred-bar-fill ${shortProb >= 0.5 ? 'bullish' : 'bearish'}`}
                                  style={{ width: `${shortPct}%`, opacity: 0.7 }} />
                              </div>
                              <span className="pred-compare-label">단기 {shortPct}%</span>
                            </div>
                            <div className="pred-compare-item">
                              <div className="pred-bar-track">
                                <div className={`pred-bar-fill ${isUp ? 'bullish' : 'bearish'}`}
                                  style={{ width: `${pct}%`, opacity: 0.7 }} />
                              </div>
                              <span className="pred-compare-label">중장기 {pct}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* DXY */}
                      {dxy != null && (
                        <div className="pred-stat-row">
                          <span className="pred-stat-label">DXY 5일 수익률</span>
                          <span className={`pred-stat-val ${dxy > 0 ? 'bearish' : 'bullish'}`}>
                            {dxy > 0 ? '+' : ''}{(dxy * 100).toFixed(4)}%
                          </span>
                          <span className="pred-stat-note">{dxy > 0 ? '달러 강세 → 하락압력' : '달러 약세 → 상승압력'}</span>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="chart-no-data-msg">중장기 예측 데이터 없음</div>
                )}
              </div>

              <div style={{ marginTop: "16px" }}>
                <PurchaseMatrix shortDir={modelShortDir} midDir={modelMidDir} />
              </div>
            </div>

            {/* 감성 트렌드 */}
            <div className="section-card signal-card">
              <div className="section-header">
                <span className="section-title">감성 트렌드</span>
                {signal && <span className={`signal-badge large ${sig.cls}`}>{sig.label}</span>}
              </div>
              {loading.signal ? (
                <div className="loading-state small"><div className="spinner" /></div>
              ) : error.signal ? (
                <div className="error-state small">{error.signal}</div>
              ) : (
                <>
                  <TrendChart trend={signal?.trend} />
                  <div className="signal-stats">
                    <div className="stat-item">
                      <span className="stat-label">평균 감성</span>
                      <span className={`stat-val ${sig.cls}`}>{avgSent ? (avgSent * 100).toFixed(1) : "–"}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">오늘 기사</span>
                      <span className="stat-val">{todayCount}건</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">시장 시그널</span>
                      <span className={`stat-val ${sig.cls}`}>{sig.label}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 트렌딩 */}
            <div className="section-card trending-card">
              <div className="section-header">
                <span className="section-title">트렌딩 키워드</span>
                <span className="section-note">최근 7일</span>
              </div>
              {loading.trending ? (
                <div className="loading-state small"><div className="spinner" /></div>
              ) : error.trending ? (
                <div className="error-state small">{error.trending}</div>
              ) : (
                <TrendingTags trending={trending} />
              )}
            </div>

            {/* Feature 현황 — 계절성/과거 리스크 탭 제거 */}
            <div className="section-card feature-card">
              <div className="feature-card-header">
                <span className="section-title">Feature 현황</span>
              </div>
              <table className="feature-table">
                <tbody>
                  {[
                    { label: "ICE 아라비카 종가", val: market ? market.arabica_close.toFixed(2) : "–", note: "¢/lb", cls: "" },
                    { label: "RSI (14일)", val: modelPrediction.short?.base_features?.coffee_rsi_14 != null ? modelPrediction.short.base_features.coffee_rsi_14.toFixed(1) : "–", note: "", cls: "" },
                    { label: "USD/KRW 환율", val: market ? Math.round(market.usdkrw).toLocaleString() : "–", note: "원", cls: "" },
                    { label: "DXY 5일 로그수익률", val: modelPrediction.short?.base_features?.dxy_logret_5d != null ? (modelPrediction.short.base_features.dxy_logret_5d * 100).toFixed(4) + "%" : "–", note: "", cls: modelPrediction.short?.base_features?.dxy_logret_5d > 0 ? "bullish" : modelPrediction.short?.base_features?.dxy_logret_5d < 0 ? "bearish" : "" },
                    {
                      label: "뉴스 감성 점수",
                      val: avgSent ? (avgSent * 2 - 1).toFixed(2) : "–",
                      note: sig.label,
                      cls: sig.cls,
                    },
                    { label: "ARIMA 잔차 (1일)", val: modelPrediction.short?.arima_features?.arima_resid_1d != null ? modelPrediction.short.arima_features.arima_resid_1d.toFixed(4) : "–", note: "", cls: modelPrediction.short?.arima_features?.arima_resid_1d > 0 ? "bullish" : modelPrediction.short?.arima_features?.arima_resid_1d < 0 ? "bearish" : "" },
                    { label: "XGBoost 상승 확률", val: modelShortProb !== null ? `${(modelShortProb * 100).toFixed(1)}%` : "–%", note: modelShortDir === "up" ? "상승" : modelShortDir === "down" ? "하락" : "", cls: modelShortDir === "up" ? "bullish" : modelShortDir === "down" ? "bearish" : "" },
                  ].map((r) => (
                    <tr key={r.label}>
                      <td className="ft-label">{r.label}</td>
                      <td className={`ft-val ${r.cls}`}>{r.val}</td>
                      <td className={`ft-note ${r.cls}`}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </div>
        </div>
      </main>

      {selectedNews && <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
    </div>
  );
}