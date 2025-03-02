import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import boardApi from '../api/boardApi';
import assetApi from '../api/assetApi'; // 종목 정보를 가져오기 위한 API 추가

function BoardList() {
  const { assetId } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [userNicknames, setUserNicknames] = useState({});
  const [assetInfo, setAssetInfo] = useState(null); // 종목 정보 상태 추가

  useEffect(() => {
    fetchPosts();
    fetchAssetInfo(); // 페이지 로드 시 종목 정보 가져오기
  }, [assetId, page]);

  // 종목 정보를 가져오는 함수
  const fetchAssetInfo = async () => {
    try {
      const response = await assetApi.getStockDetail(assetId);
      if (response && (response.koreanName || response.englishName)) {
        setAssetInfo({
          name: response.koreanName || response.englishName
        });
      } else {
        setAssetInfo({ name: assetId }); // 정보가 없으면 심볼을 이름으로 사용
      }
    } catch (err) {
      console.error('종목 정보 가져오기 실패:', err);
      setAssetInfo({ name: assetId }); // 오류 시 심볼을 이름으로 사용
    }
  };

  useEffect(() => {
    const fetchNicknames = async () => {
      const nicknames = {};
      for (const post of posts) {
        if (!userNicknames[post.userEmail]) {
          const nickname = await boardApi.getNickname(post.userEmail);
          nicknames[post.userEmail] = nickname;
        }
      }
      setUserNicknames(prev => ({ ...prev, ...nicknames }));
    };

    if (posts.length > 0) {
      fetchNicknames();
    }
  }, [posts]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await boardApi.getPosts(assetId, page);
      setPosts(response.content);
      setTotalPages(response.totalPages);
      setError(null);
    } catch (err) {
      setError('게시글을 불러오는데 실패했습니다.');
      console.error('Error fetching posts:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !assetInfo) return (
    <div className="container py-4 text-light">
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="container py-4 text-light">
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    </div>
  );

  return (
    <div className="container py-4">
      {/* 종목명 + 게시판으로 표시 */}
      <h2 className="text-light mb-4">
        {assetInfo ? assetInfo.name : assetId} 게시판
      </h2>
      
      <div className="card bg-dark">
        {/* 나머지 코드는 동일 */}
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-dark table-hover">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>제목</th>
                  <th className="text-center" style={{ width: '15%' }}>작성자</th>
                  <th className="text-center" style={{ width: '25%' }}>작성일시</th>
                  <th className="text-center" style={{ width: '7.5%' }}>조회</th>
                  <th className="text-center" style={{ width: '7.5%' }}>좋아요</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id}>
                    <td>
                      <Link 
                        to={`/assets/${assetId}/posts/${post.id}`} 
                        className="text-light text-decoration-none"
                        style={{ display: 'block' }}
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="text-center">
                      {post.userNickname}
                    </td>
                    <td className="text-center">{new Date(post.createdAt).toLocaleString()}</td>
                    <td className="text-center">{post.viewCount}</td>
                    <td className="text-center">{post.likeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 수정 */}
          <nav className="mt-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                <button 
                  className="page-link bg-dark text-light" 
                  onClick={() => setPage(prev => prev - 1)}
                  disabled={page === 0}
                >
                  이전
                </button>
              </li>
              {[...Array(totalPages)].map((_, index) => (
                <li 
                  key={index} 
                  className={`page-item ${page === index ? 'active' : ''}`}
                >
                  <button
                    className={`page-link ${page === index ? 'bg-primary' : 'bg-dark'} text-light`}
                    onClick={() => setPage(index)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link bg-dark text-light" 
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={page >= totalPages - 1}
                >
                  다음
                </button>
              </li>
            </ul>
          </nav>

          <div className="d-flex justify-content-end mt-3">
            <Link 
              to={`/assets/${assetId}/posts/write`} 
              className="btn btn-primary"
            >
              글쓰기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoardList;