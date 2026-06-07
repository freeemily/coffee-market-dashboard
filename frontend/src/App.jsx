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

  // 템플릿 기반 브리핑 생성 (비전공자/구매 담당자용)
  const generateBriefing = useCallback(() => {
    if (!market && !modelPrediction.short && !signal) return;

    const icePrice = market?.arabica_close ?? null;
    const usdkrw = market ? Math.round(market.usdkrw) : null;
    const rsi = modelPrediction.short?.base_features?.coffee_rsi_14 ?? null;
    const xgbDir = modelPrediction.short?.direction === 1 ? "up" : modelPrediction.short?.direction === -1 ? "down" : null;
    const pctChange = market?.arabica_pct_change ?? null;
    const isModelUp = xgbDir === "up";
    const isModelDown = xgbDir === "down";
    const isSentBullish = sig.cls === "bullish";
    const isSentBearish = sig.cls === "bearish";
    const isRsiOversold = rsi != null && rsi < 30;
    const isRsiOverbought = rsi != null && rsi > 70;

    let s1 = "";
    if (icePrice) {
      if (pctChange != null) {
        if (pctChange > 1) s1 = `오늘 아라비카 커피 선물 가격은 전일 대비 ${pctChange.toFixed(2)}% 상승한 ${icePrice.toFixed(2)}센트/lb를 기록했습니다.`;
        else if (pctChange > 0) s1 = `오늘 아라비카 커피 선물 가격은 전일 대비 소폭 상승한 ${icePrice.toFixed(2)}센트/lb를 기록했습니다.`;
        else if (pctChange < -1) s1 = `오늘 아라비카 커피 선물 가격은 전일 대비 ${Math.abs(pctChange).toFixed(2)}% 하락한 ${icePrice.toFixed(2)}센트/lb를 기록했습니다.`;
        else s1 = `오늘 아라비카 커피 선물 가격은 전일 대비 소폭 하락한 ${icePrice.toFixed(2)}센트/lb를 기록했습니다.`;
      } else {
        s1 = `현재 아라비카 커피 선물 가격은 ${icePrice.toFixed(2)}센트/lb입니다.`;
      }
      if (usdkrw) {
        const krwStr = usdkrw.toLocaleString();
        if (usdkrw >= 1400) s1 += ` 원/달러 환율은 ${krwStr}원 수준으로, 환율이 높은 상태가 유지되면서 원화 기준 수입 원가는 여전히 부담 요인으로 작용하고 있습니다.`;
        else s1 += ` 원/달러 환율은 ${krwStr}원 수준으로, 환율 부담은 상대적으로 낮은 편입니다.`;
      }
    } else {
      s1 = "현재 가격 데이터를 불러오는 중입니다.";
    }

    let s2 = "";
    if (rsi != null) {
      if (rsi < 30) s2 = `최근 커피 가격은 이전 고점 대비 상당 폭 조정을 받은 상태입니다. 가격 수준만 놓고 보면 추가 하락 여력이 제한될 수 있어 향후 반등 가능성도 함께 고려할 필요가 있습니다.`;
      else if (rsi < 45) s2 = `가격은 최근 약세 흐름을 이어가고 있습니다. 아직 뚜렷한 반등 신호는 확인되지 않으나, 추가 하락 폭은 점차 제한될 수 있는 구간입니다.`;
      else if (rsi <= 55) s2 = `가격은 뚜렷한 방향 없이 횡보하는 흐름입니다. 시장이 다음 방향성을 모색하는 구간으로, 추세 전환 여부를 주시할 필요가 있습니다.`;
      else if (rsi <= 70) s2 = `가격은 최근 꾸준한 상승세를 이어온 상태입니다. 단기 과열 여부를 확인하며 매입 시점을 신중히 검토하는 것이 바람직합니다.`;
      else s2 = `가격이 단기간에 빠르게 상승하여 과열 구간에 진입한 상태입니다. 조정 가능성을 염두에 두고 대량 매입은 신중하게 접근하시기 바랍니다.`;
    }

    let s3 = "";
    if (avgSent != null) {
      const countStr = todayCount > 0 ? `오늘 수집된 커피 관련 뉴스 ${todayCount}건을 분석한 결과, ` : "";
      if (isSentBullish) s3 = `${countStr}시장 뉴스의 전반적인 분위기는 긍정적으로 나타났습니다. 산지 수급 또는 수요 측면에서 우호적인 요인이 부각되고 있습니다.`;
      else if (isSentBearish) s3 = `${countStr}시장 뉴스의 전반적인 분위기는 부정적으로 나타났습니다. 공급 증가 또는 수요 둔화와 관련된 소식이 시장에 영향을 미치고 있어 주의가 필요합니다.`;
      else s3 = `${countStr}시장 뉴스의 전반적인 분위기는 중립적으로 나타났습니다. 시장 방향성에 영향을 줄 만한 뚜렷한 호재나 악재는 확인되지 않았습니다.`;
    }

    let s4label = "매입 전략";
    let s4body = "";
    if (isRsiOversold && isModelUp && isSentBullish) {
      s4label = "매입 전략: 적극 매입 검토";
      s4body = "가격 조정, 상승 모델 신호, 긍정적 뉴스 감성이 동시에 나타나고 있습니다. 선물량 조기 확보 또는 분할 매입을 통한 적극적 대응이 유효한 시점입니다.";
    } else if (isRsiOversold && isModelUp) {
      s4label = "매입 전략: 분할 매입 권장";
      s4body = "가격이 조정된 상태에서 단기 상승 신호가 감지되고 있습니다. 한 번에 대량 매입하기보다는 분할 매입을 통해 평균 단가를 관리하는 방식이 유리합니다.";
    } else if (isModelUp && isSentBullish) {
      s4label = "매입 전략: 선매입 적극 검토";
      s4body = "단기 모델과 뉴스 감성 모두 강세를 가리키고 있습니다. 필요 물량의 일부를 미리 확보하는 선매입 전략이 유효할 수 있습니다.";
    } else if (isModelDown && isSentBearish) {
      s4label = "매입 전략: 매입 보류 권고";
      s4body = "단기 하락 모델 신호와 부정적 뉴스 감성이 겹치고 있습니다. 추가 하락 여지가 남아 있을 수 있어, 급하지 않다면 매입 시점을 늦추는 것이 바람직합니다.";
    } else if (isRsiOverbought && isModelDown) {
      s4label = "매입 전략: 관망 권고";
      s4body = "가격이 단기 고점권에 위치한 상태에서 하락 신호가 나타나고 있습니다. 조정 이후 진입하는 방안을 검토하시기 바랍니다.";
    } else if (isModelDown) {
      s4label = "매입 전략: 단기 관망 권고";
      s4body = "단기 하락 신호가 감지되고 있습니다. 추이를 좀 더 확인한 후 매입 여부를 결정하는 것이 안전합니다.";
    } else {
      s4label = "매입 전략: 분할 매입 권장";
      s4body = "가격 조정 이후 방향성이 뚜렷하지 않은 구간입니다. 대량 매입보다는 분할 매입을 통해 가격 변동 위험을 관리하는 것이 유리해 보입니다.";
    }
    const s4 = `${s4label}\n${s4body}`;

    const text = [s1, s2, s3, s4].filter(Boolean).join("\n\n");
    setBriefing({ text, loading: false, error: null, generatedAt: new Date() });
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


            <div className="section-card chart-card">
              <div className="section-header">
                <span className="section-title">모델 예측</span>
                <span className="chart-meta-tag">ARIMA+XGB</span>
              </div>

              {modelPrediction.loading ? (
                <div className="chart-no-data-msg">예측 데이터 로딩 중...</div>
              ) : (!modelPrediction.short && !modelPrediction.mid) ? (
                <div className="chart-no-data-msg">예측 데이터 없음</div>
              ) : (() => {
                const s = modelPrediction.short;
                const m = modelPrediction.mid;
                const shortProb = s?.probability_up ?? null;
                const midProb   = m?.probability_up ?? null;
                const rsi       = s?.base_features?.coffee_rsi_14 ?? null;
                const arima     = s?.arima_features?.arima_resid_1d ?? null;
                const dxy       = s?.base_features?.dxy_logret_5d ?? null;

                const clr = (p) => p >= 0.5 ? "#1d7a4e" : "#c0392b";
                const BX = 8, BW = 384, RH = 32;

                const rows = [];
                if (shortProb != null) rows.push({ key: "short", label: "단기 상승확률 (1일)",    prob: shortProb, note: s?.direction_label ?? null });
                if (midProb   != null) rows.push({ key: "mid",   label: "중장기 상승확률 (20일)", prob: midProb,   note: m?.direction_label ?? null });
                if (rsi       != null) rows.push({ key: "rsi",   label: "RSI (14일)",            prob: rsi / 100, value: rsi.toFixed(1), isRsi: true });
                if (arima     != null) rows.push({ key: "arima", label: "ARIMA 잔차 (1일)",       value: `${arima > 0 ? "+" : ""}${arima.toFixed(4)}`, sign: arima > 0 ? 1 : -1 });
                if (dxy       != null) rows.push({ key: "dxy",   label: "DXY 5일 수익률",         value: `${dxy > 0 ? "+" : ""}${(dxy * 100).toFixed(4)}%`, sign: dxy > 0 ? 1 : -1 });

                const svgH = rows.length * RH + 4;

                return (
                  <svg viewBox={`0 0 400 ${svgH}`} width="100%" style={{ display: "block" }}>
                    {rows.map((row, i) => {
                      const ty = i * RH + 4;
                      const labelY = ty + 10;
                      const barY   = ty + 15;

                      if (row.prob != null) {
                        const fillClr = row.isRsi
                          ? (row.prob * 100 < 30 ? "#1d7a4e" : row.prob * 100 > 70 ? "#c0392b" : "#9e9a94")
                          : clr(row.prob);
                        const filled = BW * row.prob;
                        const valText = row.value ?? `${Math.round(row.prob * 100)}%`;
                        const rightLabel = row.note ? `${row.note}  ${Math.round(row.prob * 100)}%` : valText;
                        return (
                          <g key={row.key}>
                            <text x={BX} y={labelY} fontSize="9" fill="#9e9a94" fontFamily="monospace">{row.label}</text>
                            <text x={BX + BW} y={labelY} fontSize="9" fill={fillClr} fontWeight="600" textAnchor="end" fontFamily="monospace">{rightLabel}</text>
                            <rect x={BX} y={barY} width={BW} height="7" rx="3.5" fill="#e8e4df"/>
                            {row.isRsi && <>
                              <rect x={BX} y={barY} width={BW * 0.3} height="7" rx="3.5" fill="#1d7a4e" opacity="0.12"/>
                              <rect x={BX + BW * 0.7} y={barY} width={BW * 0.3} height="7" rx="3.5" fill="#c0392b" opacity="0.12"/>
                            </>}
                            <rect x={BX} y={barY} width={filled} height="7" rx="3.5" fill={fillClr} opacity={row.isRsi ? 0 : 0.85}/>
                            {row.isRsi && <rect x={BX + filled - 1.5} y={barY - 1} width="3" height="9" rx="1.5" fill={fillClr}/>}
                            {!row.isRsi && <line x1={BX + BW/2} y1={barY - 1} x2={BX + BW/2} y2={barY + 8} stroke="#c8c3bc" strokeWidth="1" strokeDasharray="2,2"/>}
                          </g>
                        );
                      }

                      const signClr = row.sign > 0 ? "#1d7a4e" : "#c0392b";
                      return (
                        <g key={row.key}>
                          <text x={BX} y={labelY} fontSize="9" fill="#9e9a94" fontFamily="monospace">{row.label}</text>
                          <text x={BX + BW} y={labelY} fontSize="9" fill={signClr} fontWeight="600" textAnchor="end" fontFamily="monospace">{row.value}</text>
                          <line x1={BX} y1={barY + 4} x2={BX + BW} y2={barY + 4} stroke="#ede9e3" strokeWidth="1"/>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}

              <div style={{ marginTop: "12px" }}>
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
