// src/Funnel/LeadsAnalytics/LeadsAnalytics.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import { FiCalendar } from "react-icons/fi";
import "./LeadsAnalytics.scss";

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

const EMPTY_STATS = {
  year: null,
  month: null,
  contacts_total: 0, // Первый контакт
  trial_total: 0, // Пробная тренировка
  thinking_total: 0, // Ушли подумать
  bought_total: 0, // Купили
  refused_total: 0, // Отказ
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeArr = (v) => (Array.isArray(v) ? v : []);
const normalizeText = (v) => (v || "").toString().trim();

/** ---- КОНСТАНТЫ ДЛЯ ВАРИАНТОВ ---- */

// тип клиента
const CLIENT_TYPE_VARIANTS = [
  { key: "adult", label: "Для себя (взрослые)" },
  { key: "child", label: "Для детей" },
  { key: "unknown", label: "Не указано" },
];

// виды спорта (как в модалке)
const SPORTS_BASE = [
  "Не выбран",
  "Бокс",
  "Борьба",
  "Греко-римская борьба",
  "Дзюдо",
  "Кикбокс",
  "Кроссфит",
  "Кулату",
  "Самбо",
  "Тхэквондо",
];

// тренеры (как в модалке)
const TRAINERS_BASE = [
  "Не выбран",
  "Асанбаев Эрлан",
  "Азизбек Улуу Баяман",
  "Жумалы Улуу Ариет",
  "Калмамат Улуу Акай",
  "Машрапов Жумабай",
  "Машрапов Тилек",
  "Медербек Улуу Сафармурат",
  "Минбаев Сулайман",
  "Мойдунов Мирлан",
  "Сыдыков Алайбек",
  "Пазылов Кутман",
  "Тажибаев Азамат",
  "Тургунов Ислам",
];

// статусы до пробной
const PRE_TRIAL_VARIANTS = [
  { value: "", label: "Не выбрано" },
  { value: "confirmed", label: "Подтвердили" },
  { value: "rescheduled", label: "Перенесли" },
  { value: "ignored", label: "Игнор" },
  { value: "declined", label: "Отказ" },
];

// статусы пробной
const TRIAL_VARIANTS = [
  { value: "", label: "Не выбрано" },
  { value: "confirmed", label: "Пришли" },
  { value: "rescheduled", label: "Перенесли" },
  { value: "ignored", label: "Не вышли на связь" },
  { value: "declined", label: "Отказались" },
];

// результат
const RESULT_VARIANTS = [
  { value: "", label: "Не выбрано" },
  { value: "bought", label: "Купили" },
  { value: "thinking", label: "Ушли подумать" },
  { value: "declined", label: "Отказались" },
];

/** нормализуем сырую строку канала в один ключ */
const normalizeChannelKey = (channel) => {
  const v = (channel || "").toString().trim().toLowerCase();
  if (!v) return "unknown";
  if (v.includes("whats")) return "whatsapp";
  if (v.includes("inst")) return "instagram";
  if (v.includes("звон")) return "call";
  return v;
};

/** красивое имя канала по нормализованному ключу */
const mapChannelLabel = (key) => {
  const k = (key || "").toString().trim().toLowerCase();
  if (!k || k === "unknown") return "Не указан";
  if (k === "whatsapp") return "WhatsApp";
  if (k === "instagram") return "Instagram";
  if (k === "call") return "Звонок";
  return key;
};

/** map client_type -> key */
const getClientTypeKey = (v) => {
  const s = (v || "").toString().trim().toLowerCase();
  if (s === "adult") return "adult";
  if (s === "child") return "child";
  return "unknown";
};

/** нормализация значения статуса: "", null, "none" => "" */
const normalizeStatusValue = (v) => {
  const s = (v || "").toString().trim().toLowerCase();
  if (!s || s === "none") return "";
  return s;
};

const LeadsAnalytics = () => {
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");

  // СТАРАЯ БЕКОВСКАЯ АНАЛИТИКА
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");

  // Лиды для новых блоков
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  /** ---- бековская /api/analytics/ (НЕ ЛОМАЕМ) ---- */
  const loadAnalytics = useCallback(async () => {
    setLoadingStats(true);
    setError("");
    setStats(EMPTY_STATS);

    try {
      const params = {};
      if (month !== "all") params.month = Number(month);
      if (year !== "all") params.year = Number(year);

      const { data } = await API.get("/api/analytics/", { params });

      const src = Array.isArray(data)
        ? data[0] || {}
        : typeof data === "object"
        ? data
        : {};

      setStats({
        year: src.year ?? null,
        month: src.month ?? null,
        contacts_total: toNumber(src.contacts_total),
        trial_total: toNumber(src.trial_total),
        thinking_total: toNumber(src.thinking_total),
        bought_total: toNumber(src.bought_total),
        refused_total: toNumber(src.refused_total),
      });
    } catch (err) {
      console.error("Ошибка загрузки аналитики лидов:", err);
      setError("Не удалось загрузить аналитику по лидам.");
      setStats(EMPTY_STATS);
    } finally {
      setLoadingStats(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  /** ---- загрузка всех лидов ---- */
  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const { data } = await API.get("/api/leads/");
      setLeads(safeArr(data));
    } catch (err) {
      console.error("Ошибка загрузки лидов для аналитики:", err);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  /** ---- фильтр лидов по месяцу+году ---- */
  const filteredLeads = useMemo(() => {
    const monthNum = month === "all" ? null : Number(month);
    const yearNum = year === "all" ? null : Number(year);

    if (!monthNum && !yearNum) return safeArr(leads);

    return safeArr(leads).filter((lead) => {
      if (!lead.created_at) return false;
      const d = new Date(lead.created_at);
      if (Number.isNaN(d.getTime())) return false;
      if (monthNum && d.getMonth() + 1 !== monthNum) return false;
      if (yearNum && d.getFullYear() !== yearNum) return false;
      return true;
    });
  }, [leads, month, year]);

  const anyLoading = loadingStats || loadingLeads;

  /** ---- по каналу ---- */
  const byChannel = useMemo(() => {
    const map = new Map();
    filteredLeads.forEach((l) => {
      const key = normalizeChannelKey(l.channel);
      const label = mapChannelLabel(key);
      map.set(label, (map.get(label) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  /** ---- Для себя / Для детей (всегда показываем все варианты) ---- */
  const byClientType = useMemo(() => {
    const counts = CLIENT_TYPE_VARIANTS.reduce((acc, v) => {
      acc[v.key] = 0;
      return acc;
    }, {});

    filteredLeads.forEach((l) => {
      const key = getClientTypeKey(l.client_type);
      counts[key] = (counts[key] || 0) + 1;
    });

    return CLIENT_TYPE_VARIANTS.map((v) => ({
      label: v.label,
      total: counts[v.key] || 0,
    }));
  }, [filteredLeads]);

  /** ---- Вид спорта (всегда базовый список + возможные доп) ---- */
  const bySport = useMemo(() => {
    const counts = new Map();

    filteredLeads.forEach((l) => {
      let label = normalizeText(l.sport);
      if (!label) label = "Не выбран";

      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const result = [];

    // сначала все базовые
    SPORTS_BASE.forEach((label) => {
      result.push({
        label,
        total: counts.get(label) || 0,
      });
      counts.delete(label);
    });

    // затем любые нестандартные значения, если есть
    counts.forEach((total, label) => {
      result.push({ label, total });
    });

    return result;
  }, [filteredLeads]);

  /** ---- Тренер (всегда базовый список + возможные доп) ---- */
  const byTrainer = useMemo(() => {
    const counts = new Map();

    filteredLeads.forEach((l) => {
      let label = normalizeText(l.trainer);
      if (!label) label = "Не выбран";

      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const result = [];

    TRAINERS_BASE.forEach((label) => {
      result.push({
        label,
        total: counts.get(label) || 0,
      });
      counts.delete(label);
    });

    counts.forEach((total, label) => {
      result.push({ label, total });
    });

    return result;
  }, [filteredLeads]);

  /** ---- До пробной / Пробная / Результат — всегда все варианты ---- */
  const buildStatusStats = (items, getRaw, variants) => {
    const counts = variants.reduce((acc, v) => {
      acc[v.value] = 0;
      return acc;
    }, {});

    items.forEach((l) => {
      const raw = getRaw(l);
      const key = normalizeStatusValue(raw); // "", "confirmed", ...
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      } else {
        // если вдруг пришёл неожиданный статус — добавим отдельной строкой
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const result = variants.map((v) => ({
      label: v.label,
      total: counts[v.value] || 0,
    }));

    // нестандартные статусы, если вдруг есть
    Object.entries(counts).forEach(([key, total]) => {
      if (!variants.find((v) => v.value === key) && key) {
        result.push({ label: key, total });
      }
    });

    return result;
  };

  const byPreTrial = useMemo(
    () =>
      buildStatusStats(
        filteredLeads,
        (l) => l.pre_trial_status,
        PRE_TRIAL_VARIANTS
      ),
    [filteredLeads]
  );

  const byTrial = useMemo(
    () =>
      buildStatusStats(
        filteredLeads,
        (l) => l.trial_status,
        TRIAL_VARIANTS
      ),
    [filteredLeads]
  );

  const byResult = useMemo(
    () =>
      buildStatusStats(filteredLeads, (l) => l.result, RESULT_VARIANTS),
    [filteredLeads]
  );

  return (
    <div className="leads-analytic">
      <div className="leads-analytic__header">
        <div className="leads-analytic__title-wrap">
          <h2 className="leads-analytic__title">Аналитика воронки лидов</h2>
          <p className="leads-analytic__subtitle">
            Сколько уникальных лидов побывали в каждом этапе за выбранный
            период + разбивка по каналам, типу клиента, виду спорта, тренеру
            и статусам.
          </p>
        </div>

        <div className="leads-analytic__filters">
          <FiCalendar className="leads-analytic__icon" />

          <select
            className="leads-analytic__select"
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
            className="leads-analytic__select"
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

      {error && <div className="leads-analytic__error">{error}</div>}

      <div className="leads-analytic__body">
        {anyLoading ? (
          <div className="leads-analytic__loading">Загружаю аналитику...</div>
        ) : (
          <>
            {/* СТАРЫЕ 5 КАРТОЧЕК */}
            <div className="leads-analytic__grid leads-analytic__grid--top">
              <div className="leads-analytic__card">
                <span className="leads-analytic__label">Первый контакт</span>
                <span className="leads-analytic__value">
                  {stats.contacts_total}
                </span>
              </div>

              <div className="leads-analytic__card">
                <span className="leads-analytic__label">
                  Пробная тренировка
                </span>
                <span className="leads-analytic__value">
                  {stats.trial_total}
                </span>
              </div>

              <div className="leads-analytic__card">
                <span className="leads-analytic__label">Ушли подумать</span>
                <span className="leads-analytic__value">
                  {stats.thinking_total}
                </span>
              </div>

              <div className="leads-analytic__card leads-analytic__card--bought">
                <span className="leads-analytic__label">Купили</span>
                <span className="leads-analytic__value">
                  {stats.bought_total}
                </span>
              </div>

              <div className="leads-analytic__card leads-analytic__card--refused">
                <span className="leads-analytic__label">Отказ</span>
                <span className="leads-analytic__value">
                  {stats.refused_total}
                </span>
              </div>
            </div>

            {/* 4 блока 2x2: канал / тип / спорт / тренер */}
            <div className="leads-analytic__sections-grid">
              {/* --- По каналу --- */}
              <section className="leads-analytic__section leads-analytic__section--card">
                <h3 className="leads-analytic__section-title">По каналу</h3>
                <div className="leads-analytic__chips">
                  {byChannel.length === 0 && (
                    <span className="leads-analytic__empty-text">
                      Нет данных по выбранному периоду.
                    </span>
                  )}
                  {byChannel.map((item) => (
                    <div
                      key={item.label}
                      className="leads-analytic__chip leads-analytic__chip--channel"
                    >
                      <span className="leads-analytic__chip-label">
                        {item.label}
                      </span>
                      <span className="leads-analytic__chip-value">
                        {item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* --- Для себя / для детей --- */}
              <section className="leads-analytic__section leads-analytic__section--card">
                <h3 className="leads-analytic__section-title">
                  Для себя или для детей
                </h3>
                <div className="leads-analytic__chips">
                  {byClientType.map((item) => (
                    <div
                      key={item.label}
                      className="leads-analytic__chip leads-analytic__chip--client"
                    >
                      <span className="leads-analytic__chip-label">
                        {item.label}
                      </span>
                      <span className="leads-analytic__chip-value">
                        {item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* --- Вид спорта --- */}
              <section className="leads-analytic__section leads-analytic__section--card">
                <h3 className="leads-analytic__section-title">Вид спорта</h3>
                <div className="leads-analytic__chips">
                  {bySport.map((item) => (
                    <div
                      key={item.label}
                      className="leads-analytic__chip leads-analytic__chip--sport"
                    >
                      <span className="leads-analytic__chip-label">
                        {item.label}
                      </span>
                      <span className="leads-analytic__chip-value">
                        {item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* --- Тренер --- */}
              <section className="leads-analytic__section leads-analytic__section--card">
                <h3 className="leads-analytic__section-title">Тренер</h3>
                <div className="leads-analytic__chips">
                  {byTrainer.map((item) => (
                    <div
                      key={item.label}
                      className="leads-analytic__chip leads-analytic__chip--trainer"
                    >
                      <span className="leads-analytic__chip-label">
                        {item.label}
                      </span>
                      <span className="leads-analytic__chip-value">
                        {item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* --- Статусы --- */}
            <section className="leads-analytic__section leads-analytic__section--statuses">
              <h3 className="leads-analytic__section-title">Статусы</h3>

              <div className="leads-analytic__status-grid">
                <div className="leads-analytic__status-column">
                  <h4 className="leads-analytic__status-title">До пробной</h4>
                  <div className="leads-analytic__chips">
                    {byPreTrial.map((item) => (
                      <div
                        key={item.label}
                        className="leads-analytic__chip leads-analytic__chip--pretrial"
                      >
                        <span className="leads-analytic__chip-label">
                          {item.label}
                        </span>
                        <span className="leads-analytic__chip-value">
                          {item.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="leads-analytic__status-column">
                  <h4 className="leads-analytic__status-title">
                    Пробная тренировка
                  </h4>
                  <div className="leads-analytic__chips">
                    {byTrial.map((item) => (
                      <div
                        key={item.label}
                        className="leads-analytic__chip leads-analytic__chip--trial"
                      >
                        <span className="leads-analytic__chip-label">
                          {item.label}
                        </span>
                        <span className="leads-analytic__chip-value">
                          {item.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="leads-analytic__status-column">
                  <h4 className="leads-analytic__status-title">Результат</h4>
                  <div className="leads-analytic__chips">
                    {byResult.map((item) => (
                      <div
                        key={item.label}
                        className="leads-analytic__chip leads-analytic__chip--result"
                      >
                        <span className="leads-analytic__chip-label">
                          {item.label}
                        </span>
                        <span className="leads-analytic__chip-value">
                          {item.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadsAnalytics;
