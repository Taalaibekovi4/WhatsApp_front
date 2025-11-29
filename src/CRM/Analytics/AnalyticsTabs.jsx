import React, { useState } from "react";
import {
  FaUsers,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaBoxOpen,
  FaUserPlus,
} from "react-icons/fa";
import { IoFunnel } from "react-icons/io5";

import Dashboard from "./Review/Review";
import ClientIncomeByDays from "./Salary/Salary";
import ProductAnalytics from "./AnalyticsProducts/AnalyticsProducts";
import ClientIncomeByDate from "./IncomeByDate/IncomeByDate";
import NewClients from "./NewClients/NewClients";

import "./AnalyticsTabs.scss";
import FunnelTabs from "../Funnel/FunnelTabs";

const AnalyticsTabs = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const tabs = [
    { name: "Dashboard",          label: "Клиенты",       Icon: FaUsers,         component: <Dashboard /> },
    { name: "TrainerAnalytics",   label: "Доход по дате", Icon: FaCalendarAlt,   component: <ClientIncomeByDate /> },
    { name: "ClientIncomeByDays", label: "Зарплата",      Icon: FaMoneyBillWave, component: <ClientIncomeByDays /> },
    { name: "Product",            label: "Продукт",       Icon: FaBoxOpen,       component: <ProductAnalytics /> },
    { name: "NewClient",          label: "Новые клиенты", Icon: FaUserPlus,      component: <NewClients /> },
    { name: "FunnelTabs",          label: "Этапы", Icon: IoFunnel,      component: <FunnelTabs /> },
  ];

  const current = tabs.find((t) => t.name === activeTab);

  return (
    <section className="analytics-tabs" aria-labelledby="analytics-tabs-title">
      <header className="analytics-tabs__header">
        <h1 id="analytics-tabs-title" className="analytics-tabs__title">Аналитика</h1>

        <div className="analytics-tabs__tabs" role="tablist" aria-label="Разделы аналитики">
          {tabs.map(({ name, label, Icon }) => {
            const isActive = activeTab === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-pressed={isActive}
                className={`analytics-tabs__tab ${isActive ? "analytics-tabs__tab--active" : ""}`}
                onClick={() => setActiveTab(name)}
              >
                <span className="analytics-tabs__tab-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="analytics-tabs__tab-label">{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="analytics-tabs__content" role="tabpanel">
        {current ? current.component : null}
      </main>
    </section>
  );
};

export default AnalyticsTabs;
