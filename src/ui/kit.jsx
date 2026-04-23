// src/ui/kit.jsx
import React from "react";

/**
 * HabitaLibre UI Kit (world-class baseline)
 * - Unifica radio, borde, sombras, chips y botones
 * - Cambias tokens aquí -> cambian todas las pantallas
 */
export const UI = {
  radiusCard: 22,
  radiusInner: 16,
  radiusBtn: 16,
  radiusChip: 999,

  border: "1px solid rgba(148,163,184,0.16)",
  borderSoft: "1px solid rgba(148,163,184,0.12)",

  cardBg: "rgba(15,23,42,0.62)",
  cardBgSoft: "rgba(15,23,42,0.48)",
  innerBg: "rgba(2,6,23,0.22)",

  text: "rgba(226,232,240,0.95)",
  subtext: "rgba(148,163,184,0.95)",

  shadow: "0 18px 52px rgba(0,0,0,0.40)",
  shadowSoft: "0 12px 34px rgba(0,0,0,0.26)",
};

export function Screen({ children, style }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background:
          "radial-gradient(1200px 800px at 20% 10%, rgba(45,212,191,0.10), transparent 55%)," +
          "radial-gradient(1000px 700px at 80% 10%, rgba(59,130,246,0.10), transparent 60%)," +
          "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 100%)",
        color: UI.text,
        fontFamily: "system-ui",
        overflowX: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 8,
          paddingBottom: 10,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}


export function Card({ children, soft = false, style }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: UI.radiusCard,
        background: soft ? UI.cardBgSoft : UI.cardBg,
        border: UI.border,
        boxShadow: soft ? UI.shadowSoft : UI.shadow,
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function InnerCard({ children, style }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: UI.radiusInner,
        background: UI.innerBg,
        border: UI.borderSoft,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({ children, tone = "neutral", style }) {
  const tones = {
    good: { bg: "rgba(34,197,94,0.12)", bd: "rgba(34,197,94,0.25)", fg: "rgba(187,247,208,0.95)" },
    warn: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.25)", fg: "rgba(254,243,199,0.95)" },
    bad: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.25)", fg: "rgba(254,226,226,0.95)" },
    neutral: { bg: "rgba(148,163,184,0.10)", bd: "rgba(148,163,184,0.20)", fg: "rgba(226,232,240,0.92)" },
  };
  const c = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: UI.radiusChip,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({ children, onClick, style, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 48,
        borderRadius: UI.radiusBtn,
        border: "1px solid rgba(255,255,255,0.10)",
        background: disabled
          ? "rgba(148,163,184,0.14)"
          : "linear-gradient(180deg, rgba(45,212,191,0.95), rgba(45,212,191,0.78))",
        color: disabled ? "rgba(226,232,240,0.55)" : "rgba(2,6,23,0.95)",
        fontWeight: 950,
        letterSpacing: 0.2,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 14px 30px rgba(45,212,191,0.12)",
        transition: "transform 140ms ease",
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.99)";
      }}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 44,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.18)",
        background: disabled ? "rgba(148,163,184,0.08)" : "rgba(2,6,23,0.20)",
        color: disabled ? "rgba(226,232,240,0.40)" : "rgba(226,232,240,0.92)",
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 140ms ease",
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.99)";
      }}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div
      style={{
        height: 10,
        width: "100%",
        borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${v}%`,
          borderRadius: 999,
          background: "linear-gradient(90deg, rgba(45,212,191,0.95), rgba(59,130,246,0.55))",
          transition: "width 450ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
    </div>
  );
}