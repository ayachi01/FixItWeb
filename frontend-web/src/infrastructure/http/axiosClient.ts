import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8000/api", // Django backend
});

axiosClient.interceptors.request.use((config) => {
  const user = localStorage.getItem("user");
  if (user) {
    const token = JSON.parse(user).accessToken;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
