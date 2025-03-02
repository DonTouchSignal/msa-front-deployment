// AssetList.js의 웹소켓 연결 실패 시 폴링으로 대체하는 로직

import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import assetApi from "../api/assetApi";

function AssetList() {
  // 기존 상태들...
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "domestic");
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // WebSocket 연결 관리
  const webSocketRefs = useRef({});
  // 폴링 인터벌 관리
  const pollingIntervalRef = useRef(null);
  // WebSocket 연결 상태 추적
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  
  useEffect(() => {
    fetchStocksByCategory();
    
    return () => {
      // 컴포넌트 언마운트 시 WebSocket 연결 및 폴링 모두 정리
      clearWebSocketConnections();
      clearPolling();
    };
  }, [selectedCategory]);
  
  // 검색어 변경 감지
  useEffect(() => {
    if (searchTerm) {
      fetchSearchedStocks();
    } else {
      fetchStocksByCategory();
    }
  }, [searchTerm, selectedCategory]);
  
  // 카테고리별 종목 필터링 함수
  const filterStocksByCategory = (stocks) => {
    if (!stocks || !Array.isArray(stocks)) return [];
    
    switch (selectedCategory) {
      case "domestic":
        // 국내주식: 6자리 숫자
        return stocks.filter(stock => /^\d{6}$/.test(stock.symbol));
      case "overseas":
        // 해외주식: 숫자가 아니고 '-'가 없는 심볼
        return stocks.filter(stock => 
          !(/^\d{6}$/.test(stock.symbol)) && !stock.symbol.includes('-')
        );
      case "crypto":
        // 암호화폐: '-'가 포함된 심볼
        return stocks.filter(stock => stock.symbol.includes('-'));
      default:
        return stocks;
    }
  };

  // 종목 데이터 가져오기
  const fetchStocksByCategory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 모든 종목 가져오기
      const allStocks = await assetApi.searchStocks("");
      console.log("📊 전체 종목 데이터:", allStocks.length);
      
      // 카테고리별 필터링
      const filteredStocks = filterStocksByCategory(allStocks);
      console.log(`📊 ${selectedCategory} 필터링 후 종목 수: ${filteredStocks.length}`);
      
      setAssets(filteredStocks);
      
      // 기존 연결 정리
      clearWebSocketConnections();
      clearPolling();
      
      // WebSocket 연결 시도
      setupWebSocketConnections(filteredStocks);
      
      // 5초 후에 WebSocket 연결 상태 확인 후 필요시 폴링으로 전환
      setTimeout(() => {
        if (!webSocketConnected) {
          console.log("⚠️ WebSocket 연결이 활성화되지 않아 폴링으로 전환합니다.");
          setupPolling(filteredStocks);
        }
      }, 5000);
      
    } catch (error) {
      console.error("❌ 종목 데이터 로드 실패:", error);
      setError("종목 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  // 검색 처리
  const fetchSearchedStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchResults = await assetApi.searchStocks(searchTerm);
      console.log(`🔍 검색 결과: ${searchResults?.length || 0}개 종목`);
      
      // 카테고리별 필터링 (검색어가 있어도 카테고리 필터링 적용)
      const filteredResults = filterStocksByCategory(searchResults);
      
      setAssets(filteredResults);
      
      // 기존 연결 정리
      clearWebSocketConnections();
      clearPolling();
      
      // WebSocket 연결 시도
      setupWebSocketConnections(filteredResults);
      
      // 5초 후에 WebSocket 연결 상태 확인 후 필요시 폴링으로 전환
      setTimeout(() => {
        if (!webSocketConnected) {
          console.log("⚠️ WebSocket 연결이 활성화되지 않아 폴링으로 전환합니다.");
          setupPolling(filteredResults);
        }
      }, 5000);
      
    } catch (error) {
      console.error("❌ 종목 검색 실패:", error);
      setError("종목 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  // WebSocket 연결 설정
  const setupWebSocketConnections = (stocks) => {
    if (!stocks || stocks.length === 0) return;
    
    // 최대 연결 수 제한 (성능 고려)
    const maxConnections = 10;
    const priorityStocks = stocks.slice(0, maxConnections);
    
    console.log(`🔌 ${priorityStocks.length}개 종목에 대해 WebSocket 연결 시도`);
    
    let connectedCount = 0;
    priorityStocks.forEach(stock => {
      const connection = assetApi.subscribeToStockPrice(
        stock.symbol,
        (data) => {
          // 연결 성공으로 간주
          setWebSocketConnected(true);
          
          // 데이터 업데이트
          updateAssetPrice(stock.symbol, data);
        }
      );
      
      webSocketRefs.current[stock.symbol] = connection;
      connectedCount++;
    });
    
    console.log(`🔌 ${connectedCount}개 WebSocket 연결 설정 완료`);
  };
  
  // WebSocket 연결 해제
  const clearWebSocketConnections = () => {
    Object.values(webSocketRefs.current).forEach(connection => {
      if (connection && connection.close) {
        connection.close();
      }
    });
    webSocketRefs.current = {};
    setWebSocketConnected(false);
  };
  
  // 폴링 설정
  const setupPolling = (stocks) => {
    if (!stocks || stocks.length === 0) return;
    
    clearPolling();
    
    console.log("🔄 폴링 방식으로 가격 업데이트 시작");
    
    pollingIntervalRef.current = setInterval(() => {
      // 최대 10개 종목만 폴링 (성능 고려)
      const pollingStocks = stocks.slice(0, 10);
      
      pollingStocks.forEach(async (stock) => {
        try {
          const stockData = await assetApi.getStockDetail(stock.symbol);
          if (stockData) {
            updateAssetPrice(stock.symbol, stockData);
          }
        } catch (err) {
          console.error(`❌ ${stock.symbol} 폴링 실패:`, err);
        }
      });
    }, 5000); // 5초마다 갱신
  };
  
  // 폴링 해제
  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  
  // 가격 업데이트 처리
  const updateAssetPrice = (symbol, data) => {
    if (!data || !data.price) return;
    
    console.log(`🔄 ${symbol} 가격 업데이트: ${data.price}, 변동률: ${data.changeRate}`);
    
    setAssets(prevAssets => 
      prevAssets.map(asset => 
        asset.symbol === symbol 
          ? { 
              ...asset, 
              price: data.price, 
              changeRate: data.changeRate 
            }
          : asset
      )
    );
  };
  
  // 카테고리 변경 처리
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSearchParams({ category });
    setSearchTerm("");
  };
  
  // 가격 형식 지정
  const formatPrice = (price, symbol) => {
    if (price === undefined || price === null) return "-";

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return "-";

    //  암호화폐의 경우, 단위 추가 (₿, Ξ, $)
    if (symbol.includes('-')) {
        const baseCurrency = symbol.split('-')[0]; // BTC, ETH, USDT 등
        const formattedPrice = numericPrice < 0.01 
            ? numericPrice.toFixed(8) 
            : numericPrice.toLocaleString();

        //  BTC, ETH, USDT 같은 단위 추가
        return baseCurrency === "KRW" ? `${formattedPrice} 원` 
            : baseCurrency === "BTC" ? `₿ ${formattedPrice}`
            : baseCurrency === "ETH" ? `Ξ ${formattedPrice}`
            : `$ ${formattedPrice}`;
    }

    // 국내 주식
    if (/^\d{6}$/.test(symbol)) {
        return `${numericPrice.toLocaleString()}원`;
    } else {
        return `$${numericPrice.toLocaleString()}`;
    }
};

  
  // 변동률 형식 지정
  const formatChangeRate = (changeRate, symbol) => {
    if (changeRate === undefined || changeRate === null) return "0.00%";
    
    const numericRate = parseFloat(changeRate);
    const sign = numericRate >= 0 ? "+" : "";
    
    // 암호화폐는 100 곱해서 표시 (백엔드에서 0.01 형식으로 내려오는 경우)
    const adjustedRate = symbol.includes('-') && Math.abs(numericRate) < 1
      ? numericRate * 100 
      : numericRate;
    
    return `${sign}${adjustedRate.toFixed(2)}%`;
  };

  return (
    <div className="container py-4 text-light">
      {/* 카테고리 탭 */}
      <div className="row mb-4">
        <div className="col">
          <div className="btn-group w-100">
            <button 
              className={`btn ${selectedCategory === "domestic" ? "btn-primary" : "btn-outline-primary"}`} 
              onClick={() => handleCategoryChange("domestic")}
            >
              국내주식
            </button>
            <button 
              className={`btn ${selectedCategory === "overseas" ? "btn-primary" : "btn-outline-primary"}`} 
              onClick={() => handleCategoryChange("overseas")}
            >
              해외주식
            </button>
            <button 
              className={`btn ${selectedCategory === "crypto" ? "btn-primary" : "btn-outline-primary"}`} 
              onClick={() => handleCategoryChange("crypto")}
            >
              암호화폐
            </button>
          </div>
        </div>
      </div>

      {/* 검색 입력란 */}
      <div className="row mb-4">
        <div className="col">
          <div className="input-group">
            <input
              type="text"
              className="form-control bg-dark text-light border-secondary"
              placeholder="종목명 또는 코드 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSearchedStocks()}
            />
            <button 
              className="btn btn-outline-primary" 
              type="button" 
              onClick={fetchSearchedStocks}
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* 연결 상태 표시 */}
      <div className="mb-3">
        <small className={`badge ${webSocketConnected ? 'bg-success' : 'bg-secondary'}`}>
          {webSocketConnected ? '실시간 연결됨' : '새로고침 모드'}
        </small>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* 종목 목록 테이블 */}
      <div className="row">
        <div className="col">
          <div className="table-responsive">
            <table className="table table-dark table-hover">
              <thead>
                <tr>
                  <th>종목명</th>
                  <th>종목코드</th>
                  <th className="text-end">현재가</th>
                  <th className="text-end">등락률</th>
                  <th className="text-center">상세/토론</th>
                </tr>
              </thead>
              <tbody>
                {assets.length > 0 ? (
                  assets.map((asset) => (
                    <tr key={asset.symbol}>
                      <td>
                        <Link to={`/assets/${asset.symbol}`} className="text-light">
                          {asset.koreanName || asset.englishName}
                        </Link>
                      </td>
                      <td>{asset.symbol}</td>
                      <td className="text-end">
                        {formatPrice(asset.price, asset.symbol)}
                      </td>
                      <td className={`text-end ${parseFloat(asset.changeRate) >= 0 ? "text-success" : "text-danger"}`}>
                        {formatChangeRate(asset.changeRate, asset.symbol)}
                      </td>
                      <td className="text-center">
                        <Link to={`/assets/${asset.symbol}`} className="btn btn-sm btn-outline-primary me-2">
                          상세
                        </Link>
                        <Link to={`/assets/${asset.symbol}/posts`} className="btn btn-sm btn-outline-primary">
                          토론방
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : !loading ? (
                  <tr>
                    <td colSpan="5" className="text-center text-light">
                      {error ? "데이터 로드 실패" : "검색 결과가 없습니다."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetList;