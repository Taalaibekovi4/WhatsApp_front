import { create } from "zustand";
import { apiFetchUsers, apiUpdateUser, apiDeleteUser } from "../Api/users";

const TTL_MS = 60_000;

export const useUsersStore = create((set, get) => ({
  users: [],
  loading: false,
  error: "",
  _lastFetch: 0,

  clearError: () => set({ error: "" }),

  load: async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && now - get()._lastFetch < TTL_MS && get().users.length) return;
    set({ loading: true, error: "" });
    try {
      const { data } = await apiFetchUsers();
      set({ users: Array.isArray(data) ? data : [], _lastFetch: now, loading: false });
    } catch (e) {
      set({
        error: `Ошибка загрузки пользователей: ${e?.response?.data?.detail || e.message}`,
        loading: false,
      });
    }
  },

  update: async (id, payload) => {
    set({ loading: true, error: "" });
    try {
      const { data } = await apiUpdateUser(id, payload);
      const next = get().users.map((u) => (u.id === id ? data : u));
      set({ users: next, loading: false });
      return { ok: true, data };
    } catch (e) {
      set({
        error: `Ошибка при обновлении пользователя: ${e?.response?.data?.detail || e.message}`,
        loading: false,
      });
      return { ok: false };
    }
  },

  remove: async (id) => {
    set({ loading: true, error: "" });
    try {
      await apiDeleteUser(id);
      set({ users: get().users.filter((u) => u.id !== id), loading: false });
      return { ok: true };
    } catch (e) {
      set({
        error: `Ошибка при удалении пользователя: ${e?.response?.data?.detail || e.message}`,
        loading: false,
      });
      return { ok: false };
    }
  },
}));
