// src/screens/Login.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiPost } from "../lib/api.js";
import { setCustomerSession /*, clearCustomerSession*/ } from "../lib/customerSession.js";

const LS_AFTER_LOGIN = "hl_after_login_path";

function Card({ children }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 18,
        borderRadius: 24,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{label}</div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          width: "100%",
          marginTop: 8,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          outline: "none",
          fontSize: 14,
        }}
      />
    </div>
  );
}

function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: 12,
        opacity: 0.92,
      }}
    >
      {children}
    </span>
  );
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    return String(email).includes("@") && String(password).length >= 6;
  }, [email, password]);

function resolveNextFromQuery() {
  try {
    const params = new URLSearchParams(location.search);
    const raw = params.get("next") || "";
    return raw ? decodeURIComponent(raw) : "";
  } catch {
    return "";
  }
}

function resolveAfterLoginPath() {
  const next = resolveNextFromQuery();
  if (next) return next;

  try {
    const after = localStorage.getItem(LS_AFTER_LOGIN) || "";
    if (after) localStorage.removeItem(LS_AFTER_LOGIN);
    return after || "/journey/full"; // ✅ default pro
  } catch {
    return "/journey/full";
  }
}
  function resolveAfterLoginPath() {
    // prioridad: ?next=...
    const next = resolveNextFromQuery();
    if (next) return next;

    // fallback: localStorage
    try {
      const after = localStorage.getItem(LS_AFTER_LOGIN) || "";
      if (after) localStorage.removeItem(LS_AFTER_LOGIN);
      return after || "/";
    } catch {
      return "/";
    }
  }

  async function onLogin() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr("");

    try {
      const data = await apiPost("/api/customer-auth/login", {
        email: String(email).trim().toLowerCase(),
        password: String(password),
      });

      const token = data?.token || data?.accessToken || data?.jwt;
      const customer = data?.customer || data?.user || null;

      if (!token) throw new Error("No pudimos iniciar sesión. Intenta de nuevo.");

      setCustomerSession({ token, customer });

      // ✅ vuelve a donde estaba (next o LS fallback)
      const after = resolveAfterLoginPath();
      nav(after, { replace: true });
    } catch (e) {
      setErr(e?.message || "Credenciales inválidas. Revisa email y password.");
    } finally {
      setBusy(false);
    }
  }

  function goRegister() {
    const next = resolveNextFromQuery() || "/";
    nav(`/register?next=${encodeURIComponent(next)}`);
  }

  function continueNoAccount() {
    // opcional: si quieres asegurarte que no quede token viejo:
    // clearCustomerSession();
    nav("/", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 30% 0%, #123a7a 0%, #071024 45%, #0b1a35 100%)",
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      {/* Top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button
          onClick={() => nav("/", { replace: true })}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: 18,
            cursor: "pointer",
          }}
          aria-label="Volver"
        >
          ←
        </button>

        <Chip>🔒 Sesión segura</Chip>
      </div>

      {/* Title */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 2, fontWeight: 900 }}>
          HABITALIBRE
        </div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>
          Entra a tu cuenta
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
          Guarda tus resultados y retoma tu camino cuando quieras.
        </div>
      </div>

      <Card>
        <Input
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ej: mateo@correo.com"
          type="email"
        />

        <Input
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          type="password"
        />

        {!!err && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 16,
              background: "rgba(244,63,94,0.10)",
              border: "1px solid rgba(244,63,94,0.25)",
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            {err}
          </div>
        )}

        <button
          onClick={onLogin}
          disabled={!canSubmit || busy}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 14,
            borderRadius: 16,
            border: "none",
            background: !canSubmit || busy ? "rgba(37,211,166,0.35)" : "#25d3a6",
            fontWeight: 900,
            fontSize: 15,
            color: "#052019",
            opacity: !canSubmit || busy ? 0.85 : 1,
            cursor: !canSubmit || busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Entrando..." : "Entrar"}
        </button>

        {/* ✅ NUEVO: crear cuenta */}
        <button
          onClick={goRegister}
          disabled={busy}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.04)",
            color: "white",
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Crear cuenta
        </button>

        <button
          onClick={() => alert("Siguiente: flujo de recuperación de password")}
          disabled={busy}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.04)",
            color: "white",
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Olvidé mi contraseña
        </button>

        {/* no fricción */}
        <button
          onClick={continueNoAccount}
          disabled={busy}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 12,
            borderRadius: 16,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.78)",
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Continuar sin cuenta
        </button>
      </Card>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
        Tip: ahora ya puedes crear tu cuenta directamente desde el app 😉
      </div>
    </div>
  );
}