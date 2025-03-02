import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password
      });
      
      if (response === "로그인 성공") {
        // 저장된 값 확인을 위해 약간의 지연 추가
        setTimeout(() => {
          const accessToken = localStorage.getItem('accessToken');
          const refreshToken = localStorage.getItem('refreshToken');
          const authUser = localStorage.getItem('X-Auth-User');
          
          console.log('Final check - Stored values:', {
            accessToken,
            refreshToken,
            authUser
          });

          if (accessToken && authUser) {
            navigate('/');
            window.location.reload();
          } else {
            console.error('Missing auth info:', { accessToken, authUser });
            setError('인증 정보 저장에 실패했습니다.');
          }
        }, 100);
      } else {
        throw new Error('로그인 실패');
      }
    } catch (err) {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
      console.error('Login Error:', err);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card bg-dark text-light">
            <div className="card-body">
              <h2 className="text-center mb-4">로그인</h2>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">이메일</label>
                  <input
                    type="email"
                    className="form-control bg-dark text-light border-secondary"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">비밀번호</label>
                  <input
                    type="password"
                    className="form-control bg-dark text-light border-secondary"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100 mb-3">
                  로그인
                </button>
                <div className="text-center">
                  <Link to="/register" className="text-light">
                    계정이 없으신가요? 회원가입
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 