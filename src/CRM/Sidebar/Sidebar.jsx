import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaUsers,
  FaBoxOpen,
  FaStickyNote,
  FaChartBar,
  FaUserTie,
  FaUserPlus,
  FaWhatsapp,
  FaSignOutAlt,
} from "react-icons/fa";
import "./Sidebar.scss";
import { MdLeaderboard } from "react-icons/md";

const Sidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const managerName = localStorage.getItem("manager_name") || "Админ";
  const avatarLetter = managerName.trim().charAt(0).toUpperCase() || "A";

const handleLogout = () => {
  try {
localStorage.removeItem("access");
localStorage.removeItem("refresh");
localStorage.removeItem("manager_name");
localStorage.removeItem("role");
localStorage.removeItem("token");      // ← на всякий случай
localStorage.removeItem("auth_token"); // ← на всякий случай

    
    navigate("/", { replace: true });
  } catch (err) {
    console.error("Ошибка выхода:", err);
  }
};



  const go = (to) => () => navigate(to);

  const isActive = (route) =>
    pathname === route || pathname.startsWith(route + "/");

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <nav className="sidebar__nav">
          <button
            type="button"
            className={`sidebar__link${isActive("/crm/clients") || pathname === "/crm" ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/clients")}
          >
            <FaUsers className="sidebar__icon" />
            <span>Клиенты</span>
          </button>

          <button
            type="button"
            className={`sidebar__link${isActive("/crm/goods") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/goods")}
          >
            <FaBoxOpen className="sidebar__icon" />
            <span>Товары</span>
          </button>

          <button
            type="button"
            className={`sidebar__link${isActive("/crm/notes") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/notes")}
          >
            <FaStickyNote className="sidebar__icon" />
            <span>Заметки</span>
          </button>

          <button
            type="button"
            className={`sidebar__link${isActive("/crm/analytics") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/analytics")}
          >
            <FaChartBar className="sidebar__icon" />
            <span>Аналитика</span>
          </button>

          <button
            type="button"
            className={`sidebar__link${isActive("/crm/staff") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/staff")}
          >
            <FaUserTie className="sidebar__icon" />
            <span>Сотрудники</span>
          </button>

          <button
            type="button"
            className={`sidebar__link${isActive("/crm/register") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/register")}
          >
            <FaUserPlus className="sidebar__icon" />
            <span>Регистрация</span>
          </button>

          <button
            type="button"
            className={`sidebar__link${isActive("/crm/whatsapp") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/whatsapp")}
          >
            <FaWhatsapp className="sidebar__icon" />
            <span>Ватсап</span>
          </button>
                    <button
            type="button"
            className={`sidebar__link${isActive("/crm/leadstabs") ? " sidebar__link--active" : ""}`}
            onClick={go("/crm/leadstabs")}
          >
            <MdLeaderboard className="sidebar__icon" />
            <span>Этапы лидов</span>
          </button>
        </nav>
      </div>

      <div className="sidebar__bottom">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{avatarLetter}</div>
          <span className="sidebar__name">{managerName}</span>
        </div>

        <button type="button" className="sidebar__logout" onClick={handleLogout}>
          <FaSignOutAlt className="sidebar__logoutIcon" />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
