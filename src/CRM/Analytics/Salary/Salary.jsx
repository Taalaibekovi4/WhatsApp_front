import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  months,
  years,
  days,
  trainers,
  sports,
  paymentOptions,
  typeClients,
  checkFieldOptions,
} from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import {
  FaCalendarAlt,
  FaTimes,
  FaMoneyBillWave,
  FaFilter,
  FaUser,
} from "react-icons/fa";
import "./Salary.scss";

const SUBSCRIPTION_DAYS = 30;
const parsePrice = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const SelectField = ({ name, value, onChange, options, placeholder, className, icon }) => (
  <div className="salary__select-group">
    {icon}
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      className={`salary__select ${className || ""}`}
      aria-label={placeholder}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

const Salary = () => {
  // zustand
  const items   = useClientsStore((s) => s.items);
  const loading = useClientsStore((s) => s.loading);
  const error   = useClientsStore((s) => s.error);
  const load    = useClientsStore((s) => s.load);

  const [filters, setFilters] = useState({
    year: "",
    month: "",
    day: "",
    trainer: "",
    sport_category: "",
    typeClient: "",
    payment: "",
    check_field: "",
  });
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);

  useEffect(() => {
    if (!items?.length) load();
  }, [items?.length, load]);

  // приведение и дедуп
  const clients = useMemo(() => {
    const data = Array.isArray(items) ? items : [];
    const valid = data.filter((client) => {
      if (
        !client || !client.id || !client.day || !client.month || !client.year ||
        !client.price || !client.trainer || !client.sport_category ||
        !client.typeClient || !client.payment
      ) return false;

      const price = parsePrice(client.price);
      const mIdx = months.indexOf(client.month);
      if (mIdx === -1) return false;

      const date = new Date(`${client.year}-${mIdx + 1}-${client.day}`);
      return !Number.isNaN(date.getTime()) && price > 0;
    });

    const seen = new Set();
    const unique = [];
    for (const c of valid) {
      const key = `${(c.name || "").toLowerCase()}|${c.month}|${c.year}|${(c.sport_category || "").toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); unique.push(c); }
    }
    return unique;
  }, [items]);

  // handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      year: "",
      month: "",
      day: "",
      trainer: "",
      sport_category: "",
      typeClient: "",
      payment: "",
      check_field: "",
    });
  }, []);

  const handleRetry = useCallback(() => { load(); }, [load]);
  const toggleFilters = useCallback(() => setIsFiltersVisible((p) => !p), []);

  // основная агрегация
  const { incomeByDate, clientsByMonth, totalIncome, sortedIncome } = useMemo(() => {
    const income = {};
    const byMonth = {};

    if (!Object.values(filters).some((v) => v !== "")) {
      return { incomeByDate: income, clientsByMonth: byMonth, totalIncome: 0, sortedIncome: [] };
    }

    clients.forEach((client) => {
      const {
        day, month, year, price,
        trainer, sport_category, typeClient, payment, check_field, name,
      } = client;

      const startMonthIndex = months.indexOf(month);
      if (startMonthIndex === -1) return;

      const startDate = new Date(`${year}-${startMonthIndex + 1}-${day}`);
      if (startDate.toString() === "Invalid Date") return;

      const cleanedPrice = parsePrice(price);
      if (cleanedPrice <= 0) return;

      // распарсить "дату оплаты" из startDate
      const payYear  = String(startDate.getFullYear());
      const payDay   = String(startDate.getDate());

      // фильтры (месяц отдельно учитываем при распределении)
      if (
        (filters.year && filters.year !== payYear) ||
        (filters.day && filters.day !== payDay) ||
        (filters.trainer && filters.trainer.trim().toLowerCase() !== trainer.trim().toLowerCase()) ||
        (filters.sport_category && filters.sport_category.trim().toLowerCase() !== sport_category.trim().toLowerCase()) ||
        (filters.typeClient && filters.typeClient.trim().toLowerCase() !== typeClient.trim().toLowerCase()) ||
        (filters.payment && filters.payment.trim().toLowerCase() !== payment.trim().toLowerCase()) ||
        (filters.check_field && filters.check_field.trim().toLowerCase() !== (check_field || "").trim().toLowerCase())
      ) {
        return;
      }

      // делим на 30 дней: часть может уйти в след. месяц
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + SUBSCRIPTION_DAYS - 1);

      const sM = startDate.getMonth();
      const sY = startDate.getFullYear();
      const eM = endDate.getMonth();
      const eY = endDate.getFullYear();
      const eD = endDate.getDate();

      const daysInStartMonth = new Date(sY, sM + 1, 0).getDate();
      const remainingStart   = daysInStartMonth - startDate.getDate() + 1;

      let curMonthPrice = cleanedPrice;
      let nextMonthPrice = 0;

      if (sM !== eM || sY !== eY) {
        const daysInSecond = endDate.getDate();
        curMonthPrice  = (cleanedPrice * remainingStart) / SUBSCRIPTION_DAYS;
        nextMonthPrice = (cleanedPrice * daysInSecond) / SUBSCRIPTION_DAYS;
      }

      const curKey  = `${months[sM]} ${sY}`;
      const nextKey = `${months[eM % 12]} ${eY}`;

      const curRelevant  = !filters.month || filters.month === months[sM];
      const nextRelevant = nextMonthPrice > 0 && (!filters.month || filters.month === months[eM % 12]);

      if (curRelevant) {
        income[curKey] = (income[curKey] || 0) + curMonthPrice;
        if (!byMonth[curKey]) byMonth[curKey] = [];
        byMonth[curKey].push({
          name,
          price: curMonthPrice,
          startDate: `${day} ${month} ${year}`,
          endDate:   `${eD} ${months[eM % 12]} ${eY}`,
          split: nextMonthPrice > 0
            ? `${curMonthPrice.toFixed(2)} сом (из ${cleanedPrice.toFixed(2)})`
            : `${cleanedPrice.toFixed(2)} сом`,
        });
      }

      if (nextRelevant) {
        income[nextKey] = (income[nextKey] || 0) + nextMonthPrice;
        if (!byMonth[nextKey]) byMonth[nextKey] = [];
        byMonth[nextKey].push({
          name,
          price: nextMonthPrice,
          startDate: `${day} ${month} ${year}`,
          endDate:   `${eD} ${months[eM % 12]} ${eY}`,
          split: `${nextMonthPrice.toFixed(2)} сом (из ${cleanedPrice.toFixed(2)})`,
        });
      }
    });

    const sorted = Object.entries(income).sort(([da], [db]) => {
      const [ma, ya] = da.split(" ");
      const [mb, yb] = db.split(" ");
      const ia = months.indexOf(ma);
      const ib = months.indexOf(mb);
      return ya !== yb ? ya.localeCompare(yb) : ia - ib;
    });

    const total = Object.values(income).reduce((a, v) => a + v, 0);

    return { incomeByDate: income, clientsByMonth: byMonth, totalIncome: total, sortedIncome: sorted };
  }, [clients, filters]);

  // добавляем 60% и 40% от итога
  const sixtyPart = (totalIncome * 0.6).toFixed(2);
  const fortyPart = (totalIncome * 0.4).toFixed(2);

  return (
    <div className="salary">
      <div className="salary__header">
        <h1 className="salary__title">Доход</h1>

        <div className="salary__filters-container">
          <button
            type="button"
            className="salary__toggle-filters"
            onClick={toggleFilters}
            aria-label={isFiltersVisible ? "Скрыть фильтры" : "Показать фильтры"}
            aria-expanded={isFiltersVisible}
            title="Фильтры"
          >
            <FaFilter size={14} />
          </button>

          <div className={`salary__filters ${isFiltersVisible ? "" : "salary__filters--hidden"}`}>
            <SelectField name="year"  value={filters.year}  onChange={handleFilterChange} options={years}  placeholder="Год"   icon={<FaCalendarAlt size={14} />} />
            <SelectField name="month" value={filters.month} onChange={handleFilterChange} options={months} placeholder="Месяц" icon={<FaCalendarAlt size={14} />} />
            <SelectField name="day"   value={filters.day}   onChange={handleFilterChange} options={days}   placeholder="День"  icon={<FaCalendarAlt size={14} />} />
            <SelectField name="trainer" value={filters.trainer} onChange={handleFilterChange} options={trainers} placeholder="Тренер" icon={<FaUser size={14} />} />
            <SelectField name="sport_category" value={filters.sport_category} onChange={handleFilterChange} options={sports} placeholder="Спорт" icon={<FaUser size={14} />} />
            <SelectField name="typeClient" value={filters.typeClient} onChange={handleFilterChange} options={typeClients} placeholder="Тип клиента" icon={<FaUser size={14} />} />
            <SelectField name="payment" value={filters.payment} onChange={handleFilterChange} options={paymentOptions.map((o) => o.value)} placeholder="Оплата" icon={<FaMoneyBillWave size={14} />} />
            <SelectField name="check_field" value={filters.check_field} onChange={handleFilterChange} options={checkFieldOptions} placeholder="Источник" icon={<FaUser size={14} />} />

            <button
              type="button"
              className="salary__reset-btn"
              onClick={handleResetFilters}
              aria-label="Сбросить фильтры"
              title="Сбросить фильтры"
            >
              <FaTimes size={14} /> Сброс
            </button>
          </div>
        </div>
      </div>

      <div className={`salary__content ${loading ? "salary__content--loading" : ""}`}>
        {loading ? (
          <div className="salary__loading" role="status" aria-live="polite">
            <span className="salary__loading-spinner" /> Загрузка...
          </div>
        ) : error ? (
          <div className="salary__error" role="alert">
            {error}
            <button type="button" className="salary__retry-btn" onClick={handleRetry} aria-label="Повторить загрузку">
              Повторить
            </button>
          </div>
        ) : sortedIncome.length > 0 && totalIncome > 0 ? (
          <div className="salary__results">
            <div className="salary__total">
              <FaMoneyBillWave size={16} /> Итого: {totalIncome.toFixed(2)} сом
              <span className="salary__pill" title="60% от итога">60%: {sixtyPart} сом</span>
              <span className="salary__pill" title="40% от итога">40%: {fortyPart} сом</span>
            </div>

            <h3 className="salary__distribution-title">Распределение дохода</h3>

            <div className="salary__cards">
              {sortedIncome.map(([date, amount], index) => (
                <div key={date} className="salary__card" style={{ animationDelay: `${index * 0.08}s` }}>
                  <div className="salary__card-header">{date}</div>

                  <div className="salary__card-content">
                    <span className="salary__card-amount">
                      <FaMoneyBillWave size={14} /> {amount.toFixed(2)} сом
                    </span>

                    <div
                      className="salary__bar"
                      style={{ width: `${(amount / totalIncome) * 100}%` }}
                      aria-label={`Доход за ${date}: ${amount.toFixed(2)} сом`}
                    />

                    <div className="salary__client-list">
                      {clientsByMonth[date]?.map((c, idx) => (
                        <div key={`${c.name}-${idx}`} className="salary__client-item">
                          {c.name}: {c.split}, {c.startDate} – {c.endDate}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="salary__no-data">
            Нет данных для выбранных фильтров или выберите фильтры
          </div>
        )}
      </div>
    </div>
  );
};

export default Salary;
