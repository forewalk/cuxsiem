import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Response 인터셉터 - 401 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 유효하지 않음
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      delete api.defaults.headers.common["Authorization"];

      // 로그인 페이지로 리다이렉트는 라우터에서 처리
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
