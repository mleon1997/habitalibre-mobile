import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
} from "../ui/kit.jsx";
import { customerLogin } from "../lib/customerAuthApi.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

function niceMsg(err) {
  const raw =
    err?.data?.error ||
    err?.data?.message ||
    err?.message ||
    "Ups… no pudimos iniciar sesión.";

  const msg = String(raw).toLowerCase();

  if (msg.includes("failed to fetch") || msg.includes("load failed")) {
    return "Ups… no pudimos conectarnos en este momento. Intenta de nuevo en unos segundos.";
  }

  if (
    msg.includes("invalid") ||
    msg.includes("credenciales") ||
    msg.includes("incorrect")
  ) {
    return "Tu email o contraseña no coinciden. Revisa tus datos e inténtalo otra vez.";
  }

  return raw;
}

const COLORS = {
  text: "rgba(226,232,240,0.98)",
  subtext: "rgba(148,163,184,0.94)",
  subtextSoft: "rgba(148,163,184,0.78)",
  borderSoft: "rgba(148,163,184,0.18)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBgFocus: "rgba(255,255,255,0.08)",
  successBg: "rgba(16,185,129,0.14)",
  successBorder: "rgba(16,185,129,0.22)",
  successText: "rgba(220,252,231,0.96)",
  dangerBg: "rgba(239,68,68,0.10)",
  dangerBorder: "rgba(239,68,68,0.20)",
  dangerText: "#fca5a5",
};

function inputStyle(hasValue = false) {
  return {
    width: "100%",
    height: 56,
    borderRadius: 18,
    border: `1px solid ${COLORS.borderSoft}`,
    background: COLORS.inputBg,
    padding: "0 16px",
    color: "white",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.18s ease",
    boxShadow: hasValue ? "0 8px 20px rgba(0,0,0,0.08)" : "none",
  };
}

function setFocusedInputStyle(el) {
  if (!el) return;
  el.style.border = "1px solid rgba(45,212,191,0.58)";
  el.style.boxShadow = "0 0 0 3px rgba(45,212,191,0.14)";
  el.style.background = COLORS.inputBgFocus;
}

function resetInputStyle(el) {
  if (!el) return;
  el.style.border = `1px solid ${COLORS.borderSoft}`;
  el.style.boxShadow = "none";
  el.style.background = COLORS.inputBg;
}

function TrustLine() {
  return (
    <div
      style={{
        marginTop: 10,
        textAlign: "center",
        fontSize: 12,
        lineHeight: 1.4,
        color: COLORS.subtextSoft,
      }}
    >
      Tus datos están protegidos. No compartimos tu información sin tu
      consentimiento.
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const next = useMemo(() => query.get("next") || "/", [query]);

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
      setError("Ingresa tu email para continuar.");
      return;
    }

    if (!password.trim()) {
      setError("Ingresa tu contraseña para continuar.");
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

  function handlePrimaryPressDown(e) {
    e.currentTarget.style.transform = "scale(0.985)";
  }

  function handlePrimaryPressUp(e) {
    e.currentTarget.style.transform = "scale(1)";
  }

  return (
    <Screen>
     <div
  style={{
    maxWidth: 430,
    margin: "0 auto",
    paddingTop: 48,
    paddingBottom: 8,
  }}
>
        <div style={{ marginBottom: 12 }}>
          <img
            src="/LOGOHL.png"
            alt="HabitaLibre"
            style={{
              height: 34,
              marginBottom: 14,
              display: "block",
              filter: "drop-shadow(0 8px 18px rgba(45,212,191,0.20))",
            }}
          />

          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 3.2,
              color: "rgba(226,232,240,0.68)",
              marginBottom: 10,
            }}
          >
            HABITALIBRE
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.06,
              fontWeight: 950,
              color: COLORS.text,
              letterSpacing: -1.0,
              maxWidth: 350,
              textWrap: "balance",
            }}
          >
            Inicia sesión para ver tu progreso
          </h1>

          <div
            style={{
              marginTop: 12,
              fontSize: 16,
              lineHeight: 1.42,
              color: COLORS.subtext,
              maxWidth: 350,
            }}
          >
Accede a tu progreso guardado y tus resultados.
          </div>
        </div>
<Card
  soft
  style={{
   marginTop: 18,
    padding: 18,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
          }}
        >
          {wasDeleted ? (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 14,
                background: COLORS.successBg,
                border: `1px solid ${COLORS.successBorder}`,
                color: COLORS.successText,
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Tu cuenta fue eliminada correctamente.
            </div>
          ) : null}

          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 800,
                color: COLORS.text,
              }}
            >
              Email
            </div>

            <input
              type="email"
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => setFocusedInputStyle(e.target)}
              onBlur={(e) => resetInputStyle(e.target)}
              autoComplete="email"
              style={inputStyle(Boolean(email))}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 800,
                color: COLORS.text,
              }}
            >
              Contraseña
            </div>

            <input
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => setFocusedInputStyle(e.target)}
              onBlur={(e) => resetInputStyle(e.target)}
              autoComplete="current-password"
              style={inputStyle(Boolean(password))}
            />
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 14,
                background: COLORS.dangerBg,
                border: `1px solid ${COLORS.dangerBorder}`,
                fontSize: 13,
                color: COLORS.dangerText,
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          ) : null}

          <PrimaryButton
            onClick={handleLogin}
            disabled={loading}
            onMouseDown={handlePrimaryPressDown}
            onMouseUp={handlePrimaryPressUp}
            onMouseLeave={handlePrimaryPressUp}
            style={{
              height: 58,
              borderRadius: 22,
              fontSize: 17,
              fontWeight: 900,
              transition: "all 0.2s ease",
              boxShadow: "0 18px 40px rgba(45,212,191,0.35)",
            }}
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </PrimaryButton>
          <TrustLine />

          <div style={{ marginTop: 14 }}>
            <SecondaryButton
              onClick={() => navigate("/register")}
              style={{
                height: 50,
                borderRadius: 16,
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                color: "rgba(226,232,240,0.96)",
              }}
            >
              Crear cuenta
            </SecondaryButton>
          </div>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            style={{
              marginTop: 14,
              width: "100%",
              background: "transparent",
              border: "none",
              color: "rgba(226,232,240,0.66)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Olvidé mi contraseña
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              marginTop: 8,
              width: "100%",
              background: "transparent",
              border: "none",
              color: "rgba(226,232,240,0.50)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Explorar sin cuenta
          </button>
        </Card>
      </div>
    </Screen>
  );
}