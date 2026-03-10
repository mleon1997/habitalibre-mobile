// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Ruta from "./screens/Ruta.jsx";
import Home from "./screens/Home.jsx";
import Journey from "./screens/Journey.jsx";
import QueMeFalta from "./screens/QueMeFalta.jsx";
import MejorarPerfil from "./screens/MejorarPerfil.jsx";
import Marketplace from "./screens/Marketplace.jsx";
import Asesor from "./screens/Asesor.jsx";
import PropertyDetail from "./screens/PropertyDetail.jsx";
import Login from "./screens/Login.jsx";
import Register from "./screens/Register.jsx";

import BottomNav from "./components/BottomNav.jsx";
import { getCustomerToken } from "./lib/customerSession.js";

function RequireCustomer({ children }) {
  const token = getCustomerToken();
  const location = useLocation();

  if (!token) {
    const next = encodeURIComponent(`${location.pathname}${location.search || ""}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();

  const hideNav =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register");

  return (
    <>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/mejorar" element={<MejorarPerfil />} />
        <Route path="/que-me-falta" element={<QueMeFalta />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/property/:id" element={<PropertyDetail />} />

        {/* Ruta principal */}
        <Route path="/ruta" element={<Ruta />} />

        {/* Alias por compatibilidad */}
        <Route path="/docs" element={<Ruta />} />

        <Route path="/asesor" element={<Asesor />} />

        {/* Protegidas */}
        <Route
          path="/journey/full"
          element={
            <RequireCustomer>
              <Journey />
            </RequireCustomer>
          }
        />

        <Route
          path="/mejorar/full"
          element={
            <RequireCustomer>
              <MejorarPerfil />
            </RequireCustomer>
          }
        />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideNav ? <BottomNav /> : null}
    </>
  );
}