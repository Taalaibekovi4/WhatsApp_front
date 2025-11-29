// src/components/LeadsTabs.jsx
import React, { useState } from "react";
import { FiFileText, FiGitBranch } from "react-icons/fi";
import "./LeadsTabs.scss";

// если RequestsPage лежит в src/components/RequestsPage.jsx
import RequestsPage from "../RequestsPage/RequestsPage.jsx";

// если LeadsBoard лежит в src/Funnel/LeadsBoard/LeadsBoard.jsx
// и этот файл в src/components — путь такой:
import LeadsBoard from "../LeadsBoard/LeadsBoard.jsx";

const LeadsTabs = () => {
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "funnel"

  return (
    <div className="leads-tabs">
      <header className="leads-tabs__header">

        <div className="leads-tabs__tabs" role="tablist">
          <button
            type="button"
            className={`leads-tabs__tab ${
              activeTab === "requests" ? "leads-tabs__tab--active" : ""
            }`}
            onClick={() => setActiveTab("requests")}
            role="tab"
            aria-selected={activeTab === "requests"}
          >
            <FiFileText className="leads-tabs__tab-icon" />
            <span>Заявки</span>
          </button>

          <button
            type="button"
            className={`leads-tabs__tab ${
              activeTab === "funnel" ? "leads-tabs__tab--active" : ""
            }`}
            onClick={() => setActiveTab("funnel")}
            role="tab"
            aria-selected={activeTab === "funnel"}
          >
            <FiGitBranch className="leads-tabs__tab-icon" />
            <span>Воронка лидов</span>
          </button>
        </div>
      </header>

      <div className="leads-tabs__content">
        {activeTab === "requests" && (
          <div className="leads-tabs__pane leads-tabs__pane--visible">
            <RequestsPage />
          </div>
        )}

        {activeTab === "funnel" && (
          <div className="leads-tabs__pane leads-tabs__pane--visible">
            <LeadsBoard />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsTabs;
