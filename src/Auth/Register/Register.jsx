import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaShieldAlt, FaUserTag } from "react-icons/fa";
import { useAuthStore } from "../../store/auth";
import "./Register.scss";

const LS_KNOWN_USERS = "reg_known_users";

const norm = (s) => String(s ?? "").trim();
const dedupe = (arr) => Array.from(new Set(arr.map(norm))).filter(Boolean);
const isValidUsername = (s) => /^[a-zA-Z0-9_.-]{3,32}$/.test(s);
const isValidPassword = (s) => String(s ?? "").length >= 8;

const readKnown = () => {
  try { return JSON.parse(localStorage.getItem(LS_KNOWN_USERS) || "[]"); }
  catch { return []; }
};

const saveKnown = (u) => {
  try {
    const next = dedupe([norm(u), ...readKnown()]).slice(0, 100);
    localStorage.setItem(LS_KNOWN_USERS, JSON.stringify(next));
  } catch {/* ignore */}
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Администратор", color: "#a855f7" },
  { value: "client_manager", label: "Менеджер", color: "#3b82f6" },
];

const Register = () => {
  const [formData, setFormData] = useState({ username: "", password: "", role: "" });
  const [localErrors, setLocalErrors] = useState([]);
  const [success, setSuccess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const roleSelected = useMemo(() => Boolean(formData.role), [formData.role]);

  const validate = (fd) => {
    const errs = [];
    if (!isValidUsername(fd.username)) errs.push("Имя пользователя: 3–32 латиницы/цифр и . _ -");
    if (!isValidPassword(fd.password)) errs.push("Пароль должен быть не короче 8 символов.");
    if (!fd.role) errs.push("Выберите роль.");
    if (readKnown().includes(norm(fd.username))) errs.push("Этот логин уже вводили на этом устройстве.");
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSuccess("");
    setLocalErrors([]);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (val) => {
    setFormData((prev) => ({ ...prev, role: val }));
    setRoleOpen(false);
    setLocalErrors((prev) => prev.filter((m) => !m.toLowerCase().includes("роль")));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    const errs = validate(formData);
    if (errs.length) {
      setLocalErrors(errs);
      return;
    }

    try {
      const res = await register({
        username: norm(formData.username),
        password: formData.password,
        role: formData.role,
      });

      if (res?.ok) {
        saveKnown(formData.username);
        setSuccess("Регистрация прошла успешно. Перенаправляем…");
        setTimeout(() => navigate("/", { replace: true }), 500);
      }
    } catch (err) {
      console.error("Ошибка регистрации:", err);
    }
  };

  useEffect(() => {
    cardRef.current?.classList.add("reg-card--in");
  }, []);

  return (
    <div className="reg-page">
      <div className="reg-page__inner">
        <h1 className="reg-page__title">Регистрация</h1>

        <form className="reg-card" onSubmit={handleSubmit} ref={cardRef} noValidate>
          <div className="reg-card__icon">
            <FaShieldAlt aria-hidden="true" />
          </div>

          <h2 className="reg-card__heading">Регистрация нового пользователя</h2>
          <p className="reg-card__subtitle">Заполните форму для создания учетной записи</p>

          {(localErrors.length > 0 || error) && (
            <div className="reg-card__errors" role="alert">
              {localErrors.map((err) => <p key={err}>{err}</p>)}
              {error && <p>{error}</p>}
            </div>
          )}

          {success && (
            <div className="reg-card__success" role="status">
              {success}
            </div>
          )}

          {/* Имя */}
          <label className="reg-field">
            <span className="reg-field__label">
              <FaUser className="reg-field__label-icon" aria-hidden="true" />
              Имя пользователя
            </span>
            <input
              type="text"
              name="username"
              className={`reg-field__input ${submitted && !isValidUsername(formData.username) ? "is-invalid" : ""}`}
              placeholder="Введите имя пользователя"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </label>

          {/* Пароль */}
          <label className="reg-field">
            <span className="reg-field__label">
              <FaLock className="reg-field__label-icon" aria-hidden="true" />
              Пароль
            </span>
            <input
              type="password"
              name="password"
              className={`reg-field__input ${submitted && !isValidPassword(formData.password) ? "is-invalid" : ""}`}
              placeholder="Минимум 8 символов"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <span className="reg-field__hint">Пароль должен содержать минимум 8 символов</span>
          </label>

          {/* Роль */}
          <div className="reg-field reg-field--select">
            <span className="reg-field__label">
              <FaUserTag className="reg-field__label-icon" aria-hidden="true" />
              Роль пользователя
            </span>

            <div
              className={`reg-field__input reg-field__input--select ${submitted && !roleSelected ? "is-invalid" : ""}`}
              tabIndex={0}
              onClick={() => setRoleOpen((v) => !v)}
              onBlur={() => setTimeout(() => setRoleOpen(false), 120)}
              aria-haspopup="listbox"
              aria-expanded={roleOpen}
            >
              <span className={roleSelected ? "" : "reg-field__placeholder"}>
                {roleSelected
                  ? ROLE_OPTIONS.find((o) => o.value === formData.role)?.label
                  : "Выберите роль"}
              </span>
              <span className="reg-field__chevron" aria-hidden="true" />
            </div>

            {roleOpen && (
              <ul className="reg-select" role="listbox">
                {ROLE_OPTIONS.map((opt) => (
                  <li
                    key={opt.value}
                    className={`reg-select__item ${formData.role === opt.value ? "reg-select__item--active" : ""}`}
                    onMouseDown={() => handleRoleSelect(opt.value)}
                    role="option"
                    aria-selected={formData.role === opt.value}
                  >
                    <span className="reg-select__dot" style={{ backgroundColor: opt.color }} aria-hidden="true" />
                    {opt.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className="reg-card__submit" disabled={loading}>
            {loading ? "Сохраняем..." : "Зарегистрировать пользователя"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
