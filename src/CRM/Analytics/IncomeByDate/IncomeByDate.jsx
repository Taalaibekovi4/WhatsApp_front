import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  months,
  years,
  days,
  trainers,
  sports,
  paymentOptions,
  formFieldConfig,
} from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import {
  FaCalendarAlt,
  FaTimes,
  FaMoneyBillWave,
  FaFilter,
  FaUser,
} from "react-icons/fa";
import "./IncomeByDate.scss";

/* small helpers */
const norm = (v) => (v ?? "").toString().trim().toLowerCase();
const parsePrice = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const SelectField = ({
  name,
  value,
  onChange,
  options,
  placeholder,
  className,
  icon,
}) => (
  <div className="income-by-date__select-group">
    {icon}
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      className={`income-by-date__select ${className || ""}`}
      aria-label={placeholder}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const IncomeByDate = () => {
  // zustand store
  const items = useClientsStore((s) => s.items);
  const loading = useClientsStore((s) => s.loading);
  const error = useClientsStore((s) => s.error);
  const load = useClientsStore((s) => s.load);

  // UI state
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [filters, setFilters] = useState({
    year: "2025",
    month: "",
    day: "",
    trainer: "",
    sport_category: "",
    typeClient: "",
    payment: "",
  });

  const clientTypes =
    formFieldConfig.find((f) => f.name === "typeClient")?.options || [
      "Обычный",
      "Пробный",
      "Индивидуальный",
      "Абонемент",
    ];

  // initial load
  useEffect(() => {
    if (!items?.length) load();
  }, [items?.length, load]);

  // only valid clients (guarded)
  const validClients = useMemo(() => {
    return (Array.isArray(items) ? items : []).filter((c) => {
      if (
        !c ||
        !c.id ||
        !c.dataCassa ||
        !c.price ||
        !c.trainer ||
        !c.sport_category ||
        !c.typeClient ||
        !c.payment ||
        !c.name
      )
        return false;

      const date = new Date(c.dataCassa);
      const price = parsePrice(c.price);
      return typeof c.dataCassa === "string" && !Number.isNaN(date.getTime()) && price > 0;
    });
  }, [items]);

  // handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      year: "2025",
      month: "",
      day: "",
      trainer: "",
      sport_category: "",
      typeClient: "",
      payment: "",
    });
  }, []);

  const handleRetry = useCallback(() => {
    load();
  }, [load]);

  const toggleFilters = useCallback(
    () => setIsFiltersVisible((v) => !v),
    []
  );

  // calculation
  const { total, clients: filteredClients } = useMemo(() => {
    if (!filters.day || !filters.month || !filters.year) {
      return { total: 0, clients: [] };
    }

    const mmIndex = months.indexOf(filters.month); // 0..11
    if (mmIndex < 0) return { total: 0, clients: [] };

    const filtered = validClients.filter((c) => {
      const d = new Date(c.dataCassa);
      if (Number.isNaN(d.getTime())) return false;

      const sameDate =
        d.getFullYear().toString() === filters.year &&
        months[d.getMonth()] === filters.month &&
        d.getDate().toString() === filters.day;

      if (!sameDate) return false;

      const trainerOk =
        !filters.trainer || norm(c.trainer) === norm(filters.trainer);
      const sportOk =
        !filters.sport_category ||
        norm(c.sport_category) === norm(filters.sport_category);
      const typeOk =
        !filters.typeClient || norm(c.typeClient) === norm(filters.typeClient);
      const paymentOk =
        !filters.payment || norm(c.payment) === norm(filters.payment);

      return trainerOk && sportOk && typeOk && paymentOk;
    });

    const sum = filtered.reduce((acc, c) => acc + parsePrice(c.price), 0);
    return { total: sum, clients: filtered };
  }, [filters, validClients]);

  return (
    <div className="income-by-date">
      <div className="income-by-date__header">
        <h1 className="income-by-date__title">Доход по дате</h1>

        <div className="income-by-date__filters-container">
          <button
            type="button"
            className="income-by-date__toggle-filters"
            onClick={toggleFilters}
            aria-label={isFiltersVisible ? "Скрыть фильтры" : "Показать фильтры"}
            aria-expanded={isFiltersVisible}
            title="Фильтры"
          >
            <FaFilter size={14} />
          </button>

          <div
            className={`income-by-date__filters ${
              isFiltersVisible ? "" : "income-by-date__filters--hidden"
            }`}
          >
            <SelectField
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              options={years}
              placeholder="Год"
              icon={<FaCalendarAlt size={14} />}
            />
            <SelectField
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              options={months}
              placeholder="Месяц"
              icon={<FaCalendarAlt size={14} />}
            />
            <SelectField
              name="day"
              value={filters.day}
              onChange={handleFilterChange}
              options={days}
              placeholder="День"
              icon={<FaCalendarAlt size={14} />}
            />
            <SelectField
              name="trainer"
              value={filters.trainer}
              onChange={handleFilterChange}
              options={trainers}
              placeholder="Тренер"
              icon={<FaUser size={14} />}
            />
            <SelectField
              name="sport_category"
              value={filters.sport_category}
              onChange={handleFilterChange}
              options={sports}
              placeholder="Спорт"
              icon={<FaUser size={14} />}
            />
            <SelectField
              name="typeClient"
              value={filters.typeClient}
              onChange={handleFilterChange}
              options={clientTypes}
              placeholder="Тип клиента"
              icon={<FaUser size={14} />}
            />
            <SelectField
              name="payment"
              value={filters.payment}
              onChange={handleFilterChange}
              options={paymentOptions.map((o) => o.value)}
              placeholder="Оплата"
              icon={<FaMoneyBillWave size={14} />}
            />

            <button
              type="button"
              className="income-by-date__reset-btn"
              onClick={handleResetFilters}
              aria-label="Сбросить фильтры"
              title="Сбросить фильтры"
            >
              <FaTimes size={14} /> Сброс
            </button>
          </div>
        </div>
      </div>

      <div
        className={`income-by-date__content ${
          loading ? "income-by-date__content--loading" : ""
        }`}
      >
        {loading ? (
          <div className="income-by-date__loading" role="status" aria-live="polite">
            <span className="income-by-date__loading-spinner" />
            Загрузка...
          </div>
        ) : error ? (
          <div className="income-by-date__error" role="alert">
            {error}
            <button
              type="button"
              className="income-by-date__retry-btn"
              onClick={handleRetry}
              aria-label="Повторить загрузку"
            >
              Повторить
            </button>
          </div>
        ) : filters.day && filters.month && filters.year ? (
          <div className="income-by-date__results">
            <div className="income-by-date__total">
              <FaMoneyBillWave size={16} /> Итого: {total.toFixed(2)} сом
            </div>

            {filteredClients.length > 0 ? (
              <div className="income-by-date__clients">
                <h3 className="income-by-date__clients-title">
                  Клиенты за {filters.day} {filters.month} {filters.year}
                </h3>

                <div className="income-by-date__client-list">
                  {filteredClients.map((client, index) => {
                    const amount = parsePrice(client.price).toFixed(2);
                    return (
                      <div
                        key={client.id}
                        className="income-by-date__client"
                        style={{ animationDelay: `${index * 0.08}s` }}
                        aria-label={`Клиент: ${client.name}, Сумма: ${amount} сом`}
                      >
                        <span className="income-by-date__client-name">{client.name}</span>
                        <span className="income-by-date__client-amount">{amount} сом</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="income-by-date__no-data">
                Нет данных за выбранную дату
              </div>
            )}
          </div>
        ) : (
          <div className="income-by-date__no-data">
            Выберите дату для отображения дохода
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeByDate;
