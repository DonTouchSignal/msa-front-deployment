import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import chatApi from '../api/chatApi';
import newsApi from '../api/newsApi';
import { chatStyles } from '../styles/ChatStyles';
import '../styles/Chat.css';
import authApi from '../api/authApi';
import assetApi from '../api/assetApi';

// 광고 데이터를 상수로 정의
const ADS_DATA = {
  sidebar: [
    {
      imageUrl: "/images/ads/sidebar-ad1.jpg",
      title: "투자 전략 강의",
      description: "전문가와 함께하는 투자 분석",
      link: "/premium/course"
    },
    {
      imageUrl: "/images/ads/sidebar-ad2.jpg",
      title: "프리미엄 구독",
      description: "실시간 매매 신호",
      link: "/subscription"
    }
  ],
  popup: {
    title: "특별 할인 이벤트",
    content: "지금 구독하시면 첫 달 50% 할인!",
    imageUrl: "/images/ads/popup-ad.jpg",
    link: "/subscription/special"
  }
};

function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [stockNews, setStockNews] = useState([]);
  const [cryptoNews, setCryptoNews] = useState([]);
  const [activeTab, setActiveTab] = useState('stock');
  const [showMoreNews, setShowMoreNews] = useState(false);
  const chatContainerRef = useRef(null);
  const [showAds, setShowAds] = useState(true);
  const [popupAd, setPopupAd] = useState(null);
  const [trendingStocks, setTrendingStocks] = useState([]); 
  const [trendingCoins, setTrendingCoins] = useState([]);

  // 임시 데이터
  

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await chatApi.getAllMessages();
        setMessages(data);
      } catch (error) {
        console.error('Error loading messages:', error);
        // 에러가 발생해도 로그인 페이지로 리다이렉트하지 않음
      }
    };
    loadMessages();

    const cleanup = chatApi.connectWebSocket(
      () => setConnected(true),
      () => setConnected(false)
    );

    const unsubscribe = chatApi.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchTopMovers = async () => {
      try {
        const data = await assetApi.getTopMovers();
        console.log("📊 변동률 상위 종목 API 응답:", data); // ✅ 콘솔 출력 추가
    
        if (!Array.isArray(data)) {
          console.error("⚠️ API 응답이 배열이 아님:", data);
          return;
        }
    
        // 주식과 암호화폐 분리
        const stocks = data.filter(item => !item.symbol.includes('-'));
        const cryptos = data.filter(item => item.symbol.includes('-'));
    
        setTrendingStocks(stocks);
        setTrendingCoins(cryptos);
      } catch (error) {
        console.error("❌ 변동률 상위 종목 조회 실패:", error);
      }
    };
    

    fetchTopMovers();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    try {
      await chatApi.sendMessage(currentMessage);
      setCurrentMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const stockNewsData = await newsApi.getStockNews(searchTerm);
      setStockNews(stockNewsData.items);

      const cryptoNewsData = await newsApi.getCryptoNews(searchTerm);
      setCryptoNews(cryptoNewsData.items);
    } catch (error) {
      console.error('Failed to search news:', error);
    }
  };

  const handleNewsClick = (link) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };


    // 주식 가격 포맷 함수
  const formatStockPrice = (symbol, price) => {
    if (!price) return "데이터 없음";
    
    const isKoreanStock = /^[0-9]+$/.test(symbol); // 종목 코드가 숫자로만 이루어지면 국내 주식
    const currency = isKoreanStock ? "₩" : "$"; // 국내 주식은 원화, 해외 주식은 달러

    return `${price.toLocaleString()} ${currency}`;
  };

  // 암호화폐 가격 포맷 함수
  const formatCryptoPrice = (symbol, price) => {
    if (!price) return "데이터 없음";
  
    let currencySymbol = "₩"; // 기본값: 원(KRW)
    if (symbol.startsWith("USDT-")) {
      currencySymbol = "$";
    } else if (symbol.startsWith("BTC-")) {
      currencySymbol = "₿";
    } else if (symbol.startsWith("ETH-")) {
      currencySymbol = "Ξ";
    }
  
    // 지수 표기법을 방지해ㅑㅇ함
    let formattedPrice = price.toFixed(8); // 기본적으로 소수점 8자리까지 표시
  
    if (price < 0.0001) {
      formattedPrice = price.toLocaleString('fullwide', { useGrouping: false, minimumFractionDigits: 8 });
    }
  
    return `${formattedPrice} ${currencySymbol}`;
  };
  


  // TradingView 위젯 컴포넌트
  useEffect(() => {
    const loadTradingViewWidget = () => {
      // 기존 스크립트가 있다면 제거
      const existingScript = document.getElementById('tradingview-widget-script');
      if (existingScript) {
        existingScript.remove();
      }

      // 위젯 컨테이너 초기화
      const container = document.querySelector('.tradingview-widget-container__widget');
      if (container) {
        container.innerHTML = '';
      }

      // 스크립트 엘리먼트 생성
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
      script.type = 'text/javascript';
      script.async = true;

      // 위젯 설정을 스크립트 속성으로 추가
      script.innerHTML = JSON.stringify({
        "feedMode": "all_symbols",
        "colorTheme": "dark",
        "isTransparent": false,
        "displayMode": "regular",
        "width": "100%",
        "height": "550",
        "locale": "kr"
      });

      // 스크립트를 위젯 컨테이너에 추가
      if (container) {
        container.appendChild(script);
      }
    };

    // React의 Strict Mode로 인한 이중 실행 방지
    const timeoutId = setTimeout(loadTradingViewWidget, 0);

    return () => {
      clearTimeout(timeoutId);
      const script = document.getElementById('tradingview-widget-script');
      if (script) {
        script.remove();
      }
    };
  }, []);

  useEffect(() => {
    const checkAdsStatus = async () => {
      try {
        const userEmail = localStorage.getItem('X-Auth-User');
        if (userEmail) {
          // 구독 상태를 먼저 확인
          const isSubscribed = await authApi.checkSubscriptionStatus();
          
          // 구독 중이 아닌 경우에만 광고 표시
          if (!isSubscribed) {
            const shouldShowAds = await authApi.checkAdsShow();
            setShowAds(shouldShowAds);
            
            // 팝업 광고 표시 여부 확인
            if (shouldShowAds) {
              setPopupAd(ADS_DATA.popup);
            }
          } else {
            setShowAds(false);
            setPopupAd(null);
          }
        }
      } catch (error) {
        console.error('Error checking ads status:', error);
        setShowAds(true);
      }
    };

    checkAdsStatus();
  }, []);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        {/* 왼쪽 광고 사이드바 - 구독자에게는 표시하지 않음 */}
        {showAds && (
          <div className="col-lg-2">
            <div className="sticky-top" style={{ top: '1rem' }}>
              {ADS_DATA.sidebar.map((ad, index) => (
                <div key={index} className="mb-3">
                  <div className="card bg-dark border-secondary" style={{ width: '160px' }}>
                    <img 
                      src={ad.imageUrl} 
                      alt={ad.title} 
                      className="card-img-top"
                      style={{ height: '120px', objectFit: 'cover' }}
                    />
                    <div className="card-body p-2">
                      <h6 className="card-title text-light mb-1">{ad.title}</h6>
                      <p className="card-text text-secondary small mb-2">{ad.description}</p>
                      <Link to={ad.link} className="btn btn-outline-primary btn-sm w-100">
                        자세히 보기
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
  
        {/* 메인 컨텐츠 영역 */}
        <div className="col-lg-7">

          {/* 급상승/급하락 종목 */}
          <div className="card bg-dark border-secondary mb-4">
            <div className="card-header bg-dark border-bottom border-secondary">
              <h3 className="card-title mb-0 text-light">급상승/급하락 종목</h3>
            </div>
            <div className="card-body">
              <div className="row">
              <div className="col-md-6 border-end border-secondary">
                  <h5 className="text-light mb-3">주식</h5>
                  <div className="list-group list-group-flush">
                    {trendingStocks.map((stock, index) => (
                      <div key={index} className="list-group-item bg-dark text-light border-secondary">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold">{stock.englishName || stock.koreanName}</span>
                          <span className={`badge ${stock.changeRate >= 0 ? 'bg-success' : 'bg-danger'}`}>
                            {stock.changeRate.toFixed(2)}%
                          </span>
                        </div>
                        <small className="text-secondary">
                          현재가: {formatStockPrice(stock.symbol, stock.price)}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-md-6">
                  <h5 className="text-light mb-3">코인</h5>
                  <div className="list-group list-group-flush">
                    {trendingCoins.map((coin, index) => (
                      <div key={index} className="list-group-item bg-dark text-light border-secondary">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold">{coin.englishName || coin.koreanName}</span>
                          <span className={`badge ${coin.changeRate >= 0 ? 'bg-success' : 'bg-danger'}`}>
                            {(coin.changeRate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <small className="text-secondary">
                          현재가: {formatCryptoPrice(coin.symbol, coin.price)}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 뉴스 섹션 */}
          <div className="card bg-dark border-secondary">
            <div className="card-header bg-dark border-bottom border-secondary">
              <h3 className="card-title mb-3 text-light">뉴스 검색</h3>
              <div className="d-flex gap-2 mb-3">
                <button 
                  className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab('stock')}
                >
                  주식
                </button>
                <button 
                  className={`btn ${activeTab === 'crypto' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab('crypto')}
                >
                  암호화폐
                </button>
              </div>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control bg-dark text-light border-secondary"
                  placeholder={`${activeTab === 'stock' ? '주식' : '암호화폐'} 뉴스 검색...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  className="btn btn-primary"
                  type="button"
                  onClick={handleSearch}
                >
                  검색
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {(activeTab === 'stock' ? stockNews : cryptoNews).length > 0 ? (
                <>
                  <div className="row m-0">
                    <div className="col-md-6 p-0">
                      {(activeTab === 'stock' ? stockNews : cryptoNews)
                        .slice(0, 5)
                        .map((news, index) => (
                          <div 
                            key={index}
                            className="list-group-item bg-dark text-light border-secondary p-3"
                            onClick={() => handleNewsClick(news.link)}
                            style={{ cursor: 'pointer' }}
                          >
                            <h5 className="mb-1">{news.title}</h5>
                            <p className="text-secondary small mb-2">
                              {news.description?.substring(0, 100)}...
                            </p>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-secondary">
                                {new Date(news.pubDate).toLocaleDateString()}
                              </small>
                              <i className="bi bi-arrow-right text-primary"></i>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="col-md-6 p-0 border-start border-secondary">
                      {(activeTab === 'stock' ? stockNews : cryptoNews)
                        .slice(5, 10)
                        .map((news, index) => (
                          <div 
                            key={index}
                            className="list-group-item bg-dark text-light border-secondary p-3"
                            onClick={() => handleNewsClick(news.link)}
                            style={{ cursor: 'pointer' }}
                          >
                            <h5 className="mb-1">{news.title}</h5>
                            <p className="text-secondary small mb-2">
                              {news.description?.substring(0, 100)}...
                            </p>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-secondary">
                                {new Date(news.pubDate).toLocaleDateString()}
                              </small>
                              <i className="bi bi-arrow-right text-primary"></i>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  {(activeTab === 'stock' ? stockNews : cryptoNews).length > 10 && (
                    <div className="text-center p-3 border-top border-secondary">
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => setShowMoreNews(true)}
                      >
                        더보기
                      </button>
                    </div>
                  )}

                  {/* 더보기 모달 */}
                  <div 
                    className={`modal fade ${showMoreNews ? 'show' : ''}`} 
                    style={{ display: showMoreNews ? 'block' : 'none' }}
                    tabIndex="-1"
                  >
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                      <div className="modal-content bg-dark">
                        <div className="modal-header border-secondary">
                          <h5 className="modal-title text-light">
                            {activeTab === 'stock' ? '주식' : '암호화폐'} 뉴스 전체보기
                          </h5>
                          <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={() => setShowMoreNews(false)}
                          ></button>
                        </div>
                        <div className="modal-body">
                          <div className="list-group list-group-flush">
                            {(activeTab === 'stock' ? stockNews : cryptoNews)
                              .slice(10)
                              .map((news, index) => (
                                <div 
                                  key={index}
                                  className="list-group-item bg-dark text-light border-secondary p-3"
                                  onClick={() => handleNewsClick(news.link)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <h5 className="mb-1">{news.title}</h5>
                                  <p className="text-secondary small mb-2">
                                    {news.description?.substring(0, 150)}...
                                  </p>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-secondary">
                                      {new Date(news.pubDate).toLocaleDateString()}
                                    </small>
                                    <i className="bi bi-arrow-right text-primary"></i>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {showMoreNews && (
                    <div 
                      className="modal-backdrop fade show" 
                      onClick={() => setShowMoreNews(false)}
                    ></div>
                  )}
                </>
              ) : (
                <div className="text-center p-5">
                  <i className="bi bi-newspaper fs-1 text-secondary mb-3"></i>
                  <p className="text-secondary mb-0">
                    관심 있는 {activeTab === 'stock' ? '주식' : '암호화폐'} 뉴스를 검색해보세요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="col-lg-3">
          {/* 채팅 */}
          <div className="card bg-dark border-secondary mb-4">
            <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0 text-light">실시간 채팅</h3>
              {connected && <span className="badge bg-success">Live</span>}
            </div>
            <div className="card-body p-3">
              <div 
                className="chat-container" 
                ref={chatContainerRef}
              >
                {messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <div key={index} className="message-container" style={chatStyles.messageContainer}>
                      <div style={chatStyles.messageHeader}>
                        <span style={chatStyles.username}>
                          {msg.nickName ? msg.nickName : 'Guest'}
                        </span>
                        <span style={chatStyles.timestamp}>
                          {new Date(msg.sendAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      <div style={chatStyles.messageContent}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-secondary p-4">
                    <i className="bi bi-chat-dots fs-2 mb-2"></i>
                    <p className="mb-0">채팅 내역이 없습니다</p>
                  </div>
                )}
              </div>
              <div className="input-group mt-3">
                <input
                  type="text"
                  className="form-control bg-dark text-light border-secondary"
                  placeholder={connected ? "메시지를 입력하세요..." : "연결 중..."}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  className="btn btn-primary"
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!connected}
                >
                  전송
                </button>
              </div>
            </div>
          </div>

          {/* TradingView 위젯 */}
          <div className="card bg-dark border-secondary">
            <div className="card-header bg-dark border-bottom border-secondary">
              <h3 className="card-title mb-0 text-light">실시간 시장 동향</h3>
            </div>
            <div className="card-body p-0" style={{ height: '550px' }}>
              <div className="tradingview-widget-container">
                <div className="tradingview-widget-container__widget"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 팝업 광고 모달 */}
        {popupAd && (
          <div className="modal fade show" style={{ display: 'block' }}>
            <div className="modal-dialog">
              <div className="modal-content bg-dark">
                <div className="modal-header border-secondary">
                  <h5 className="modal-title text-light">{popupAd.title}</h5>
                  <button type="button" className="btn-close" onClick={() => setPopupAd(null)}></button>
                </div>
                <div className="modal-body">
                  <img src={popupAd.imageUrl} alt={popupAd.title} className="img-fluid mb-3" />
                  <p className="text-light">{popupAd.content}</p>
                </div>
                <div className="modal-footer border-secondary">
                  <Link to={popupAd.link} className="btn btn-primary">
                    자세히 보기
                  </Link>
                  <button type="button" className="btn btn-secondary" onClick={() => setPopupAd(null)}>
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;