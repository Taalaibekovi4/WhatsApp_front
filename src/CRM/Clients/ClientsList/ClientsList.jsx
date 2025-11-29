import React, { useState, useEffect, useCallback, useMemo } from "react";
import FilterComponent from "../ClientsFilter/ClientsFilter";
import {
  trainers,
  sports,
  months,
  years,
  days,
  checkFieldOptions,
  timeSlots,
  saleOptions,
  renewalOptions,
  CORRECT_PIN,
  paymentOptions,
  errorMessages,
} from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import ClientDetailsView from "./ClientDetailsView";
import ClientEditForm from "./ClientEditForm";
import "./ClientsList.scss";

/* ===== helpers ===== */
const splitComment = (comment = "") => {
  const m = comment.match(/\(Добавил:\s*([^)]+)\)\s*$/);
  const addedBy = m ? m[1].trim() : "";
  const commentBody = m ? comment.replace(m[0], "").trim() : comment.trim();
  return { commentBody, addedBy };
};

const normalizePayment = (v) => {
  const s = String(v || "").toLowerCase().replace(/\s+/g, "");
  if (["оплачено", "paid"].includes(s)) return "Оплачено";
  if (["неоплачено", "неоплачен", "неоплата", "unpaid"].includes(s))
    return "Не оплачено";
  return v || "-";
};

const paymentClass = (v) => {
  const n = normalizePayment(v);
  if (n === "Оплачено") return "oplacheno";
  if (n === "Не оплачено") return "neoplacheno";
  return "unknown";
};

const safeNum = (v, def = 0) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : def;
};

const trimLower = (s) => String(s || "").trim().toLowerCase();

const buildISODate = (day, monthName, year) => {
  const mIndex = months.indexOf(monthName); // 0..11
  const mm = String(mIndex + 1).padStart(2, "0");
  const dd = String(day || "01").padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

// цвет по типу клиента
const typeClientClass = (v) => {
  const t = trimLower(v);
  if (t === "пробный") return "type-trial";
  if (t === "индивидуальный") return "type-individual";
  if (t === "абонемент") return "type-subscription";
  return "type-unknown";
};

/* общий Modal (оверлей + Esc + клик по фону) */
const Modal = ({ isOpen, onClose, title, children, typeClass }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="clients-list__modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`clients-list__modal-content${
          typeClass ? ` clients-list__modal-content--${typeClass}` : ""
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="clients-list__modal-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
        {title && <h2 className="clients-list__modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ===== main ===== */
const ClientsList = () => {
  const {
    items: clients,
    loading,
    error: storeError,
    load,
    addOne,
    updateOne,
    deleteOne,
  } = useClientsStore();

  const [globalError, setGlobalError] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    trainer: "",
    sport_category: "",
    day: "",
    month: "",
    year: "",
    typeClient: "",
    payment: "",
  });

  const [selectedClient, setSelectedClient] = useState(null); // для "Подробности"

  const [modalState, setModalState] = useState({ type: null, data: null }); // pin / edit / delete / renewal
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState("1");
  const [renewReport, setRenewReport] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // без "Обычный"
  const typeClients = ["Пробный", "Индивидуальный", "Абонемент"];
  const allowedPayments = paymentOptions.map((o) => o.value);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setGlobalError(storeError || "");
  }, [storeError]);

  const filteredClients = useMemo(() => {
    const res = clients.filter(
      (client) =>
        (!filters.name ||
          trimLower(client.name).includes(trimLower(filters.name))) &&
        (!filters.trainer || client.trainer === filters.trainer) &&
        (!filters.sport_category || client.sport_category === filters.sport_category) &&
        (!filters.day || client.day === filters.day) &&
        (!filters.month || client.month === filters.month) &&
        (!filters.year || client.year === filters.year) &&
        (!filters.typeClient || client.typeClient === filters.typeClient) &&
        (!filters.payment ||
          filters.payment.split(",").includes(normalizePayment(client.payment)))
    );
    return res.slice().reverse();
  }, [clients, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const pageItems = filteredClients.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const getClientActivePeriods = useMemo(() => {
    if (!selectedClient) return { count: 0, periods: [] };
    const sameName = clients.filter(
      (c) => trimLower(c.name) === trimLower(selectedClient.name)
    );
    const uniq = [
      ...new Set(
        sameName
          .filter((c) => c.month && c.year)
          .map((c) => `${c.month} ${c.year}`)
      ),
    ];
    return { count: uniq.length, periods: uniq };
  }, [selectedClient, clients]);

  const generateRenewalPeriods = (client, monthsToAdd) => {
    const periods = [];
    const currentMonthIndex = client.month ? months.indexOf(client.month) : 0;
    const currentYearNum = client.year ? parseInt(client.year, 10) : 2025;
    const currentDay = client.day || "01";
    for (let i = 1; i <= monthsToAdd; i++) {
      const totalMonths = currentMonthIndex + i;
      const newMonthIndex = totalMonths % 12;
      const yearsToAdd = Math.floor(totalMonths / 12);

      const monthName = months[newMonthIndex];
      const yearStr = String(currentYearNum + yearsToAdd);

      periods.push({
        month: monthName,
        year: yearStr,
        day: currentDay,
        dataCassa: buildISODate(currentDay, monthName, yearStr),
      });
    }
    return periods;
  };

  const hasDuplicate = useCallback(
    (data, excludeId = null) => {
      const key = (c) =>
        `${trimLower(c.name)}|${trimLower(c.sport_category)}|${c.month}|${c.year}`;
      const targetKey = key(data);
      return clients.some(
        (c) => key(c) === targetKey && c.id !== excludeId
      );
    },
    [clients]
  );

  const validateForm = (d, excludeId = null) => {
    const errs = [];
    if (!d.name || String(d.name).trim().length < 2)
      errs.push("Имя: минимум 2 символа.");
    if (d.phone && !/^[\d()+\-\s]{7,20}$/.test(String(d.phone).trim()))
      errs.push("Телефон: неверный формат.");
    if (d.price !== undefined) {
      const n = safeNum(d.price, NaN);
      if (!Number.isFinite(n) || n < 0)
        errs.push("Цена: укажите неотрицательное число.");
    }
    if (d.typeClient && !typeClients.includes(d.typeClient))
      errs.push("Тип клиента: неверное значение.");
    if (d.sale && !saleOptions.includes(d.sale))
      errs.push("Скидка: неверное значение.");
    if (d.payment && !allowedPayments.includes(normalizePayment(d.payment)))
      errs.push("Оплата: неверное значение.");
    if (d.month && !months.includes(d.month))
      errs.push("Месяц: неверное значение.");
    if (d.year && !years.includes(d.year))
      errs.push("Год: неверное значение.");
    if (d.day && !days.includes(d.day))
      errs.push("День: неверное значение.");
    if (
      d.month &&
      d.year &&
      d.name &&
      d.sport_category &&
      hasDuplicate(d, excludeId)
    ) {
      errs.push("Дубликат: такой клиент за этот период уже есть.");
    }
    return errs;
  };

  const handleAction = (action, client) => {
    switch (action) {
      case "edit":
        setModalState({
          type: "pin",
          data: { action: "edit", id: client.id, client },
        });
        setPinInput("");
        setPinError("");
        setFormErrors([]);
        break;
      case "delete":
        setModalState({
          type: "pin",
          data: { action: "delete", id: client.id },
        });
        setPinInput("");
        setPinError("");
        setFormErrors([]);
        break;
      case "renewal":
        setModalState({ type: "renewal", data: client });
        setSelectedMonths("1");
        setRenewReport("");
        break;
      default:
        break;
    }
  };

  const handlePinSubmit = () => {
    if (pinInput !== CORRECT_PIN) {
      setPinError(errorMessages.invalidPin || "Неверный PIN.");
      return;
    }
    const { action, id, client } = modalState.data;
    setPinInput("");
    setPinError("");
    if (action === "delete") {
      setModalState({ type: "delete", data: id });
    } else if (action === "edit") {
      const { commentBody, addedBy } = splitComment(client.comment || "");
      setFormData({
        ...client,
        day: client.day || "",
        month: client.month || "",
        year: client.year || "2025",
        typeClient: client.typeClient || "",
        dataCassa: client.dataCassa || "",
        commentBody,
        addedBy,
        payment: normalizePayment(client.payment),
      });
      setModalState({ type: "edit", data: { id, ...client } });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    try {
      setIsProcessing(true);
      setFormErrors([]);

      let updatedPrice = safeNum(formData.price, 0);
      if (formData.sale === "15%") updatedPrice = +(updatedPrice * 0.85).toFixed(2);
      if (formData.sale === "20%") updatedPrice = +(updatedPrice * 0.8).toFixed(2);

      const mergedComment = `${(formData.commentBody || "").trim()}${
        formData.addedBy ? `\n(Добавил: ${formData.addedBy})` : ""
      }`;

      const updated = {
        ...formData,
        price: updatedPrice,
        comment: mergedComment,
        payment: normalizePayment(formData.payment),
      };
      delete updated.commentBody;
      delete updated.addedBy;

      const errs = validateForm(updated, modalState.data.id);
      if (errs.length) {
        setFormErrors(errs);
        return;
      }

      await updateOne(modalState.data.id, updated);
      setModalState({ type: null, data: null });
    } catch (e) {
      console.error(e);
      setFormErrors([
        errorMessages.updateClientError || "Не удалось сохранить.",
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenewal = async () => {
    try {
      setIsProcessing(true);
      setRenewReport("");
      const client = modalState.data;
      const count = parseInt(selectedMonths, 10) || 1;
      const periods = generateRenewalPeriods(client, count);

      const created = [];
      const skipped = [];

      const existingKeys = new Set(
        clients.map(
          (c) =>
            `${trimLower(c.name)}|${trimLower(
              c.sport_category
            )}|${c.month}|${c.year}`
        )
      );

      for (const p of periods) {
        const draft = {
          ...client,
          month: p.month,
          year: p.year,
          day: p.day,
          dataCassa: p.dataCassa,
        };
        const k = `${trimLower(draft.name)}|${trimLower(
          draft.sport_category
        )}|${draft.month}|${draft.year}`;
        if (existingKeys.has(k)) {
          skipped.push(`${p.month} ${p.year}`);
          continue;
        }

        await addOne(draft);
        created.push(draft);
        existingKeys.add(k);
      }

      if (skipped.length && created.length) {
        setRenewReport(
          `Создано: ${created.length}. Пропущено (дубликаты): ${skipped.join(
            ", "
          )}`
        );
      } else if (skipped.length) {
        setRenewReport(`Пропущено (дубликаты): ${skipped.join(", ")}`);
      } else {
        setRenewReport("Продление успешно.");
        setModalState({ type: null, data: null });
      }
    } catch (e) {
      console.error(e);
      setRenewReport(errorMessages.renewalError || "Не удалось продлить.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsProcessing(true);
      await deleteOne(modalState.data);
      setModalState({ type: null, data: null });
    } catch (e) {
      console.error(e);
      setGlobalError(errorMessages.deleteClientError || "Не удалось удалить.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setModalState({ type: null, data: null });
    setPinInput("");
    setPinError("");
    setSelectedClient(null);
    setFormErrors([]);
    setRenewReport("");
  };

  const paginationNumbers = useMemo(() => {
    const maxButtons = 7;
    const nums = [];
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons)
      start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [page, totalPages]);

  return (
    <div className="clients-list">
      <FilterComponent filters={filters} setFilters={setFilters} />

      {loading ? (
        <div className="clients-list__spinner" />
      ) : globalError ? (
        <p className="clients-list__error">{globalError}</p>
      ) : (
        <>
          <div className="clients-list__table-container">
            <table className="clients-list__table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Спорт</th>
                  <th>Месяц</th>
                  <th>Дата</th>
                  <th className="clients-list__th-status">Статус</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  pageItems.map((client) => {
                    const pay = normalizePayment(client.payment);
                    const typeClass = typeClientClass(client.typeClient);

                    return (
                      <tr
                        key={client.id}
                        className={`clients-list__row clients-list__row--${typeClass}${
                          pay === "Не оплачено"
                            ? " clients-list__row--unpaid"
                            : ""
                        }`}
                      >
                        <td>{client.name || "-"}</td>
                        <td>{client.sport_category || "-"}</td>
                        <td>{client.month || "-"}</td>
                        <td>{client.dataCassa || "-"}</td>
                        <td className="clients-list__status-cell">
                          <span
                            className={`clients-list__payment clients-list__payment--${paymentClass(
                              pay
                            )}`}
                          >
                            {pay}
                          </span>
                          <div className="clients-list__actions">
                            <button
                              className="clients-list__pill clients-list__pill--neutral"
                              onClick={() => setSelectedClient(client)}
                            >
                              Подробности
                            </button>
                            <button
                              className="clients-list__pill clients-list__pill--blue"
                              onClick={() => handleAction("edit", client)}
                            >
                              Изменить
                            </button>
                            <button
                              className="clients-list__pill clients-list__pill--green"
                              onClick={() => handleAction("renewal", client)}
                            >
                              Продлить
                            </button>
                            <button
                              className="clients-list__pill clients-list__pill--red"
                              onClick={() => handleAction("delete", client)}
                              disabled={isProcessing}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div
              className="clients-list__pagination"
              role="navigation"
              aria-label="Пагинация"
            >
              <button
                className="clients-list__page-btn"
                onClick={() => setPage(1)}
                disabled={page === 1}
                aria-label="Первая страница"
              >
                «
              </button>
              <button
                className="clients-list__page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Предыдущая страница"
              >
                ‹
              </button>
              {paginationNumbers.map((n) => (
                <button
                  key={n}
                  className={`clients-list__page-btn ${
                    n === page ? "is-active" : ""
                  }`}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                className="clients-list__page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Следующая страница"
              >
                ›
              </button>
              <button
                className="clients-list__page-btn"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                aria-label="Последняя страница"
              >
                »
              </button>
              <span className="clients-list__page-info">
                {page} / {totalPages} • всего {filteredClients.length}
              </span>
            </div>
          )}
        </>
      )}

      {/* Подробности (отдельный компонент) */}
      <Modal
        isOpen={!!selectedClient}
        onClose={closeModal}
        title="Детали клиента"
        typeClass={typeClientClass(selectedClient?.typeClient)}
      >
        <ClientDetailsView
          client={selectedClient}
          activePeriods={getClientActivePeriods}
        />
      </Modal>

      {/* Редактирование (отдельный компонент) */}
      <Modal
        isOpen={modalState.type === "edit"}
        onClose={closeModal}
        title="Редактирование"
        typeClass={typeClientClass(formData.typeClient)}
      >
        <ClientEditForm
          formData={formData}
          formErrors={formErrors}
          onChange={handleEditChange}
          onSave={handleEditSave}
          onCancel={closeModal}
          isProcessing={isProcessing}
        />
      </Modal>

      {/* PIN */}
      <Modal
        isOpen={modalState.type === "pin"}
        onClose={closeModal}
        title="PIN-код"
      >
        <div className="clients-list__modal-form">
          <input
            type="password"
            name="pin"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="PIN-код"
            className="clients-list__modal-input"
          />
          {pinError && (
            <p className="clients-list__error" role="alert">
              {pinError}
            </p>
          )}
          <div className="clients-list__modal-actions">
            <button
              className="clients-list__modal-button clients-list__modal-button--save"
              onClick={handlePinSubmit}
            >
              Подтвердить
            </button>
            <button
              className="clients-list__modal-button clients-list__modal-button--cancel"
              onClick={closeModal}
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Удаление */}
      <Modal
        isOpen={modalState.type === "delete"}
        onClose={closeModal}
        title="Удаление"
      >
        <p className="clients-list__modal-message">Удалить клиента?</p>
        <div className="clients-list__modal-actions">
          <button
            className="clients-list__modal-button clients-list__modal-button--save"
            onClick={handleDeleteConfirm}
            disabled={isProcessing}
          >
            Да
          </button>
          <button
            className="clients-list__modal-button clients-list__modal-button--cancel"
            onClick={closeModal}
            disabled={isProcessing}
          >
            Отмена
          </button>
        </div>
      </Modal>

      {/* Продление */}
      <Modal
        isOpen={modalState.type === "renewal"}
        onClose={closeModal}
        title="Продление"
      >
        {modalState.data && (
          <div className="clients-list__modal-form">
            {renewReport && (
              <div
                className="clients-list__error"
                role="status"
                style={{ textAlign: "left" }}
              >
                {renewReport}
              </div>
            )}
            <div className="clients-list__modal-row">
              <span className="clients-list__modal-label">Имя:</span>
              <span>{modalState.data.name}</span>
            </div>
            <div className="clients-list__modal-row">
              <span className="clients-list__modal-label">Месяц:</span>
              <span>{modalState.data.month || "-"}</span>
            </div>
            <div className="clients-list__modal-row">
              <span className="clients-list__modal-label">Тип клиента:</span>
              <span>{modalState.data.typeClient || "-"}</span>
            </div>
            <div className="clients-list__modal-row">
              <span className="clients-list__modal-label">Кол-во мес.:</span>
              <select
                name="months"
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(e.target.value)}
                className="clients-list__modal-select"
              >
                <option value="" disabled>
                  Месяцы
                </option>
                {renewalOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="clients-list__modal-actions">
              <button
                className="clients-list__modal-button clients-list__modal-button--save"
                onClick={handleRenewal}
                disabled={isProcessing}
              >
                Подтвердить
              </button>
              <button
                className="clients-list__modal-button clients-list__modal-button--cancel"
                onClick={closeModal}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClientsList;
