import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiX, FiUser, FiPhone, FiCalendar, FiAlertCircle } from "react-icons/fi";
import "./LeadModal.scss";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://rasu0101.pythonanywhere.com",
});

const preTrialOptions = [
  { value: "", label: "Не выбрано" },
  { value: "confirmed", label: "Подтвердили" },
  { value: "rescheduled", label: "Перенесли" },
  { value: "ignored", label: "Игнор" },
  { value: "declined", label: "Отказ" },
];

const trialOptions = [
  { value: "", label: "Не выбрано" },
  { value: "confirmed", label: "Пришли" },
  { value: "rescheduled", label: "Перенесли" },
  { value: "ignored", label: "Не вышли на связь" },
  { value: "declined", label: "Отказались" },
];

const resultOptions = [
  { value: "", label: "Не выбрано" },
  { value: "bought", label: "Купили" },
  { value: "thinking", label: "Ушли подумать" },
  { value: "declined", label: "Отказались" },
];

const trainersOptions = [
  "Асанбаев Эрлан",
  "Азизбек Улуу Баяман",
  "Жумалы Уулу Ариет",
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

const sportsOptions = [
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

const defaultForm = {
  id: null,
  name: "",
  phone: "",
  channel: "",
  createdAt: "",
  isChild: "adult",
  sport: "",
  trainer: "",
  preTrialStatus: "",
  trialStatus: "",
  result: "",
  amount: "",
  comment: "",
};

/** нормализация канала из бэка -> значение селекта */
const normalizeChannel = (value) => {
  const s = (value || "").toString().trim().toLowerCase();

  if (!s) return "";

  if (["instagram", "insta", "ig"].includes(s)) return "Instagram";
  if (["whatsapp", "wa", "ватсап", "ватсапп"].includes(s)) return "WhatsApp";
  if (["звонок", "call", "phone", "телефон"].includes(s)) return "Звонок";
  if (["другое", "other"].includes(s)) return "Другое";

  // всё странное считаем "Другое", чтобы не терять инфу
  return "Другое";
};

const LeadModal = ({ lead, onClose, onSave }) => {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const incoming = lead || {};
    setForm({
      ...defaultForm,
      ...incoming,
      // тут принудительно приводим канал к значениям селекта
      channel: normalizeChannel(incoming.channel),
    });
    setError("");
    setSaving(false);
  }, [lead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDateInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    if (!value) {
      setForm((prev) => ({
        ...prev,
        createdAt: "",
      }));
      return;
    }
    const iso = new Date(`${value}T09:00:00`).toISOString();
    setForm((prev) => ({
      ...prev,
      createdAt: iso,
    }));
  };

  const buildPayload = () => {
    const payload = {
      name: form.name,
      phone: form.phone,
      // в бэк канал уходит уже нормальный:
      // Instagram / WhatsApp / Звонок / Другое
      channel: form.channel,
      client_type: form.isChild || "adult",
      sport: form.sport,
      trainer: form.trainer,
      pre_trial_status: form.preTrialStatus || "",
      trial_status: form.trialStatus || "",
      result: form.result || "",
      amount: form.amount || null,
      comment: form.comment || "",
    };

    if (form.createdAt) {
      payload.created_at = form.createdAt;
    }

    return payload;
  };

  const mapBackendToForm = (backend, prev) => ({
    ...prev,
    name: backend.name ?? prev.name,
    phone: backend.phone ?? prev.phone,
    // ответ бэка тоже нормализуем
    channel: normalizeChannel(backend.channel ?? prev.channel),
    createdAt: backend.created_at ?? prev.createdAt,
    isChild: backend.client_type ?? prev.isChild,
    sport: backend.sport ?? prev.sport,
    trainer: backend.trainer ?? prev.trainer,
    preTrialStatus: backend.pre_trial_status ?? prev.preTrialStatus,
    trialStatus: backend.trial_status ?? prev.trialStatus,
    result: backend.result ?? prev.result,
    amount: backend.amount ?? prev.amount,
    comment: backend.comment ?? prev.comment,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Укажи имя и номер телефона.");
      return;
    }

    if (!form.id) {
      onSave?.(form);
      onClose();
      return;
    }

    setError("");
    setSaving(true);

    try {
      const payload = buildPayload();
      const { data } = await API.patch(`/api/leads/${form.id}/`, payload);

      const nextForm = mapBackendToForm(data || {}, form);
      setForm(nextForm);
      onSave?.(nextForm);
      onClose();
    } catch (err) {
      console.error("Ошибка сохранения лида:", err);
      setError("Не удалось сохранить изменения. Попробуй ещё раз.");
      setSaving(false);
    }
  };

  return (
    <div className="lead-modal">
      <div
        className="lead-modal__backdrop"
        onClick={saving ? undefined : onClose}
      />
      <div className="lead-modal__content" role="dialog" aria-modal="true">
        <header className="lead-modal__header">
          <div className="lead-modal__title-wrap">
            <h2 className="lead-modal__title">Карточка лида</h2>
            <p className="lead-modal__subtitle">
              Проверь данные клиента и обнови статусы после общения.
            </p>
          </div>
          <button
            type="button"
            className="lead-modal__close-btn"
            onClick={onClose}
            disabled={saving}
          >
            <FiX className="lead-modal__close-icon" />
          </button>
        </header>

        <form className="lead-modal__form" onSubmit={handleSubmit}>
          <div className="lead-modal__scroll">
            <section className="lead-modal__section">
              <h3 className="lead-modal__section-title">Основное</h3>

              <div className="lead-modal__grid lead-modal__grid--2">
                <label className="lead-modal__field">
                  <span className="lead-modal__label">
                    <FiCalendar className="lead-modal__label-icon" />
                    Дата заявки
                  </span>
                  <input
                    type="date"
                    name="createdAt"
                    className="lead-modal__input"
                    value={formatDateInput(form.createdAt)}
                    onChange={handleDateChange}
                    disabled={saving}
                  />
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">
                    <FiUser className="lead-modal__label-icon" />
                    Имя
                  </span>
                  <input
                    type="text"
                    name="name"
                    className="lead-modal__input"
                    placeholder="Имя клиента"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">
                    <FiPhone className="lead-modal__label-icon" />
                    Телефон
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    className="lead-modal__input"
                    placeholder="+996 ..."
                    value={form.phone}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">Канал</span>
                  <select
                    name="channel"
                    className="lead-modal__select"
                    value={form.channel}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Не выбрано</option>
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Звонок">Звонок</option>
                    <option value="Другое">Другое</option>
                  </select>
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">
                    Для себя или для детей
                  </span>
                  <select
                    name="isChild"
                    className="lead-modal__select"
                    value={form.isChild}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="adult">Взрослый</option>
                    <option value="child">Дети</option>
                  </select>
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">Вид спорта</span>
                  <select
                    name="sport"
                    className="lead-modal__select"
                    value={form.sport}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Не выбрано</option>
                    {sportsOptions.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">Тренер</span>
                  <select
                    name="trainer"
                    className="lead-modal__select"
                    value={form.trainer}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Не выбрано</option>
                    {trainersOptions.map((coach) => (
                      <option key={coach} value={coach}>
                        {coach}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="lead-modal__section">
              <h3 className="lead-modal__section-title">Статусы</h3>

              <div className="lead-modal__grid lead-modal__grid--3">
                <label className="lead-modal__field">
                  <span className="lead-modal__label">До пробной</span>
                  <select
                    name="preTrialStatus"
                    className="lead-modal__select"
                    value={form.preTrialStatus}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    {preTrialOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">
                    Пробная тренировка
                  </span>
                  <select
                    name="trialStatus"
                    className="lead-modal__select"
                    value={form.trialStatus}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    {trialOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="lead-modal__field">
                  <span className="lead-modal__label">Результат</span>
                  <select
                    name="result"
                    className="lead-modal__select"
                    value={form.result}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    {resultOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="lead-modal__section">
              <h3 className="lead-modal__section-title">
                Финансы и комментарии
              </h3>

              <div className="lead-modal__grid lead-modal__grid--2">
                <label className="lead-modal__field">
                  <span className="lead-modal__label">Сумма</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    name="amount"
                    className="lead-modal__input"
                    placeholder="Сумма, если клиент оплатил"
                    value={form.amount}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </label>

                <label className="lead-modal__field lead-modal__field--full">
                  <span className="lead-modal__label">
                    Комментарии и возражения
                  </span>
                  <textarea
                    name="comment"
                    className="lead-modal__textarea"
                    placeholder="Что говорил клиент, страхи, почему сомневается или купил..."
                    value={form.comment}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </label>
              </div>
            </section>
          </div>

          {error && (
            <div className="lead-modal__error">
              <FiAlertCircle className="lead-modal__error-icon" />
              <span>{error}</span>
            </div>
          )}

          <footer className="lead-modal__footer">
            <button
              type="button"
              className="lead-modal__btn lead-modal__btn--secondary"
              onClick={onClose}
              disabled={saving}
            >
              Закрыть
            </button>
            <button
              type="submit"
              className="lead-modal__btn lead-modal__btn--primary"
              disabled={saving}
            >
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
