import React, { useState, useEffect, useRef } from 'react';
import boardApi from '../api/boardApi';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import assetApi from '../api/assetApi';

function User() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    email: '',
    nickname: '',
    isSubscribed: false,
    subscriptionEndDate: null,
  });

  const [favoriteStocks, setFavoriteStocks] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(0);
  const [likedPostsPage, setLikedPostsPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myPostsTotalPages, setMyPostsTotalPages] = useState(0);
  const [likedPostsTotalPages, setLikedPostsTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState('myPosts'); // 'myPosts' 또는 'likedPosts'

  // WebSocket 연결 관리
  const webSocketRefs = useRef({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const email = localStorage.getItem('X-Auth-User');
        const nickname = await boardApi.getNickname(email);
        const isSubscribed = await authApi.checkSubscriptionStatus();
        
        setUserInfo(prev => ({
          ...prev,
          email: email || '',
          nickname: nickname || '',
          isSubscribed: isSubscribed
        }));

        // 관심종목 데이터 가져오기
        const watchlist = await assetApi.getFavoriteStocks();
        
        // 관심종목 상세 정보 가져오기
        if (watchlist && watchlist.length > 0) {
          const stockDetails = await Promise.all(
            watchlist.map(async (symbol) => {
              try {
                const stockData = await assetApi.getStockDetail(symbol);
                return stockData;
              } catch (err) {
                console.error(`❌ ${symbol} 종목 정보 가져오기 실패:`, err);
                return {
                  symbol: symbol,
                  koreanName: symbol,
                  englishName: symbol,
                  price: null,
                  changeRate: null
                };
              }
            })
          );
          
          setFavoriteStocks(stockDetails);
          
          // 실시간 가격 업데이트를 위한 WebSocket 연결
          setupWebSocketConnections(stockDetails);
        } else {
          setFavoriteStocks([]);
        }

        // 내가 쓴 글 가져오기
        const postsData = await boardApi.getMyPosts(postsPage);
        setMyPosts(postsData.content);
        setMyPostsTotalPages(postsData.totalPages);

        // 좋아요한 글 가져오기
        const likedPostsData = await boardApi.getMyLikedPosts(likedPostsPage);
        setLikedPosts(likedPostsData.content);
        setLikedPostsTotalPages(likedPostsData.totalPages);

        setError(null);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    
    // 컴포넌트 언마운트 시 WebSocket 연결 해제
    return () => {
      clearWebSocketConnections();
    };
  }, [postsPage, likedPostsPage]);
  
  // WebSocket 연결 설정
  const setupWebSocketConnections = (stocks) => {
    // 기존 연결 해제
    clearWebSocketConnections();
    
    // 최대 연결 수 제한 (성능 고려)
    const maxConnections = 10;
    const priorityStocks = stocks.slice(0, maxConnections);
    
    priorityStocks.forEach(stock => {
      if (!stock || !stock.symbol) return;
      
      const connection = assetApi.subscribeToStockPrice(
        stock.symbol,
        (data) => updateStockPrice(stock.symbol, data)
      );
      
      webSocketRefs.current[stock.symbol] = connection;
    });
  };
  
  // WebSocket 연결 해제
  const clearWebSocketConnections = () => {
    Object.values(webSocketRefs.current).forEach(connection => {
      if (connection && connection.close) {
        connection.close();
      }
    });
    webSocketRefs.current = {};
  };
  
  // 실시간 가격 업데이트 처리
  const updateStockPrice = (symbol, data) => {
    setFavoriteStocks(prevStocks => 
      prevStocks.map(stock => 
        stock.symbol === symbol 
          ? { 
              ...stock, 
              price: data.price, 
              changeRate: data.changeRate 
            }
          : stock
      )
    );
  };

  // 암호화폐 통화 기호 판별 함수
  const getCryptoSymbol = (symbol) => {
    if (!symbol || !symbol.includes('-')) return '';
    
    // KRW-BTC와 같은 형식에서 KRW 부분 추출
    const baseCurrency = symbol.split('-')[0];
    
    // KRW가 포함되면 원화, 아니면 달러 반환
    return baseCurrency === 'KRW' ? '원' : '$';
  };

  const handleSubscribe = async () => {
    try {
      const response = await authApi.processSubscription();
      if (response === "구독 처리가 완료되었습니다.") {
        setUserInfo(prev => ({
          ...prev,
          isSubscribed: true,
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));
        alert('구독이 완료되었습니다!');
      }
    } catch (error) {
      console.error('Subscribe Error:', error);
      alert('구독 처리 중 오류가 발생했습니다.');
    }
  };

  // 구독 취소 핸들러
  const handleUnsubscribe = async () => {
    try {
      const response = await authApi.cancelSubscription();
      if (response === "구독 취소가 완료되었습니다.") {
        setUserInfo(prev => ({
          ...prev,
          isSubscribed: false,
          subscriptionEndDate: null
        }));
        alert('구독이 취소되었습니다.');
      }
    } catch (error) {
      console.error('Unsubscribe Error:', error);
      alert('구독 취소 중 오류가 발생했습니다.');
    }
  };

  // 게시글 클릭 핸들러
  const handlePostClick = (assetId, postId) => {
    navigate(`/assets/${assetId}/posts/${postId}`);
  };

  // 종목 상세 페이지로 이동
  const handleStockClick = (symbol) => {
    navigate(`/assets/${symbol}`);
  };

  // 해외주식 판별 함수
  const isOverseasStock = (symbol) => {
    if (!symbol) return false;
    if (/^\d+$/.test(symbol)) return false;
    if (symbol.includes('-')) return false;
    return true;
  };

  // 암호화폐 판별 함수
  const isCryptoStock = (symbol) => {
    return symbol && symbol.includes('-');
  };
  
  // 가격 포맷팅 함수
  const formatPrice = (price, symbol) => {
    if (price === null || price === undefined) return '로딩중...';
    
    const numericPrice = parseFloat(price);
    
    if (isOverseasStock(symbol)) {
      return `$${numericPrice.toLocaleString()}`;
    } else if (isCryptoStock(symbol)) {
      const currencySymbol = getCryptoSymbol(symbol);
      return currencySymbol === '원'
        ? `${numericPrice.toLocaleString()}원`
        : `$${numericPrice.toLocaleString()}`;
    } else {
      return `${numericPrice.toLocaleString()}원`;
    }
  };
  
  // 변동률 포맷팅 함수
  const formatChangeRate = (changeRate, symbol) => {
    if (changeRate === null || changeRate === undefined) return '-';
    
    const numericRate = parseFloat(changeRate);
    const formattedRate = isCryptoStock(symbol)
      ? (numericRate * 100).toFixed(2) // 암호화폐는 100 곱해서 표시
      : numericRate.toFixed(2);
    
    return `${formattedRate}%`;
  };

  // 게시글 목록 렌더링
  const renderPosts = (posts, title, currentPage, totalPages, setPage) => (
    <div className="list-group list-group-flush">
      <h5 className="mb-3">{title}</h5>
      {posts.map(post => (
        <div 
          key={post.id} 
          className="list-group-item bg-dark border-secondary cursor-pointer"
          onClick={() => handlePostClick(post.assetId, post.id)}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-1 text-light">{post.title}</h6>
            <small className="text-secondary">
              {new Date(post.createdAt).toLocaleDateString()}
            </small>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-secondary">
              조회 {post.viewCount} · 좋아요 {post.likeCount}
            </small>
          </div>
        </div>
      ))}
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
              <button
                className="page-link bg-dark text-light"
                onClick={() => setPage(prev => prev - 1)}
                disabled={currentPage === 0}
              >
                이전
              </button>
            </li>
            {[...Array(totalPages)].map((_, index) => (
              <li key={index} className={`page-item ${currentPage === index ? 'active' : ''}`}>
                <button
                  className="page-link bg-dark text-light"
                  onClick={() => setPage(index)}
                >
                  {index + 1}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}>
              <button
                className="page-link bg-dark text-light"
                onClick={() => setPage(prev => prev + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                다음
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );

  // 관심종목 제거 핸들러
  const handleRemoveFavorite = async (symbol) => {
    try {
      await assetApi.removeFavoriteStock(symbol);
      setFavoriteStocks(prev => prev.filter(stock => stock.symbol !== symbol));
      alert(`${symbol} 종목이 관심 목록에서 제거되었습니다.`);
    } catch (err) {
      console.error(`❌ 관심 종목 제거 실패 (${symbol}):`, err);
      alert('관심 종목 제거에 실패했습니다.');
    }
  };

  if (loading) return (
    <div className="container mt-5 text-center text-light">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-2">데이터를 불러오는 중...</p>
    </div>
  );
  
  if (error) return (
    <div className="container mt-5">
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    </div>
  );

  return (
    <div className="container mt-5">
      <div className="row">
        {/* 왼쪽 사이드바 - 사용자 정보 및 구독 */}
        <div className="col-md-4">
          <div className="card bg-dark text-light mb-4">
            <div className="card-header bg-dark border-secondary">
              <h4 className="mb-0">내 정보</h4>
            </div>
            <div className="card-body">
              <h5 className="mb-3">{userInfo.nickname}</h5>
              <p className="text-secondary mb-2">
                <i className="bi bi-envelope me-2"></i>
                {userInfo.email}
              </p>
              <div className="mb-3">
                <span className={`badge ${userInfo.isSubscribed ? 'bg-success' : 'bg-secondary'}`}>
                  {userInfo.isSubscribed ? '구독중' : '미구독'}
                </span>
              </div>
              {userInfo.isSubscribed && userInfo.subscriptionEndDate && (
                <p className="text-secondary">
                  구독 만료일: {new Date(userInfo.subscriptionEndDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* 구독 버튼 섹션 */}
          <div className="card bg-dark text-light">
            <div className="card-header bg-dark border-secondary">
              <h4 className="mb-0">구독 상태</h4>
            </div>
            <div className="card-body">
              {userInfo.isSubscribed ? (
                <>
                  <p className="text-success mb-3">현재 구독 중입니다</p>
                  <button 
                    className="btn btn-danger w-100"
                    onClick={handleUnsubscribe}
                  >
                    구독 취소하기
                  </button>
                </>
              ) : (
                <>
                  <p className="card-text text-secondary">
                    - 모든 광고 제거<br />
                    - 종목 분석 데이터 제공<br />
                    - 알림 설정 무제한
                  </p>
                  <h4 className="mb-3 text-primary">월 9,900원</h4>
                  <button 
                    className="btn btn-primary w-100"
                    onClick={handleSubscribe}
                  >
                    구독하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 메인 컨텐츠 */}
        <div className="col-md-8">
          {/* 관심 종목 */}
          <div className="card bg-dark text-light mb-4">
            <div className="card-header bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h4 className="mb-0">관심 종목</h4>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => navigate('/assets')}
              >
                종목 더보기
              </button>
            </div>
            <div className="card-body p-0">
              {favoriteStocks.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-hover mb-0">
                    <thead>
                      <tr>
                        <th>종목명</th>
                        <th>현재가</th>
                        <th>등락률</th>
                        <th className="text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {favoriteStocks.map((stock) => (
                        <tr key={stock.symbol} style={{ cursor: 'pointer' }}>
                          <td onClick={() => handleStockClick(stock.symbol)}>
                            {stock.koreanName || stock.englishName || stock.symbol}
                          </td>
                          <td onClick={() => handleStockClick(stock.symbol)}>
                            {formatPrice(stock.price, stock.symbol)}
                          </td>
                          <td 
                            className={parseFloat(stock.changeRate) >= 0 ? 'text-success' : 'text-danger'}
                            onClick={() => handleStockClick(stock.symbol)}
                          >
                            {formatChangeRate(stock.changeRate, stock.symbol)}
                          </td>
                          <td className="text-center">
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFavorite(stock.symbol);
                              }}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-secondary mb-2">관심 종목이 없습니다.</p>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => navigate('/assets')}
                  >
                    종목 둘러보기
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 게시글 목록 카드 */}
          <div className="card bg-dark text-light">
            <div className="card-header bg-dark border-secondary">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'myPosts' ? 'active text-light' : 'text-secondary'}`}
                    onClick={() => setActiveTab('myPosts')}
                    style={{ backgroundColor: activeTab === 'myPosts' ? '#343a40' : 'transparent', border: 'none' }}
                  >
                    내가 쓴 글
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'likedPosts' ? 'active text-light' : 'text-secondary'}`}
                    onClick={() => setActiveTab('likedPosts')}
                    style={{ backgroundColor: activeTab === 'likedPosts' ? '#343a40' : 'transparent', border: 'none' }}
                  >
                    좋아요한 글
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === 'myPosts' ? (
                myPosts.length > 0 ? (
                  renderPosts(myPosts, '내가 쓴 글', postsPage, myPostsTotalPages, setPostsPage)
                ) : (
                  <div className="text-center p-4">
                    <p className="text-secondary mb-0">작성한 글이 없습니다.</p>
                  </div>
                )
              ) : (
                likedPosts.length > 0 ? (
                  renderPosts(likedPosts, '좋아요한 글', likedPostsPage, likedPostsTotalPages, setLikedPostsPage)
                ) : (
                  <div className="text-center p-4">
                    <p className="text-secondary mb-0">좋아요한 글이 없습니다.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default User;