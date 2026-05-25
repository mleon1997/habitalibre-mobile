// src/ui/kit.jsx
import React from "react";

/**
 * HabitaLibre UI Kit — Web
 * Replica el look & feel de la app mobile:
 * dark premium, glass cards, emerald CTA, radios grandes y experiencia app-like.
 *
 * Importante:
 * - Screen por defecto CONSTRAINT el contenido para que Home/Journey se vean como app.
 * - PageShell y CenterShell usan constrain={false} para no romper layouts web amplios.
 */

export const UI = {
  radiusCard: 28,
  radiusInner: 20,
  radiusBtn: 18,
  radiusInput: 18,
  radiusChip: 999,

  border: "1px solid rgba(148,163,184,0.16)",
  borderSoft: "1px solid rgba(148,163,184,0.12)",
  borderStrong: "1px solid rgba(255,255,255,0.10)",

  bg: "rgba(2,6,23,1)",
  cardBg: "rgba(15,23,42,0.68)",
  cardBgSoft: "rgba(15,23,42,0.52)",
  innerBg: "rgba(2,6,23,0.28)",
  inputBg: "rgba(255,255,255,0.06)",

  text: "rgba(226,232,240,0.98)",
  subtext: "rgba(148,163,184,0.95)",
  muted: "rgba(148,163,184,0.70)",

  emerald: "rgba(45,212,191,0.95)",
  emeraldSoft: "rgba(45,212,191,0.14)",
  blue: "rgba(59,130,246,0.85)",

  dangerBg: "rgba(239,68,68,0.10)",
  dangerBorder: "rgba(239,68,68,0.25)",
  dangerText: "rgba(254,202,202,0.96)",

  successBg: "rgba(16,185,129,0.14)",
  successBorder: "rgba(16,185,129,0.25)",
  successText: "rgba(209,250,229,0.96)",

  shadow: "0 24px 80px rgba(0,0,0,0.42)",
  shadowSoft: "0 16px 48px rgba(0,0,0,0.28)",
  buttonShadow: "0 18px 40px rgba(45,212,191,0.24)",
};

export function Screen({
  children,
  style,
  className = "",
  constrain = true,
  contentStyle,
  contentClassName = "",
}) {
  return (
    <main
      data-scroll-container
      className={`hl-screen ${className || ""}`}
      style={{
        minHeight: "100dvh",
        width: "100%",
        background:
          "radial-gradient(1200px 800px at 20% 10%, rgba(45,212,191,0.10), transparent 55%)," +
          "radial-gradient(1000px 700px at 80% 10%, rgba(59,130,246,0.10), transparent 60%)," +
          "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 100%)",
        color: UI.text,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflowX: "hidden",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <style>
        {`
          .hl-screen-inner {
            width: 100%;
            max-width: 430px;
            margin-left: auto;
            margin-right: auto;
            box-sizing: border-box;
          }

          @media (min-width: 640px) {
            .hl-screen-inner {
              max-width: 520px;
            }
          }

          @media (min-width: 900px) {
            .hl-screen-inner {
              max-width: 620px;
            }
          }

          @media (min-width: 1180px) {
            .hl-screen-inner {
              max-width: 680px;
            }
          }
        `}
      </style>

      {constrain ? (
        <div
          className={`hl-screen-inner ${contentClassName || ""}`}
          style={{
            ...contentStyle,
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </main>
  );
}

export function PageShell({ children, style, className = "" }) {
  return (
    <Screen className={className} constrain={false}>
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          padding: "40px 20px",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {children}
      </div>
    </Screen>
  );
}

export function CenterShell({ children, style, className = "" }) {
  return (
    <Screen constrain={false}>
      <div
        className={className}
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {children}
      </div>
    </Screen>
  );
}

export function Card({ children, soft = false, style, className = "" }) {
  return (
    <div
      className={className}
      style={{
        padding: 20,
        borderRadius: UI.radiusCard,
        background: soft ? UI.cardBgSoft : UI.cardBg,
        border: UI.borderStrong,
        boxShadow: soft ? UI.shadowSoft : UI.shadow,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function InnerCard({ children, style, className = "" }) {
  return (
    <div
      className={className}
      style={{
        padding: 16,
        borderRadius: UI.radiusInner,
        background: UI.innerBg,
        border: UI.borderSoft,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, style, className = "" }) {
  return (
    <div
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: UI.muted,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Title({ children, style, className = "" }) {
  return (
    <h1
      className={className}
      style={{
        margin: 0,
        fontSize: 34,
        lineHeight: 1.04,
        fontWeight: 950,
        letterSpacing: "-0.04em",
        color: UI.text,
        textWrap: "balance",
        ...style,
      }}
    >
      {children}
    </h1>
  );
}

export function Subtitle({ children, style, className = "" }) {
  return (
    <p
      className={className}
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.65,
        color: UI.subtext,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function Field({ label, children, hint, style, className = "" }) {
  return (
    <div className={className} style={{ ...style }}>
      {label ? (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 800,
            color: UI.text,
          }}
        >
          {label}
        </label>
      ) : null}

      {children}

      {hint ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            lineHeight: 1.45,
            color: UI.muted,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  name,
  disabled,
  onKeyDown,
  style,
  className = "",
}) {
  return (
    <input
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      disabled={disabled}
      onKeyDown={onKeyDown}
      className={className}
      style={{
        width: "100%",
        height: 56,
        borderRadius: UI.radiusInput,
        border: UI.borderStrong,
        background: UI.inputBg,
        padding: "0 16px",
        color: UI.text,
        fontSize: 16,
        outline: "none",
        boxSizing: "border-box",
        transition: "all 0.18s ease",
        opacity: disabled ? 0.65 : 1,
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = "1px solid rgba(45,212,191,0.58)";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(45,212,191,0.12)";
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.background = UI.inputBg;
      }}
    />
  );
}

export function Chip({ children, tone = "neutral", style, className = "" }) {
  const tones = {
    good: {
      bg: "rgba(34,197,94,0.12)",
      bd: "rgba(34,197,94,0.25)",
      fg: "rgba(187,247,208,0.95)",
    },
    warn: {
      bg: "rgba(245,158,11,0.12)",
      bd: "rgba(245,158,11,0.25)",
      fg: "rgba(254,243,199,0.95)",
    },
    bad: {
      bg: "rgba(239,68,68,0.12)",
      bd: "rgba(239,68,68,0.25)",
      fg: "rgba(254,226,226,0.95)",
    },
    neutral: {
      bg: "rgba(148,163,184,0.10)",
      bd: "rgba(148,163,184,0.20)",
      fg: "rgba(226,232,240,0.92)",
    },
    brand: {
      bg: "rgba(45,212,191,0.12)",
      bd: "rgba(45,212,191,0.25)",
      fg: "rgba(204,251,241,0.95)",
    },
  };

  const c = tones[tone] || tones.neutral;

  return (
    <span
      className={className}
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
        fontWeight: 850,
        letterSpacing: 0.1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  style,
  disabled,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={{
        width: "100%",
        height: 54,
        borderRadius: UI.radiusBtn,
        border: "1px solid rgba(255,255,255,0.10)",
        background: disabled
          ? "rgba(148,163,184,0.14)"
          : "linear-gradient(180deg, rgba(45,212,191,0.98), rgba(45,212,191,0.82))",
        color: disabled ? "rgba(226,232,240,0.55)" : "rgba(2,6,23,0.96)",
        fontWeight: 950,
        fontSize: 15,
        letterSpacing: 0.1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : UI.buttonShadow,
        transition: "transform 140ms ease, opacity 140ms ease",
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.99)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  style,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={{
        width: "100%",
        height: 50,
        borderRadius: UI.radiusBtn,
        border: UI.borderSoft,
        background: disabled ? "rgba(148,163,184,0.08)" : "rgba(2,6,23,0.24)",
        color: disabled ? "rgba(226,232,240,0.40)" : "rgba(226,232,240,0.92)",
        fontWeight: 900,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 140ms ease, background 140ms ease",
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.99)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled,
  style,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={{
        width: "100%",
        border: "none",
        background: "transparent",
        color: disabled ? "rgba(148,163,184,0.38)" : "rgba(148,163,184,0.86)",
        fontSize: 13,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 4,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Alert({ children, tone = "danger", style, className = "" }) {
  const isSuccess = tone === "success";

  return (
    <div
      className={className}
      style={{
        padding: "12px 14px",
        borderRadius: 16,
        background: isSuccess ? UI.successBg : UI.dangerBg,
        border: isSuccess
          ? `1px solid ${UI.successBorder}`
          : `1px solid ${UI.dangerBorder}`,
        color: isSuccess ? UI.successText : UI.dangerText,
        fontSize: 13,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ value = 0, style, className = "" }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div
      className={className}
      style={{
        height: 10,
        width: "100%",
        borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${v}%`,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(45,212,191,0.95), rgba(59,130,246,0.60))",
          transition: "width 450ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
    </div>
  );
}