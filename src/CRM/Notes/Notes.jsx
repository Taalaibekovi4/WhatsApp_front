import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaPlus, FaEdit, FaTrash, FaRegCalendarAlt, FaRegClock } from "react-icons/fa";
import "./Notes.scss";
import { useNotesStore } from "../../store/notes";

const STATUS_OPTIONS = [
  { value: "all", label: "Все заметки" },
  { value: "active", label: "Активные" },
  { value: "done", label: "Выполненные" },
];

const normalize = (s) => String(s ?? "").trim();

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const Notes = () => {
  const { items, loading, error, success, fetch, addOrUpdate, remove, clearStatus } = useNotesStore();

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [note, setNote] = useState({ id: null, text: "", date: todayISO(), time: "", done: false });

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, text: "" });

  const loadNotes = useCallback(async () => { await fetch(); }, [fetch]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => { setNotes(items.map((n) => ({ done: false, ...n }))); }, [items]);

  const filtered = useMemo(() => {
    return notes
      .filter((n) => {
        const q = search.trim().toLowerCase();
        if (q && !String(n.text || "").toLowerCase().includes(q)) return false;
        if (statusFilter === "active") return !n.done;
        if (statusFilter === "done") return n.done;
        return true;
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });
  }, [notes, search, statusFilter]);

  const total = notes.length;
  const activeCount = notes.filter((n) => !n.done).length;
  const doneCount = notes.filter((n) => n.done).length;

  const openCreateModal = () => {
    clearStatus();
    setModalError("");
    setNote({ id: null, text: "", date: todayISO(), time: "", done: false });
    setIsModalOpen(true);
  };

  const openEditModal = (n) => {
    clearStatus();
    setModalError("");
    setNote({ id: n.id, text: n.text || "", date: n.date || todayISO(), time: n.time || "", done: Boolean(n.done) });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setModalError(""); };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalError("");
    setNote((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (n) => {
    if (!normalize(n.text)) return "Опишите задачу.";
    if (normalize(n.text).length < 3) return "Описание слишком короткое.";
    if (!normalize(n.date)) return "Укажите дату создания.";
    if (!normalize(n.time)) return "Укажите дату выполнения.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearStatus();
    const err = validate(note);
    if (err) { setModalError(err); return; }
    const res = await addOrUpdate(note);
    if (res?.ok) closeModal();
  };

  const toggleDone = async (n) => {
    clearStatus();
    const updated = { ...n, done: !n.done };
    const res = await addOrUpdate(updated);
    if (res?.ok) setNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
  };

  const openDelete = (n) => { clearStatus(); setDeleteModal({ open: true, id: n.id, text: n.text || "" }); };
  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    const res = await remove(deleteModal.id);
    if (res?.ok) setDeleteModal({ open: false, id: null, text: "" });
  };

  return (
    <div className="notes">
      <h2 className="notes__page-title">Заметки</h2>

      <div className="notes__card">
        <div className="notes__head">
          <div>
            <h3 className="notes__head-title">Управление заметками</h3>
            <div className="notes__head-stats">
              <span>Всего: {total}</span>
              <span className="notes__head-stat notes__head-stat--active">Активных: {activeCount}</span>
              <span className="notes__head-stat notes__head-stat--done">Выполнено: {doneCount}</span>
            </div>
          </div>
          <button type="button" className="notes__add" onClick={openCreateModal} disabled={loading}>
            <FaPlus /> Добавить заметку
          </button>
        </div>

        <div className="notes__toolbar">
          <div className="notes__search">
            <span className="notes__search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Поиск по заметкам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="notes__status">
            <span>Статус:</span>
            <div className="notes__status-select-wrap">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="notes__status-chevron" aria-hidden="true" />
            </div>
          </div>
        </div>

        {success && <div className="notes__alert notes__alert--ok" role="status">{success}</div>}
        {error &&   <div className="notes__alert notes__alert--err" role="alert">{error}</div>}

        <div className="notes__list">
          {loading ? (
            <div className="notes__loader" aria-label="Загрузка..." />
          ) : filtered.length ? (
            filtered.map((n) => (
              <div key={n.id} className={`notes__item ${n.done ? "notes__item--done" : ""}`}>
                <label className="notes__check">
                  <input type="checkbox" checked={n.done} onChange={() => toggleDone(n)} aria-label="Отметить выполненной" />
                  <span className="notes__check-box" />
                </label>

                <div className="notes__body">
                  <p className="notes__text">{n.text || "Без описания"}</p>
                  <div className="notes__meta">
                    <span className="notes__meta-item">
                      <FaRegCalendarAlt /> Создано: {n.date ? n.date.split("-").reverse().join(".") : "—"}
                    </span>
                    <span className="notes__meta-item notes__meta-item--deadline">
                      <FaRegClock /> Выполнить до: {n.time ? n.time.split("-").reverse().join(".") : "—"}
                    </span>
                  </div>
                </div>

                <div className="notes__actions">
                  <button type="button" className="notes__icon-btn" onClick={() => openEditModal(n)} aria-label="Редактировать">
                    <FaEdit />
                  </button>
                  <button type="button" className="notes__icon-btn" onClick={() => openDelete(n)} aria-label="Удалить">
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="notes__empty">Заметок нет</p>
          )}
        </div>
      </div>

      {/* модалка создания/редактирования */}
      {isModalOpen && (
        <div className="notes__modal-overlay">
          <div className="notes__modal">
            <button type="button" className="notes__modal-close" onClick={closeModal} aria-label="Закрыть">×</button>
            <h3 className="notes__modal-title">{note.id ? "Редактировать заметку" : "Новая заметка"}</h3>
            {modalError && <div className="notes__alert notes__alert--err">{modalError}</div>}

            <form className="notes__form" onSubmit={handleSubmit}>
              <label className="notes__field">
                <span className="notes__field-label">Описание задачи</span>
                <textarea
                  name="text"
                  value={note.text}
                  onChange={handleModalChange}
                  placeholder="Введите описание задачи"
                  className="notes__textarea"
                  rows={3}
                />
              </label>

              <label className="notes__field">
                <span className="notes__field-label notes__field-label--icon">
                  <span className="notes__field-icon" aria-hidden="true"><FaRegCalendarAlt /></span>
                  Дата создания
                </span>
                <input type="date" name="date" value={note.date} onChange={handleModalChange} className="notes__input" />
              </label>

              <label className="notes__field">
                <span className="notes__field-label notes__field-label--icon">
                  <span className="notes__field-icon" aria-hidden="true"><FaRegCalendarAlt /></span>
                  Дата выполнения
                </span>
                <input type="date" name="time" value={note.time} onChange={handleModalChange} className="notes__input" />
              </label>

              <div className="notes__modal-actions">
                <button type="submit" className="notes__btn notes__btn--primary" disabled={loading}>
                  {loading ? "Сохраняем..." : "Добавить"}
                </button>
                <button type="button" className="notes__btn notes__btn--ghost" onClick={closeModal} disabled={loading}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* модалка удаления */}
      {deleteModal.open && (
        <div className="notes__modal-overlay">
          <div className="notes__modal notes__modal--small">
            <h3 className="notes__modal-title">Удалить заметку</h3>
            <p className="notes__confirm">«{deleteModal.text || "Без описания"}» будет удалена безвозвратно.</p>
            <div className="notes__modal-actions">
              <button type="button" className="notes__btn notes__btn--danger" onClick={confirmDelete} disabled={loading}>
                {loading ? "Удаляем..." : "Удалить"}
              </button>
              <button type="button" className="notes__btn notes__btn--ghost" onClick={() => setDeleteModal({ open: false, id: null, text: "" })} disabled={loading}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
