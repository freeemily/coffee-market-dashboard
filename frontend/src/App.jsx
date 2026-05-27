
import React, { useState, useEffect } from 'react';
import './App.css';

const WEB_BACKEND_URL = 'https://coffee-market-dashboard-production.up.railway.app';

export default function App() {
  const [dbData, setDbData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedNewsId, setSelectedNewsId] = useState(null);
  const [selectedNewsTitle, setSelectedNewsTitle] = useState('');
  const [relatedNewsList, setRelatedNewsList] = useState([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);

  useEffect(() => {
    fetch(`${WEB_BACKEND_URL}/api/dashboard`)
      .then(res => res.json())
      .then(data => {
        setDbData(data);
        setIsLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setIsSearching(true);

    try {
      const res = await fetch(
        `${WEB_BACKEND_URL}/api/search?q=${encodeURIComponent(searchQuery)}`
      );

      const data = await res.json();

      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNewsClick = async (newsId, title) => {
    setSelectedNewsId(newsId);
    setSelectedNewsTitle(title);
    setIsRelatedLoading(true);

    try {
      const res = await fetch(
        `${WEB_BACKEND_URL}/api/news/similar/${newsId}`
      );

      const data = await res.json();

      setRelatedNewsList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRelatedLoading(false);
    }
  };

  const generateHistoricalPoints = () => {
    if (
      !dbData ||
      !dbData.historicalData ||
      dbData.historicalData.length === 0
    ) {
      return '0,25 100,25';
    }

    const prices = dbData.historicalData.map(d => d.price);

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const range = max - min || 1;

    return dbData.historicalData
      .map((item, index) => {
        const x =
          (index / (dbData.historicalData.length - 1)) * 100;

        const y =
          45 - ((item.price - min) / range) * 40;

        return `${x},${y}`;
      })
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="loading">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  const {
    prediction,
    marketSignal,
    latestNews,
    historicalData
  } = dbData;

  const getSignalTranslation = (signal) => {
    if (signal === 'bullish') return '상승 우세';
    if (signal === 'bearish') return '하락 우세';
    return '보합세';
  };

  const isMatchedStrategy = (midDirection, shortDirection) => {
    if (!prediction) {
      return (
        midDirection === 'down' &&
        shortDirection === 'down'
      );
    }

    return (
      prediction.direction === midDirection &&
      prediction.direction === shortDirection
    );
  };

  return (
    <div>

      <header className="top-header">
        <div className="header-glow"></div>

        <div className="logo">
          생두 시장 분석 대시보드
        </div>
      </header>

      <main className="dashboard-container">


        <section className="panel">
          <h2>기한별 생두 시장 전망 및 지표</h2>

          <div className="risk-cards">

            <div className="card">
              <div className="card-header">
                단기 예측 모델 분석 결과
              </div>

              <div className="card-body">

                {prediction ? (
                  <>
                    <span
                      className={`badge ${
                        prediction.direction === 'up'
                          ? 'badge-high'
                          : 'badge-normal'
                      }`}
                    >
                      단기 예측 상태:
                      {' '}
                      {prediction.direction === 'up'
                        ? '상승 우세'
                        : '보합세'}
                    </span>

                    <p className="desc">
                      수집된 가격 데이터의 인공지능 모델 분석 결과,
                      전반적인 단기 시나리오 기조는
                      {' '}
                      {prediction.direction === 'up'
                        ? '상승 흐름'
                        : '안정 유지'}
                      {' '}
                      양상을 나타내고 있습니다.
                      {' '}
                      (예측가:
                      {' '}
                      {prediction.predictedPrice}
                      {' '}
                      달러 / 타깃일:
                      {' '}
                      {prediction.targetDate})
                    </p>
                  </>
                ) : (
                  <p className="desc">
                    데이터가 없습니다.
                  </p>
                )}

              </div>
            </div>

            <div className="card">
              <div className="card-header">
                중장기 예측 모델 분석 결과
              </div>

              <div className="card-body">

                {prediction ? (
                  <>
                    <span
                      className={`badge ${
                        prediction.direction === 'up'
                          ? 'badge-high'
                          : 'badge-normal'
                      }`}
                    >
                      중장기 예측 상태:
                      {' '}
                      {prediction.direction === 'up'
                        ? '상승 우세'
                        : '보합세'}
                    </span>

                    <p className="desc">
                      수집된 원자재 데이터의 인공지능 모델 분석 결과,
                      전반적인 중장기 시나리오 기조는
                      {' '}
                      {prediction.direction === 'up'
                        ? '상승 흐름'
                        : '안정 유지'}
                      {' '}
                      양상을 나타내고 있습니다.
                    </p>
                  </>
                ) : (
                  <p className="desc">
                    데이터가 없습니다.
                  </p>
                )}

              </div>
            </div>

          </div>
        </section>


        <section className="panel">
          <h2>최근 30일 커피 선물 실제 가격 추이</h2>

          <div className="chart-section">
            <div className="chart-container">

              {historicalData && historicalData.length > 0 ? (
                <div className="line-chart-wrapper">

                  <svg
                    viewBox="0 0 100 50"
                    preserveAspectRatio="none"
                    className="line-chart"
                  >
                    <line
                      x1="0"
                      y1="10"
                      x2="100"
                      y2="10"
                      stroke="#ece2db"
                      strokeWidth="0.5"
                    />

                    <line
                      x1="0"
                      y1="25"
                      x2="100"
                      y2="25"
                      stroke="#ece2db"
                      strokeWidth="0.5"
                    />

                    <line
                      x1="0"
                      y1="40"
                      x2="100"
                      y2="40"
                      stroke="#ece2db"
                      strokeWidth="0.5"
                    />

                    <polyline
                      fill="none"
                      stroke="#5c3b2e"
                      strokeWidth="1.5"
                      points={generateHistoricalPoints()}
                    />
                  </svg>

                  <div className="chart-labels">
                    <span>
                      {historicalData[0]?.date}
                    </span>

                    <span>
                      오늘 (
                      {historicalData[
                        historicalData.length - 1
                      ]?.date}
                      )
                    </span>
                  </div>

                </div>
              ) : (
                <div
                  className="line-chart-wrapper"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '140px'
                  }}
                >
                  <p className="desc">
                    데이터가 없습니다.
                  </p>
                </div>
              )}

            </div>
          </div>
        </section>



        <section className="panel full-width">
          <h2>오늘의 추천 매입 전략 매트릭스</h2>

          <p className="subtitle">
            중장기 모델 예측 결과(행) 및 단기 모델 예측 결과(열)
            교차 분석에 따른 최적의 행동 지침
          </p>

          <table className="decision-matrix">

            <thead>
              <tr>
                <th className="matrix-header">
                  중장기 모델 ↓ / 단기 모델 →
                </th>

                <th className="matrix-header">
                  단기 상승 예측 (상승)
                </th>

                <th className="matrix-header">
                  단기 하락 및 보합 (하락)
                </th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <th className="matrix-row-header">
                  중장기 상승 예측 (상승)
                </th>

                <td
                  className={
                    isMatchedStrategy('up', 'up')
                      ? 'recommended'
                      : ''
                  }
                >
                  즉시 선매입 및 재고 확보
                </td>

                <td
                  className={
                    isMatchedStrategy('up', 'down')
                      ? 'recommended'
                      : ''
                  }
                >
                  분할 매수를 통한 평단가 조절
                </td>
              </tr>

              <tr>
                <th className="matrix-row-header">
                  중장기 하락 예측 (하락)
                </th>

                <td
                  className={
                    isMatchedStrategy('down', 'up')
                      ? 'recommended'
                      : ''
                  }
                >
                  리스크 헤징 금융 옵션 검토
                </td>

                <td
                  className={
                    isMatchedStrategy('down', 'down')
                      ? 'recommended'
                      : ''
                  }
                >
                  매입 전면 보류 및 하락 대기
                </td>
              </tr>

            </tbody>

          </table>
        </section>


        <section
          className="panel full-width"
          style={{
            padding: '20px',
            fontSize: '13px'
          }}
        >

          <h2
            style={{
              fontSize: '15px',
              marginBottom: '5px'
            }}
          >
            시장 뉴스 파이프라인 및 동향 역추적
          </h2>

          <p
            className="desc"
            style={{
              marginBottom: '15px',
              fontSize: '11px',
              color: '#795548'
            }}
          >
            * 뉴스 제목을 선택하면 오른쪽에 시스템 엔진이 탐색한
            문맥 연관 리스크 리스트가 동적 매칭됩니다.
          </p>

          <div
            className="data-lists"
            style={{
              gap: '20px',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(92,59,46,0.08)',
              paddingBottom: '20px'
            }}
          >



            <div className="data-box" style={{ flex: '1' }}>

              <h3
                style={{
                  fontSize: '13px',
                  color: '#5d4037',
                  marginBottom: '8px'
                }}
              >
                최신 마켓 수집 뉴스
                {' '}
                (현재 상태:
                {' '}
                {getSignalTranslation(marketSignal)})
              </h3>

              <ul
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}
              >

                {latestNews.map((art) => (

                  <li
                    key={art.id}

                    onClick={() =>
                      handleNewsClick(art.id, art.title)
                    }

                    style={{
                      padding: '10px 8px',
                      borderBottom:
                        '1px dashed rgba(92,59,46,0.08)',

                      cursor: 'pointer',

                      backgroundColor:
                        selectedNewsId === art.id
                          ? 'rgba(92,59,46,0.08)'
                          : 'transparent',

                      fontWeight:
                        selectedNewsId === art.id
                          ? '700'
                          : '400',

                      color: '#3e2723',

                      textAlign: 'left',

                      borderRadius: '10px'
                    }}
                  >

                    <span
                      style={{
                        fontSize: '11px',
                        color: '#8d6e63',
                        marginRight: '8px'
                      }}
                    >
                      [{art.date}]
                    </span>

                    {art.title}

                  </li>

                ))}

              </ul>

            </div>



            <div
              className="data-box"
              style={{
                flex: '1',
                background: 'rgba(255,255,255,0.72)',
                border:
                  '1px solid rgba(92,59,46,0.08)',

                borderRadius: '14px',

                padding: '14px'
              }}
            >

              <h3
                style={{
                  fontSize: '13px',
                  color: '#3e2723',
                  marginBottom: '10px',
                  borderBottom:
                    '1px solid rgba(92,59,46,0.08)',

                  paddingBottom: '6px'
                }}
              >
                선택 뉴스 기반 연관 리스크 목록
              </h3>

              {selectedNewsId ? (

                isRelatedLoading ? (

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#8d6e63',
                      padding: '10px 0'
                    }}
                  >
                    유사 문맥 데이터 추출 중...
                  </div>

                ) : relatedNewsList.length > 0 ? (

                  <ul
                    style={{
                      maxHeight: '190px',
                      overflowY: 'auto'
                    }}
                  >

                    {relatedNewsList.map((rel, idx) => (

                      <li
                        key={idx}

                        style={{
                          fontSize: '12px',
                          padding: '8px 0',
                          borderBottom:
                            '1px dashed rgba(92,59,46,0.08)',

                          color: '#5d4037'
                        }}
                      >

                        <span
                          style={{
                            fontWeight: '700',
                            color: '#795548',
                            marginRight: '5px'
                          }}
                        >
                          [유사도
                          {' '}
                          {(rel.similarity * 100).toFixed(0)}
                          %]
                        </span>

                        {rel.title}

                      </li>

                    ))}

                  </ul>

                ) : (

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#8d6e63',
                      padding: '10px 0'
                    }}
                  >
                    분석된 연관 리스크 뉴스가 존재하지 않습니다.
                  </div>

                )

              ) : (

                <div
                  style={{
                    fontSize: '12px',
                    color: '#8d6e63',
                    padding: '40px 0',
                    textAlign: 'center'
                  }}
                >
                  좌측 뉴스 스트림에서 항목을 선택해 주세요.
                </div>

              )}

            </div>

          </div>


          <div
            style={{
              background: 'rgba(92,59,46,0.06)',
              padding: '14px',
              borderRadius: '14px'
            }}
          >

            <form
              onSubmit={handleSearch}

              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '10px'
              }}
            >

              <span
                style={{
                  fontWeight: '700',
                  color: '#4e342e',
                  alignSelf: 'center',
                  marginRight: '10px',
                  fontSize: '12px'
                }}
              >
                과거 리스크 역추적 검색
              </span>

              <input
                type="text"

                className="search-input"

                placeholder="임베딩 기반 매칭용 과거 사례 검색어를 입력하세요..."

                value={searchQuery}

                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
              />

              <button
                type="submit"
                className="search-btn"
              >
                검색 실행
              </button>

            </form>

            {searchResults.length > 0 ? (

              <div
                style={{
                  background: '#fff',

                  border:
                    '1px solid rgba(92,59,46,0.08)',

                  padding: '10px',

                  borderRadius: '12px',

                  maxHeight: '120px',

                  overflowY: 'auto'
                }}
              >

                <ul style={{ paddingLeft: '5px' }}>

                  {searchResults
                    .slice(0, 3)
                    .map((res, idx) => (

                    <li
                      key={idx}

                      style={{
                        fontSize: '12px',

                        padding: '5px 0',

                        borderBottom:
                          idx !== 2
                            ? '1px dashed rgba(92,59,46,0.08)'
                            : 'none',

                        color: '#3e2723'
                      }}
                    >

                      <span
                        style={{
                          fontWeight: '700',
                          color: '#d84b4b',
                          marginRight: '6px'
                        }}
                      >
                        [
                        {(res.similarity * 100).toFixed(0)}
                        % 일치]
                      </span>

                      {res.title}

                    </li>

                  ))}

                </ul>

              </div>

            ) : (

              searchQuery &&
              !isSearching && (

                <p
                  className="desc"
                  style={{
                    fontSize: '11px',
                    margin: '0',
                    paddingLeft: '5px'
                  }}
                >
                  매칭된 데이터가 없습니다.
                </p>

              )

            )}

          </div>

        </section>

      </main>

    </div>
  );
}