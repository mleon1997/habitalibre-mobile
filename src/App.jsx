import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Onboarding from "./screens/Onboarding.jsx";
import { hasSeenOnboarding } from "./lib/appOnboarding.js";
import ForgotPassword from "./screens/ForgotPassword.jsx";
import ResetPassword from "./screens/ResetPassword.jsx";
import Home from "./screens/Home.jsx";
import Journey from "./screens/Journey.jsx";
import Marketplace from "./screens/Marketplace.jsx";
import Perfil from "./screens/Perfil.jsx";
import Ruta from "./screens/Ruta.jsx";
import Asesor from "./screens/Asesor.jsx";
import PropertyDetail from "./screens/PropertyDetail.jsx";
import Login from "./screens/Login.jsx";
import Register from "./screens/Register.jsx";
import EditarPerfil from "./screens/EditarPerfil.jsx";
import Legal from "./screens/Legal.jsx";
import DeleteAccount from "./screens/DeleteAccount.jsx";
import ChecklistDocumentos from "./screens/ChecklistDocumentos";
import SiguientePaso from "./screens/SiguientePaso.jsx";
import Caso from "./screens/Caso.jsx";
import BottomNav from "./components/BottomNav.jsx";
import AppShell from "./components/AppShell.jsx";
import { getCustomerToken } from "./lib/customerSession.js";

function RequireCustomer({ children }) {
  const token = getCustomerToken();
  const location = useLocation();

  if (!token) {
    const next = encodeURIComponent(
      `${location.pathname}${location.search || ""}`
    );
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const possibleScrollContainers = document.querySelectorAll(
        "[data-scroll-container], main, .app-scroll, .screen, #root"
      );

      possibleScrollContainers.forEach((el) => {
        if (el && typeof el.scrollTo === "function") {
          el.scrollTo({
            top: 0,
            left: 0,
            behavior: "auto",
          });
        } else if (el) {
          el.scrollTop = 0;
        }
      });
    });
  }, [pathname]);

  return null;
}

export default function App() {
  const location = useLocation();
  const token = getCustomerToken();
  const seenOnboarding = hasSeenOnboarding();

  const hideNav =
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password");

  return (
    <AppShell hideNav={hideNav}>
      <ScrollToTop />

      <Routes>
        {/* Públicas principales */}
        <Route
          path="/"
          element={
            !seenOnboarding ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <Home />
            )
          }
        />

        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/asesor" element={<Asesor />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/checklist-documentos" element={<ChecklistDocumentos />} />
        <Route path="/siguiente-paso" element={<SiguientePaso />} />
        <Route path="/caso" element={<Caso />} />
        <Route path="/ruta" element={<Ruta />} />
        <Route
          path="/docs"
          element={<Navigate to="/checklist-documentos" replace />}
        />

        {/* Rutas antiguas redirigidas a pantallas ya corregidas */}
        <Route path="/que-me-falta" element={<Navigate to="/ruta" replace />} />
        <Route
          path="/mejorar"
          element={<Navigate to="/journey?afinando=1" replace />}
        />
        <Route
          path="/propiedad-ideal"
          element={<Navigate to="/marketplace" replace />}
        />

        {/* Auth */}
        <Route
          path="/login"
          element={token ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/" replace /> : <Register />}
        />
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
              <Navigate to="/journey/full?afinando=1" replace />
            </RequireCustomer>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideNav ? <BottomNav /> : null}
    </AppShell>
  );
}