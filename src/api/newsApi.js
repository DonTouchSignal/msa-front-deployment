import axios from 'axios';

//수정
const BASE_URL = 'http://34.210.11.121:8080';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  withCredentials: true
  }
});

const cleanTitle = (title) => {
  return title
    .replace(/<\/?b>/g, '')    
    .replace(/&quot;/g, '"') 
    .replace(/&amp;/g, '&')  
    .replace(/&lt;/g, '<')    
    .replace(/&gt;/g, '>')     
};

const newsApi = {
  // 주식 뉴스 검색
  getStockNews: async (stockName) => {
    try {
      const response = await axiosInstance.get('/api/news/stock', {
        params: { name: stockName }
      });
      response.data.items = response.data.items.map(item => ({
        ...item,
        title: cleanTitle(item.title)
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stock news:', error);
      throw error;
    }
  },

  // 암호화폐 뉴스 검색
  getCryptoNews: async (cryptoName) => {
    try {
      const response = await axiosInstance.get('/api/news/crypto', {
        params: { name: cryptoName }
      });
      response.data.items = response.data.items.map(item => ({
        ...item,
        title: cleanTitle(item.title)
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch crypto news:', error);
      throw error;
    }
  }
};

export default newsApi;