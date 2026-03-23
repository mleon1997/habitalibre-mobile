// src/screens/Unlock.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function Pill({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {children}
    </span>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: 18,
        borderRadius: 22,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      {children}
    </div>
  );
}

export default function Unlock() {
  const nav = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #071024 0%, #0b1a35 100%)",
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      {/* Header */}
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
            fontWeight: 900,
          }}
          aria-label="Volver"
        >
          ←
        </button>

        <Pill>🔒 Desbloquear</Pill>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 2 }}>HABITALIBRE</div>
        <h2 style={{ margin: "8px 0 0 0", fontSize: 30, letterSpacing: -0.5 }}>
          Ver tu resultado real
        </h2>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 14, lineHeight: 1.35 }}>
          Puedes explorar sin cuenta. Para <b>guardar tu score</b>, ver tu <b>ruta exacta</b> y
          retomar tu camino cuando quieras, inicia sesión.
        </div>
      </div>

      <Card>
        <div style={{ fontWeight: 900, fontSize: 14 }}>¿Qué desbloqueas?</div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {[
            { t: "Score Hipotecario real", s: "Se guarda en la nube y no lo pierdes." },
            { t: "Tu ruta recomendada", s: "BIESS / VIS / Privada según tu perfil." },
            { t: "Checklist y próximos pasos", s: "Acciones claras para mejorar aprobación." },
          ].map((x, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 13 }}>{x.t}</div>
              <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>{x.s}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => nav("/login")}
          style={{
            marginTop: 14,
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "none",
            background: "#25d3a6",
            fontWeight: 900,
            color: "#052019",
            fontSize: 15,
          }}
        >
          Entrar
        </button>

        <button
          onClick={() => nav("/journey")}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          Seguir explorando sin cuenta
        </button>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
          Tip: por ahora el registro lo haces desde la web. Luego te hago el Register screen aquí.
        </div>
      </Card>
    </div>
  );
}