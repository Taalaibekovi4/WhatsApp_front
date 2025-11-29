// src/components/AdminManager/Review/Review.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FaCalendarAlt, FaUsers, FaGlobe, FaVenusMars, FaUser } from "react-icons/fa";
import { months, years, checkFieldOptions, formFieldConfig } from "../../Constants/constants";
import { useClientsStore } from "../../../store/clients";
import "./Review.scss";

const norm = (v) => (v ?? "").toString().trim().toLowerCase();
const getDefaultFilters = () => {
  const d = new Date();
  return { month: months[d.getMonth()] || months[0], year: years[0] };
};

// извлекаем имя менеджера из "(Добавил: Имя)" в конце комментария
const getAddedBy = (comment = "") => {
  const m = String(comment || "").match(/\(Добавил:\s*([^)]+)\)\s*$/i);
  return m ? m[1].trim() : "";
};

const Review = () => {
  // zustand
  const items   = useClientsStore((s) => s.items);
  const loading = useClientsStore((s) => s.loading);
  const error   = useClientsStore((s) => s.error);
  const load    = useClientsStore((s) => s.load);

  // локальные фильтры периода
  const [filters, setFilters] = useState(getDefaultFilters());

  // справочники из formFieldConfig с дефолтами
  const genders = formFieldConfig.find((f) => f.name === "stage")?.options || ["Мужской", "Женский"];
  const clientTypes =
    formFieldConfig.find((f) => f.name === "typeClient")?.options ||
    ["Обычный", "Пробный", "Индивидуальный", "Абонемент"];

  useEffect(() => { load(); }, [load]);

  // данные за выбранный период
  const period = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (c) =>
          c &&
          norm(c.month) === norm(filters.month) &&
          String(c.year).trim() === String(filters.year).trim()
      ),
    [items, filters.month, filters.year]
  );

  // агрегаты
  const students = period.length;

  const sourceData = useMemo(
    () =>
      checkFieldOptions.map((source) => ({
        source,
        count: period.filter((c) => norm(c.check_field) === norm(source)).length,
      })),
    [period]
  );

  const genderData = useMemo(
    () =>
      genders.map((g) => ({
        gender: g,
        count: period.filter((c) => norm(c.stage) === norm(g)).length,
      })),
    [period, genders]
  );

  const typeClientData = useMemo(
    () =>
      clientTypes.map((t) => ({
        type: t,
        count: period.filter((c) => norm(c.typeClient) === norm(t)).length,
      })),
    [period, clientTypes]
  );

  // === менеджеры (сколько добавил каждый) ===
  const managerData = useMemo(() => {
    const map = new Map();
    period.forEach((c) => {
      const name = getAddedBy(c.comment);
      if (!name) return; // без подписи менеджера не учитываем
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([manager, count]) => ({ manager, count }))
      .sort((a, b) => b.count - a.count);
  }, [period]);

  // максимум/итоги для полос
  const totalCount   = useMemo(() => sourceData.reduce((s, i) => s + (Number(i.count) || 0), 0), [sourceData]);
  const maxStudents  = Math.max(students, 1);
  const maxSource    = sourceData.length ? Math.max(...sourceData.map((i) => i.count), 1) : 1;
  const maxGender    = genderData.length ? Math.max(...genderData.map((i) => i.count), 1) : 1;
  const maxType      = typeClientData.length ? Math.max(...typeClientData.map((i) => i.count), 1) : 1;
  const maxManager   = managerData.length ? Math.max(...managerData.map((i) => i.count), 1) : 1;
  const totalManagers = useMemo(() => managerData.reduce((s, i) => s + i.count, 0), [managerData]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(getDefaultFilters()), []);

  return (
    <section className="review" aria-labelledby="review-title">
      <header className="review__header">
        <h2 id="review-title" className="review__title">Панель управления</h2>

        <div className="review__filters" role="group" aria-label="Фильтры">
          <div className="review__filter">
            <FaCalendarAlt className="review__filter-icon" aria-hidden />
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              className="review__select"
              aria-label="Месяц"
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="review__select"
              aria-label="Год"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button type="button" className="review__reset" onClick={resetFilters} aria-label="Сбросить фильтры">
            Сброс
          </button>
        </div>
      </header>

      {loading ? (
        <div className="review__loading" role="status" aria-live="polite">
          <span className="review__spinner" /> Загрузка…
        </div>
      ) : error ? (
        <div className="review__error" role="alert">
          {error}
          <button className="review__retry" type="button" onClick={load}>Повторить</button>
        </div>
      ) : (
        <div className="review__grid">
          {/* Ученики */}
          <article className="review__card">
            <header className="review__card-head">
              <FaUsers className="review__card-icon" aria-hidden />
              <h3 className="review__card-title">Ученики</h3>
            </header>
            <div className="review__list">
              <div className="review__row">
                <span className="review__label">{filters.month} {filters.year}</span>
                <div
                  className="review__bar"
                  style={{ width: `${(students / maxStudents) * 100}%` }}
                  aria-label={`Количество учеников: ${students}`}
                >
                  <span className="review__bar-val">{students}</span>
                </div>
              </div>
            </div>
          </article>

          {/* Источники */}
          <article className="review__card">
            <header className="review__card-head">
              <FaGlobe className="review__card-icon" aria-hidden />
              <h3 className="review__card-title">Источники</h3>
              <span className="review__total">Всего: {totalCount}</span>
            </header>
            <div className="review__list review__list--scroll">
              {sourceData.map((item, i) => (
                <div className="review__row" key={`${item.source}-${i}`}>
                  <span className="review__label">{item.source}</span>
                  <div
                    className="review__bar"
                    style={{ width: `${(item.count / maxSource) * 100}%` }}
                    aria-label={`Источник ${item.source}: ${item.count} клиентов`}
                  >
                    <span className="review__bar-val">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Пол */}
          <article className="review__card">
            <header className="review__card-head">
              <FaVenusMars className="review__card-icon" aria-hidden />
              <h3 className="review__card-title">Пол</h3>
            </header>
            <div className="review__list">
              {genderData.map((g, i) => (
                <div className="review__row" key={`${g.gender}-${i}`}>
                  <span className="review__label">{g.gender}</span>
                  <div
                    className="review__bar"
                    style={{ width: `${(g.count / maxGender) * 100}%` }}
                    aria-label={`Пол ${g.gender}: ${g.count} клиентов`}
                  >
                    <span className="review__bar-val">{g.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Тип клиента */}
          <article className="review__card">
            <header className="review__card-head">
              <FaUser className="review__card-icon" aria-hidden />
              <h3 className="review__card-title">Типы клиентов</h3>
            </header>
            <div className="review__list review__list--scroll">
              {typeClientData.map((t, i) => (
                <div className="review__row" key={`${t.type}-${i}`}>
                  <span className="review__label">{t.type}</span>
                  <div
                    className="review__bar"
                    style={{ width: `${(t.count / maxType) * 100}%` }}
                    aria-label={`Тип клиента ${t.type}: ${t.count} клиентов`}
                  >
                    <span className="review__bar-val">{t.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Менеджеры */}
          <article className="review__card">
            <header className="review__card-head">
              <FaUser className="review__card-icon" aria-hidden />
              <h3 className="review__card-title">Менеджеры</h3>
              {managerData.length > 0 && (
                <span className="review__total">Всего: {totalManagers}</span>
              )}
            </header>
            {managerData.length ? (
              <div className="review__list review__list--scroll">
                {managerData.map((m, i) => (
                  <div className="review__row" key={`${m.manager}-${i}`}>
                    <span className="review__label">{m.manager}</span>
                    <div
                      className="review__bar"
                      style={{ width: `${(m.count / maxManager) * 100}%` }}
                      aria-label={`Менеджер ${m.manager}: ${m.count} записей`}
                    >
                      <span className="review__bar-val">{m.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="review__list">
                <div className="review__row">
                  <span className="review__label">Нет данных (нет подписи «Добавил: …»)</span>
                  <div className="review__bar" style={{ width: "0%" }}>
                    <span className="review__bar-val">0</span>
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
};

export default Review;
