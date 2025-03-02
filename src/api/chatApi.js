import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const BASE_URL = 'http://34.210.11.121:8080';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 요청 인터셉터 추가
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

class ChatApi {
  constructor() {
    this.stompClient = null;
    this.messageCallbacks = [];
    this.isConnecting = false;
  }

  // 전체 메시지 조회
  getAllMessages = async () => {
    try {
      const response = await axiosInstance.get('/chat/all');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  }

  // WebSocket 연결
  connectWebSocket = (onConnect, onError) => {
    const accessToken = localStorage.getItem('accessToken');
    const authUser = localStorage.getItem('X-Auth-User');

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
      debug: function (str) {
        console.log('STOMP:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        'Authorization': accessToken || 'null',
        'X-Auth-User': authUser || 'null'
      }
    });

    client.onConnect = () => {
      this.stompClient = client;
      
      client.subscribe('/topic/messages', (message) => {
        const receivedMessage = JSON.parse(message.body);
        this.messageCallbacks.forEach(callback => callback(receivedMessage));
      });

      if (onConnect) onConnect();
    };

    client.onStompError = (frame) => {
      console.error('STOMP Error:', frame);
      if (onError) onError(frame);
    };

    client.activate();
    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }

  // 메시지 수신 콜백 등록
  onMessage = (callback) => {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  // 메시지 전송
  sendMessage = async (message) => {
    if (!this.stompClient?.active) return;

    const authUser = localStorage.getItem('X-Auth-User');
    const accessToken = localStorage.getItem('accessToken');
    
    const messageData = {
      message: message,
      guest: !authUser,  // 로그인하지 않은 경우 true
      nickName: authUser ? null : 'Guest',  // 로그인하지 않은 경우 'Guest'로 설정
      sendAt: new Date().toLocaleString('sv').replace(' ', 'T') + '.000Z'
    };

    this.stompClient.publish({
      destination: '/app/message',
      body: JSON.stringify(messageData),
      headers: {
        'Authorization': accessToken || 'null',
        'X-Auth-User': authUser || 'null'
      }
    });

    return messageData;
  }
}

export default new ChatApi();