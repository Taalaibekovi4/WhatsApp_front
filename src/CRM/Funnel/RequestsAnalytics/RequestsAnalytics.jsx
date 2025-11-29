import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FiCalendar } from "react-icons/fi";
import "./RequestsAnalytics.scss";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://rasu0101.pythonanywhere.com",
});

const monthOptions = [
  { value: "all", label: "Все месяцы" },
  { value: "1", label: "Январь" },
  { value: "2", label: "Февраль" },
  { value: "3", label: "Март" },
  { value: "4", label: "Апрель" },
  { value: "5", label: "Май" },
  { value: "6", label: "Июнь" },
  { value: "7", label: "Июль" },
  { value: "8", label: "Август" },
  { value: "9", label: "Сентябрь" },
  { value: "10", label: "Октябрь" },
  { value: "11", label: "Ноябрь" },
  { value: "12", label: "Декабрь" },
];

const yearOptions = [
  { value: "all", label: "Все годы" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
];

const normalize = (v) => (v || "").toString().trim().toLowerCase();

const RequestsAnalytics = () => {
  const [data, setData] = useState([]);
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/api/requests/");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        // тихо, как просил
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const m = month === "all" ? null : Number(month);
    const y = year === "all" ? null : Number(year);

    const filtered = data.filter((item) => {
      const d = item.created_at ? new Date(item.created_at) : null;
      if (!d || Number.isNaN(d.getTime())) return false;

      if (m && d.getMonth() + 1 !== m) return false;
      if (y && d.getFullYear() !== y) return false;

      return true;
    });

    const total = filtered.length;
    const accept = filtered.filter((i) => normalize(i.status) === "accept").length;
    const refusal = filtered.filter((i) => normalize(i.status) === "refusal").length;

    return { total, accept, refusal };
  }, [data, month, year]);

  return (
    <div className="req-analytic">
      <div className="req-analytic__header">
        <h2 className="req-analytic__title">Аналитика заявок</h2>

        <div className="req-analytic__filters">
          <FiCalendar className="req-analytic__icon" />
          <select
            className="req-analytic__select"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            className="req-analytic__select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {yearOptions.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="req-analytic__grid">
        <div className="req-analytic__card">
          <span className="req-analytic__label">Всего заявок</span>
          <span className="req-analytic__value">{stats.total}</span>
        </div>

        <div className="req-analytic__card req-analytic__card--accept">
          <span className="req-analytic__label">Принятые</span>
          <span className="req-analytic__value">{stats.accept}</span>
        </div>

        <div className="req-analytic__card req-analytic__card--refusal">
          <span className="req-analytic__label">Отказы</span>
          <span className="req-analytic__value">{stats.refusal}</span>
        </div>
      </div>
    </div>
  );
};

export default RequestsAnalytics;
