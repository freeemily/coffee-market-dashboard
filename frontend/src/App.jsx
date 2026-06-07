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

  // 차트 탭 상태
  const [chartTab, setChartTab] = useState("short"); // "short" | "mid"

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

  // AI 브리핑 생성 — 실제 /api/briefing (Anthropic API) 호출
  const generateBriefing = useCallback(async () => {
    if (!market && !modelPrediction.short && !signal) return;

    setBriefing(prev => ({ ...prev, loading: true, error: null }));

    const icePrice = market?.arabica_close ?? null;
    const usdkrw = market ? Math.round(market.usdkrw) : null;
    const pctChange = market?.arabica_pct_change ?? null;
    const rsi = modelPrediction.short?.base_features?.coffee_rsi_14 ?? null;
    const xgbProb = modelPrediction.short?.probability_up ?? null;
    const xgbDir = modelPrediction.short?.direction === 1 ? "상승" : modelPrediction.short?.direction === -1 ? "하락" : "불명";
    const arima_resid = modelPrediction.short?.arima_features?.arima_resid_1d ?? null;
    const midDir = modelPrediction.mid?.direction === 1 ? "상승" : modelPrediction.mid?.direction === -1 ? "하락" : "불명";
    const midProb = modelPrediction.mid?.probability_up ?? null;
    const sentLabel = sig.label;
    const avgSentVal = avgSent != null ? (avgSent * 100).toFixed(1) : null;

    const prompt = `당신은 생두(커피 원두) 구매 담당자를 위한 시장 브리핑 AI입니다.
아래 실시간 시장 데이터를 바탕으로, 비전문가도 이해할 수 있는 간결한 한국어 브리핑을 작성하세요.

[시장 데이터]
- ICE 아라비카 선물 종가: ${icePrice != null ? `${icePrice.toFixed(2)}¢/lb` : "데이터 없음"}
- 전일 대비 변화율: ${pctChange != null ? `${pctChange.toFixed(2)}%` : "데이터 없음"}
- USD/KRW 환율: ${usdkrw != null ? `${usdkrw.toLocaleString()}원` : "데이터 없음"}
- RSI(14): ${rsi != null ? rsi.toFixed(1) : "데이터 없음"}
- ARIMA 잔차(1일): ${arima_resid != null ? arima_resid.toFixed(4) : "데이터 없음"}
- 단기 XGBoost 예측: ${xgbDir} (상승확률 ${xgbProb != null ? `${(xgbProb * 100).toFixed(1)}%` : "–"})
- 중장기 XGBoost 예측: ${midDir} (상승확률 ${midProb != null ? `${(midProb * 100).toFixed(1)}%` : "–"})
- 뉴스 감성: ${sentLabel} (평균 ${avgSentVal != null ? `${avgSentVal}` : "–"})
- 오늘 수집 뉴스 수: ${todayCount}건

[작성 지침]
1. 가격 및 환율 현황 (1~2문장)
2. 가격 추세 분석 (1~2문장, RSI/ARIMA 기반)
3. 뉴스 감성 요약 (1문장)
4. 매입 전략 권고 — 반드시 마지막 단락으로, "매입 전략: [제목]" 형식으로 시작

총 4개 단락, 각 단락은 빈 줄로 구분하세요. 수치를 직접 언급하되 전문 용어는 쉽게 풀어 설명하세요.`;

    try {
      const res = await fetch(`${API_BASE}/api/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBriefing({ text: data.text, loading: false, error: null, generatedAt: new Date() });
    } catch (e) {
      setBriefing({ text: null, loading: false, error: e.message, generatedAt: null });
    }
  }, [market, modelPrediction, signal, avgSent, sig, todayCount]);

  const [briefing, setBriefing] = useState({ text: null, loading: false, error: null, generatedAt: null });

  // 데이터가 로드되면 자동 브리핑 생성
  useEffect(() => {
    const ready = market !== null && !modelPrediction.loading && !loading.signal;
    if (ready && !briefing.text) {
      generateBriefing();
    }
  }, [market, modelPrediction.loading, loading.signal]);

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
                <span className="section-title">AI 데일리 브리핑</span>
                <span className="badge-llm">LLM 생성</span>
                {briefing.generatedAt && (
                  <span className="section-note">
                    {briefing.generatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 생성
                  </span>
                )}
                <button
                  className="briefing-refresh-btn"
                  onClick={generateBriefing}
                  disabled={briefing.loading}
                  title="브리핑 재생성"
                >
                  {briefing.loading ? "생성중..." : "↻ 재생성"}
                </button>
              </div>

              {briefing.loading ? (
                <div className="briefing-generating">
                  <div className="spinner" />
                  <span>AI가 시장 데이터를 분석하고 있습니다...</span>
                </div>
              ) : briefing.error ? (
                <div className="error-state small">브리핑 생성 실패: {briefing.error}</div>
              ) : briefing.text ? (
                <div className="briefing-content">
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
                <div className="briefing-placeholder">
                  <div className="placeholder-line w-full" />
                  <div className="placeholder-line w-3/4" />
                  <div className="briefing-features">
                    {["ICE 선물가","USD/KRW","RSI(14)","ARIMA 잔차","XGBoost 확률","뉴스 감성"].map(f => (
                      <span key={f} className="feature-tag">{f}</span>
                    ))}
                  </div>
                </div>
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
                <span className="section-title">가격 추이 + 모델 예측</span>
                <div className="chart-tabs">
                  <button className={`chart-tab${chartTab === "short" ? " active" : ""}`} onClick={() => setChartTab("short")}>단기</button>
                  <button className={`chart-tab${chartTab === "mid" ? " active" : ""}`} onClick={() => setChartTab("mid")}>중장기</button>
                </div>
              </div>

              {chartTab === "short" ? (
                <>
                  <div className="chart-placeholder-inner">
                    <div className="chart-no-data-msg">
                      실제 가격 데이터 연동 시 차트가 표시됩니다.
                    </div>
                  </div>
                  <div className="chart-meta-row">
                    <span className="chart-meta-tag">1일 후 예측 · ARIMA+XGB</span>
                  </div>
                  {!modelPrediction.loading && (
                    <div className="chart-pred-summary">
                      {modelPrediction.short ? (
                        <>
                          <span className={`chart-pred-dir ${modelShortDir === 'up' ? 'bullish' : 'bearish'}`}>
                            {modelPrediction.short.direction_label || (modelShortDir === 'up' ? '상승' : '하락')}
                          </span>
                          <span className="chart-pred-sep">·</span>
                          <span>상승확률 <strong>{(modelShortProb * 100).toFixed(1)}%</strong></span>
                          <span className="chart-pred-sep">·</span>
                          <span className="chart-pred-date">{modelPrediction.short.prediction_for_date?.slice(0, 10)} 기준</span>
                        </>
                      ) : (
                        <span className="chart-pred-empty">단기 예측 데이터 없음</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="chart-placeholder-inner">
                    <div className="chart-no-data-msg">
                      실제 가격 데이터 연동 시 차트가 표시됩니다.
                    </div>
                  </div>
                  <div className="chart-meta-row">
                    <span className="chart-meta-tag">20일 후 예측 · XGBoost</span>
                  </div>
                  {!modelPrediction.loading && (
                    <div className="chart-pred-summary">
                      {modelPrediction.mid ? (
                        <>
                          <span className={`chart-pred-dir ${modelMidDir === 'up' ? 'bullish' : 'bearish'}`}>
                            {modelPrediction.mid.direction_label || (modelMidDir === 'up' ? '상승' : '하락')}
                          </span>
                          <span className="chart-pred-sep">·</span>
                          <span>상승확률 <strong>{(modelPrediction.mid.probability_up * 100).toFixed(1)}%</strong></span>
                          <span className="chart-pred-sep">·</span>
                          <span className="chart-pred-date">{modelPrediction.mid.prediction_for_date?.slice(0, 10)} 기준</span>
                        </>
                      ) : (
                        <span className="chart-pred-empty">장기 예측 데이터 없음</span>
                      )}
                    </div>
                  )}
                </>
              )}

              <PurchaseMatrix shortDir={modelShortDir} midDir={modelMidDir} />
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
