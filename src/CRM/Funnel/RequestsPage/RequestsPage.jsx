// src/components/RequestsPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FiRefreshCw,
  FiUser,
  FiPhone,
  FiShare2,
  FiCheck,
  FiFilter,
  FiX,
  FiSearch,
  FiPlus,
  FiAlertCircle,
} from "react-icons/fi";
import "./RequestsPage.scss";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://rasu0101.pythonanywhere.com",
});

// id этапа "Первый контакт"
const FIRST_STAGE_ID = 4;

const normalizeData = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (status) => {
  const s = (status || "").toString().trim().toLowerCase();
  if (s === "accept" || s === "refusal" || s === "new") return s;
  return "new";
};

const normalizeText = (v) => (v || "").toString().trim().toLowerCase();
const normalizePhone = (v) => (v || "").toString().replace(/\D/g, "");

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // модалка "Новая заявка"
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newChannel, setNewChannel] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/api/requests/");
      setRequests(normalizeData(data));
    } catch (err) {
      console.error("Ошибка загрузки заявок:", err);
      setError("Не удалось загрузить заявки.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /** создаём лид из заявки, в этапе "Первый контакт" */
  const createLeadFromRequest = async (req) => {
    if (!req || !req.id) return;

    const name = (req.name && req.name.toString().trim()) || "Карточка";
    const phone = (req.phone || "").toString().trim();
    const channel = (req.channel || "").toString().trim();

    const payload = {
      name,
      phone,
      channel,
      request: req.id,
      stage: FIRST_STAGE_ID,
      client_type: "adult",
      created_at: req.created_at || new Date().toISOString(),
    };

    await API.post("/api/leads/", payload);
  };

  const updateStatus = async (req, status) => {
    if (!req || !req.id) return;

    const prevStatus = normalizeStatus(req.status);

    setError("");
    setSaving(true);

    try {
      await API.patch(`/api/requests/${req.id}/`, { status });

      setRequests((prev) =>
        prev.map((item) =>
          item.id === req.id ? { ...item, status } : item
        )
      );

      if (status === "accept") {
        try {
          await createLeadFromRequest(req);
        } catch (leadErr) {
          console.error("Ошибка создания лида из заявки:", leadErr);
          setError(
            "Заявка помечена как принята, но не удалось создать лид в воронке."
          );
          setRequests((prev) =>
            prev.map((item) =>
              item.id === req.id ? { ...item, status: prevStatus } : item
            )
          );
        }
      }
    } catch (err) {
      console.error("Ошибка обновления статуса:", err);
      setError("Не получилось обновить статус заявки.");
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = (req) => updateStatus(req, "accept");
  const handleRefusal = (req) => updateStatus(req, "refusal");

  const getStatusLabel = (status) => {
    const s = normalizeStatus(status);
    if (s === "accept") return "Принята";
    if (s === "refusal") return "Отказ";
    return "Новая";
  };

  const getStatusClass = (status) => {
    const s = normalizeStatus(status);
    if (s === "accept") return "accept";
    if (s === "refusal") return "refusal";
    return "new";
  };

  const visibleRequests = useMemo(() => {
    const q = normalizeText(search);

    const filtered = requests.filter((req) => {
      const st = normalizeStatus(req.status);

      if (statusFilter !== "all" && st !== statusFilter) {
        return false;
      }

      if (!q) return true;

      const nameText = normalizeText(req.name);
      const phoneText = normalizeText(req.phone);

      return nameText.includes(q) || phoneText.includes(q);
    });

    const order = {
      new: 0,
      accept: 1,
      refusal: 2,
    };

    const sorted = [...filtered].sort((a, b) => {
      const sa = order[normalizeStatus(a.status)] ?? 3;
      const sb = order[normalizeStatus(b.status)] ?? 3;
      if (sa !== sb) return sa - sb;
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      return bId - aId;
    });

    return sorted;
  }, [requests, statusFilter, search]);

  /** дубликаты по имени ИЛИ телефону для модалки */
  const modalDuplicates = useMemo(() => {
    const nameNorm = normalizeText(newName);
    const phoneNorm = normalizePhone(newPhone);

    if (!nameNorm && !phoneNorm) return [];

    return requests.filter((r) => {
      const rName = normalizeText(r.name);
      const rPhone = normalizePhone(r.phone);

      const sameName = nameNorm && rName && rName === nameNorm;
      const samePhone = phoneNorm && rPhone && rPhone === phoneNorm;

      return sameName || samePhone;
    });
  }, [requests, newName, newPhone]);

  const resetAddForm = () => {
    setNewName("");
    setNewPhone("");
    setNewChannel("");
  };

  const handleOpenAdd = () => {
    setError("");
    resetAddForm();
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    if (saving) return;
    setIsAddOpen(false);
  };

  const handleCreateRequest = async () => {
    const name = newName.trim();
    const phone = newPhone.trim();
    const channel = newChannel.trim();

    if (!name || !phone || !channel) {
      setError("Заполните имя, телефон и канал.");
      return;
    }

    // жёсткий стоп по дублям
    if (modalDuplicates.length > 0) {
      setError(
        `Нельзя создать: уже есть ${modalDuplicates.length} заявк(и) с таким именем или номером.`
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        phone,
        channel,
        status: "new",
      };

      const { data } = await API.post("/api/requests/", payload);
      const created = data && typeof data === "object" ? data : payload;

      setRequests((prev) => [created, ...prev]);

      resetAddForm();
      setIsAddOpen(false);
      setError("");
    } catch (err) {
      console.error("Ошибка создания заявки:", err);
      setError("Не удалось создать заявку.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="requests-page">
      <div className="requests-page__header">
        <h1 className="requests-page__title">Заявки</h1>
        <div className="requests-page__header-buttons">
          <button
            type="button"
            className="requests-page__add-trigger"
            onClick={handleOpenAdd}
            disabled={saving}
          >
            <FiPlus className="requests-page__add-trigger-icon" />
            <span>Добавить</span>
          </button>
          <button
            type="button"
            className="requests-page__reload"
            onClick={loadRequests}
            disabled={loading || saving}
          >
            <FiRefreshCw className="requests-page__reload-icon" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      <div className="requests-page__filters">
        <div className="requests-page__filters-label">
          <FiFilter className="requests-page__filters-icon" />
          <span>Фильтр по статусу</span>
        </div>
        <div className="requests-page__filters-buttons">
          <button
            type="button"
            className={`requests-page__filter ${
              statusFilter === "all" ? "requests-page__filter--active" : ""
            }`}
            onClick={() => setStatusFilter("all")}
          >
            Все
          </button>
          <button
            type="button"
            className={`requests-page__filter ${
              statusFilter === "new" ? "requests-page__filter--active" : ""
            }`}
            onClick={() => setStatusFilter("new")}
          >
            Новые
          </button>
          <button
            type="button"
            className={`requests-page__filter ${
              statusFilter === "accept" ? "requests-page__filter--active" : ""
            }`}
            onClick={() => setStatusFilter("accept")}
          >
            Принятые
          </button>
          <button
            type="button"
            className={`requests-page__filter ${
              statusFilter === "refusal" ? "requests-page__filter--active" : ""
            }`}
            onClick={() => setStatusFilter("refusal")}
          >
            Отказы
          </button>
        </div>
      </div>

      <div className="requests-page__search">
        <div className="requests-page__search-icon-wrap">
          <FiSearch className="requests-page__search-icon" />
        </div>
        <input
          className="requests-page__search-input"
          placeholder="Поиск по имени или телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && !isAddOpen && (
        <div className="requests-page__error">{error}</div>
      )}

      <div className="requests-page__list-wrap">
        {loading && (
          <div className="requests-page__empty">Загружаю заявки...</div>
        )}

        {!loading && visibleRequests.length === 0 && (
          <div className="requests-page__empty">Пока нет заявок.</div>
        )}

        {!loading && visibleRequests.length > 0 && (
          <div className="requests-page__list">
            {visibleRequests.map((req) => {
              const st = normalizeStatus(req.status);

              return (
                <div
                  className="requests-page__item"
                  key={req.id || req.phone}
                >
                  <div className="requests-page__item-main">
                    <div className="requests-page__item-line">
                      <FiUser className="requests-page__item-icon" />
                      <span className="requests-page__item-name">
                        {req.name || "Без имени"}
                      </span>
                    </div>

                    <div className="requests-page__item-line">
                      <FiPhone className="requests-page__item-icon" />
                      <span className="requests-page__item-phone">
                        {req.phone || "Без телефона"}
                      </span>
                    </div>

                    <div className="requests-page__item-line">
                      <FiShare2 className="requests-page__item-icon" />
                      <span className="requests-page__badge">
                        {req.channel || "Канал не указан"}
                      </span>
                    </div>
                  </div>

                  <div className="requests-page__item-meta">
                    <span
                      className={`requests-page__status requests-page__status--${getStatusClass(
                        st
                      )}`}
                    >
                      {getStatusLabel(st)}
                    </span>

                    {req.created_at && (
                      <span className="requests-page__date">
                        {formatDateTime(req.created_at)}
                      </span>
                    )}

                    <div className="requests-page__actions">
                      {st === "new" && (
                        <>
                          <button
                            type="button"
                            className="requests-page__accept"
                            onClick={() => handleAccept(req)}
                            disabled={saving}
                          >
                            <FiCheck className="requests-page__accept-icon" />
                            <span>Принять</span>
                          </button>

                          <button
                            type="button"
                            className="requests-page__refuse"
                            onClick={() => handleRefusal(req)}
                            disabled={saving}
                          >
                            <FiX className="requests-page__refuse-icon" />
                            <span>Отказать</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ЗАЯВКИ */}
      {isAddOpen && (
        <div
          className="requests-page__modal-backdrop"
          onClick={handleCloseAdd}
        >
          <div
            className="requests-page__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="requests-page__modal-header">
              <h2 className="requests-page__modal-title">Новая заявка</h2>
              <button
                type="button"
                className="requests-page__modal-close"
                onClick={handleCloseAdd}
                disabled={saving}
              >
                <FiX />
              </button>
            </div>

            {/* предупреждение о дублях прямо в модалке */}
            {modalDuplicates.length > 0 && (
              <div className="requests-page__modal-duplicate">
                <FiAlertCircle className="requests-page__modal-duplicate-icon" />
                <span>
                  Уже есть {modalDuplicates.length} заявк(и) с таким именем или
                  номером.
                </span>
              </div>
            )}

            {error && (
              <div className="requests-page__modal-error">
                <FiAlertCircle className="requests-page__modal-duplicate-icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="requests-page__modal-body">
              <div className="requests-page__modal-field">
                <label className="requests-page__modal-label">
                  <FiUser className="requests-page__modal-icon" />
                  <span>Имя</span>
                </label>
                <input
                  className="requests-page__modal-input"
                  type="text"
                  placeholder="Имя клиента"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="requests-page__modal-field">
                <label className="requests-page__modal-label">
                  <FiPhone className="requests-page__modal-icon" />
                  <span>Телефон</span>
                </label>
                <input
                  className="requests-page__modal-input"
                  type="text"
                  placeholder="+996 ..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div className="requests-page__modal-field">
                <label className="requests-page__modal-label">
                  <FiShare2 className="requests-page__modal-icon" />
                  <span>Канал</span>
                </label>
                <select
                  className="requests-page__modal-select"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                >
                  <option value="">Не выбрано</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Звонок">Звонок</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>
            </div>

            <div className="requests-page__modal-footer">
              <button
                type="button"
                className="requests-page__modal-btn requests-page__modal-btn--secondary"
                onClick={handleCloseAdd}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="button"
                className="requests-page__modal-btn requests-page__modal-btn--primary"
                onClick={handleCreateRequest}
                disabled={saving || modalDuplicates.length > 0}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
