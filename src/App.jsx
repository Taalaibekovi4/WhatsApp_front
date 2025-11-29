import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Auth/Login/Login";
import CRM from "./CRM/Crm";
import "./App.scss";
import LeadsTabs from "./CRM/Funnel/LeadsTabs/LeadsTabs";
import FunnelTabs from "./CRM/Funnel/FunnelTabs";

const PrivateRoute = ({ children }) => {
  const hasToken = Boolean(localStorage.getItem("access")); // ← ВАЖНО!

  if (!hasToken) {
    return <Navigate to="/" replace />;
  }

  return children;
};


const App = () => (
  <div className="app">
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/crm/*"
          element={
            <PrivateRoute>
              <CRM />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </div>
);

export default App;
