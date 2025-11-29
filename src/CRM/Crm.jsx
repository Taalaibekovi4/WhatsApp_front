// src/CRM/CRM.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar/Sidebar";
import Register from "../Auth/Register/Register";
import "./Crm.scss";
import Staff from "./Staff/Staff";
import Notes from "./Notes/Notes";
import GoodsTabs from "./Goods/GoodsTabs";
import ClientsTabs from "./Clients/ClientsTabs";
import Analytics from "./Analytics/AnalyticsTabs";
import Whatsapp from "./WhatsApp/WhatsAppUI/WhatsAppUI";
import LeadsTabs from "./Funnel/LeadsTabs/LeadsTabs";
import FunnelTabs from "./Funnel/FunnelTabs";

const Placeholder = ({ title }) => (
  <div>
    <h1 className="crm__title">{title}</h1>
  </div>
);

const CRM = () => {
  return (
    <div className="crm">
      <Sidebar />

      <main className="crm__main">
        <Routes>
          <Route index element={<Placeholder title="Главная панель" />} />

          <Route path="register" element={<Register />} />
          <Route path="staff" element={<Staff />} />
          <Route path="clients" element={<ClientsTabs />} />
          <Route path="notes" element={<Notes />} />
          <Route path="goods" element={<GoodsTabs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="whatsapp" element={<Whatsapp />} />

          <Route path="/leadstabs" element={<LeadsTabs />} />
          <Route path="/funneltabs" element={<FunnelTabs />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default CRM;
