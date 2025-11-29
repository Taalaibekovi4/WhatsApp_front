import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiLogin, apiProfile, apiRegister } from "../Api/auth";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: "",

      clearError: () => set({ error: "" }),

      login: async (username, password) => {
        set({ loading: true, error: "" });
        try {
          const { data } = await apiLogin(username, password);
          const access = data?.access;
          const refresh = data?.refresh;
          if (access) localStorage.setItem("access", access);
          if (refresh) localStorage.setItem("refresh", refresh);

          const me = await apiProfile();
          const user = me.data;

          localStorage.setItem("manager_name", user?.username ?? "");
          localStorage.setItem("role", user?.role ?? "");
          

          set({ user, loading: false });
          return true;
        } catch (e) {
          const msg =
            e?.response?.status === 401
              ? "Неверное имя пользователя или пароль."
              : (e?.response?.data && JSON.stringify(e.response.data)) ||
                "Ошибка подключения к серверу.";
          set({ error: msg, loading: false });
          return false;
        }
      },

      register: async (payload) => {
        set({ loading: true, error: "" });
        try {
          // как раньше, бэкенд ожидает email — подставляем дефолт, если его нет в форме
          const body = {
            email: payload.email || "abytov247@gmail.com",
            ...payload,
          };
          await apiRegister(body);
          set({ loading: false });
          return { ok: true };
        } catch (e) {
          let errors = ["Ошибка регистрации."];
          const data = e?.response?.data;
          if (data && typeof data === "object") {
            try {
              errors = Object.values(data).flat().map(String);
            } catch {
              errors = [JSON.stringify(data)];
            }
          } else if (e?.message) {
            errors = [String(e.message)];
          }
          set({ error: errors.join("\n"), loading: false });
          return { ok: false, error: errors };
        }
      },

      logout: () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("manager_name");
        localStorage.removeItem("role");
        set({ user: null });
      },
    }),
    { name: "auth_store" }
  )
);
