import axios from "axios";
import { throttle } from "lodash";

const BASE_URL = "http://34.210.11.121:8080/asset"; // 백엔드 API URL

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 400000,
  headers: {
    "Content-Type": "application/json",
  },
});

const getAuthHeaders = () => {
  const accessToken = localStorage.getItem('accessToken');
  const authUser = localStorage.getItem('X-Auth-User');
  return { accessToken, authUser };
};

axiosInstance.interceptors.request.use(
  config => {
    const { accessToken, authUser } = getAuthHeaders();
    if (accessToken) {
      config.headers['Authorization'] = accessToken;
    }
    if (authUser) {
      config.headers['X-Auth-User'] = authUser;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const assetApi = {
  // 종목 검색
  searchStocks: async (keyword) => {
    try {
      const response = await axiosInstance.get("/search", {
        params: { keyword },
      });
      return response.data;
    } catch (error) {
      console.error("❌ 종목 검색 실패:", error);
      throw error;
    }
  },

  // 종목 상세 정보 조회
  getStockDetail: async (symbol) => {
    try {
      const response = await axiosInstance.get(`/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`❌ ${symbol} 종목 상세 정보 조회 실패:`, error);
      throw error;
    }
  },

  // 변동률 상위 종목 조회
  getTopMovers: async () => {
    try {
      const response = await axiosInstance.get("/top-movers");
      return response.data; // 주식 3개 + 코인 3개 반환
    } catch (error) {
      console.error("❌ 상위 변동 종목 조회 실패:", error);
      return [];
    }
  },

  // 관심 종목 목록 조회
  getFavoriteStocks: async () => {
    try {
      const response = await axiosInstance.get("/favorite");
      return response.data;
    } catch (error) {
      console.error("❌ 관심 종목 목록 조회 실패:", error);
      return [];
    }
  },

  // 관심 종목 추가
  addFavoriteStock: async (symbol) => {
    try {
      const response = await axiosInstance.post("/favorite", null, {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ ${symbol} 관심 종목 추가 실패:`, error);
      throw error;
    }
  },

  // 관심 종목 삭제
  removeFavoriteStock: async (symbol) => {
    try {
      const response = await axiosInstance.delete("/favorite", {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ ${symbol} 관심 종목 삭제 실패:`, error);
      throw error;
    }
  },

  // 목표 가격 설정
  setTargetPrice: async (symbol, targetPrice, condition) => {
    try {
      const response = await axiosInstance.post("/target-price", null, {
        params: { 
          symbol, 
          targetPrice, 
          condition 
        }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ ${symbol} 목표 가격 설정 실패:`, error);
      throw error;
    }
  },

  // 목표 가격 목록 조회
  getTargetPrices: async () => {
    try {
      const response = await axiosInstance.get("/target-prices");
      return response.data;
    } catch (error) {
      console.error("❌ 목표 가격 목록 조회 실패:", error);
      return [];
    }
  },

  // 목표 가격 삭제
  removeTargetPrice: async (symbol) => {
    try {
      const response = await axiosInstance.delete("/target-price", {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ ${symbol} 목표 가격 삭제 실패:`, error);
      throw error;
    }
  },

  // 실시간 주식 가격 조회 (WebSocket 대용)
  getLiveStockPrice: throttle(async (symbol) => {
    try {
      // Redis에 저장된 실시간 시세 데이터 사용
      const priceKey = `stock_prices:${symbol}`;
      const changeKey = `stock_changes:${symbol}`;
      
      // 비동기 처리를 위해 실제 API 요청
      const response = await axiosInstance.get(`/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`❌ ${symbol} 실시간 가격 조회 실패:`, error);
      return null;
    }
  }, 2000), // 2초 간격 제한
  
  // WebSocket 연결 - 주식 실시간 시세
  //  수정
  // assetApi.js 파일의 웹소켓 관련 부분만 수정

// WebSocket 연결 - 주식 실시간 시세
  subscribeToStockPrice: (symbol, onMessage) => {
    // 웹소켓 주소를 백엔드 포트(8080)로 수정
    const socket = new WebSocket(`ws://34.210.11.121:8080/ws/stocks`);
    let isSubscribed = false;
    
    socket.onopen = () => {
      console.log(`✅ WebSocket 연결 성공 - ${symbol}`);
      // 연결 후 구독 메시지 전송
      const subscribeMsg = JSON.stringify({
        type: 'subscribe',
        symbol: symbol
      });
      socket.send(subscribeMsg);
      console.log(`📨 구독 메시지 전송: ${subscribeMsg}`);
    };
    
    socket.onmessage = (event) => {
      console.log(`📩 WebSocket 메시지 수신 (${symbol}):`, event.data);
      try {
        const data = JSON.parse(event.data);
        
        // 구독 성공 응답 처리
        if (data.status === 'success' && data.message.includes('구독 성공')) {
          isSubscribed = true;
          console.log(`✅ ${symbol} 구독 성공`);
          return;
        }
        
        // 오류 메시지 처리
        if (data.status === 'error') {
          console.error(`❌ WebSocket 오류: ${data.message}`);
          return;
        }
        
        // 가격 업데이트 메시지 처리
        if (data.type === 'price_update' && data.symbol === symbol) {
          const priceData = {
            symbol: data.symbol,
            price: data.price,
            changeRate: data.changeRate,
            timestamp: data.timestamp
          };
          onMessage(priceData);
        }
      } catch (error) {
        console.error('❌ WebSocket 메시지 파싱 실패:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error(`❌ WebSocket 오류 (${symbol}):`, error);
    };
    
    socket.onclose = (event) => {
      console.log(`🚪 WebSocket 연결 종료 - ${symbol}, 코드: ${event.code}, 이유: ${event.reason || '알 수 없음'}`);
      isSubscribed = false;
    };
    
    return {
      socket,
      close: () => {
        if (socket.readyState === WebSocket.OPEN) {
          if (isSubscribed) {
            // 구독 해제 메시지 전송
            const unsubscribeMsg = JSON.stringify({
              type: 'unsubscribe',
              symbol: symbol
            });
            console.log(`📤 구독 해제 메시지 전송: ${unsubscribeMsg}`);
            socket.send(unsubscribeMsg);
          }
          // 약간의 지연 후 연결 종료 (구독 해제 메시지가 전송될 시간 확보)
          setTimeout(() => {
            socket.close();
          }, 100);
        } else {
          // 이미 닫혀있거나 연결 중인 경우
          if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
            socket.close();
          }
        }
      }
    };
  },
  
  // 알림 WebSocket 연결
  subscribeToAlerts: (onMessage) => {
    const userEmail = localStorage.getItem('X-Auth-User');
    if (!userEmail) {
      console.error('❌ 사용자 인증 정보 없음');
      return null;
    }
    
    const socket = new WebSocket(`ws://34.210.11.121:8080/ws/alerts?email=${userEmail}`);
    
    socket.onopen = () => {
      console.log('✅ 알림 WebSocket 연결 성공');
    };
    
    socket.onmessage = (event) => {
      onMessage(event.data);
    };
    
    socket.onerror = (error) => {
      console.error('❌ 알림 WebSocket 오류:', error);
    };
    
    socket.onclose = () => {
      console.log('🚪 알림 WebSocket 연결 종료');
    };
    
    return {
      socket,
      close: () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      }
    };
  }
};

export default assetApi;