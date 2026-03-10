// src/screens/QueMeFalta.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { moneyUSD } from "../lib/money.js";
import { getCustomerToken } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pick(snapshot, keys) {
  if (!snapshot) return null;
  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }
  return null;
}

const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
const toNum = (v) => {
  if (isFiniteNum(v)) return v;
  if (v == null) return null;
  const s = String(v).replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function Pill({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
        whiteSpace: "nowrap",
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
        marginTop: 14,
        padding: 16,
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

function fmtUSD(n) {
  const x = toNum(n);
  return x == null ? "—" : moneyUSD(x);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function ProgressMini({ value }) {
  const v = value == null ? 0 : clamp(Number(value), 0, 100);
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          height: 10,
          width: "100%",
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${v}%`,
            borderRadius: 999,
            background: "#25d3a6",
            transition: "width 250ms ease",
          }}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        {Math.round(v)}%
      </div>
    </div>
  );
}

function SuggestionRow({ title, subtitle, cta, onClick, tone = "neutral" }) {
  const toneMap = {
    neutral: { bg: "rgba(255,255,255,0.05)", bd: "rgba(255,255,255,0.10)" },
    good: { bg: "rgba(37,211,166,0.08)", bd: "rgba(37,211,166,0.25)" },
    warn: { bg: "rgba(255,193,7,0.08)", bd: "rgba(255,193,7,0.25)" },
  };
  const t = toneMap[tone] || toneMap.neutral;

  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 16,
        background: t.bg,
        border: `1px solid ${t.bd}`,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 13 }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
          {subtitle}
        </div>
      ) : null}

      {cta ? (
        <button
          onClick={onClick}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 12,
            borderRadius: 14,
            border: "none",
            background: "#25d3a6",
            fontWeight: 900,
            color: "#052019",
          }}
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Calcula 3 cosas clave:
 * 1) Precio objetivo (vivienda)
 * 2) Entrada requerida (según LTV o regla simple)
 * 3) “Te falta” y opciones de plan
 */
export default function QueMeFalta() {
  const nav = useNavigate();
  const token = getCustomerToken();
  const isLoggedIn = !!token;

  const journey = loadJSON(LS_JOURNEY);
  const snapshot = loadJSON(LS_SNAPSHOT);

  // Datos base
  const valorViviendaJourney =
    toNum(journey?.form?.valorVivienda) ??
    toNum(journey?.form?.valor) ??
    toNum(journey?.form?.precioVivienda) ??
    null;

  const precioMaxVivienda =
    toNum(pick(snapshot, ["precioMaxVivienda", "precioMax", "valorMaxVivienda"])) ?? null;

  const valorObjetivo = valorViviendaJourney ?? precioMaxVivienda ?? null;

  const ltv = toNum(pick(snapshot, ["ltv"])) ?? null; // ej: 0.8 o 0.75
  const entradaDisponible =
    toNum(journey?.form?.entradaDisponible) ??
    toNum(journey?.form?.entrada) ??
    toNum(journey?.form?.ahorro) ??
    toNum(pick(snapshot, ["entradaDisponible"])) ??
    null;

  const ingresoNeto =
    toNum(journey?.form?.ingresoNetoMensual) ??
    toNum(journey?.form?.ingreso) ??
    toNum(pick(snapshot, ["ingresoNetoMensual", "ingresoTotal"])) ??
    null;

  const dti = toNum(pick(snapshot, ["dtiConHipoteca", "dti"])) ?? null;
  const scoreObj = pick(snapshot, ["score", "hlScore", "scoreHL"]);
  const scoreTotal = typeof scoreObj === "object" ? toNum(scoreObj?.total) : toNum(scoreObj);

  // Entrada requerida
  const entradaRequerida = useMemo(() => {
    if (valorObjetivo == null) return null;

    // Si el backend manda LTV como 0.8 => entrada = 20%
    if (ltv != null && ltv > 0 && ltv < 1) {
      return Math.max(0, valorObjetivo * (1 - ltv));
    }

    // fallback conservador: 20%
    return Math.max(0, valorObjetivo * 0.2);
  }, [valorObjetivo, ltv]);

  const faltaEntrada = useMemo(() => {
    if (entradaRequerida == null) return null;
    const disp = entradaDisponible ?? 0;
    return Math.max(0, entradaRequerida - disp);
  }, [entradaRequerida, entradaDisponible]);

  // Plan simple de ahorro
  const [ahorroMensual, setAhorroMensual] = useState(() => {
    // heurística: 10% del ingreso si existe, sino 300
    const base = ingresoNeto != null ? ingresoNeto * 0.1 : 300;
    return Math.max(100, Math.round(base / 10) * 10);
  });

  const mesesParaMeta = useMemo(() => {
    if (faltaEntrada == null) return null;
    if (faltaEntrada <= 0) return 0;
    const a = Math.max(1, toNum(ahorroMensual) ?? 0);
    return Math.ceil(faltaEntrada / a);
  }, [faltaEntrada, ahorroMensual]);

  // Diagnóstico rápido
  const dtiLabel = useMemo(() => {
    if (dti == null) return null;
    if (dti <= 0.35) return { txt: "Saludable", tone: "good" };
    if (dti <= 0.45) return { txt: "Ajustado", tone: "warn" };
    return { txt: "Riesgoso", tone: "warn" };
  }, [dti]);

  const headline = useMemo(() => {
    if (!isLoggedIn) {
      return {
        title: "Inicia sesión para guardar tu plan",
        subtitle: "Puedes explorar igual, pero con tu cuenta guardas tu meta y tu ruta.",
        cta: "Entrar a mi cuenta",
        to: "/login?next=/que-me-falta",
      };
    }

    if (valorObjetivo == null) {
      return {
        title: "Define tu vivienda objetivo",
        subtitle: "Necesitamos un precio objetivo para decirte exactamente qué te falta.",
        cta: "Ir a Simular",
        to: "/journey",
      };
    }

    if (faltaEntrada != null && faltaEntrada > 0) {
      return {
        title: "Te falta completar tu entrada",
        subtitle: `Te faltan aprox. ${fmtUSD(faltaEntrada)} para una vivienda de ${fmtUSD(
          valorObjetivo
        )}.`,
        cta: "Ajustar escenario",
        to: "/mejorar",
      };
    }

    return {
      title: "Tu entrada ya está lista ✅",
      subtitle: "Ahora el foco es documentos y cerrar tu ruta con el banco correcto.",
      cta: "Ver checklist",
      to: "/journey",
    };
  }, [isLoggedIn, valorObjetivo, faltaEntrada]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 600px at 30% 0%, #123a7a 0%, #071024 45%, #0b1a35 100%)",
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
        paddingBottom: 18,
      }}
    >
      {/* top */}
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill>{isLoggedIn ? "Plan guardable ✅" : "Explorar"}</Pill>
          {valorObjetivo != null ? <Pill>Vivienda: {fmtUSD(valorObjetivo)}</Pill> : null}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 2, fontWeight: 900 }}>
          HABITALIBRE
        </div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>
          Qué me falta para comprar
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
          Te mostramos tu brecha y un plan simple para cerrarla.
        </div>
      </div>

      {/* Headline card */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>🧭 Tu Guía</div>
          <Pill>{valorObjetivo != null ? "Meta" : "Paso 1"}</Pill>
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>{headline.title}</div>
        <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.35, fontSize: 13 }}>
          {headline.subtitle}
        </div>

        <button
          onClick={() => nav(headline.to)}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 12,
            borderRadius: 14,
            border: "none",
            background: "#25d3a6",
            fontWeight: 900,
            color: "#052019",
          }}
        >
          {headline.cta}
        </button>
      </Card>

      {/* Brecha */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Tu brecha</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {scoreTotal != null ? <Pill>Score HL: {scoreTotal}</Pill> : null}
            {dtiLabel?.txt ? <Pill>DTI: {dtiLabel.txt}</Pill> : null}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Entrada requerida (aprox.)</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {entradaRequerida != null ? fmtUSD(entradaRequerida) : "—"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              Basado en LTV {ltv != null ? `${Math.round(ltv * 100)}%` : "estimado"}.
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Te falta</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {faltaEntrada != null ? fmtUSD(faltaEntrada) : "—"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              Entrada disponible: {entradaDisponible != null ? fmtUSD(entradaDisponible) : "—"}
            </div>
          </div>
        </div>

        {/* Progreso hacia entrada */}
        {entradaRequerida != null ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Progreso hacia tu entrada
            </div>
            <ProgressMini
              value={
                entradaDisponible == null
                  ? 0
                  : (clamp(entradaDisponible, 0, entradaRequerida) / Math.max(1, entradaRequerida)) * 100
              }
            />
          </div>
        ) : null}
      </Card>

      {/* Plan simple */}
      <Card>
        <div style={{ fontWeight: 900, fontSize: 14 }}>Plan simple para cerrar la brecha</div>
        <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13, lineHeight: 1.35 }}>
          Ajusta un ahorro mensual y te estimamos el tiempo.
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Ahorro mensual</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{fmtUSD(ahorroMensual)}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Tiempo estimado</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {mesesParaMeta == null ? "—" : mesesParaMeta === 0 ? "0 meses" : `${mesesParaMeta} meses`}
            </div>
          </div>
        </div>

        <input
          type="range"
          min={100}
          max={5000}
          step={50}
          value={clamp(ahorroMensual, 100, 5000)}
          onChange={(e) => setAhorroMensual(Number(e.target.value))}
          style={{ width: "100%", marginTop: 12, accentColor: "#25d3a6" }}
          aria-label="Ahorro mensual"
        />

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button
            onClick={() => setAhorroMensual((v) => Math.max(100, v - 100))}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
            }}
          >
            −
          </button>
          <button
            onClick={() => setAhorroMensual((v) => Math.min(5000, v + 100))}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
            }}
          >
            +
          </button>
        </div>

        {/* Recomendaciones accionables */}
        <div style={{ marginTop: 14, fontWeight: 900, fontSize: 13, opacity: 0.9 }}>
          Opciones para mejorar tu ruta
        </div>

        <SuggestionRow
          tone={faltaEntrada != null && faltaEntrada > 0 ? "warn" : "good"}
          title="1) Aumentar entrada (palanca #1)"
          subtitle={
            faltaEntrada == null
              ? "Define tu objetivo para calcular brecha."
              : faltaEntrada > 0
              ? `Si consigues ${fmtUSD(Math.min(faltaEntrada, 5000))} extra, tu ruta mejora visible.`
              : "Tu entrada está cubierta. ✅"
          }
          cta="Ir a Mejorar"
          onClick={() => nav("/mejorar")}
        />

        <SuggestionRow
          tone={dti != null && dti > 0.45 ? "warn" : "neutral"}
          title="2) Bajar deudas (palanca #2)"
          subtitle={
            dti == null
              ? "DTI no disponible en snapshot."
              : dti > 0.45
              ? `Tu DTI está alto. Bajar deudas mensuales suele subir aprobación rápido.`
              : `Tu DTI está ${dtiLabel?.txt || "ok"}. Igual puedes optimizarlo.`
          }
          cta="Ajustar en Mejorar"
          onClick={() => nav("/mejorar")}
        />

        <SuggestionRow
          tone="neutral"
          title="3) Comprar una vivienda más baja (palanca #3)"
          subtitle={
            valorObjetivo == null
              ? "Define tu precio objetivo."
              : `Pro tip: probar ${fmtUSD(valorObjetivo * 0.9)} o ${fmtUSD(valorObjetivo * 0.8)} cambia mucho tu escenario.`
          }
          cta="Simular otro precio"
          onClick={() => nav("/journey")}
        />

        <button
          onClick={() => nav("/", { replace: true })}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontWeight: 900,
          }}
        >
          Volver al Home
        </button>
      </Card>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
        Nota: esto es una estimación. La preaprobación real depende de documentos y políticas del banco.
      </div>
    </div>
  );
}