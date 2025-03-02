import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import boardApi from '../api/boardApi';

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [userNickname, setUserNickname] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const authUser = localStorage.getItem('X-Auth-User');
      
      if (accessToken && authUser) {
        setIsLoggedIn(true);
        setUsername(authUser);
        try {
          const nickname = await boardApi.getNickname();
          if (nickname) {
            setUserNickname(nickname);
          }
        } catch (error) {
          console.error('Error fetching nickname:', error);
        }
      } else {
        setIsLoggedIn(false);
        setUsername('');
        setUserNickname('');
      }
      setLoading(false);
    };

    checkLoginStatus();
  }, []);

  const handleLogout = () => {
    // 로그아웃 시 localStorage의 인증 정보 삭제
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('X-Auth-User');
    
    setIsLoggedIn(false);
    setUsername('');
    setUserNickname('');
    
    // 홈페이지로 이동
    window.location.href = '/';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary">
      <div className="container">
        {/* 로고와 메인 네비게이션 */}
        <div className="d-flex align-items-center">
          <Link className="navbar-brand me-4" to="/">돈 터치</Link>
          <ul className="navbar-nav me-auto mb-0">
            <li className="nav-item">
              <Link className="nav-link" to="/assets?category=domestic">국내주식</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/assets?category=overseas">해외주식</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/assets?category=crypto">암호화폐</Link>
            </li>
          </ul>
        </div>

        {/* 모바일 토글 버튼 */}
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarAuth"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* 인증 관련 네비게이션 */}
        <div className="collapse navbar-collapse" id="navbarAuth">
          <ul className="navbar-nav ms-auto align-items-center">
            {isLoggedIn && (
              <li className="nav-item me-3">
                <Link to="/notifications" className="nav-link position-relative">
                  <FaBell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
              </li>
            )}
            {isLoggedIn ? (
              <>
                <li className="nav-item">
                  {loading ? (
                    <span className="nav-link">로딩중...</span>
                  ) : (
                    <span className="nav-link">
                      <span className="text-light">{userNickname}</span>님 환영합니다
                    </span>
                  )}
                </li>
                <li className="nav-item">
                  <Link to={`/users/${username}`} 
                    className="btn btn-outline-light ms-2">
                    마이페이지
                  </Link>
                </li>
                <li className="nav-item">
                  <button 
                    className="btn btn-outline-light ms-2"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">로그인</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-outline-light ms-2" to="/register">
                    회원가입
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 