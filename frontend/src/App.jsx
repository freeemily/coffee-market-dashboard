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
    hour: "2-digit", minute: "2-digit", hour12: false
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
  const entities = Array.isArray(item.named_entities)
    ? item.named_entities.slice(0, 3)
    : [];
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
          {entities.map((e) => (
            <span key={e} className="entity-tag">{e}</span>
          ))}
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
            {item.named_entities.map((e) => (
              <span key={e} className="entity-tag">{e}</span>
            ))}
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
            <div key={d.date} className="trend-bar-col" title={`${d.date}: ${d.num_articles}건, 감성 ${(d.avg_sentiment * 100).toFixed(0)}`}>
              <div
                className={`trend-bar-fill ${sent.cls}`}
                style={{ height: `${h}px` }}
              />
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
        <span
          key={t.entity}
          className="trending-tag"
          style={{ opacity: 0.4 + 0.6 * (t.count / max) }}
        >
          {t.entity} <em>{t.count}</em>
        </span>
      ))}
    </div>
  );
}

function SearchBar({ onSearch }) {
  const [q, setQ] = useState("");
  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) onSearch(q.trim());
      }}
    >
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchJSON = useCallback(async (path, onData, key) => {
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  const nowStr = now.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <span className="logo-dot" />
          <span className="logo-text">BEAN PULSE</span>
          <span className="logo-sub">생두 시장 인텔리전스</span>
        </div>
        <div className="header-right">
          <span className="header-time">{nowStr} KST 기준</span>
        </div>
      </header>

      <main className="main">
        {/* TOP KPIs */}
        <section className="kpi-row">
          {/* 아라비카 가격 - 모델 전용 (디자인) */}
          <div className="kpi-card kpi-model">
            <span className="kpi-label">ICE 아라비카</span>
            <div className="kpi-value-row">
              <span className="kpi-value">–</span>
              <span className="kpi-unit">¢/lb</span>
            </div>
            <span className="kpi-note kpi-model-note">모델 API 연동 예정</span>
          </div>

          {/* USD/KRW - 모델 전용 (디자인) */}
          <div className="kpi-card kpi-model">
            <span className="kpi-label">USD/KRW</span>
            <div className="kpi-value-row">
              <span className="kpi-value">–</span>
              <span className="kpi-unit">원</span>
            </div>
            <span className="kpi-note kpi-model-note">모델 API 연동 예정</span>
          </div>

          {/* 단기 모델 - 모델 전용 (디자인) */}
          <div className="kpi-card kpi-model">
            <span className="kpi-label">단기 모델</span>
            <div className="kpi-value-row">
              <span className="kpi-value">–%</span>
            </div>
            <span className="kpi-note kpi-model-note">상승 확률 · ARIMA+XGB</span>
          </div>

          {/* 뉴스 감성 - 실제 데이터 */}
          <div className={`kpi-card kpi-live ${sig.cls}`}>
            <span className="kpi-label">뉴스 감성</span>
            <div className="kpi-value-row">
              {loading.signal ? (
                <span className="kpi-loading">로딩중...</span>
              ) : error.signal ? (
                <span className="kpi-error">오류</span>
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

        {/* MAIN GRID */}
        <div className="grid-main">
          {/* LEFT COLUMN */}
          <div className="col-left">
            {/* AI 브리핑 - 모델 전용 */}
            <div className="section-card briefing-card">
              <div className="section-header">
                <span className="section-title">AI 데일리 브리핑</span>
                <span className="badge-llm">LLM 생성</span>
                <span className="section-note">모델 API 연동 예정</span>
              </div>
              <div className="briefing-placeholder">
                <div className="placeholder-line w-full" />
                <div className="placeholder-line w-3/4" />
                <div className="briefing-placeholder-item">
                  <div className="placeholder-dot" />
                  <div style={{ flex: 1 }}>
                    <div className="placeholder-line w-full" />
                    <div className="placeholder-line w-2/3" />
                  </div>
                </div>
                <div className="briefing-placeholder-item">
                  <div className="placeholder-dot" />
                  <div style={{ flex: 1 }}>
                    <div className="placeholder-line w-full" />
                    <div className="placeholder-line w-1/2" />
                  </div>
                </div>
                <div className="briefing-placeholder-item">
                  <div className="placeholder-dot" />
                  <div style={{ flex: 1 }}>
                    <div className="placeholder-line w-3/4" />
                  </div>
                </div>
                <div className="briefing-features">
                  <span className="feature-tag">ICE 선물가</span>
                  <span className="feature-tag">USD/KRW</span>
                  <span className="feature-tag">RSI(14)</span>
                  <span className="feature-tag">ARIMA 잔차</span>
                  <span className="feature-tag">XGBoost 확률</span>
                  <span className="feature-tag">뉴스 감성</span>
                </div>
              </div>
            </div>

            {/* 검색 바 */}
            <SearchBar onSearch={handleSearch} />

            {/* 탭: 뉴스 / 유사사건 / 검색 */}
            <div className="tab-bar">
              <button
                className={`tab-btn ${activeTab === "news" ? "active" : ""}`}
                onClick={() => setActiveTab("news")}
              >
                뉴스 피드
                {todayCount > 0 && <span className="tab-count">{todayCount}</span>}
              </button>
              <button
                className={`tab-btn ${activeTab === "similar" ? "active" : ""}`}
                onClick={() => setActiveTab("similar")}
              >
                유사 과거 사건
              </button>
              {searchResults && (
                <button
                  className={`tab-btn ${activeTab === "search" ? "active" : ""}`}
                  onClick={() => setActiveTab("search")}
                >
                  검색: {searchResults.q}
                </button>
              )}
            </div>

            {/* 뉴스 탭 */}
            {activeTab === "news" && (
              <div className="news-list">
                {loading.news ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>뉴스 로딩 중...</span>
                  </div>
                ) : error.news ? (
                  <div className="error-state">뉴스를 불러오지 못했습니다: {error.news}</div>
                ) : todayNews.length === 0 ? (
                  <div className="empty-state">오늘 수집된 뉴스가 없습니다.</div>
                ) : (
                  todayNews.map((item) => (
                    <NewsCard key={item.id} item={item} onClick={setSelectedNews} />
                  ))
                )}
              </div>
            )}

            {/* 유사 사건 탭 */}
            {activeTab === "similar" && (
              <div className="similar-list">
                {loading.similar ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>유사 사건 분석 중...</span>
                  </div>
                ) : error.similar ? (
                  <div className="error-state">데이터를 불러오지 못했습니다: {error.similar}</div>
                ) : similar.length === 0 ? (
                  <div className="empty-state">유사 과거 사건 데이터가 없습니다.</div>
                ) : (
                  similar.map((item, i) => <SimilarCard key={i} data={item} />)
                )}
              </div>
            )}

            {/* 검색 결과 탭 */}
            {activeTab === "search" && (
              <div className="news-list">
                {searchLoading ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>검색 중...</span>
                  </div>
                ) : searchResults?.error ? (
                  <div className="error-state">검색 오류: {searchResults.error}</div>
                ) : searchResults?.items?.length === 0 ? (
                  <div className="empty-state">검색 결과가 없습니다.</div>
                ) : (
                  searchResults?.items?.map((item) => (
                    <NewsCard key={item.id} item={item} onClick={setSelectedNews} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-right">
            {/* 가격 추이 + 모델 예측 - 모델 전용 */}
            <div className="section-card chart-card">
              <div className="section-header">
                <span className="section-title">가격 추이 + 모델 예측</span>
                <div className="chart-tabs">
                  <span className="chart-tab">1W</span>
                  <span className="chart-tab active">1M</span>
                  <span className="chart-tab">3M</span>
                </div>
              </div>
              <div className="chart-placeholder">
                <div className="chart-placeholder-inner">
                  <svg viewBox="0 0 340 120" className="placeholder-chart">
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C17A3A" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#C17A3A" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,90 C30,85 50,70 80,60 C110,50 120,55 150,45 C180,35 190,50 220,40 C250,30 270,35 300,25 C320,20 330,18 340,15"
                      fill="none" stroke="#C17A3A" strokeWidth="2" strokeDasharray="6 4" opacity="0.5"
                    />
                    <path
                      d="M0,90 C30,85 50,70 80,60 C110,50 120,55 150,45 C180,35 190,50 220,40 C250,30 270,35 300,25 C320,20 330,18 340,15 L340,120 L0,120 Z"
                      fill="url(#grad)"
                    />
                  </svg>
                  <div className="chart-overlay-text">모델 API 연동 예정</div>
                </div>
                <div className="chart-legend">
                  <span><span className="legend-dot real" />실제 가격</span>
                  <span><span className="legend-dot pred" />모델 예측</span>
                </div>
              </div>

              {/* 매입 전략 매트릭스 */}
              <div className="matrix-section">
                <div className="matrix-title">매입 전략 매트릭스</div>
                <div className="matrix-grid">
                  <div className="matrix-header" />
                  <div className="matrix-header center">단기 ↑</div>
                  <div className="matrix-header center">단기 ↓</div>
                  <div className="matrix-rowlabel">중장기 ↑</div>
                  <div className="matrix-cell action-buy">즉시 선매입</div>
                  <div className="matrix-cell action-split">분할 매수</div>
                  <div className="matrix-rowlabel">중장기 ↓</div>
                  <div className="matrix-cell action-hedge model-dim">▶ 리스크 헤징</div>
                  <div className="matrix-cell action-hold">매입 보류</div>
                </div>
                <p className="matrix-note">현재 상태: 모델 데이터 연동 후 활성화</p>
              </div>
            </div>

            {/* 감성 트렌드 */}
            <div className="section-card signal-card">
              <div className="section-header">
                <span className="section-title">감성 트렌드</span>
                {signal && (
                  <span className={`signal-badge large ${sig.cls}`}>
                    {sig.label}
                  </span>
                )}
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
                      <span className={`stat-val ${sig.cls}`}>
                        {avgSent ? (avgSent * 100).toFixed(1) : "–"}
                      </span>
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

            {/* 트렌딩 엔티티 */}
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

            {/* Feature 현황 - 모델 전용 */}
            <div className="section-card feature-card">
              <div className="tab-bar small">
                <span className="tab-btn active small">Feature 현황</span>
                <span className="tab-btn small">계절성</span>
                <span className="tab-btn small">과거 리스크</span>
              </div>
              <table className="feature-table">
                <tbody>
                  {[
                    { label: "ICE 아라비카 종가", val: "–", note: "¢/lb", cls: "" },
                    { label: "RSI (14일)", val: "–", note: "", cls: "" },
                    { label: "USD/KRW 환율", val: "–", note: "", cls: "" },
                    { label: "DXY (달러 인덱스)", val: "–", note: "", cls: "" },
                    { label: "뉴스 감성 점수", val: avgSent ? (avgSent * 100 / 50 - 1).toFixed(2) : "–",
                      note: sig.label, cls: sig.cls },
                    { label: "ARIMA 잔차", val: "–", note: "", cls: "" },
                    { label: "XGBoost 상승 확률", val: "–%", note: "", cls: "" },
                    { label: "30일 가격 백분위", val: "–", note: "", cls: "" },
                  ].map((r) => (
                    <tr key={r.label}>
                      <td className="ft-label">{r.label}</td>
                      <td className={`ft-val ${r.cls}`}>{r.val}</td>
                      <td className={`ft-note ${r.cls}`}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="feature-model-note">* 모델 API 연동 후 실시간 업데이트</p>
            </div>
          </div>
        </div>

        {/* DATA PIPELINE */}
        <section className="pipeline-section">
          <h3 className="pipeline-label">DATA PIPELINE</h3>
          <div className="pipeline-flow">
            {[
              { icon: "ti-database", title: "데이터 수집", sub: "ICE · 환율 · 뉴스" },
              { icon: "ti-cpu", title: "Feature 추출", sub: "RSI · DXY · 감성" },
              { icon: "ti-chart-line", title: "ML 예측", sub: "ARIMA+XGB" },
              { icon: "ti-brain", title: "LLM 브리핑", sub: "종합 분석 생성" },
              { icon: "ti-layout-dashboard", title: "대시보드", sub: "시각화 · 알림" },
            ].map((s, i, arr) => (
              <>
                <div key={s.title} className="pipeline-step">
                  <i className={`ti ${s.icon}`} aria-hidden="true" />
                  <span className="pipeline-step-title">{s.title}</span>
                  <span className="pipeline-step-sub">{s.sub}</span>
                </div>
                {i < arr.length - 1 && <span key={`arrow-${i}`} className="pipeline-arrow">→</span>}
              </>
            ))}
          </div>
        </section>
      </main>

      {/* MODAL */}
      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </div>
  );
}
