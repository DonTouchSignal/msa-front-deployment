import axios from 'axios';

const BASE_URL = 'http://34.210.11.121:8088/user';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});


const userApi = {
  // 관심 종목
  getFavoriteStocks: async (email) => {
    try {
      const response = await axiosInstance.get('/favoritestocks', {
        params: { email:email }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch favoritestocks:', error);
      throw error;
    }
  },

  // 내가 쓴 글
  getMyPosts: async (email) => {
    try {
      const response = await axiosInstance.get('/myposts', {
        params: { email:email }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch myposts:', error);
      throw error;
    }
  },
  // 내가 쓴 댓글
  getMyComments: async (email) => {
    try {
      const response = await axiosInstance.get('/mycomments', {
        params: { email:email }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch mycomments:', error);
      throw error;
    }
  },
};

export default userApi;