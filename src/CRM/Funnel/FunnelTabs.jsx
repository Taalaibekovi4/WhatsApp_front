import React, { useState } from "react";
import "./FunnelTabs.scss";
import RequestsAnalytics from "./RequestsAnalytics/RequestsAnalytics.jsx";
import LeadsAnalytics from "./RequestsAnalytics/LeadsAnalytics.jsx";

const TABS = [
  { id: "requests", label: "Заявки" },
  { id: "leads", label: "Воронка лидов" },
];

const FunnelTabs = () => {
  const [activeTab, setActiveTab] = useState("requests");

  return (
    <div className="funnel-tabs">
      <div className="funnel-tabs__header">
        <h1 className="funnel-tabs__title">Лиды и заявки</h1>
        <p className="funnel-tabs__subtitle">
          Управляйте заявками и воронкой лидов в одном экране.
        </p>
      </div>

      <div className="funnel-tabs__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`funnel-tabs__tab ${
              activeTab === tab.id ? "funnel-tabs__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="funnel-tabs__body">
        {activeTab === "requests" && (
          <div className="funnel-tabs__pane">
            <div className="funnel-tabs__block funnel-tabs__block--top">
              <RequestsAnalytics />
            </div>
          </div>
        )}

        {activeTab === "leads" && (
          <div className="funnel-tabs__pane">
            <div className="funnel-tabs__block funnel-tabs__block--top">
              <LeadsAnalytics />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FunnelTabs;
