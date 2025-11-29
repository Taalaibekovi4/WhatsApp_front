// Узкоспециализированные клиенты для auth
import axios from "axios";

const ROOT = "https://testosh.pythonanywhere.com/";

// Публичные запросы (без Authorization): register, login, refresh и т.п.
export const publicHttp = axios.create({
  baseURL: ROOT,
  timeout: 20000,
});

// Приватные запросы (с токеном)
export const privateHttp = axios.create({
  baseURL: ROOT,
  timeout: 20000,
});

privateHttp.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ===== API =====
export const apiLogin = (username, password) =>
  publicHttp.post("login/", { username, password });

export const apiRegister = ({ username, password, role, email }) =>
  publicHttp.post("register/", { username, password, role, email });

export const apiProfile = () => privateHttp.get("profile/");
