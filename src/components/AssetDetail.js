import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import TradingViewWidget from './TradingViewWidget';
import assetApi from '../api/assetApi';

function AssetDetail() {
  const { assetId } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [priceAlert, setPriceAlert] = useState({
    targetPrice: '',
    condition: 'ABOVE'  // 백엔드 TargetPriceCondition enum과 일치
  });
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  
  // WebSocket 연결 관리
  const webSocketRef = useRef(null);
  // 폴링 간격 관리
  const pollingIntervalRef = useRef(null);
  
  // 종목 정보 가져오기
  useEffect(() => {
    fetchAssetDetail();
    checkFavoriteStatus();
    
    // 1. 먼저 WebSocket 연결 시도
    const connection = assetApi.subscribeToStockPrice(
      assetId,
      updateAssetPriceFromWebSocket
    );
    webSocketRef.current = connection;
    
    // 2. 폴링 방식 시작
    startPolling();
    
    // 3. 컴포넌트 언마운트 시 정리
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      stopPolling();
    };
  }, [assetId]);
  
  // WebSocket에서 가격 업데이트 처리
  const updateAssetPriceFromWebSocket = (data) => {
    if (data && data.symbol === assetId) {
      setIsLiveUpdating(true);
      setAsset(prev => ({
        ...prev,
        currentPrice: data.price,
        change: formatChangeRate(data.changeRate, getAssetType(assetId))
      }));
    }
  };
  
  // 폴링 시작 함수
  const startPolling = () => {
    // 기존 인터벌 제거
    stopPolling();
    
    // 2초마다 가격 업데이트 (API 부하를 고려하여 조정 가능)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await assetApi.getStockDetail(assetId);
        if (response) {
          setAsset(prev => {
            // 이전 가격과 현재 가격 비교
            const prevPrice = prev?.currentPrice;
            const newPrice = response.price;
            
            // 가격이 변경되면 업데이트 상태 표시
            if (prevPrice !== newPrice) {
              setIsLiveUpdating(true);
              
              // 3초 후 업데이트 표시 제거
              setTimeout(() => {
                setIsLiveUpdating(false);
              }, 3000);
            }
            
            return {
              ...prev,
              currentPrice: newPrice,
              change: formatChangeRate(response.changeRate, getAssetType(assetId))
            };
          });
        }
      } catch (err) {
        console.error("❌ 가격 업데이트 실패:", err);
      }
    }, 2000); // 2초마다 갱신
  };
  
  // 폴링 중지 함수
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  
  // 종목 상세 정보 조회
  const fetchAssetDetail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await assetApi.getStockDetail(assetId);
      
      if (!response) {
        throw new Error("종목 데이터를 가져오는데 실패했습니다.");
      }
      
      // TradingView 심볼 변환
      const tradingViewSymbol = convertToTradingViewSymbol(response.symbol);
      const assetType = getAssetType(response.symbol);
      
      setAsset({
        id: response.symbol,
        name: response.koreanName || response.englishName || "알 수 없음",
        code: response.symbol,
        currentPrice: response.price,
        change: formatChangeRate(response.changeRate, assetType),
        tradingViewSymbol,
        assetType
      });
    } catch (err) {
      console.error("❌ 종목 상세 정보 조회 실패:", err);
      setError("종목 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  // 관심 종목 여부 확인
  const checkFavoriteStatus = async () => {
    try {
      const favorites = await assetApi.getFavoriteStocks();
      setIsFavorite(favorites.includes(assetId));
    } catch (err) {
      console.error("❌ 관심 종목 상태 확인 실패:", err);
    }
  };
  
  // 심볼을 TradingView 포맷으로 변환
  const convertToTradingViewSymbol = (symbol) => {
    if (!symbol) return null;
    
    // 암호화폐 (KRW-BTC, USDT-ETH 등)
    if (symbol.includes("-")) {
      const parts = symbol.split("-");
      if (parts.length === 2) {
        const base = parts[1]; // BTC, ETH 등
        const quote = parts[0]; // KRW, USDT 등
        return `UPBIT:${base}${quote}`;
      }
    }
    
    // 국내주식 (6자리 숫자)
    if (/^\d{6}$/.test(symbol)) {
      return `KRX:${symbol}`;
    }
    
    // 해외주식 (기본적으로 NASDAQ으로 설정)
    return `NASDAQ:${symbol}`;
  };
  
  // 종목 유형 판별
  const getAssetType = (symbol) => {
    if (!symbol) return 'unknown';
    
    // 숫자로만 구성된 경우 국내주식
    if (/^\d+$/.test(symbol)) return 'domestic';
    
    // '-'가 포함되어 있으면 암호화폐
    if (symbol.includes('-')) return 'crypto';
    
    // 그 외의 경우는 해외주식으로 간주
    return 'overseas';
  };
  
  // 암호화폐 통화 심볼 가져오기
  const getCryptoSymbol = (symbol) => {
    if (!symbol || !symbol.includes('-')) return '';
    
    // KRW-BTC와 같은 형식에서 KRW 부분 추출
    const baseCurrency = symbol.split('-')[0];
    
    // 통화별 다른 심볼 반환
    switch (baseCurrency) {
      case 'KRW':
        return '원';
      case 'USDT':
        return '$';
      case 'BTC':
        return '₿';
      case 'ETH':
        return 'Ξ';
      default:
        return '';
    }
  };
  
  // 가격 형식 지정
  const formatPrice = (price, assetType, symbol) => {
    if (price === undefined || price === null) return "-";
    
    const numericPrice = parseFloat(price);
    
    switch (assetType) {
      case "domestic":
        return `${numericPrice.toLocaleString()}원`;
      case "overseas":
        return `$${numericPrice.toLocaleString()}`;
      case "crypto":
        // 암호화폐는 통화 심볼에 따라 단위 변경
        const currencySymbol = getCryptoSymbol(symbol);
        // 암호화폐는 소수점 8자리까지 표시
        const formattedPrice = numericPrice < 1 
          ? numericPrice.toFixed(8) 
          : numericPrice.toLocaleString();
        return `${currencySymbol}${formattedPrice}`;
      default:
        return `${numericPrice.toLocaleString()}`;
    }
  };
  
  // 변동률 형식 지정
  const formatChangeRate = (changeRate, assetType) => {
    if (changeRate === undefined || changeRate === null) return "0.00%";
    
    const numericRate = parseFloat(changeRate);
    // 암호화폐의 경우 곱하기 100
    const adjustedRate = assetType === 'crypto' ? numericRate * 100 : numericRate;
    const sign = adjustedRate >= 0 ? "+" : "";
    
    return `${sign}${adjustedRate.toFixed(2)}%`;
  };
  
  // 가격 알림 설정 처리
  const handleAlertSubmit = async (e) => {
    e.preventDefault();
    
    if (!asset || !priceAlert.targetPrice) return;
    
    try {
      // 관심 종목 아닌 경우 먼저 추가
      if (!isFavorite) {
        await assetApi.addFavoriteStock(asset.code);
        setIsFavorite(true);
      }
      
      // 목표 가격 설정
      await assetApi.setTargetPrice(
        asset.code,
        parseFloat(priceAlert.targetPrice),
        priceAlert.condition
      );
      
      alert("가격 알림이 성공적으로 설정되었습니다.");
      setShowAlertForm(false);
    } catch (err) {
      console.error("❌ 가격 알림 설정 실패:", err);
      alert("가격 알림 설정에 실패했습니다. 다시 시도해주세요.");
    }
  };
  
  // 관심 종목 토글
  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await assetApi.removeFavoriteStock(assetId);
        setIsFavorite(false);
        alert("관심 종목에서 제거되었습니다.");
      } else {
        await assetApi.addFavoriteStock(assetId);
        setIsFavorite(true);
        alert("관심 종목에 추가되었습니다.");
      }
    } catch (err) {
      console.error("❌ 관심 종목 설정 실패:", err);
      alert("관심 종목 설정에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="container py-4 text-center text-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">종목 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // 에러 표시
  if (error) {
    return (
      <div className="container py-4 text-light">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <Link to="/assets" className="btn btn-primary">
          종목 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 데이터가 없을 경우
  if (!asset) {
    return (
      <div className="container py-4 text-light">
        <div className="alert alert-warning" role="alert">
          해당 종목 정보를 찾을 수 없습니다.
        </div>
        <Link to="/assets" className="btn btn-primary">
          종목 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 가격에 통화 기호 추가
  const formattedPrice = (() => {
    const price = asset.currentPrice;
    if (price === undefined || price === null) return "-";
    
    const numericPrice = parseFloat(price);
    
    if (asset.assetType === 'domestic') {
      return `${numericPrice.toLocaleString()}원`;
    } else if (asset.assetType === 'overseas') {
      return `$${numericPrice.toLocaleString()}`;
    } else if (asset.assetType === 'crypto') {
      // 암호화폐의 경우 소수점 8자리까지 표시
      const formattedNumber = numericPrice < 1 
        ? numericPrice.toFixed(8) 
        : numericPrice.toLocaleString();
      const currencySymbol = getCryptoSymbol(asset.code);
      return `${currencySymbol}${formattedNumber}`;
    } else {
      return `${numericPrice.toLocaleString()}`;
    }
  })();

  return (
    <div className="container py-4 text-light">
      {/* 종목 기본 정보 */}
      <div className="card bg-dark border-secondary mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1 text-white fw-bold">{asset.name}</h2>
              <span className="text-light opacity-75">{asset.code}</span>
            </div>
            <div className="text-end">
              <h3 className={`mb-1 text-white fw-bold ${isLiveUpdating ? 'text-success' : ''}`}>
                {formattedPrice}
                {isLiveUpdating && <span className="badge bg-success ms-2 pulse">실시간</span>}
              </h3>
              <span className={`fs-5 fw-bold ${asset.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                {asset.change}
              </span>
            </div>
          </div>
          
          <div className="d-flex gap-2 mb-3">
            <button 
              className={`btn ${isFavorite ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={toggleFavorite}
            >
              {isFavorite ? '⭐ 관심 종목' : '☆ 관심 종목 추가'}
            </button>
            <button 
              className="btn btn-outline-primary"
              onClick={() => setShowAlertForm(!showAlertForm)}
            >
              {showAlertForm ? '알림 설정 취소' : '가격 알림 설정'}
            </button>
          </div>

          {/* 가격 알림 설정 폼 */}
          {showAlertForm && (
            <div className="mt-4 p-3 border border-secondary rounded">
              <form onSubmit={handleAlertSubmit} className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label text-light">목표가</label>
                  <input
                    type="number"
                    className="form-control bg-dark text-white border-secondary"
                    value={priceAlert.targetPrice}
                    onChange={(e) => setPriceAlert({...priceAlert, targetPrice: e.target.value})}
                    required
                    step="any"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-light">조건</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={priceAlert.condition}
                    onChange={(e) => setPriceAlert({...priceAlert, condition: e.target.value})}
                  >
                    <option value="ABOVE">이상일 때</option>
                    <option value="BELOW">이하일 때</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <button type="submit" className="btn btn-primary w-100">
                    알림 설정하기
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="card bg-dark border-secondary mb-4">
        <div className="card-body">
          <h3 className="card-title mb-3 text-white fw-bold">차트</h3>
          <div className="bg-darker rounded" style={{ height: '400px', background: '#1a1a1a' }}>
            {asset.tradingViewSymbol ? (
              <TradingViewWidget symbol={asset.tradingViewSymbol} />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <p className="text-center text-light">⚠️ 차트 데이터를 불러올 수 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 토론방 링크 */}
      <div className="card bg-dark border-secondary">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="card-title mb-0 text-white fw-bold">토론방</h3>
            <Link 
              to={`/assets/${assetId}/posts/write`} 
              className="btn btn-primary"
            >
              글쓰기
            </Link>
          </div>
          <Link 
            to={`/assets/${assetId}/posts`} 
            className="btn btn-outline-primary w-100 py-2"
          >
            토론방 이동
          </Link>
        </div>
      </div>

      {/* 실시간 업데이트 애니메이션 CSS */}
      <style jsx>{`
        .pulse {
          animation: pulse-animation 1.5s infinite;
        }

        @keyframes pulse-animation {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default AssetDetail;