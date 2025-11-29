// axios API для заметок
import axios from "axios";

const BASE_URL = "https://testosh.pythonanywhere.com/";
const PATH = "api/notes/";

const notesApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

notesApi.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const listNotes   = () => notesApi.get(PATH);
export const createNote  = (payload) => notesApi.post(PATH, payload);
export const updateNote  = (id, payload) => notesApi.put(`${PATH}${id}/`, payload);
export const deleteNote  = (id) => notesApi.delete(`${PATH}${id}/`);

export default notesApi;
