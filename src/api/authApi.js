import axios from 'axios';

const BASE_URL = 'http://34.210.11.121:8080';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 50000,  // 다시 5초로 변경
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const authApi = {
  // 회원가입
  register: async (userData) => {
    try {
      console.log('Request Data:', userData);
      const response = await axiosInstance.post('/user/signup', userData);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error('Error Response:', error.response.data);
      }
      throw error;
    }
  },

  // 로그인
  login: async (credentials) => {
    try {
      const response = await axiosInstance.post('/auth/login', credentials);
      
      if (response.data === "로그인 성공") {
        // 변경된 헤더 이름으로 토큰 가져오기
        const accessToken = response.headers['accesstoken'];
        const refreshToken = response.headers['refreshtoken'];
        const authUser = response.headers['x-auth-user'];
        
        console.log('Response Headers:', {
          accessToken,
          refreshToken,
          authUser
        });

        // localStorage에 저장
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        if (authUser) {
          localStorage.setItem('X-Auth-User', authUser);
        }

        // 저장된 값 확인
        console.log('Stored values:', {
          accessToken: localStorage.getItem('accessToken'),
          refreshToken: localStorage.getItem('refreshToken'),
          authUser: localStorage.getItem('X-Auth-User')
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      const response = await axiosInstance.post('/auth/logout', null, {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      
      // 로그아웃 성공 시 저장된 정보 삭제
      localStorage.removeItem('X-Auth-User');
      localStorage.removeItem('accessToken');
      
      return response.data;
    } catch (error) {
      console.error('Logout Error:', error);
      throw error;
    }
  },

  // 로그인 상태 확인
  checkLoginStatus: async () => {
    try {
      const response = await axiosInstance.get('/auth/status', {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      return response.data;
    } catch (error) {
      console.error('Check Login Status Error:', error);
      throw error;
    }
  },

  // 광고 표시 여부 확인
  checkAdsShow: async () => {
    try {
      const response = await axiosInstance.get('/api/ads/show', {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      return response.data;
    } catch (error) {
      console.error('Check Ads Show Error:', error);
      return true; // 에러 시 기본적으로 광고 표시
    }
  },

  // 팝업 광고 정보 가져오기
  getPopupAd: async () => {
    try {
      const response = await axiosInstance.get('/api/ads/popup', {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      return response.data;
    } catch (error) {
      console.error('Get Popup Ad Error:', error);
      return null;
    }
  },

  // 구독 처리
  processSubscription: async () => {
    try {
      const response = await axiosInstance.post('/api/subscription/subscribe', null, {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      return response.data;
    } catch (error) {
      console.error('Subscription Error:', error);
      throw error;
    }
  },

  // 구독 상태 확인
  checkSubscriptionStatus: async () => {
    try {
      const response = await axiosInstance.get('/api/subscription/status', {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      return response.data;
    } catch (error) {
      console.error('Check Subscription Status Error:', error);
      return false; // 에러 시 기본적으로 미구독 상태 반환
    }
  },

  // 구독 취소
  cancelSubscription: async () => {
    try {
      const response = await axiosInstance.post('/api/subscription/unsubscribe', null, {
        headers: {
          'X-Auth-User': localStorage.getItem('X-Auth-User'),
          'Authorization': localStorage.getItem('accessToken')
        }
      });
      return response.data;
    } catch (error) {
      console.error('Cancel Subscription Error:', error);
      throw error;
    }
  }
};

// axios 인터셉터 수정
axiosInstance.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem('accessToken');
    const authUser = localStorage.getItem('X-Auth-User');
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

// 응답 인터셉터 추가
axiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('X-Auth-User');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default authApi; 