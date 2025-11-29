import React, { useEffect, useMemo, useRef, useState } from "react";
import { months } from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import "./ClientsValidation.scss";

const PAGE_SIZE = 15;
const YEARS = ["2025", "2026"];

/* Чистый Select: без ввода, со СКРОЛЛОМ */
const Select = ({
  value,
  onChange,
  options,
  placeholder = "Выберите значение",
  ariaLabel = placeholder,
  idSuffix = "select",
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const listId = `clients-validation-${idSuffix}-list`;

  return (
    <div className="clients-validation__select" ref={rootRef}>
      <button
        type="button"
        className={`clients-validation__select-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((s) => !s)}
      >
        <span className={`clients-validation__select-value ${value ? "" : "is-placeholder"}`}>
          {value || placeholder}
        </span>
        <span className="clients-validation__select-caret">▾</span>
      </button>

      {open && (
        <div className="clients-validation__select-popover" role="listbox" id={listId}>
          <div className="clients-validation__select-list">
            {options.map((opt) => (
              <div
                key={opt}
                role="option"
                aria-selected={String(value) === String(opt)}
                className={`clients-validation__select-item ${
                  String(value) === String(opt) ? "is-active" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ClientsValidation = () => {
  const { items, load, loading, error } = useClientsStore();

  const [filters, setFilters] = useState({ month: "", year: YEARS[0] });
  const [page, setPage] = useState(1);

  useEffect(() => { load?.(); }, [load]);

  const filtered = useMemo(() => {
    return (items || []).filter((c) => {
      if (filters.year && String(c.year) !== String(filters.year)) return false;
      if (filters.month && String(c.month) !== String(filters.month)) return false;
      return true;
    });
  }, [items, filters]);

  const duplicateKeys = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      const key = `${String(c.name || "").trim().toLowerCase()}|${String(c.sport_category || "").trim().toLowerCase()}|${String(c.month)}|${String(c.year)}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [filtered]);

  const errors = useMemo(() => {
    const errs = [];
    for (const c of filtered) {
      const missing = [];
      const dayNum = Number(c.day);
      const priceNum = Number(c.price);

      if (!c.id) missing.push("ИД");
      if (!c.name) missing.push("Имя");
      if (!c.day || !(dayNum >= 1 && dayNum <= 31)) missing.push(`День (некорректный: ${c.day || "пустой"})`);
      if (!c.month || !months.includes(String(c.month))) missing.push(`Месяц (некорректный: ${c.month || "пустой"})`);
      if (!c.year || !["2025","2026"].includes(String(c.year))) missing.push(`Год (некорректный: ${c.year || "пустой"})`);
      if (!c.price || Number.isNaN(priceNum) || !(priceNum > 0)) missing.push(`Цена (некорректная: ${c.price || "пустая"})`);
      if (!c.trainer) missing.push("Тренер");
      if (!c.sport_category) missing.push("Категория спорта");
      if (!c.payment) missing.push("Оплата");
      if (!c.typeClient) missing.push("Тип клиента");
      if (!c.check_field) missing.push("Источник");

      const dupKey = `${String(c.name || "").trim().toLowerCase()}|${String(c.sport_category || "").trim().toLowerCase()}|${String(c.month)}|${String(c.year)}`;
      if (duplicateKeys.get(dupKey) > 1) missing.push("Дубликат записи в выбранном периоде");

      if (missing.length) errs.push({ name: c.name || "Неизвестный", list: missing });
    }
    return errs;
  }, [filtered, duplicateKeys]);

  const totalPages = Math.max(1, Math.ceil(errors.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [filters]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return errors.slice(start, start + PAGE_SIZE);
  }, [errors, page]);

  const pageNums = useMemo(() => {
    const maxBtns = 7;
    const arr = [];
    let s = Math.max(1, page - 3);
    let e = Math.min(totalPages, s + maxBtns - 1);
    if (e - s + 1 < maxBtns) s = Math.max(1, e - maxBtns + 1);
    for (let i = s; i <= e; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  return (
    <div className="clients-validation">
      <div className="clients-validation__filters">
        <div className="clients-validation__filter">
          <label className="clients-validation__label">Год</label>
          <Select
            value={filters.year}
            onChange={(val) => setFilters((p) => ({ ...p, year: val }))}
            options={YEARS}
            placeholder="Выберите год"
            ariaLabel="Год"
            idSuffix="year"
          />
        </div>
        <div className="clients-validation__filter">
          <label className="clients-validation__label">Месяц</label>
          <Select
            value={filters.month}
            onChange={(val) => setFilters((p) => ({ ...p, month: val }))}
            options={months}
            placeholder="Выберите месяц"
            ariaLabel="Месяц"
            idSuffix="month"
          />
        </div>
      </div>

      {loading ? (
        <div className="clients-validation__spinner" aria-label="Загрузка..." />
      ) : error ? (
        <p className="clients-validation__error" role="alert">{error}</p>
      ) : errors.length > 0 ? (
        <>
          <div className="clients-validation__tableWrap">
            <table className="clients-validation__table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Ошибки</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((err, i) => (
                  <tr key={`${i}-${err.name}`}>
                    <td>{err.name}</td>
                    <td className="clients-validation__errorsCell">
                      {err.list.map((t, idx) => (
                        <div key={idx} className="clients-validation__errorRow">{t}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errors.length > PAGE_SIZE && (
            <div className="clients-validation__pagination" role="navigation" aria-label="Пагинация">
              <button className="clients-validation__pageBtn" onClick={() => setPage(1)} disabled={page === 1} aria-label="Первая страница">«</button>
              <button className="clients-validation__pageBtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Предыдущая">‹</button>
              {pageNums.map((n) => (
                <button key={n} className={`clients-validation__pageBtn ${n === page ? "is-active" : ""}`} onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined}>{n}</button>
              ))}
              <button className="clients-validation__pageBtn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Следующая">›</button>
              <button className="clients-validation__pageBtn" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Последняя страница">»</button>
              <span className="clients-validation__pageInfo">{page} / {totalPages} • всего {errors.length}</span>
            </div>
          )}
        </>
      ) : (
        <p className="clients-validation__noErrors">Ошибок нет — все клиенты заполнены корректно.</p>
      )}
    </div>
  );
};

export default ClientsValidation;
