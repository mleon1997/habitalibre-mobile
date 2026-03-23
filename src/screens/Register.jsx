// src/screens/Register.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiPost } from "../lib/api.js";
import { setCustomerSession } from "../lib/customerSession.js";

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
  if (norm.startsWith("593") && norm.length >= 11 && norm.length <= 13) return true;
  return false;
}

const LEGAL_LINKS = {
  privacidad: "https://www.habitalibre.com/#/privacidad",
  terminos: "https://www.habitalibre.com/#/terminos",
  cookies: "https://www.habitalibre.com/#/cookies",
};

function openExternal(url) {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = url;
  }
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
  const phoneOk = useMemo(() => isValidEcPhone(phoneNormalized), [phoneNormalized]);

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
      const payload = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: phoneNormalized,
        email: email.trim().toLowerCase(),
        password,
        acceptedPrivacy: true,
        privacyVersion: "v1",
      };

      const data = await apiPost("/api/customer-auth/register", payload);

      const token = data?.token || data?.accessToken || data?.jwt;
      const customer = data?.customer || data?.user || null;

      if (!token) throw new Error("No pudimos crear tu cuenta. Intenta de nuevo.");

      setCustomerSession({ token, customer });
      nav(next, { replace: true });
    } catch (e) {
      setErr(e?.message || "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button
          onClick={() => nav(-1)}
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

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 2, fontWeight: 900 }}>
          HABITALIBRE
        </div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>
          Crea tu cuenta
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
          Guarda tu score y retoma tu camino cuando quieras.
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
          💬 WhatsApp obligatorio para poder ayudarte con tu ruta y documentación.
        </div>
      </div>

      <Card>
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Mateo"
        />

        <Input
          label="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Ej: Leon"
        />

        <Input
          label="Teléfono (WhatsApp) — obligatorio"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 09XXXXXXXX o +5939XXXXXXX"
          type="tel"
        />

        {!phoneOk && telefono ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "salmon", opacity: 0.95 }}>
            Formato sugerido: 09XXXXXXXX o +5939XXXXXXX
          </div>
        ) : null}

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

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.45 }}>
            Acepto los{" "}
            <button
              type="button"
              onClick={() => openExternal(LEGAL_LINKS.terminos)}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                color: "#25d3a6",
                fontWeight: 900,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              términos de uso
            </button>{" "}
            y la{" "}
            <button
              type="button"
              onClick={() => openExternal(LEGAL_LINKS.privacidad)}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                color: "#25d3a6",
                fontWeight: 900,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              política de privacidad
            </button>
            . Entiendo que HabitaLibre usa esta información para ayudarme a explorar
            opciones de precalificación y acompañar mi proceso hipotecario.
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, opacity: 0.62, lineHeight: 1.4 }}>
          También puedes revisar nuestra{" "}
          <button
            type="button"
            onClick={() => openExternal(LEGAL_LINKS.cookies)}
            style={{
              padding: 0,
              border: "none",
              background: "transparent",
              color: "#9ad7c4",
              fontWeight: 800,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            política de cookies
          </button>
          .
        </div>

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
          onClick={onRegister}
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
            cursor: !canSubmit || busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Creando..." : "Crear cuenta"}
        </button>

        <button
          onClick={() => nav(`/login?next=${encodeURIComponent(next)}`)}
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
          Ya tengo cuenta
        </button>

        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.65, lineHeight: 1.45 }}>
          Usamos tu WhatsApp y tus datos de perfil únicamente para ayudarte con tu
          proceso hipotecario, mostrarte resultados referenciales y acompañarte mejor
          en tu camino hacia tu vivienda.
        </div>
      </Card>
    </div>
  );
}