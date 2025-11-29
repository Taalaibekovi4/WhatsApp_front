// axios API для /api/clients с авто-рефрешем JWT (без новых файлов)
import axios from "axios";

const BASE_URL = "https://testosh.pythonanywhere.com/api";
const REFRESH_URL = `${BASE_URL}/token/refresh/`;

const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (e) => Promise.reject(e)
);

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config || {};
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!refresh) throw error;

      const { data } = await axios.post(REFRESH_URL, { refresh });
      if (!data?.access) throw error;

      localStorage.setItem(ACCESS_KEY, data.access);
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return http(originalRequest);
    } catch (e) {
      return Promise.reject(e);
    }
  }
);

const unwrap = (p) =>
  p.then((r) => r?.data).catch((e) => {
    const msg = e?.response?.data?.detail || e?.response?.data?.message || e.message || "Request error";
    throw new Error(msg);
  });

// endpoints
export const fetchClients = (params = {}) => unwrap(http.get("/clients/", { params }));
export const addClient    = (payload)     => unwrap(http.post("/clients/", payload));
export const updateClient = (id, payload) => unwrap(http.put(`/clients/${id}/`, payload));
export const deleteClient = (id)          => unwrap(http.delete(`/clients/${id}/`));
