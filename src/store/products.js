// src/store/products.js
import { create as createZustand } from "zustand";
import {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
} from "../Api/products";

const CACHE_TTL = 60_000; // 1 минута

export const useProductsStore = createZustand((set, get) => ({
  items: [],
  loading: false,
  error: "",
  lastLoaded: 0,

  clearError: () => set({ error: "" }),

  // Загрузка списка (с простым TTL-кэшем)
  load: async (force = false) => {
    const { lastLoaded, loading } = get();
    if (!force && !loading && Date.now() - lastLoaded < CACHE_TTL) return;

    set({ loading: true, error: "" });
    try {
      const data = await fetchProducts();
      set({
        items: Array.isArray(data) ? data : [],
        lastLoaded: Date.now(),
      });
    } catch (e) {
      set({
        error: e?.response?.data?.detail || e.message || "Ошибка загрузки",
      });
    } finally {
      set({ loading: false });
    }
  },

  // === Создание
  add: async (payload) => {
    set({ error: "" });
    try {
      const created = await addProduct(payload);
      set((s) => ({ items: [created, ...s.items] }));
      return { ok: true, data: created };
    } catch (e) {
      set({
        error: e?.response?.data?.detail || e.message || "Ошибка создания",
      });
      return { ok: false, error: e };
    }
  },

  // Алиас под старое имя — чтобы Components могли вызывать create(payload)
  create: async (payload) => get().add(payload),

  /**
   * === Обновление
   * Поддерживает ДВА варианта вызова:
   *  1) update(id, payload)         -> PATCH к API + обновление стора
   *  2) update(updatedObject)       -> локальное обновление стора БЕЗ запроса
   *     (это нужно для случаев, когда API уже вернул обновлённый товар,
   *      например после sellProduct)
   */
  update: async (...args) => {
    set({ error: "" });
    try {
      // Вариант 2: локальный объект
      if (
        args.length === 1 &&
        args[0] &&
        typeof args[0] === "object" &&
        "id" in args[0]
      ) {
        const updated = args[0];
        set((s) => ({
          items: s.items.map((p) =>
            p.id === updated.id ? { ...p, ...updated } : p
          ),
        }));
        return { ok: true, data: updated, local: true };
      }

      // Вариант 1: id + payload -> PATCH
      if (args.length === 2) {
        const [id, payload] = args;
        const updated = await updateProduct(id, payload);
        set((s) => ({
          items: s.items.map((p) => (p.id === updated.id ? updated : p)),
        }));
        return { ok: true, data: updated };
      }

      throw new Error("Неверный вызов update");
    } catch (e) {
      set({
        error: e?.response?.data?.detail || e.message || "Ошибка обновления",
      });
      return { ok: false, error: e };
    }
  },

  // Явный локальный апдейт (если где-то удобнее вызывать напрямую)
  updateLocal: (updated) => {
    if (!updated || typeof updated !== "object") return;
    set((s) => ({
      items: s.items.map((p) =>
        p.id === updated.id ? { ...p, ...updated } : p
      ),
    }));
  },

  // === Удаление
  remove: async (id) => {
    set({ error: "" });
    try {
      await deleteProduct(id);
      set((s) => ({ items: s.items.filter((p) => p.id !== id) }));
      return { ok: true };
    } catch (e) {
      set({
        error: e?.response?.data?.detail || e.message || "Ошибка удаления",
      });
      return { ok: false, error: e };
    }
  },

  // === Продажа (API + синхронизация стора)
  sell: async (id, price_selling, date_selling, count) => {
    set({ error: "" });
    try {
      const updated = await sellProduct(id, price_selling, date_selling, count);
      set((s) => ({
        items: s.items.map((p) => (p.id === updated.id ? updated : p)),
      }));
      return { ok: true, data: updated };
    } catch (e) {
      set({
        error: e?.response?.data?.detail || e.message || "Ошибка продажи",
      });
      return { ok: false, error: e };
    }
  },
}));
