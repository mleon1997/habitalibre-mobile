// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ForgotPassword from "./screens/ForgotPassword.jsx";
import ResetPassword from "./screens/ResetPassword.jsx";
import Home from "./screens/Home.jsx";
import Journey from "./screens/Journey.jsx";
import Marketplace from "./screens/Marketplace.jsx";
import Perfil from "./screens/Perfil.jsx";
import Ruta from "./screens/Ruta.jsx";
import QueMeFalta from "./screens/QueMeFalta.jsx";
import MejorarPerfil from "./screens/MejorarPerfil.jsx";
import Asesor from "./screens/Asesor.jsx";
import PropertyDetail from "./screens/PropertyDetail.jsx";
import Login from "./screens/Login.jsx";
import Register from "./screens/Register.jsx";
import EditarPerfil from "./screens/EditarPerfil.jsx";
import PropiedadIdeal from "./screens/PropiedadIdeal.jsx";
import Legal from "./screens/Legal.jsx";
import DeleteAccount from "./screens/DeleteAccount.jsx";
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
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password");

  return (
    <>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/que-me-falta" element={<QueMeFalta />} />
        <Route path="/mejorar" element={<MejorarPerfil />} />
        <Route path="/asesor" element={<Asesor />} />
        <Route path="/legal" element={<Legal />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protegidas */}
        <Route
          path="/perfil"
          element={
            <RequireCustomer>
              <Perfil />
            </RequireCustomer>
          }
        />

        <Route
          path="/perfil/editar"
          element={
            <RequireCustomer>
              <EditarPerfil />
            </RequireCustomer>
          }
        />

        <Route
          path="/eliminar-cuenta"
          element={
            <RequireCustomer>
              <DeleteAccount />
            </RequireCustomer>
          }
        />

        <Route
          path="/propiedad-ideal"
          element={
            <RequireCustomer>
              <PropiedadIdeal />
            </RequireCustomer>
          }
        />

        {/* Ruta / Docs */}
        <Route path="/ruta" element={<Ruta />} />
        <Route path="/docs" element={<Ruta />} />

        {/* Versiones protegidas del journey */}
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideNav ? <BottomNav /> : null}
    </>
  );
}