import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlus, FaPen, FaTrash, FaShieldAlt, FaUser, FaTimes, FaSearch,
} from "react-icons/fa";
import "./Staff.scss";
import { useUsersStore } from "../../store/users";

const ROLE_OPTIONS = [
  { value: "all", label: "Все роли" },
  { value: "admin", label: "Администратор" },
  { value: "client_manager", label: "Менеджер" },
];

const roleDisplay = { admin: "Администратор", client_manager: "Менеджер" };

const Staff = () => {
  const { users, loading, error, load, update, remove, clearError } = useUsersStore();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create",
    user: { id: null, username: "", role: "client_manager" },
  });
  const [formError, setFormError] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });

  useEffect(() => { load(); }, [load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const nameOk = (u.username || "").toLowerCase().includes(q);
      const roleOk = roleFilter === "all" || u.role === roleFilter;
      return nameOk && roleOk;
    });
  }, [users, search, roleFilter]);

  const counts = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    managers: users.filter((u) => u.role === "client_manager").length,
  }), [users]);

  const openCreate = () => {
    clearError();
    setFormError("");
    setFormModal({
      open: true,
      mode: "create",
      user: { id: null, username: "", role: "client_manager" },
    });
  };

  const openEdit = (u) => {
    clearError();
    setFormError("");
    setFormModal({
      open: true,
      mode: "edit",
      user: { id: u.id, username: u.username || "", role: u.role || "client_manager" },
    });
  };

  const closeForm = () => setFormModal((p) => ({ ...p, open: false }));
  const openDelete = (u) => { clearError(); setDeleteModal({ open: true, user: u }); };
  const closeDelete = () => setDeleteModal({ open: false, user: null });

  const validate = (u) => {
    const name = (u.username || "").trim();
    if (!name) return "Имя пользователя обязательно.";
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(name)) return "Имя: 3–32 латиницы/цифр и . _ -";
    if (!u.role) return "Выберите роль.";
    const dup = users.some(
      (x) => x.id !== u.id && (x.username || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (dup) return "Пользователь с таким именем уже есть.";
    return "";
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setFormModal((prev) => ({
      ...prev,
      user: { ...prev.user, [name]: value },
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const err = validate(formModal.user);
    if (err) { setFormError(err); return; }

    try {
      const res = await update(formModal.user.id, {
        username: formModal.user.username.trim(),
        role: formModal.user.role,
      });
      if (res?.ok) closeForm();
    } catch (err2) {
      console.error("Ошибка сохранения:", err2);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    try {
      const res = await remove(deleteModal.user.id);
      if (res?.ok) closeDelete();
    } catch (err2) {
      console.error("Ошибка удаления:", err2);
    }
  };

  return (
    <div className="staff">
      <h2 className="staff__page-title">Сотрудники</h2>

      <div className="staff__card">
        <div className="staff__head">
          <div>
            <h3 className="staff__head-title">Управление сотрудниками</h3>
            <div className="staff__head-stats">
              <span>Всего: {counts.total}</span>
              <span className="staff__head-link staff__head-link--violet">
                Администраторов: {counts.admins}
              </span>
              <span className="staff__head-link staff__head-link--blue">
                Менеджеров: {counts.managers}
              </span>
            </div>
          </div>

          {/* <button type="button" className="staff__add-btn" onClick={openCreate} disabled={loading}>
            <FaPlus /> Добавить сотрудника
          </button> */}
        </div>

        <div className="staff__toolbar">
          <div className="staff__search">
            <FaSearch className="staff__search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="staff__filter">
            <span>Роль:</span>
            <div className="staff__filter-select">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="staff__filter-chevron" aria-hidden="true" />
            </div>
          </div>
        </div>

        {error && <div className="staff__alert staff__alert--err" role="alert">{error}</div>}

        <div className="staff__table-wrap">
          <table className="staff__table">
            <thead>
              <tr>
                <th>Имя пользователя</th>
                <th>Роль</th>
                <th className="staff__th-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}><div className="staff__loader" /></td></tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username || "—"}</td>
                    <td>
                      {u.role ? (
                        <span className={`staff__role-pill staff__role-pill--${u.role}`}>
                          {u.role === "admin" ? <FaShieldAlt /> : <FaUser />}
                          {roleDisplay[u.role] || u.role}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="staff__actions">
                      <button type="button" className="staff__icon-btn" onClick={() => openEdit(u)}>
                        <FaPen />
                      </button>
                      <button type="button" className="staff__icon-btn" onClick={() => openDelete(u)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="staff__empty">Ничего не найдено</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка формы */}
      {formModal.open && (
        <div className="staff__modal-overlay">
          <div className="staff__modal">
            <button type="button" className="staff__modal-close" onClick={closeForm}><FaTimes /></button>
            <h3 className="staff__modal-title">
              {formModal.mode === "edit" ? "Редактировать сотрудника" : "Новый сотрудник"}
            </h3>

            {formError && <div className="staff__alert staff__alert--err">{formError}</div>}

            <form onSubmit={handleFormSubmit} className="staff__form">
              <label className="staff__field">
                <span className="staff__field-label">Имя пользователя</span>
                <input
                  type="text"
                  name="username"
                  value={formModal.user.username}
                  onChange={handleFormChange}
                  placeholder="Введите имя сотрудника"
                  className="staff__input"
                />
              </label>

              <label className="staff__field">
                <span className="staff__field-label">Роль</span>
                <div className="staff__select-wrap">
                  <select
                    name="role"
                    value={formModal.user.role}
                    onChange={handleFormChange}
                    className="staff__select"
                  >
                    <option value="admin">Администратор</option>
                    <option value="client_manager">Менеджер</option>
                  </select>
                  <span className="staff__select-chevron" />
                </div>
              </label>

              <div className="staff__form-actions">
                <button type="submit" className="staff__btn staff__btn--primary" disabled={loading}>
                  <FaUser />
                  {loading ? "Сохраняем..." : "Сохранить"}
                </button>
                <button type="button" className="staff__btn staff__btn--ghost" onClick={closeForm}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка удаления */}
      {deleteModal.open && (
        <div className="staff__modal-overlay">
          <div className="staff__modal staff__modal--small">
            <h3 className="staff__modal-title">Удалить сотрудника</h3>
            <p className="staff__confirm-text">
              «{deleteModal.user?.username}» будет удалён безвозвратно.
            </p>
            <div className="staff__form-actions">
              <button type="button" className="staff__btn staff__btn--danger" onClick={handleDelete}>
                Удалить
              </button>
              <button type="button" className="staff__btn staff__btn--ghost" onClick={closeDelete}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
