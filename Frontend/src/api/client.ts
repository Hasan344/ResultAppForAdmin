import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err.response?.data?.detail ??
      err.response?.data?.title ??
      err.message ?? "Naməlum xəta";
    console.error("API error:", msg);
    return Promise.reject(err);
  }
);
