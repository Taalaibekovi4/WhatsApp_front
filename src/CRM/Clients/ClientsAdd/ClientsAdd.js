// src/components/AdminManager/ClientsAdd/ClientsAdd.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ClientsAdd.scss";

import { useClientsStore } from "../../../store/clients";
import { formFieldConfig, trainers, sports } from "../../Constants/constants";

/* тренер -> спорт */
const TRAINER_TO_SPORT = {
  "Машрапов Тилек": "Кулату",
  "Мойдунов Мирлан": "Кулату",
  "Асанбаев Эрлан": "Кулату",
  "Пазылов Кутман": "Борьба",
  "Жумалы Улуу Ариет": "Борьба",
  "Машрапов Жумабай": "Борьба",
  "Калмамат Улуу Акай": "Дзюдо",
  "Тажибаев Азамат": "Кроссфит",
  "Усабаев Эрбол": "Бокс",
  "Тургунов Ислам": "Бокс",
  "Азизбек Улуу Баяман": "Бокс",
  "Медербек Улуу Сафармурат": "Тхэквондо",
  "Сыдыков Алайбек": "Кикбокс",
  "Минбаев Сулайман": "Греко-римская борьба",
};

/* sport -> trainers */
const SPORT_TO_TRAINERS = sports.reduce((acc, s) => {
  acc[s] = [];
  return acc;
}, {});
Object.entries(TRAINER_TO_SPORT).forEach(([t, s]) => {
  if (SPORT_TO_TRAINERS[s]) SPORT_TO_TRAINERS[s].push(t);
});

/* ===== простой комбобокс ===== */
const ComboBox = ({
  name,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector("[data-active='true']");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlight, filtered]);

  const selectVal = (val) => {
    onChange({ target: { name, value: val } });
    setQuery(val);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) selectVal(filtered[highlight]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      className={`clients-add__combo ${
        disabled ? "clients-add__combo--disabled" : ""
      }`}
      ref={boxRef}
    >
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={`${name}-listbox`}
        name={name}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange({ target: { name, value: e.target.value } });
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => !disabled && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="clients-add__combo-input"
        autoComplete="off"
        disabled={disabled}
      />
      <button
        type="button"
        className="clients-add__combo-toggle"
        onClick={() => !disabled && setOpen((s) => !s)}
        aria-label={open ? "Скрыть список" : "Показать список"}
        disabled={disabled}
      >
        ▾
      </button>

      {open && !disabled && (
        <div
          className="clients-add__combo-popover"
          role="listbox"
          id={`${name}-listbox`}
        >
          <div className="clients-add__combo-list" ref={listRef}>
            {filtered.length ? (
              filtered.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  data-active={highlight === i ? "true" : "false"}
                  aria-selected={highlight === i}
                  className={`clients-add__combo-item${
                    highlight === i ? " clients-add__combo-item--active" : ""
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectVal(opt)}
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="clients-add__combo-empty">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ClientsAdd = () => {
  // всё ещё используем в комментарии, но в UI больше не показываем
  const managerName = localStorage.getItem("manager_name") || "Админ";

  const {
    items: clients = [],
    load: loadClients,
    addOne,
    error: storeError,
  } = useClientsStore();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    sport_category: "",
    trainer: "",
    year: "2025",
    month: "",
    day: "",
    dataCassa: "",
    sale: "Без скидки",
    price: "",
    payment: "",
    check_field: "",
    typeClient: "",
    comment: "",
    stage: "",
  });

  const [invalid, setInvalid] = useState([]);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients?.();
  }, [loadClients]);

  const availableTrainers = useMemo(() => {
    if (!formData.sport_category) return trainers;
    return SPORT_TO_TRAINERS[formData.sport_category] || [];
  }, [formData.sport_category]);

  const availableSports = useMemo(() => {
    if (!formData.trainer) return sports;
    const s = TRAINER_TO_SPORT[formData.trainer];
    return s ? [s] : sports;
  }, [formData.trainer]);

  useEffect(() => {
    if (availableSports.length === 1 && formData.sport_category !== availableSports[0]) {
      setFormData((prev) => ({
        ...prev,
        sport_category: availableSports[0],
        trainer:
          prev.trainer && TRAINER_TO_SPORT[prev.trainer] !== availableSports[0]
            ? ""
            : prev.trainer,
      }));
      setInvalid((prev) =>
        prev.filter((f) => f !== "sport_category" && f !== "trainer")
      );
    }
  }, [availableSports, formData.sport_category]);

  const calcDiscounted = () => {
    const price = parseFloat(formData.price);
    if (Number.isNaN(price) || price <= 0) return "";
    if (formData.sale === "15%") return (price * 0.85).toFixed(2);
    if (formData.sale === "20%") return (price * 0.8).toFixed(2);
    return price.toString();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "year") {
      setFormData((p) => ({ ...p, year: value }));
      setInvalid((prev) => prev.filter((f) => f !== "year"));
      return;
    }

    if (name === "sport_category") {
      setFormData((prev) => {
        const okTrainer = prev.trainer && TRAINER_TO_SPORT[prev.trainer] === value;
        return { ...prev, sport_category: value, trainer: okTrainer ? prev.trainer : "" };
      });
      setInvalid((prev) =>
        prev.filter((f) => f !== "sport_category" && f !== "trainer")
      );
      return;
    }

    if (name === "trainer") {
      const sport = TRAINER_TO_SPORT[value] || "";
      setFormData((prev) => ({
        ...prev,
        trainer: value,
        sport_category: sport || prev.sport_category,
      }));
      setInvalid((prev) =>
        prev.filter((f) => f !== "trainer" && f !== "sport_category")
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "")
          : name === "price"
          ? value.replace(/[^0-9.]/g, "")
          : value,
    }));
    setInvalid((prev) => prev.filter((f) => f !== name));
  };

  const validate = () => {
    const requiredFromConfig = formFieldConfig
      .filter((f) => f.required && f.name !== "email")
      .map((f) => f.name);

    const bad = [];

    requiredFromConfig.forEach((name) => {
      if (!formData[name] || String(formData[name]).trim() === "") {
        bad.push(name);
      }
    });

    if (!formData.dataCassa) bad.push("dataCassa");
    if (!formData.typeClient) bad.push("typeClient");

    if (
      formData.price &&
      (Number.isNaN(Number(formData.price)) || Number(formData.price) <= 0)
    ) {
      bad.push("price");
    }

    setInvalid(bad);
    return bad.length === 0;
  };

  const isDuplicate = () => {
    const n = String(formData.name || "").trim().toLowerCase();
    const m = String(formData.month || "").trim().toLowerCase();
    const y = String(formData.year || "").trim();
    const s = String(formData.sport_category || "").trim().toLowerCase();

    return (clients || []).some((c) => {
      return (
        String(c.name || "").trim().toLowerCase() === n &&
        String(c.month || "").trim().toLowerCase() === m &&
        String(c.year || "").trim() === y &&
        String(c.sport_category || "").trim().toLowerCase() === s
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      setNotice({ type: "error", text: "Заполните обязательные поля." });
      return;
    }

    if (isDuplicate()) {
      setInvalid((prev) => [
        ...new Set([...prev, "name", "month", "year", "sport_category"]),
      ]);
      setNotice({ type: "error", text: "Дубликат: такой клиент уже есть." });
      return;
    }

    setLoading(true);
    setNotice({ type: "", text: "" });

    try {
      const commentWithManager = formData.comment
        ? `${formData.comment.trim()}\n(Добавил: ${managerName})`
        : `(Добавил: ${managerName})`;

      const payload = {
        ...formData,
        comment: commentWithManager,
        price: calcDiscounted(),
      };

      await addOne?.(payload);
      setNotice({ type: "success", text: "Клиент добавлен." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err?.message || "Ошибка при добавлении.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldPairs = [
    ["name", "phone"],
    ["sport_category", "trainer"],
    [{ name: "year", type: "select-year", placeholder: "Год" }, "day"],
    ["month", { name: "sale", placeholder: "Скидка" }],
    [{ name: "dataCassa", type: "date", placeholder: "Дата оплаты" }, "price"],
    ["payment", "check_field"],
    [{ name: "typeClient", type: "select-type", placeholder: "Тип клиента" }, "stage"],
    ["comment", null],
  ].map((pair) =>
    pair
      .filter(Boolean)
      .map((f) =>
        typeof f === "string"
          ? formFieldConfig.find((x) => x.name === f) || { name: f, placeholder: f }
          : f
      )
  );

  const renderField = (field) => {
    const name = field.name;

    if (field.type === "select-year") {
      return (
        <select
          name="year"
          value={formData.year}
          onChange={handleChange}
          className={`clients-add__select${
            invalid.includes("year") ? " clients-add__input--error" : ""
          }`}
        >
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      );
    }

    if (field.type === "select-type") {
      return (
        <select
          name="typeClient"
          value={formData.typeClient}
          onChange={handleChange}
          className={`clients-add__select${
            invalid.includes("typeClient") ? " clients-add__input--error" : ""
          }`}
        >
          <option value="">Тип клиента</option>
          <option value="Обычный">Обычный</option>
          <option value="Пробный">Пробный</option>
          <option value="Индивидуальный">Индивидуальный</option>
          <option value="Абонемент">Абонемент</option>
        </select>
      );
    }

    if (name === "sale") {
      return (
        <select
          name="sale"
          value={formData.sale}
          onChange={handleChange}
          className="clients-add__select"
        >
          <option value="Без скидки">Без скидки</option>
          <option value="15%">15%</option>
          <option value="20%">20%</option>
        </select>
      );
    }

    if (name === "sport_category") {
      const disabled = availableSports.length === 1;
      return (
        <ComboBox
          name="sport_category"
          value={formData.sport_category}
          options={availableSports}
          placeholder={field.placeholder}
          onChange={handleChange}
          disabled={disabled}
        />
      );
    }

    if (name === "trainer") {
      // тут был баг с lonely return, сейчас нормально
      return (
        <ComboBox
          name="trainer"
          value={formData.trainer}
          options={availableTrainers}
          placeholder={field.placeholder}
          onChange={handleChange}
        />
      );
    }

    if (name === "comment") {
      return (
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleChange}
          placeholder={field.placeholder}
          className="clients-add__textarea"
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          name={name}
          value={formData[name] || ""}
          onChange={handleChange}
          className={`clients-add__select${
            invalid.includes(name) ? " clients-add__input--error" : ""
          }`}
        >
          <option value="">{field.placeholder}</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type === "date" ? "date" : "text"}
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        placeholder={field.placeholder}
        className={`clients-add__input${
          invalid.includes(name) ? " clients-add__input--error" : ""
        }`}
        autoComplete="off"
      />
    );
  };

  return (
    <form className="clients-add" onSubmit={handleSubmit} noValidate>
      <div className="clients-add__head">
        <div>
          <h2 className="clients-add__title">Добавление клиента</h2>
          <p className="clients-add__subtitle">
            Заполните данные, скидка и итоговая сумма посчитаются автоматически
          </p>
        </div>
        {/* блок Менеджер убран из UI */}
      </div>

      {(notice.text || storeError) && (
        <div
          className={`clients-add__alert${
            notice.type === "error" || storeError
              ? " clients-add__alert--error"
              : " clients-add__alert--success"
          }`}
        >
          {storeError || notice.text}
        </div>
      )}

      <div className="clients-add__grid">
        {fieldPairs.map((pair, idx) => (
          <div key={idx} className="clients-add__row">
            {pair.map((field) => (
              <div key={field.name} className="clients-add__field">
                <label className="clients-add__label">
                  {field.placeholder || field.name}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="clients-add__bottom">
        <div className="clients-add__total-line">
          <span className="clients-add__total-label">Итог:</span>
          <span className="clients-add__total-value">
            {formData.price ? `${calcDiscounted()} сом` : "не указан"}
          </span>
        </div>

        <button
          type="submit"
          className={`clients-add__submit${
            loading ? " clients-add__submit--loading" : ""
          }`}
          disabled={loading}
        >
          {loading ? <span className="clients-add__spinner" /> : "Добавить"}
        </button>
      </div>
    </form>
  );
};

export default ClientsAdd;
