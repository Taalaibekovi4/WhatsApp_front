// Отдельный axios для /api/users с авто-рефрешем JWT
import axios from "axios";

const BASE_URL = "https://testosh.pythonanywhere.com/api";
const REFRESH_URL = `${BASE_URL}/token/refresh/`;

const usersApi = axios.create({ baseURL: BASE_URL, timeout: 15000 });

usersApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

usersApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config || {};
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) throw new Error("No refresh token");
        const { data } = await axios.post(REFRESH_URL, { refresh });
        localStorage.setItem("access", data.access);
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${data.access}`,
        };
        return usersApi(originalRequest);
      } catch (e) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        // редирект на вход
        window.location.href = "/admin";
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export const apiFetchUsers  = () => usersApi.get("/users/");
export const apiUpdateUser  = (id, { username, role }) =>
  usersApi.put(`/users/${id}/`, { username, role });
export const apiDeleteUser  = (id) => usersApi.delete(`/users/${id}/`);

export default usersApi;
