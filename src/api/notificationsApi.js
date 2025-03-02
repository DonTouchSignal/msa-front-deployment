import axios from 'axios';

const BASE_URL = 'http://34.210.11.121:8080'; // 알림 서비스 포트로 변경

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// 요청 인터셉터 - 인증 헤더 추가
axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('accessToken'); // JWT 토큰 저장소에서 가져오기
        const userEmail = localStorage.getItem('X-Auth-User'); // X-Auth-User 값 가져오기

        if (token) {
            config.headers['Authorization'] = `${token}`; // ✅ JWT 토큰 추가
        }
        if (userEmail) {
            config.headers['X-Auth-User'] = userEmail; // ✅ X-Auth-User 추가
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 알림 API
const notificationApi = {
    fetchNotifications: async (userEmail) => {
        if (!userEmail) {
            console.error("❌ API 요청 실패: userEmail이 undefined입니다.");
            return;
        }
        try {
            const response = await axiosInstance.get(`/alert`, { // ✅ URL 수정
                headers: { 'X-Auth-User': userEmail }
            });
            return response.data;
        } catch (error) {
            console.error("❌ 알림 목록 조회 실패:", error);
            throw error;
        }
    },

    // 단일 알림 삭제
    deleteNotification: async (notificationId, userEmail) => {
        if (!notificationId) {
            console.error("❌ 알림 삭제 요청 실패: notificationId가 undefined입니다.");
            return;
        }
    
        try {
            const response = await axiosInstance.delete(`/alert/${notificationId}`, {
                headers: { 'X-Auth-User': userEmail }
            });
            return response.data;
        } catch (error) {
            console.error(`❌ 알림 삭제 실패 (ID: ${notificationId}):`, error);
            throw error;
        }
    },
    

    // 모든 알림 삭제
    deleteAllNotifications: async (userEmail) => {
        try {
            const response = await axiosInstance.delete('/alert', {
                headers: {
                    'X-Auth-User': userEmail
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ 모든 알림 삭제 실패:', error);
            throw error;
        }
    },

    // WebSocket 연결
    connectToNotifications: (userEmail, onMessage) => {
        if (!userEmail) {
            console.error('❌ WebSocket 연결 실패: 사용자 이메일 없음');
            return null;
        }

        const ws = new WebSocket(`ws://${BASE_URL.replace('http://', '')}/ws/alerts?email=${userEmail}`);
        
        ws.onopen = () => {
            console.log('✅ 알림 WebSocket 연결 성공');
        };
        
        ws.onmessage = (event) => {
            onMessage(event.data);
        };
        
        ws.onerror = (error) => {
            console.error('❌ WebSocket 오류:', error);
        };
        
        ws.onclose = () => {
            console.log('🚪 WebSocket 연결 종료');
        };
        
        return {
            socket: ws,
            close: () => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }
        };
    }
};

export default notificationApi;