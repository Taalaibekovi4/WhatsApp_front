import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paymentOptions, trainers, sports, months, years, days } from "../../Constants/constants";
import "./ClientsFilter.scss";

/** Combobox: typeahead + клавиатура */
const Combobox = ({ name, value, onChange, options, placeholder, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const norm = (s) => (s ?? "").toString().trim().toLowerCase();

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    return options.filter((opt) => norm(opt).includes(q));
  }, [options, query]);

  // закрытие по клику вне
  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // прокрутка к активному элементу
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (val) => {
    onChange({ target: { name, value: val } });
    setQuery("");
    setActiveIndex(-1);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKey = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) commit(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="clients-filter__combo" ref={wrapRef}>
      <div
        className={`clients-filter__combo-control ${open ? "is-open" : ""}`}
        onMouseDown={(e) => {
          if (e.target === inputRef.current) return;
          e.preventDefault();
          inputRef.current?.focus();
          setOpen((v) => !v);
        }}
      >
        <input
          ref={inputRef}
          className="clients-filter__combo-input"
          type="text"
          name={`${name}__combo`}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          value={query || value || ""}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        <span className="clients-filter__combo-deco" aria-hidden="true" />
      </div>

      {open && (
        <ul
          className="clients-filter__combo-list"
          role="listbox"
          ref={listRef}
          aria-label={ariaLabel || placeholder}
        >
          {filtered.length === 0 ? (
            <li className="clients-filter__combo-empty">Ничего не найдено</li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt}
                data-index={idx}
                role="option"
                aria-selected={value === opt}
                className={`clients-filter__combo-item ${
                  idx === activeIndex ? "is-active" : ""
                } ${value === opt ? "is-selected" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

const ClientsFilter = ({ filters, setFilters }) => {
  const handleFilterChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFilters((prev) => ({ ...prev, [name]: value }));
    },
    [setFilters]
  );

  return (
    <div className="clients-filter">
      <div className="clients-filter__container">
        {/* Имя */}
        <input
          className="clients-filter__input"
          type="text"
          name="name"
          autoComplete="off"
          placeholder="Имя"
          value={filters.name}
          onChange={handleFilterChange}
          aria-label="Поиск по имени"
        />

        {/* Тренер */}
        <Combobox
          name="trainer"
          value={filters.trainer}
          onChange={handleFilterChange}
          options={trainers}
          placeholder="Тренер"
          ariaLabel="Тренер"
        />

        {/* Спорт */}
        <Combobox
          name="sport_category"
          value={filters.sport_category}
          onChange={handleFilterChange}
          options={sports}
          placeholder="Спорт"
          ariaLabel="Спорт"
        />

        {/* Год */}
        <select
          className="clients-filter__select"
          name="year"
          value={filters.year}
          onChange={handleFilterChange}
          aria-label="Год"
        >
          <option value="">Год</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Месяц */}
        <select
          className="clients-filter__select"
          name="month"
          value={filters.month}
          onChange={handleFilterChange}
          aria-label="Месяц"
        >
          <option value="">Месяц</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* День */}
        <select
          className="clients-filter__select"
          name="day"
          value={filters.day}
          onChange={handleFilterChange}
          aria-label="День"
        >
          <option value="">День</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Оплата */}
        <select
          className="clients-filter__select"
          name="payment"
          value={filters.payment}
          onChange={handleFilterChange}
          aria-label="Оплата"
        >
          <option value="">Оплата</option>
          {paymentOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ClientsFilter;
