import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
} from "../ui/kit.jsx";
import { customerLogin } from "../lib/customerAuthApi.js";

function niceMsg(err) {
  return (
    err?.data?.error ||
    err?.data?.message ||
    err?.message ||
    "No pudimos iniciar sesión. Intenta de nuevo."
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const next = useMemo(() => {
    return query.get("next") || "/";
  }, [query]);

  const wasDeleted = useMemo(() => {
    const deletedByQuery = query.get("deleted") === "1";

    let deletedBySession = false;
    try {
      deletedBySession =
        typeof window !== "undefined" &&
        sessionStorage.getItem("hl_account_deleted") === "1";
    } catch {}

    return deletedByQuery || deletedBySession;
  }, [query]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wasDeleted) return;

    try {
      sessionStorage.removeItem("hl_account_deleted");
    } catch {}
  }, [wasDeleted]);

  async function handleLogin() {
    setError("");

    if (!email.trim()) {
      setError("Ingresa tu email.");
      return;
    }

    if (!password.trim()) {
      setError("Ingresa tu contraseña.");
      return;
    }

    try {
      setLoading(true);

      await customerLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      navigate(next, { replace: true });
    } catch (e) {
      setError(niceMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                cursor: "pointer",
                fontSize: 18,
                display: "grid",
                placeItems: "center",
              }}
            >
              ←
            </button>

            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                padding: "8px 14px",
                borderRadius: 999,
                color: "rgba(226,232,240,0.95)",
              }}
            >
              🔒 Sesión segura
            </div>
          </div>

          <img
            src="/LOGOHL.png"
            alt="HabitaLibre"
            style={{
              height: 50,
              marginBottom: 18,
              display: "block",
              filter: "drop-shadow(0 6px 16px rgba(45,212,191,0.22))",
            }}
          />

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.05,
              fontWeight: 950,
              color: "rgba(226,232,240,0.98)",
              letterSpacing: -0.6,
            }}
          >
            Entra a tu cuenta
          </h1>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.45,
              color: "rgba(148,163,184,0.95)",
              maxWidth: 340,
            }}
          >
            Guarda tus resultados y retoma tu camino cuando quieras.
          </div>
        </div>

        <Card soft style={{ padding: 18, borderRadius: 26 }}>
          {wasDeleted ? (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 14,
                background: "rgba(16,185,129,0.14)",
                border: "1px solid rgba(16,185,129,0.22)",
                color: "rgba(220,252,231,0.96)",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Tu cuenta fue eliminada correctamente.
            </div>
          ) : null}

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 800,
                color: "rgba(226,232,240,0.95)",
              }}
            >
              Email
            </div>

            <input
              type="email"
              placeholder="ej: mateo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                height: 52,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(255,255,255,0.06)",
                padding: "0 16px",
                color: "white",
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 800,
                color: "rgba(226,232,240,0.95)",
              }}
            >
              Contraseña
            </div>

            <input
              type="password"
              placeholder="mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%",
                height: 52,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(255,255,255,0.06)",
                padding: "0 16px",
                color: "white",
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 14,
                fontSize: 13,
                color: "#fca5a5",
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          ) : null}

          <PrimaryButton
            onClick={handleLogin}
            disabled={loading}
            style={{ height: 52, borderRadius: 18 }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </PrimaryButton>

          <div style={{ marginTop: 12 }}>
            <SecondaryButton
              onClick={() => navigate("/register")}
              style={{ height: 46, borderRadius: 16 }}
            >
              Crear cuenta
            </SecondaryButton>
          </div>

          <div style={{ marginTop: 10 }}>
            <SecondaryButton
              onClick={() => navigate("/forgot-password")}
              style={{ height: 46, borderRadius: 16 }}
            >
              Olvidé mi contraseña
            </SecondaryButton>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              marginTop: 18,
              width: "100%",
              background: "transparent",
              border: "none",
              color: "rgba(226,232,240,0.78)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Usar la app sin cuenta
          </button>
        </Card>
      </div>
    </Screen>
  );
}