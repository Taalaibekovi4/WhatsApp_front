// src/components/NewClients/NewClients.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useClientsStore } from "../../../store/clients"; // <-- zustand
import {
  months,
  years,
  trainers,
  sports,
  typeClients,
  checkFieldOptions,
} from "../../Constants/constants";
import "./NewClients.scss";

const PAGE_SIZE = 15;

const Modal = ({ open, title, onClose, items, renderItem }) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / PAGE_SIZE));
  const pageItems = useMemo(
    () => (items || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page]
  );

  const pagesToShow = useMemo(() => {
    const maxButtons = 7;
    const xs = [];
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) xs.push(i);
    return xs;
  }, [page, totalPages]);

  useEffect(() => { setPage(1); }, [items]);

  if (!open) return null;
  return (
    <div className="new-clients__modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="new-clients__modal-content">
        <button
          type="button"
          className="new-clients__modal-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h3 className="new-clients__modal-title">{title}</h3>

        <div className="new-clients__modal-list">
          {(pageItems || []).length === 0 ? (
            <p className="new-clients__muted">Нет данных</p>
          ) : (
            <ul className="new-clients__sublist new-clients__sublist--modal">
              {pageItems.map(renderItem)}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <nav className="new-clients__pagination" aria-label="Пагинация">
            <button
              className="new-clients__page-btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="Первая страница"
            >«</button>
            <button
              className="new-clients__page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Предыдущая"
            >‹</button>
            {pagesToShow.map((n) => (
              <button
                key={n}
                className={`new-clients__page-btn ${n === page ? "is-active" : ""}`}
                onClick={() => setPage(n)}
                aria-current={n === page ? "page" : undefined}
              >
                {n}
              </button>
            ))}
            <button
              className="new-clients__page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Следующая"
            >›</button>
            <button
              className="new-clients__page-btn"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Последняя страница"
            >»</button>
            <span className="new-clients__page-info">{page} / {totalPages}</span>
          </nav>
        )}
      </div>
    </div>
  );
};

const NewClients = () => {
  const { items: clients, loading, error, load } = useClientsStore();

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025");

  const [modal, setModal] = useState({ open: false, title: "", items: [] });

  // combobox (typeahead) по новым клиентам
  const [query, setQuery] = useState("");
  const [openCombo, setOpenCombo] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    if (!clients.length) load();
  }, [clients.length, load]);

  const newClients = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    const monthIdx = months.indexOf(selectedMonth);
    const yearNum = parseInt(selectedYear, 10);

    const current = clients.filter((c) => c.month === selectedMonth && c.year === selectedYear);

    const previous = clients.filter((c) => {
      const y = parseInt(c.year, 10);
      const mIdx = months.indexOf(c.month);
      return y < yearNum || (y === yearNum && mIdx < monthIdx);
    });

    return current.filter(
      (curr) =>
        !previous.some(
          (prev) => (prev.name || "").trim().toLowerCase() === (curr.name || "").trim().toLowerCase()
        )
    );
  }, [clients, selectedMonth, selectedYear]);

  // combobox подсказки
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const uniq = Array.from(new Set(newClients.map((c) => c.name || "Без имени")));
    return uniq.filter((n) => n.toLowerCase().includes(q)).slice(0, 12);
  }, [newClients, query]);

  // фильтрация отображаемого основного списка по запросу
  const filteredNew = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return newClients;
    return newClients.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [newClients, query]);

  // агрегаты для секций
  const trainerStats = useMemo(
    () =>
      trainers
        .map((t) => {
          const list = filteredNew.filter((c) => c.trainer === t);
          return { trainer: t, count: list.length, clients: list };
        })
        .sort((a, b) => b.count - a.count),
    [filteredNew]
  );

  const sportStats = useMemo(
    () =>
      sports
        .map((s) => {
          const list = filteredNew.filter((c) => c.sport_category === s);
          return { sport: s, count: list.length, clients: list };
        })
        .sort((a, b) => b.count - a.count),
    [filteredNew]
  );

  const typeClientStats = useMemo(
    () =>
      typeClients
        .map((t) => {
          const list = filteredNew.filter((c) => c.typeClient === t);
          return { type: t, count: list.length, clients: list };
        })
        .sort((a, b) => b.count - a.count),
    [filteredNew]
  );

  const sourceStats = useMemo(
    () =>
      checkFieldOptions
        .map((s) => {
          const list = filteredNew.filter((c) => c.check_field === s);
          return { source: s, count: list.length, clients: list };
        })
        .sort((a, b) => b.count - a.count),
    [filteredNew]
  );

  // пагинация главного списка
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filteredNew]);

  const totalPages = Math.max(1, Math.ceil(filteredNew.length / PAGE_SIZE));
  const mainPageItems = filteredNew.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagesToShow = useMemo(() => {
    const maxButtons = 7;
    const xs = [];
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) xs.push(i);
    return xs;
  }, [page, totalPages]);

  // combobox навигация
  const onComboKeyDown = (e) => {
    if (!openCombo && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenCombo(true);
      return;
    }
    if (!openCombo) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        setQuery(suggestions[activeIdx]);
        setOpenCombo(false);
      }
    } else if (e.key === "Escape") {
      setOpenCombo(false);
    }
  };

  const openGroupModal = (title, list) => {
    setModal({ open: true, title, items: list || [] });
  };

  return (
    <section className="new-clients" aria-labelledby="new-clients-title">
      <header className="new-clients__header">
        <h2 id="new-clients-title" className="new-clients__title">Новые клиенты</h2>

        <div className="new-clients__filters">
          <div className="new-clients__filter">
            <label className="new-clients__label">Период</label>
            <div className="new-clients__period">
              <select
                className="new-clients__select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Выберите месяц"
              >
                <option value="" disabled>Месяц</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="new-clients__select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Выберите год"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Combobox с typeahead-поиском */}
          <div className="new-clients__filter new-clients__filter--combo">
            <label className="new-clients__label">Поиск</label>
            <div className="new-clients__combo" role="combobox" aria-expanded={openCombo}>
              <input
                className="new-clients__combo-input"
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpenCombo(true); setActiveIdx(-1); }}
                onFocus={() => setOpenCombo(true)}
                onBlur={() => setTimeout(() => setOpenCombo(false), 120)}
                onKeyDown={onComboKeyDown}
                placeholder="Имя клиента"
                aria-label="Поиск по имени"
                autoComplete="off"
              />
              {openCombo && suggestions.length > 0 && (
                <ul className="new-clients__combo-list" role="listbox">
                  {suggestions.map((s, idx) => (
                    <li
                      key={`${s}-${idx}`}
                      role="option"
                      aria-selected={idx === activeIdx}
                      className={`new-clients__combo-item ${idx === activeIdx ? "is-active" : ""}`}
                      onMouseDown={() => { setQuery(s); setOpenCombo(false); }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="new-clients__loading" role="status" aria-live="polite">
          <span className="new-clients__spinner" />
          Загрузка…
        </div>
      ) : error ? (
        <>
          <p className="new-clients__error" role="alert">{error}</p>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button className="new-clients__page-btn" onClick={load}>Повторить</button>
          </div>
        </>
      ) : (
        <div className="new-clients__grid">
          {/* Главный список */}
          <article className="new-clients__card new-clients__card--full">
            <header className="new-clients__card-head">
              <h3 className="new-clients__subtitle">
                Новые клиенты в {selectedMonth || "…"} {selectedYear} ({filteredNew.length})
              </h3>
            </header>

            <div className="new-clients__list-wrap">
              <ul className="new-clients__list">
                {mainPageItems.length === 0 ? (
                  <li className="new-clients__muted">Нет данных</li>
                ) : (
                  mainPageItems.map((c) => (
                    <li key={c.id} className="new-clients__item">
                      <span className="new-clients__chip">{c.sport_category || "-"}</span>
                      {c.name}
                    </li>
                  ))
                )}
              </ul>
            </div>

            {totalPages > 1 && (
              <nav className="new-clients__pagination" aria-label="Пагинация">
                <button
                  className="new-clients__page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="Первая страница"
                >«</button>
                <button
                  className="new-clients__page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Предыдущая"
                >‹</button>
                {pagesToShow.map((n) => (
                  <button
                    key={n}
                    className={`new-clients__page-btn ${n === page ? "is-active" : ""}`}
                    onClick={() => setPage(n)}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="new-clients__page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Следующая"
                >›</button>
                <button
                  className="new-clients__page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Последняя страница"
                >»</button>
                <span className="new-clients__page-info">{page} / {totalPages}</span>
              </nav>
            )}
          </article>

          {/* Сводки + модалки */}
          <article className="new-clients__card">
            <header className="new-clients__card-head">
              <h3 className="new-clients__subtitle">Тренеры</h3>
            </header>
            <ul className="new-clients__stats">
              {trainerStats.map(({ trainer, count, clients: list }) => (
                <li key={trainer} className="new-clients__stat">
                  <button
                    type="button"
                    className="new-clients__action"
                    onClick={() => openGroupModal(`Тренер: ${trainer} — ${count}`, list)}
                  >
                    <span className="new-clients__stat-name">{trainer}</span>
                    <span className="new-clients__badge">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="new-clients__card">
            <header className="new-clients__card-head">
              <h3 className="new-clients__subtitle">Виды спорта</h3>
            </header>
            <ul className="new-clients__stats">
              {sportStats.map(({ sport, count, clients: list }) => (
                <li key={sport} className="new-clients__stat">
                  <button
                    type="button"
                    className="new-clients__action"
                    onClick={() => openGroupModal(`Вид спорта: ${sport} — ${count}`, list)}
                  >
                    <span className="new-clients__stat-name">{sport}</span>
                    <span className="new-clients__badge">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="new-clients__card">
            <header className="new-clients__card-head">
              <h3 className="new-clients__subtitle">Типы клиентов</h3>
            </header>
            <ul className="new-clients__stats">
              {typeClientStats.map(({ type, count, clients: list }) => (
                <li key={type} className="new-clients__stat">
                  <button
                    type="button"
                    className="new-clients__action"
                    onClick={() => openGroupModal(`Тип: ${type} — ${count}`, list)}
                  >
                    <span className="new-clients__stat-name">{type}</span>
                    <span className="new-clients__badge">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="new-clients__card">
            <header className="new-clients__card-head">
              <h3 className="new-clients__subtitle">Источники</h3>
            </header>
            <ul className="new-clients__stats">
              {sourceStats.map(({ source, count, clients: list }) => (
                <li key={source} className="new-clients__stat">
                  <button
                    type="button"
                    className="new-clients__action"
                    onClick={() => openGroupModal(`Источник: ${source} — ${count}`, list)}
                  >
                    <span className="new-clients__stat-name">{source}</span>
                    <span className="new-clients__badge">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </div>
      )}

      <Modal
        open={modal.open}
        title={modal.title}
        items={modal.items}
        onClose={() => setModal({ open: false, title: "", items: [] })}
        renderItem={(c) => (
          <li key={c.id} className="new-clients__subitem">
            <span className="new-clients__chip">{c.sport_category || "-"}</span>
            {c.name} <span className="new-clients__muted">({c.trainer || "—"})</span>
          </li>
        )}
      />
    </section>
  );
};

export default NewClients;
