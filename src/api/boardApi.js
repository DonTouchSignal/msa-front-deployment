import axios from 'axios';

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

// 요청 인터셉터
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

// 응답 인터셉터
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

const boardApi = {
  // 게시글 관련 API
  getPosts: async (assetId, page = 0, size = 10) => {
    try {
      const response = await axiosInstance.get(`/api/assets/${assetId}/posts`, {
        params: { page, size }
      });
      return response.data;
    } catch (error) {
      console.error('getPosts Error:', error);
      throw error;
    }
  },

  getPost: async (assetId, postId) => {
    try {
      const response = await axiosInstance.get(`/api/assets/${assetId}/posts/${postId}`);
      const post = response.data;
      
      // 현재 사용자의 좋아요 여부 확인
      try {
        const likeStatus = await boardApi.getLikeStatus(assetId, postId);
        post.isLiked = likeStatus;
      } catch (error) {
        console.error('Failed to get like status:', error);
        post.isLiked = false;
      }
      
      return post;
    } catch (error) {
      console.error('getPost Error:', error);
      throw error;
    }
  },

  createPost: async (assetId, postData, imageFile) => {
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await boardApi.uploadImage(imageFile);
      }

      const response = await axiosInstance.post(`/api/assets/${assetId}/posts`, {
        ...postData,
        imageUrl
      });
      return response.data;
    } catch (error) {
      console.error('createPost Error:', error);
      throw error;
    }
  },

  updatePost: async (assetId, postId, postData, imageFile) => {
    try {
      let imageUrl = postData.imageUrl;
      if (imageFile) {
        imageUrl = await boardApi.uploadImage(imageFile);
      }

      const response = await axiosInstance.put(`/api/assets/${assetId}/posts/${postId}`, {
        ...postData,
        imageUrl
      });
      return response.data;
    } catch (error) {
      console.error('updatePost Error:', error);
      throw error;
    }
  },

  deletePost: async (assetId, postId) => {
    await axiosInstance.delete(`/api/assets/${assetId}/posts/${postId}`);
  },

  // 댓글 관련 API
  getComments: async (postId, page = 0, size = 10) => {
    try {
      const response = await axiosInstance.get(`/api/posts/${postId}/comments`, {
        params: {
          page,
          size,
          sort: 'createdAt,desc'
        }
      });
      return response.data;
    } catch (error) {
      console.error('getComments Error:', error);
      throw error;
    }
  },

  createComment: async (postId, commentData) => {
    try {
      const response = await axiosInstance.post(`/api/posts/${postId}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('createComment Error:', error);
      throw error;
    }
  },

  updateComment: async (postId, commentId, commentData) => {
    try {
      const response = await axiosInstance.put(`/api/posts/${postId}/comments/${commentId}`, commentData);
      return response.data;
    } catch (error) {
      console.error('updateComment Error:', error);
      throw error;
    }
  },

  deleteComment: async (postId, commentId) => {
    try {
      await axiosInstance.delete(`/api/posts/${postId}/comments/${commentId}`);
    } catch (error) {
      console.error('deleteComment Error:', error);
      throw error;
    }
  },

  // 좋아요 관련 API
  toggleLike: async (assetId, postId) => {
    const isLiked = await boardApi.getLikeStatus(assetId, postId);
    if (isLiked) {
      await axiosInstance.delete(`/api/assets/${assetId}/posts/${postId}/like`);
    } else {
      await axiosInstance.post(`/api/assets/${assetId}/posts/${postId}/like`);
    }
  },

  getLikeStatus: async (assetId, postId) => {
    const response = await axiosInstance.get(`/api/assets/${assetId}/posts/${postId}/like`);
    return response.data;
  },

  // 현재 로그인한 사용자 정보 가져오기
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get('/user/me');
      return response.data;
    } catch (error) {
      console.error('getCurrentUser Error:', error);
      throw error;
    }
  },

  // 좋아요 등록
  likePost: async (assetId, postId) => {
    try {
      const response = await axiosInstance.post(`/api/assets/${assetId}/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('likePost Error:', error);
      throw error;
    }
  },

  // 좋아요 취소
  unlikePost: async (assetId, postId) => {
    try {
      const response = await axiosInstance.delete(`/api/assets/${assetId}/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('unlikePost Error:', error);
      throw error;
    }
  },

  // 현재 로그인한 사용자와 게시글 작성자가 같은지 확인하는 함수
  isCurrentUserAuthor: (authorEmail) => {
    const currentUserEmail = localStorage.getItem('X-Auth-User');
    return String(currentUserEmail) === String(authorEmail);
  },

  // 내가 작성한 게시글 목록 조회
  getMyPosts: async (page = 0, size = 10) => {
    try {
      const response = await axiosInstance.get('/api/users/me/posts', {
        params: { page, size }
      });
      return response.data;
    } catch (error) {
      console.error('getMyPosts Error:', error);
      throw error;
    }
  },

  // 내가 좋아요한 게시글 목록 조회
  getMyLikedPosts: async (page = 0, size = 10) => {
    try {
      const response = await axiosInstance.get('/api/users/me/liked-posts', {
        params: { page, size }
      });
      return response.data;
    } catch (error) {
      console.error('getMyLikedPosts Error:', error);
      throw error;
    }
  },

  // 닉네임 조회 - 특정 사용자의 닉네임 조회
  getNickname: async (email) => {
    try {
      const response = await axiosInstance.get(`/user/nickname?email=${email}`);
      return response.data;
    } catch (error) {
      console.error('getNickname Error:', error);
      return email; // 에러 시 이메일 반환
    }
  },

  // 이미지 업로드
  uploadImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axiosInstance.post('/api/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data; // S3 URL 반환
    } catch (error) {
      console.error('uploadImage Error:', error);
      throw error;
    }
  },
};

export default boardApi;
