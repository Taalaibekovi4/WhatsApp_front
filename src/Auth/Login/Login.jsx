import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuthStore } from "../../store/auth";
import "./Login.scss";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    try {
      const ok = await login(username.trim(), password);
      if (ok) navigate("/crm", { replace: true });
    } catch (err) {
      console.error("Ошибка входа:", err);
    }
  };

  // Анимация появления
  useEffect(() => {
    cardRef.current?.classList.add("login__card--in");
    return () => clearError();
  }, [clearError]);

  // Очистка ошибки при изменении данных
  useEffect(() => {
    if (error && (username || password)) clearError();
  }, [username, password]);

  // Визуальная тряска при ошибке
  useEffect(() => {
    if (error) {
      cardRef.current?.classList.add("login__card--error");
      const timer = setTimeout(() => {
        cardRef.current?.classList.remove("login__card--error");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <section className="login">
      <form className="login__card" onSubmit={handleLogin} ref={cardRef} noValidate>
        <h2 className="login__title">Вход в CRM</h2>
        <p className="login__subtitle">Укажите имя пользователя и пароль</p>

        {error && (
          <div className="login__error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* Имя пользователя */}
        <label className="login__field">
          <span className="login__label">Имя пользователя</span>
          <div className="login__control">
            <FaUser className="login__icon" aria-hidden />
            <input
              type="text"
              className="login__input"
              placeholder="Введите имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              aria-label="Имя пользователя"
            />
          </div>
        </label>

        {/* Пароль */}
        <label className="login__field">
          <span className="login__label">Пароль</span>
          <div className="login__control">
            <FaLock className="login__icon" aria-hidden />
            <input
              type={showPassword ? "text" : "password"}
              className="login__input"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              aria-label="Пароль"
            />
            <button
              type="button"
              className="login__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          className="login__submit"
          disabled={loading || !username || !password}
        >
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>
    </section>
  );
};

export default Login;
