// src/screens/Register.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
} from "../ui/kit.jsx";
import { apiPost } from "../lib/api.js";
import { setCustomerSession } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

function clearLocalScenarioState() {
  try {
    localStorage.removeItem(LS_SNAPSHOT);
    localStorage.removeItem(LS_JOURNEY);
    localStorage.removeItem(LS_SELECTED_PROPERTY);
  } catch {}
}

const COLORS = {
  text: "rgba(226,232,240,0.98)",
  textSoft: "rgba(226,232,240,0.82)",
  subtext: "rgba(148,163,184,0.95)",
  borderSoft: "rgba(148,163,184,0.18)",
  inputBg: "rgba(255,255,255,0.06)",
  dangerBg: "rgba(244,63,94,0.10)",
  dangerBorder: "rgba(244,63,94,0.25)",
  dangerText: "#fca5a5",
};

const LEGAL_LINKS = {
  privacidad: "https://www.habitalibre.com/#/privacidad",
  terminos: "https://www.habitalibre.com/#/terminos",
  cookies: "https://www.habitalibre.com/#/cookies",
};

const onlyDigits = (v) => String(v ?? "").replace(/[^\d]/g, "");

function normalizePhone(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("593")) return d;
  if (d.startsWith("09") && d.length === 10) return d;
  if (d.length === 9 && d.startsWith("9")) return `0${d}`;
  return d;
}

function isValidEcPhone(norm) {
  if (!norm) return false;
  if (norm.startsWith("09") && norm.length === 10) return true;
  if (norm.startsWith("593") && norm.length >= 11 && norm.length <= 13)
    return true;
  return false;
}

function openExternal(url) {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = url;
  }
}

function niceMsg(err) {
  const raw =
    err?.data?.error ||
    err?.data?.message ||
    err?.message ||
    "No se pudo crear la cuenta.";

  const msg = String(raw).toLowerCase();

  if (msg.includes("failed to fetch") || msg.includes("load failed")) {
    return "Ups… no pudimos conectarnos en este momento. Intenta de nuevo en unos segundos.";
  }

  if (msg.includes("email") && msg.includes("exists")) {
    return "Ese email ya tiene una cuenta. Puedes iniciar sesión directamente.";
  }

  if (msg.includes("duplicate")) {
    return "Ya existe una cuenta con esos datos. Intenta iniciar sesión.";
  }

  return raw;
}

function setFocusedInputStyle(el) {
  if (!el) return;
  el.style.border = "1px solid rgba(45,212,191,0.55)";
  el.style.boxShadow = "0 0 0 3px rgba(45,212,191,0.14)";
  el.style.background = "rgba(255,255,255,0.08)";
}

function resetInputStyle(el) {
  if (!el) return;
  el.style.border = `1px solid ${COLORS.borderSoft}`;
  el.style.boxShadow = "none";
  el.style.background = COLORS.inputBg;
}

function inputBaseStyle(hasValue = false) {
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
    boxShadow: hasValue ? "0 6px 18px rgba(0,0,0,0.08)" : "none",
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  autoCapitalize = "none",
  inputMode,
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 800,
          color: "rgba(226,232,240,0.95)",
        }}
      >
        {label}
      </div>

      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        autoCorrect="off"
        inputMode={inputMode}
        onFocus={(e) => setFocusedInputStyle(e.target)}
        onBlur={(e) => resetInputStyle(e.target)}
        style={inputBaseStyle(Boolean(value))}
      />
    </div>
  );
}

function InlineLink({ children, onClick, tone = "accent" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 0,
        border: "none",
        background: "transparent",
        color: tone === "accent" ? "#25d3a6" : "#9ad7c4",
        fontWeight: 900,
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      {children}
    </button>
  );
}

export default function Register() {
  const nav = useNavigate();
  const location = useLocation();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("next") || "/";
  }, [location.search]);

  const phoneNormalized = useMemo(() => normalizePhone(telefono), [telefono]);
  const phoneOk = useMemo(
    () => isValidEcPhone(phoneNormalized),
    [phoneNormalized]
  );

  const canSubmit = useMemo(() => {
    return (
      nombre.trim().length >= 2 &&
      apellido.trim().length >= 2 &&
      String(email).includes("@") &&
      String(password).length >= 6 &&
      phoneOk &&
      accepted
    );
  }, [nombre, apellido, email, password, phoneOk, accepted]);

  async function onRegister() {
    if (!canSubmit || busy) return;

    setBusy(true);
    setErr("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const payload = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: phoneNormalized,
        email: normalizedEmail,
        password,
        acceptedPrivacy: true,
        privacyVersion: "v1",
      };

      const data = await apiPost("/api/customer-auth/register", payload);

      const token = data?.token || data?.accessToken || data?.jwt;
      const customer = data?.customer || data?.user || null;

      if (!token) {
        throw new Error("No pudimos crear tu cuenta. Intenta de nuevo.");
      }

      clearLocalScenarioState();
      setCustomerSession({
        token,
        customer,
        email: normalizedEmail,
      });

      nav(next, { replace: true });
    } catch (e) {
      setErr(niceMsg(e));
    } finally {
      setBusy(false);
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
        <div style={{ marginBottom: 18 }}>
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
            Crea tu cuenta
          </h1>

          <div
            style={{
              marginTop: 12,
              fontSize: 16,
              lineHeight: 1.42,
              color: COLORS.subtext,
              maxWidth: 360,
            }}
          >
            Guarda tu progreso, tus resultados y tu camino a casa.
          </div>
        </div>

        <Card
          soft
          style={{
            marginTop: 14,
            padding: 18,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
          }}
        >
          <Field
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="given-name"
            autoCapitalize="words"
          />

          <Field
            label="Apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            placeholder="Tu apellido"
            autoComplete="family-name"
            autoCapitalize="words"
          />

          <Field
            label="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="09XXXXXXXX o +5939XXXXXXX"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
          />

          {!phoneOk && telefono ? (
            <div
              style={{
                marginTop: -6,
                marginBottom: 12,
                fontSize: 12,
                color: COLORS.dangerText,
                lineHeight: 1.4,
              }}
            >
              Usa un formato como 09XXXXXXXX o +5939XXXXXXX.
            </div>
          ) : null}

          <Field
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu email"
            type="email"
            autoComplete="email"
            inputMode="email"
          />

          <Field
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            type="password"
            autoComplete="new-password"
          />

          <div
            style={{
              marginTop: 6,
              padding: 14,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{
                marginTop: 4,
                width: 18,
                height: 18,
                accentColor: "#25d3a6",
                flexShrink: 0,
              }}
            />

            <div
              style={{
                fontSize: 13,
                color: COLORS.textSoft,
                lineHeight: 1.5,
              }}
            >
              Acepto los{" "}
              <InlineLink onClick={() => openExternal(LEGAL_LINKS.terminos)}>
                términos de uso
              </InlineLink>{" "}
              y la{" "}
              <InlineLink onClick={() => openExternal(LEGAL_LINKS.privacidad)}>
                política de privacidad
              </InlineLink>
              .
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "rgba(148,163,184,0.82)",
              lineHeight: 1.45,
            }}
          >
            También puedes revisar nuestra{" "}
            <InlineLink
              onClick={() => openExternal(LEGAL_LINKS.cookies)}
              tone="soft"
            >
              política de cookies
            </InlineLink>
            .
          </div>

          {!!err && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 16,
                background: COLORS.dangerBg,
                border: `1px solid ${COLORS.dangerBorder}`,
                fontSize: 13,
                lineHeight: 1.4,
                color: COLORS.dangerText,
              }}
            >
              {err}
            </div>
          )}

          <PrimaryButton
            onClick={onRegister}
            disabled={!canSubmit || busy}
            onMouseDown={handlePrimaryPressDown}
            onMouseUp={handlePrimaryPressUp}
            onMouseLeave={handlePrimaryPressUp}
            style={{
              marginTop: 16,
              height: 58,
              borderRadius: 22,
              fontSize: 16,
              fontWeight: 900,
              transition: "all 0.2s ease",
              boxShadow: "0 18px 40px rgba(45,212,191,0.32)",
            }}
          >
            {busy ? "Creando tu cuenta..." : "Crear cuenta y continuar"}
          </PrimaryButton>

          <div
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 800,
              color: "rgba(226,232,240,0.72)",
            }}
          >
            Te tomará menos de 2 minutos
          </div>

          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 12,
              lineHeight: 1.45,
              color: "rgba(148,163,184,0.78)",
            }}
          >
            Tus datos están protegidos. No compartimos tu información sin tu
            consentimiento.
          </div>

          <div style={{ marginTop: 14 }}>
            <SecondaryButton
              onClick={() => nav(`/login?next=${encodeURIComponent(next)}`)}
              disabled={busy}
              style={{
                height: 48,
                borderRadius: 16,
                fontWeight: 850,
              }}
            >
              Ya tengo cuenta
            </SecondaryButton>
          </div>
        </Card>
      </div>
    </Screen>
  );
}