import { create } from "zustand";
import * as api from "../Api/notes";

export const useNotesStore = create((set, get) => ({
  items: [],
  loading: false,
  error: "",
  success: "",

  fetch: async () => {
    set({ loading: true, error: "", success: "" });
    try {
      const { data } = await api.listNotes();
      set({ items: Array.isArray(data) ? data : [], loading: false });
    } catch (e) {
      set({ error: "Ошибка загрузки заметок. Попробуйте позже.", loading: false });
      throw e;
    }
  },

  addOrUpdate: async (note) => {
    set({ loading: true, error: "", success: "" });
    try {
      const payload = { text: note.text, date: note.date, time: note.time };
      const isEdit = Boolean(note.id);
      const { data } = isEdit
        ? await api.updateNote(note.id, payload)
        : await api.createNote(payload);

      const items = get().items;
      set({
        items: isEdit ? items.map((n) => (n.id === note.id ? data : n)) : [data, ...items],
        success: isEdit ? "Заметка обновлена." : "Заметка добавлена.",
        loading: false,
      });
      return { ok: true };
    } catch (e) {
      set({
        error: note.id ? "Ошибка обновления заметки." : "Ошибка добавления заметки.",
        loading: false,
      });
      return { ok: false };
    }
  },

  remove: async (id) => {
    set({ loading: true, error: "", success: "" });
    try {
      await api.deleteNote(id);
      set({
        items: get().items.filter((n) => n.id !== id),
        success: "Заметка удалена.",
        loading: false,
      });
      return { ok: true };
    } catch (e) {
      set({ error: "Ошибка удаления заметки.", loading: false });
      return { ok: false };
    }
  },

  clearStatus: () => set({ error: "", success: "" }),
}));
