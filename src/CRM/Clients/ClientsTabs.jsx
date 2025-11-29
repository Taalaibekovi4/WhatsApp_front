// src/components/AdminManager/ClientsTabs.jsx
import React, { useMemo, useState } from "react";
import ClientsTable from "./ClientsList/ClientsList";
import ClientsAdd from "./ClientsAdd/ClientsAdd";
import DailyClients from "./ClientsDaily/ClientsDaily";
import DuplicateClients from "./ClientsDuplicates/ClientsDuplicates";
import ClientsLost from "./ClientsLost/ClientsLost";
import ClientsValidation from "./ClientsValidation/ClientsValidation";
import ClientsCoaches from "./ClientsCoaches/ClientsCoaches";
import "./ClientsTabs.scss";

const NAV_ITEMS = [
  { key: "clients", label: "Список" },
  { key: "add", label: "Добавление" },
  { key: "daily", label: "Разовый" },
  { key: "lost", label: "Потерянные" },
  { key: "duplicates", label: "Дубликаты" },
  { key: "validation", label: "Валидация" },
  { key: "coaches", label: "Тренеры" },
];

const ClientsTabs = () => {
  // по умолчанию открываем Список
  const [active, setActive] = useState("clients");

  const sections = useMemo(
    () => ({
      clients: <ClientsTable />,
      add: <ClientsAdd />,
      daily: <DailyClients />,
      lost: <ClientsLost />,
      duplicates: <DuplicateClients />,
      validation: <ClientsValidation />,
      coaches: <ClientsCoaches />,
    }),
    []
  );

  return (
    <section className="clients-tabs">
      <div
        className="clients-tabs__nav"
        role="tablist"
        aria-label="Разделы клиентов"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`clients-panel-${item.key}`}
              id={`clients-tab-${item.key}`}
              className={`clients-tabs__nav-item${
                isActive ? " clients-tabs__nav-item--active" : ""
              }`}
              onClick={() => setActive(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="clients-tabs__body">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.key}
            id={`clients-panel-${item.key}`}
            role="tabpanel"
            aria-labelledby={`clients-tab-${item.key}`}
            hidden={active !== item.key}
          >
            {active === item.key ? sections[item.key] : null}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ClientsTabs;
