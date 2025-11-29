import { create } from "zustand";
import {
  fetchClients as apiFetchClients,
  addClient as apiAddClient,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
} from "../Api/clients";

export const useClientsStore = create((set, get) => ({
  items: [],
  loading: false,
  error: "",

  async load() {
    try {
      set({ loading: true, error: "" });
      const data = await apiFetchClients();
      set({ items: Array.isArray(data) ? data : [], loading: false });
    } catch (e) {
      console.error(e);
      set({ error: "Ошибка загрузки данных.", loading: false });
    }
  },

  async addOne(payload) {
    try {
      set({ error: "" });
      const created = await apiAddClient(payload);
      // если хочешь, чтобы новые клиенты были сверху — можно unshift:
      // set((s) => ({ items: [created, ...s.items] }));
      set((s) => ({ items: [...s.items, created] }));
      return created;
    } catch (e) {
      console.error(e);
      set({ error: "Не удалось создать запись." });
      throw e;
    }
  },

  async updateOne(id, payload) {
    try {
      set({ error: "" });

      // ⚠️ ГЛАВНОЕ ИЗМЕНЕНИЕ: для PUT нужен полный объект
      const current = get().items.find((c) => c.id === id);
      if (!current) {
        throw new Error("Клиент не найден в локальном состоянии.");
      }

      // Мерджим текущие поля и частичный payload
      // и не отправляем поле id (часто read-only на сервере).
      const { id: _omit, ...mergedForPut } = { ...current, ...payload };

      await apiUpdateClient(id, mergedForPut);

      // Обновляем локально тем же merged, чтобы состояние соответствовало серверу
      set((s) => ({
        items: s.items.map((c) => (c.id === id ? { ...c, ...mergedForPut } : c)),
      }));
    } catch (e) {
      console.error(e);
      set({ error: "Не удалось сохранить изменения." });
      throw e;
    }
  },

  async deleteOne(id) {
    try {
      set({ error: "" });
      await apiDeleteClient(id);
      set((s) => ({ items: s.items.filter((c) => c.id !== id) }));
    } catch (e) {
      console.error(e);
      set({ error: "Не удалось удалить запись." });
      throw e;
    }
  },
}));
