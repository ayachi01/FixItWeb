import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // Django backend
});

// Attach access token automatically if available,
// except for public (unauthenticated) endpoints
API.interceptors.request.use((config) => {
  const publicEndpoints = ["/student/register/", "/student/verify/"];

  // Check if the request URL contains a public endpoint
  if (!publicEndpoints.some((endpoint) => config.url?.includes(endpoint))) {
    const token = localStorage.getItem("access");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export default API;
