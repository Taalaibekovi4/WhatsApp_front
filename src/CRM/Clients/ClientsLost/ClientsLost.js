import React, { useEffect, useMemo, useRef, useState } from "react";
import { months } from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import "./ClientsLost.scss";

const YEARS = ["2025", "2026"];
const PAGE_SIZE = 15;
const MODAL_PAGE_SIZE = 20;

/* ===== Чистый Select (только выбор, со скроллом) ===== */
const Select = ({ value, onChange, options, placeholder, ariaLabel, idSuffix }) => {
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

  const listId = `clients-lost-${idSuffix}-list`;

  return (
    <div className="clients-lost__select" ref={rootRef}>
      <button
        type="button"
        className={`clients-lost__select-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((s) => !s)}
      >
        <span className={`clients-lost__select-value ${value ? "" : "is-placeholder"}`}>
          {value || placeholder}
        </span>
        <span className="clients-lost__select-caret">▾</span>
      </button>

      {open && (
        <div className="clients-lost__select-popover" role="listbox" id={listId}>
          <div className="clients-lost__select-list">
            {options.map((opt) => (
              <div
                key={opt}
                role="option"
                aria-selected={String(value) === String(opt)}
                className={`clients-lost__select-item ${
                  String(value) === String(opt) ? "is-active" : ""
                }`}
                onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
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

/* ===== Пагинация (универсальная) ===== */
const Pagination = ({ page, total, setPage }) => {
  if (total <= 1) return null;
  const max = 7;
  const btns = [];
  let start = Math.max(1, page - 3);
  let end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) btns.push(i);

  return (
    <div className="clients-lost__pagination">
      <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
      {btns.map((n) => (
        <button
          key={n}
          className={`clients-lost__page-btn ${n === page ? "is-active" : ""}`}
          onClick={() => setPage(n)}
        >
          {n}
        </button>
      ))}
      <button onClick={() => setPage((p) => Math.min(total, p + 1))} disabled={page === total}>›</button>
      <button onClick={() => setPage(total)} disabled={page === total}>»</button>
    </div>
  );
};

const ClientsLost = () => {
  const { items, load, error } = useClientsStore();

  const [month1, setMonth1] = useState("");
  const [year1, setYear1] = useState(YEARS[0]);
  const [month2, setMonth2] = useState("");
  const [year2, setYear2] = useState(YEARS[0]);

  // пагинация для двух списков
  const [pagePast, setPagePast] = useState(1);
  const [pageLost, setPageLost] = useState(1);

  // модалка для статистических списков
  const [modal, setModal] = useState({ open: false, title: "", items: [], page: 1 });

  useEffect(() => { load?.(); }, [load]);

  const pastClients = useMemo(() => {
    if (!month1 || !year1) return [];
    return (items || []).filter((c) => String(c.month) === month1 && String(c.year) === year1);
  }, [items, month1, year1]);

  const currentClients = useMemo(() => {
    if (!month2 || !year2) return [];
    return (items || []).filter((c) => String(c.month) === month2 && String(c.year) === year2);
  }, [items, month2, year2]);

  const lostClients = useMemo(() => {
    if (!pastClients.length) return [];
    const currentSet = new Set(currentClients.map((c) => String(c.name || "").toLowerCase()));
    return pastClients.filter((p) => !currentSet.has(String(p.name || "").toLowerCase()));
  }, [pastClients, currentClients]);

  // ===== агрегаты для трёх блоков статистики (с сохранением твоего UX «кнопка открывает модалку»)
  const trainerStats = useMemo(() => {
    const map = new Map();
    for (const c of lostClients) {
      const k = c.trainer || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    }
    return [...map.entries()]
      .map(([trainer, list]) => ({ trainer, count: list.length, clients: list }))
      .sort((a, b) => b.count - a.count);
  }, [lostClients]);

  const sportStats = useMemo(() => {
    const map = new Map();
    for (const c of lostClients) {
      const k = c.sport_category || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    }
    return [...map.entries()]
      .map(([sport, list]) => ({ sport, count: list.length, clients: list }))
      .sort((a, b) => b.count - a.count);
  }, [lostClients]);

  const typeClientStats = useMemo(() => {
    const map = new Map();
    for (const c of lostClients) {
      const k = c.typeClient || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    }
    return [...map.entries()]
      .map(([type, list]) => ({ type, count: list.length, clients: list }))
      .sort((a, b) => b.count - a.count);
  }, [lostClients]);

  // ===== модалка
  const openModal = (title, itemsList) => {
    setModal({ open: true, title, items: itemsList, page: 1 });
    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
  };
  const closeModal = () => {
    setModal((m) => ({ ...m, open: false }));
    document.documentElement.style.overflowY = "";
    document.body.style.overflowY = "";
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    if (modal.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open]);

  // ===== вспомогательное
  const bothPicked = month1 && month2;

  // сбрасываем страницы при смене периода
  useEffect(() => { setPagePast(1); setPageLost(1); }, [month1, year1, month2, year2]);

  // страничные выборки
  const slicePage = (list, page, size) => {
    const total = Math.max(1, Math.ceil(list.length / size));
    const start = (page - 1) * size;
    return { total, items: list.slice(start, start + size) };
  };
  const past = slicePage(pastClients, pagePast, PAGE_SIZE);
  const lost = slicePage(lostClients, pageLost, PAGE_SIZE);

  const modalTotalPages = Math.max(1, Math.ceil(modal.items.length / MODAL_PAGE_SIZE));
  const modalStart = (modal.page - 1) * MODAL_PAGE_SIZE;
  const modalItems = modal.items.slice(modalStart, modalStart + MODAL_PAGE_SIZE);

  const formatClient = (c) =>
    `${c.name || "-"}` +
    (c.trainer ? ` — ${c.trainer}` : "") +
    (c.sport_category ? ` (${c.sport_category})` : "");

  return (
    <div className="clients-lost">
      <h2 className="clients-lost__title">Сравнение клиентов по месяцам</h2>

      <div className="clients-lost__filters">
        <div className="clients-lost__filter">
          <div className="clients-lost__legend">Прошлый месяц</div>
          <Select value={month1} onChange={setMonth1} options={months} placeholder="Выберите месяц" ariaLabel="Прошлый месяц" idSuffix="prev-month" />
          <Select value={year1} onChange={setYear1} options={YEARS}  placeholder="Год"            ariaLabel="Прошлый год"    idSuffix="prev-year"  />
        </div>

        <div className="clients-lost__filter">
          <div className="clients-lost__legend">Текущий месяц</div>
          <Select value={month2} onChange={setMonth2} options={months} placeholder="Выберите месяц" ariaLabel="Текущий месяц" idSuffix="curr-month" />
          <Select value={year2} onChange={setYear2} options={YEARS}  placeholder="Год"            ariaLabel="Текущий год"    idSuffix="curr-year"  />
        </div>
      </div>

      {!bothPicked && <p className="clients-lost__hint">Выберите месяцы для сравнения</p>}
      {error && <p className="clients-lost__error">{error}</p>}

      {bothPicked && (
        <div className="clients-lost__results">
          {/* Прошлый месяц */}
          <section className="clients-lost__section" id="past">
            <h3 className="clients-lost__subtitle">
              Клиенты в {month1} {year1} ({pastClients.length})
            </h3>
            <ul className="clients-lost__list">
              {past.items.map((c) => (
                <li key={c.id} className="clients-lost__item">{c.name} ({c.sport_category})</li>
              ))}
            </ul>
            <Pagination page={pagePast} total={past.total} setPage={setPagePast} />
          </section>

          {/* Не продлили */}
          <section className="clients-lost__section" id="lost">
            <h3 className="clients-lost__subtitle">
              Не продлили в {month2} {year2} ({lostClients.length})
            </h3>
            <ul className="clients-lost__list">
              {lost.items.map((c) => (
                <li key={c.id} className="clients-lost__item">{c.name} ({c.sport_category})</li>
              ))}
            </ul>
            <Pagination page={pageLost} total={lost.total} setPage={setPageLost} />
          </section>

          {/* ====== СТАТИСТИКА ПО ТРЁМ БЛОКАМ (ВЕРНУЛ) ====== */}
          <section className="clients-lost__section">
            <h3 className="clients-lost__subtitle">Статистика по тренерам</h3>
            <ul className="clients-lost__list">
              {trainerStats.map(({ trainer, count, clients }) => (
                <li key={trainer} className="clients-lost__item">
                  <button
                    className="clients-lost__action"
                    type="button"
                    onClick={() => openModal(`Тренер: ${trainer} — ${count}`, clients)}
                    disabled={count === 0}
                  >
                    {trainer}: {count}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="clients-lost__section">
            <h3 className="clients-lost__subtitle">Статистика по видам спорта</h3>
            <ul className="clients-lost__list">
              {sportStats.map(({ sport, count, clients }) => (
                <li key={sport} className="clients-lost__item">
                  <button
                    className="clients-lost__action"
                    type="button"
                    onClick={() => openModal(`Вид спорта: ${sport} — ${count}`, clients)}
                    disabled={count === 0}
                  >
                    {sport}: {count}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="clients-lost__section">
            <h3 className="clients-lost__subtitle">Статистика по типам клиентов</h3>
            <ul className="clients-lost__list">
              {typeClientStats.map(({ type, count, clients }) => (
                <li key={type} className="clients-lost__item">
                  <button
                    className="clients-lost__action"
                    type="button"
                    onClick={() => openModal(`Тип клиента: ${type} — ${count}`, clients)}
                    disabled={count === 0}
                  >
                    {type}: {count}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* ===== МОДАЛКА СО СПИСКОМ И ПАГИНАЦИЕЙ ===== */}
      {modal.open && (
        <div
          className="clients-lost__modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target.classList.contains("clients-lost__modal")) closeModal(); }}
        >
          <div className="clients-lost__modal-content" role="document">
            <div className="clients-lost__modal-header">
              <h4 className="clients-lost__modal-title">{modal.title}</h4>
              <button type="button" className="clients-lost__modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="clients-lost__modal-body">
              {modal.items.length === 0 ? (
                <p className="clients-lost__no-data">Нет данных</p>
              ) : (
                <ul className="clients-lost__modal-list">
                  {modalItems.map((c) => (
                    <li key={c.id} className="clients-lost__modal-item">
                      {formatClient(c)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {modal.items.length > MODAL_PAGE_SIZE && (
              <div className="clients-lost__pagination" role="navigation" aria-label="Пагинация">
                <button className="clients-lost__page-btn" onClick={() => setModal((m) => ({ ...m, page: 1 }))} disabled={modal.page === 1}>«</button>
                <button className="clients-lost__page-btn" onClick={() => setModal((m) => ({ ...m, page: Math.max(1, m.page - 1) }))} disabled={modal.page === 1}>‹</button>
                {Array.from({ length: Math.min(7, modalTotalPages) }, (_, i) => {
                  // короткая пагинация без сложной навигации
                  const n = i + 1;
                  return (
                    <button key={n} className={`clients-lost__page-btn ${n === modal.page ? "is-active" : ""}`} onClick={() => setModal((m) => ({ ...m, page: n }))}>{n}</button>
                  );
                })}
                <button className="clients-lost__page-btn" onClick={() => setModal((m) => ({ ...m, page: Math.min(modalTotalPages, m.page + 1) }))} disabled={modal.page === modalTotalPages}>›</button>
                <button className="clients-lost__page-btn" onClick={() => setModal((m) => ({ ...m, page: modalTotalPages }))} disabled={modal.page === modalTotalPages}>»</button>
                <span className="clients-lost__page-info">{modal.page} / {modalTotalPages} • всего {modal.items.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsLost;
