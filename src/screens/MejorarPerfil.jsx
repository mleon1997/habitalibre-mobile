// src/screens/MejorarPerfil.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost, API_BASE } from "../lib/api.js";
import { moneyUSD } from "../lib/money.js";
import { getCustomerToken } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

/* ---------------- storage ---------------- */
function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

/* ---------------- ui primitives ---------------- */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const UI = {
  bg: "radial-gradient(1200px 600px at 30% 0%, #123a7a 0%, #071024 45%, #0b1a35 100%)",
  card: "rgba(255,255,255,0.06)",
  cardSoft: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  green: "#25d3a6",
  greenBg: "rgba(37,211,166,0.10)",
  greenBorder: "rgba(37,211,166,0.28)",
  amberBg: "rgba(255,193,7,0.10)",
  amberBorder: "rgba(255,193,7,0.25)",
  redBg: "rgba(244,63,94,0.10)",
  redBorder: "rgba(244,63,94,0.25)",
  shadow: "0 10px 30px rgba(0,0,0,0.25)",
};

function Pill({ children, tone = "neutral" }) {
  const safe =
    typeof children === "object" && children !== null
      ? JSON.stringify(children)
      : children;

  const bg =
    tone === "green"
      ? "rgba(37,211,166,0.12)"
      : tone === "amber"
      ? "rgba(255,193,7,0.12)"
      : "rgba(255,255,255,0.08)";

  const border =
    tone === "green"
      ? "1px solid rgba(37,211,166,0.25)"
      : tone === "amber"
      ? "1px solid rgba(255,193,7,0.25)"
      : "1px solid rgba(255,255,255,0.10)";

  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border,
        whiteSpace: "nowrap",
        fontWeight: 800,
      }}
    >
      {safe}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 22,
        background: UI.card,
        border: `1px solid ${UI.border}`,
        boxShadow: UI.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        border: active
          ? `1px solid ${UI.greenBorder}`
          : "1px solid rgba(255,255,255,0.14)",
        background: active ? "rgba(37,211,166,0.14)" : "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function fmtUSD(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `$${Math.round(x).toLocaleString("es-EC")}`;
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      {subtitle ? (
        <div
          style={{
            marginTop: 6,
            opacity: 0.8,
            fontSize: 13,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function KpiBox({ label, value, helper, tone = "neutral" }) {
  const bg =
    tone === "green"
      ? "rgba(37,211,166,0.10)"
      : tone === "amber"
      ? "rgba(255,193,7,0.10)"
      : "rgba(255,255,255,0.06)";

  const border =
    tone === "green"
      ? "1px solid rgba(37,211,166,0.22)"
      : tone === "amber"
      ? "1px solid rgba(255,193,7,0.22)"
      : "1px solid rgba(255,255,255,0.10)";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 18,
        background: bg,
        border,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.72 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900 }}>{value}</div>
      {helper ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.68, lineHeight: 1.3 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- helpers (data) ---------------- */
function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// soporta snapshot plano o nested (output)
function pick(snapshot, keys) {
  if (!snapshot) return null;
  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }
  return null;
}

function safeMoney(n) {
  const x = toNum(n);
  return x == null ? "—" : moneyUSD(x);
}

/**
 * Soporta probability como:
 * - number
 * - string
 * - object
 * - array
 */
function normalizeProbability(prob) {
  const clampPct = (p) => {
    if (!Number.isFinite(p)) return null;
    return Math.max(0, Math.min(100, p));
  };

  const parseAnyToPct = (x, depth = 0) => {
    if (x == null) return null;

    if (typeof x === "number") return clampPct(x <= 1 ? x * 100 : x);

    if (typeof x === "string") {
      const s = x.trim();
      const m = s.match(/(\d+(\.\d+)?)/);
      if (!m) return null;
      const n = Number(m[1]);
      if (!Number.isFinite(n)) return null;
      const p = s.includes("%") ? n : n <= 1 ? n * 100 : n;
      return clampPct(p);
    }

    if (Array.isArray(x)) {
      for (const item of x) {
        const p = parseAnyToPct(item, depth + 1);
        if (p != null) return p;
      }
      return null;
    }

    if (typeof x === "object") {
      const direct =
        parseAnyToPct(x.pct, depth + 1) ??
        parseAnyToPct(x.value, depth + 1) ??
        parseAnyToPct(x.total, depth + 1) ??
        parseAnyToPct(x.prob, depth + 1) ??
        parseAnyToPct(x.probabilidad, depth + 1) ??
        parseAnyToPct(x.aprobacion, depth + 1) ??
        parseAnyToPct(x.probAprobacion, depth + 1) ??
        parseAnyToPct(x.aprobacionProb, depth + 1);

      if (direct != null) return direct;

      if (depth >= 3) return null;
      for (const v of Object.values(x)) {
        const p = parseAnyToPct(v, depth + 1);
        if (p != null) return p;
      }
      return null;
    }

    return null;
  };

  const pctValue = parseAnyToPct(prob);

  return pctValue == null
    ? { label: "—", pct: null }
    : { label: `${Math.round(pctValue)}%`, pct: pctValue };
}

function probabilityTone(pct) {
  if (pct == null) return "neutral";
  if (pct >= 75) return "green";
  if (pct >= 50) return "amber";
  return "neutral";
}

function probabilityHint(pct) {
  if (pct == null) return "Todavía no tenemos suficiente información para interpretar esta probabilidad.";
  if (pct >= 75) return "Tu perfil va bien. Ahora el enfoque es optimizar cuota, entrada y documentos.";
  if (pct >= 50) return "Tienes potencial, pero todavía hay palancas claras para fortalecer tu perfil.";
  return "Tu perfil necesita mejoras antes de tener una ruta fuerte de aprobación.";
}

function ProbabilityBar({ valuePct, hint }) {
  const v =
    valuePct == null ? null : Math.max(0, Math.min(100, Number(valuePct)));

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
          Probabilidad de aprobación
        </div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 900 }}>
          {v == null ? "—" : `${Math.round(v)}%`}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
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
            width: v == null ? "0%" : `${v}%`,
            borderRadius: 999,
            background: UI.green,
            transition: "width 250ms ease",
          }}
        />
      </div>

      {hint ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.75,
            lineHeight: 1.25,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Slider fintech usable
 */
function SliderMoney({
  label,
  helper,
  value,
  onChange,
  min = 0,
  max = 15000,
  fineUntil = 6000,
  stepFine = 25,
  stepCoarse = 100,
}) {
  const v = Number(toNum(value) ?? 0);
  const step = v <= fineUntil ? stepFine : stepCoarse;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900 }}>{label}</div>
      {helper ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, lineHeight: 1.3 }}>
          {helper}
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{fmtUSD(v)}</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          {fmtUSD(min)} – {fmtUSD(max)}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(v, min, max)}
        onChange={(e) => onChange(String(e.target.value))}
        style={{ width: "100%", marginTop: 10, accentColor: "#25d3a6" }}
        aria-label={label}
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => onChange(String(clamp(v - stepFine * 4, min, max)))}
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
          type="button"
          onClick={() => onChange(String(clamp(v + stepFine * 4, min, max)))}
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

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
        Tip: cerca de valores bajos el slider usa pasos finos para apuntar mejor.
      </div>
    </div>
  );
}

/* ---------------- screen ---------------- */
export default function MejorarPerfil() {
  const nav = useNavigate();

  const token = getCustomerToken();
  const isLoggedIn = !!token;

  const [tab, setTab] = useState("palancas"); // "palancas" | "falta"

  const [journey, setJourney] = useState(() => loadJSON(LS_JOURNEY));
  const [snapshot, setSnapshot] = useState(() => loadJSON(LS_SNAPSHOT));

  const [ingreso, setIngreso] = useState(() => {
    const j = loadJSON(LS_JOURNEY);
    const f = j?.form || {};
    return String(
      f?.ingreso ??
        f?.ingresoNetoMensual ??
        f?.ingresoMensual ??
        pick(loadJSON(LS_SNAPSHOT), ["ingresoNetoMensual", "ingresoTotal"]) ??
        1200
    );
  });

  const [deudas, setDeudas] = useState(() => {
    const j = loadJSON(LS_JOURNEY);
    const f = j?.form || {};
    return String(
      f?.deudas ??
        f?.otrasDeudasMensuales ??
        f?.deudasMensuales ??
        pick(loadJSON(LS_SNAPSHOT), ["otrasDeudasMensuales"]) ??
        200
    );
  });

  const [entrada, setEntrada] = useState(() => {
    const j = loadJSON(LS_JOURNEY);
    const f = j?.form || {};
    return String(
      f?.entrada ??
        f?.entradaDisponible ??
        f?.ahorro ??
        pick(loadJSON(LS_SNAPSHOT), ["entradaDisponible"]) ??
        8000
    );
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const cuotaEstimada = pick(snapshot, ["cuotaEstimada"]);
  const precioMaxVivienda = pick(snapshot, [
    "precioMaxVivienda",
    "precioMax",
    "valorMaxVivienda",
  ]);
  const dti = pick(snapshot, ["dtiConHipoteca", "dti"]);
  const scoreRaw = pick(snapshot, ["score", "hlScore", "scoreHL"]);

  const score = useMemo(() => {
    if (scoreRaw == null) return null;
    if (typeof scoreRaw === "number" || typeof scoreRaw === "string") return scoreRaw;
    if (typeof scoreRaw === "object")
      return scoreRaw?.total ?? scoreRaw?.value ?? scoreRaw?.score ?? null;
    return null;
  }, [scoreRaw]);

  const dtiLabel = useMemo(() => {
    const x = Number(dti);
    if (!Number.isFinite(x)) return "—";
    if (x <= 0.35) return "Saludable";
    if (x <= 0.45) return "Ajustado";
    return "Riesgoso";
  }, [dti]);

  const probabilityRaw =
    pick(snapshot, [
      "probability",
      "probabilidad",
      "probabilidadAprobacion",
      "probAprobacion",
      "aprobacionProb",
      "prob",
      "probNormalized",
      "prob_normalized",
      "probabilityNormalized",
    ]) ?? null;

  const prob = useMemo(() => {
    const p = normalizeProbability(probabilityRaw);
    if (p.pct != null) return p;

    const scoreObj = pick(snapshot, ["score", "hlScore", "scoreHL"]);
    const maybe =
      scoreObj && typeof scoreObj === "object"
        ? scoreObj?.total ?? scoreObj?.score
        : null;

    if (typeof maybe === "number" && Number.isFinite(maybe)) {
      const pct = Math.max(0, Math.min(100, maybe));
      return { label: `${Math.round(pct)}%`, pct };
    }

    return { label: "—", pct: null };
  }, [probabilityRaw, snapshot]);

  function buildEntradaPayload() {
    const f = journey?.form || {};
    const base = {
      nacionalidad: f?.nacionalidad ?? "ecuatoriana",
      estadoCivil: f?.estadoCivil ?? "soltero",
      edad: Number(toNum(f?.edad ?? 30) ?? 30),

      tipoIngreso: f?.tipoIngreso ?? "Dependiente",
      aniosEstabilidad: Number(toNum(f?.aniosEstabilidad ?? 2) ?? 2),

      tieneVivienda: String(f?.tieneVivienda ?? "no") === "sí",
      primeraVivienda: String(f?.primeraVivienda ?? "sí") === "sí",
      tipoVivienda: f?.tipoVivienda ?? "por_estrenar",

      afiliadoIess: String(f?.afiliadoIESS ?? f?.afiliadoIess ?? "no") === "sí",
      iessAportesTotales: Number(toNum(f?.aportesTotales ?? f?.iessAportesTotales ?? 0) ?? 0),
      iessAportesConsecutivos: Number(
        toNum(f?.aportesConsecutivos ?? f?.iessAportesConsecutivos ?? 0) ?? 0
      ),

      valorVivienda: Number(toNum(f?.valor ?? f?.valorVivienda ?? 90000) ?? 90000),
      tiempoCompra: f?.horizonteCompra ?? f?.tiempoCompra ?? "3-12",

      origen: "mobile_mejorar_perfil",
    };

    return {
      ...base,
      ingresoNetoMensual: Number(toNum(ingreso) ?? 0),
      otrasDeudasMensuales: Number(toNum(deudas) ?? 0),
      entradaDisponible: Number(toNum(entrada) ?? 0),
    };
  }

  const debounceRef = useRef(null);

  async function recalcular() {
    setErr("");
    setBusy(true);

    try {
      const payload = buildEntradaPayload();
      const res = await apiPost("/api/precalificar", payload);
      console.log("RESPUESTA BACKEND:", res);

      const snap = res && typeof res === "object" ? res : { output: res };

      setSnapshot(snap);
      saveJSON(LS_SNAPSHOT, snap);

      const nextJourney = {
        ...(journey || {}),
        form: {
          ...(journey?.form || {}),
          ingreso: String(Number(toNum(ingreso) ?? 0)),
          deudas: String(Number(toNum(deudas) ?? 0)),
          entrada: String(Number(toNum(entrada) ?? 0)),
          ingresoNetoMensual: String(Number(toNum(ingreso) ?? 0)),
          otrasDeudasMensuales: String(Number(toNum(deudas) ?? 0)),
          entradaDisponible: String(Number(toNum(entrada) ?? 0)),
        },
      };

      setJourney(nextJourney);
      saveJSON(LS_JOURNEY, nextJourney);

      setLastUpdatedAt(new Date().toLocaleString("es-EC"));
    } catch (e) {
      console.warn("[HL] MejorarPerfil recalcular error:", e?.message || e);
      setErr(e?.message || "No se pudo recalcular ahora. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      recalcular();
    }, 550);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingreso, deudas, entrada]);

  const unlocked = isLoggedIn;

  const valorViviendaObjetivo = useMemo(() => {
    const f = journey?.form || {};
    return (
      toNum(f?.valorVivienda) ??
      toNum(f?.valor) ??
      toNum(f?.precioVivienda) ??
      toNum(f?.precioObjetivo) ??
      null
    );
  }, [journey]);

  const falta = useMemo(() => {
    const maxV = toNum(precioMaxVivienda);
    const obj = toNum(valorViviendaObjetivo);

    if (maxV == null || obj == null) return null;

    const gap = Math.max(0, obj - maxV);
    const ok = gap <= 0;

    const monthlySave = 300;
    const months = monthlySave > 0 ? Math.ceil(gap / monthlySave) : null;

    return {
      maxV,
      obj,
      gap,
      ok,
      monthlySave,
      months,
    };
  }, [precioMaxVivienda, valorViviendaObjetivo]);

  const insightPrincipal = useMemo(() => {
    if (!unlocked) return "Inicia sesión para ver cómo cambian tus resultados en tiempo real.";
    if (falta?.ok) return "Ya estás dentro del rango para tu vivienda objetivo con tu perfil actual.";
    if (falta && falta.gap > 0)
      return `Hoy tu brecha estimada es de ${fmtUSD(falta.gap)} frente a tu objetivo.`;
    return "Ajusta ingresos, deudas y entrada para ver el impacto en tu capacidad de compra.";
  }, [unlocked, falta]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
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

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Pill tone={unlocked ? "green" : "neutral"}>
            {unlocked ? "Perfil activo" : "Modo exploración"}
          </Pill>
          {valorViviendaObjetivo != null ? (
            <Pill>Objetivo: {fmtUSD(valorViviendaObjetivo)}</Pill>
          ) : null}
        </div>
      </div>

      {/* title */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 2, fontWeight: 900 }}>
          HABITALIBRE
        </div>
        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, letterSpacing: -0.4 }}>
          Sube tu capacidad de compra
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.4 }}>
          Ajusta tus palancas financieras y mira cómo cambia tu capacidad, cuota y probabilidad de aprobación.
        </div>
      </div>

      {/* insight hero */}
      <Card
        style={{
          background: "linear-gradient(180deg, rgba(37,211,166,0.12) 0%, rgba(255,255,255,0.05) 100%)",
          border: "1px solid rgba(37,211,166,0.18)",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900 }}>Lectura rápida</div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, lineHeight: 1.25 }}>
          {insightPrincipal}
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill tone={probabilityTone(prob?.pct)}>Prob: {prob?.label ?? "—"}</Pill>
          <Pill>Capacidad: {unlocked ? safeMoney(precioMaxVivienda) : "—"}</Pill>
          <Pill>Cuota: {unlocked ? safeMoney(cuotaEstimada) : "—"}</Pill>
        </div>
      </Card>

      {/* tabs */}
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <TabButton active={tab === "palancas"} onClick={() => setTab("palancas")}>
          Ajustar escenario
        </TabButton>
        <TabButton active={tab === "falta"} onClick={() => setTab("falta")}>
          Mi brecha
        </TabButton>
      </div>

      {/* resumen principal */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <SectionTitle
            title="Tu panel de mejora"
            subtitle="Este bloque resume dónde estás hoy versus lo que quieres comprar."
          />
          <Pill>{busy ? "Recalculando…" : lastUpdatedAt ? `Actualizado: ${lastUpdatedAt}` : "Listo"}</Pill>
        </div>

        <ProbabilityBar valuePct={prob?.pct} hint={probabilityHint(prob?.pct)} />

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <KpiBox
            label="Vivienda objetivo"
            value={valorViviendaObjetivo != null ? fmtUSD(valorViviendaObjetivo) : "—"}
            helper="El valor de la vivienda que vienes persiguiendo en tu journey."
          />
          <KpiBox
            label="Capacidad actual"
            value={unlocked ? safeMoney(precioMaxVivienda) : "—"}
            helper="Precio máximo estimado que el motor considera alcanzable hoy."
            tone="green"
          />
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <KpiBox
            label="Cuota estimada"
            value={unlocked ? safeMoney(cuotaEstimada) : "—"}
            helper="Pago mensual estimado con tu escenario actual."
          />
          <KpiBox
            label="Brecha actual"
            value={
              falta
                ? falta.ok
                  ? "Sin brecha"
                  : fmtUSD(falta.gap)
                : "—"
            }
            helper={
              falta
                ? falta.ok
                  ? "Tu capacidad ya cubre tu objetivo."
                  : "Lo que te falta cerrar frente a tu vivienda objetivo."
                : "Necesitamos tu objetivo para calcularla."
            }
            tone={falta?.ok ? "green" : "amber"}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Pill>Score: {unlocked ? score ?? "—" : "—"}</Pill>
          <Pill tone={probabilityTone(prob?.pct)}>Probabilidad: {prob?.label ?? "—"}</Pill>
          <Pill>DTI: {unlocked ? dtiLabel : "—"}</Pill>
          <Pill>Ingreso: {fmtUSD(Number(toNum(ingreso) ?? 0))}</Pill>
          <Pill>Deudas: {fmtUSD(Number(toNum(deudas) ?? 0))}</Pill>
          <Pill>Entrada: {fmtUSD(Number(toNum(entrada) ?? 0))}</Pill>
        </div>

        {!unlocked ? (
          <button
            onClick={() => nav("/login?next=/mejorar", { replace: true })}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "none",
              background: UI.green,
              fontWeight: 900,
              color: "#052019",
            }}
          >
            Entrar para ver tu resultado real
          </button>
        ) : null}
      </Card>

      {/* TAB: PALANCAS */}
      {tab === "palancas" ? (
        <Card>
          <SectionTitle
            title="Ajusta tus palancas"
            subtitle="Estas son las variables que más rápido suelen mover tu capacidad de compra."
          />

          <SliderMoney
            label="Ingreso neto mensual"
            helper="Subir ingresos demostrables suele mejorar capacidad, score y probabilidad."
            value={ingreso}
            onChange={setIngreso}
            max={20000}
            fineUntil={6000}
            stepFine={25}
            stepCoarse={100}
          />

          <SliderMoney
            label="Deudas mensuales"
            helper="Bajar deudas mejora tu DTI. Suele ser la palanca más poderosa."
            value={deudas}
            onChange={setDeudas}
            max={15000}
            fineUntil={3000}
            stepFine={25}
            stepCoarse={100}
          />

          <SliderMoney
            label="Entrada disponible"
            helper="Incluye ahorros, cesantía, fondos de reserva u otras fuentes reales."
            value={entrada}
            onChange={setEntrada}
            max={
              valorViviendaObjetivo != null
                ? Math.max(15000, Math.round(valorViviendaObjetivo * 0.6))
                : 15000
            }
            fineUntil={15000}
            stepFine={50}
            stepCoarse={200}
          />

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 13 }}>Orden recomendado para mejorar</div>
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>1. Baja deudas para mejorar DTI.</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>2. Sube entrada para mejorar LTV y cuota.</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>3. Fortalece ingreso demostrable.</div>
            </div>
          </div>

          {!!err && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 16,
                background: UI.redBg,
                border: `1px solid ${UI.redBorder}`,
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              {err}
            </div>
          )}

          <button
            onClick={recalcular}
            disabled={busy}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "none",
              background: busy ? "rgba(37,211,166,0.35)" : UI.green,
              fontWeight: 900,
              color: "#052019",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Recalculando…" : "Recalcular ahora"}
          </button>

          <button
            onClick={() => nav("/", { replace: true })}
            style={{
              marginTop: 10,
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
      ) : null}

      {/* TAB: BRECHA */}
      {tab === "falta" ? (
        <Card>
          <SectionTitle
            title="Tu brecha hacia la vivienda objetivo"
            subtitle="Aquí aterrizamos la distancia entre lo que quieres comprar y lo que hoy soporta tu perfil."
          />

          {falta ? (
            <>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <KpiBox
                  label="Tu objetivo"
                  value={moneyUSD(falta.obj)}
                  helper="Valor de la vivienda que quieres alcanzar."
                />

                <KpiBox
                  label="Tu capacidad hoy"
                  value={moneyUSD(falta.maxV)}
                  helper="Precio máximo estimado hoy por el motor."
                  tone="green"
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: falta.ok ? UI.greenBg : UI.amberBg,
                  border: falta.ok
                    ? `1px solid ${UI.greenBorder}`
                    : `1px solid ${UI.amberBorder}`,
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  {falta.ok ? "✅ Ya estás dentro del rango" : "📉 Todavía hay una brecha"}
                </div>

                <div style={{ marginTop: 6, opacity: 0.92, lineHeight: 1.35, fontSize: 13 }}>
                  {falta.ok
                    ? "Con tu perfil actual ya estás dentro del rango estimado para tu vivienda objetivo."
                    : `Te faltan aproximadamente ${moneyUSD(falta.gap)} para cerrar la brecha frente a tu objetivo.`}
                </div>

                {!falta.ok ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Si ahorras {moneyUSD(falta.monthlySave)} por mes, te tomaría aprox.{" "}
                    <b>{falta.months ?? "—"} meses</b> cerrar esa brecha en una estimación simple.
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>1) Reducir deudas</div>
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    Esto suele mejorar la capacidad más rápido que cualquier otra palanca.
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>2) Subir entrada</div>
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    Te ayuda a bajar cuota, mejorar LTV y abrir mejores rutas.
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>3) Mejorar ingreso demostrable</div>
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    Más ingreso formal mejora capacidad, score y probabilidad.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTab("palancas")}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "none",
                  background: UI.green,
                  fontWeight: 900,
                  color: "#052019",
                }}
              >
                Ajustar mi escenario
              </button>
            </>
          ) : (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                fontSize: 13,
                lineHeight: 1.35,
                opacity: 0.9,
              }}
            >
              Para mostrar esta sección necesitamos un <b>valor de vivienda objetivo</b> guardado en tu journey.
              Puedes volver a <b>Simular</b> y definirlo.
            </div>
          )}
        </Card>
      ) : null}

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
        Nota: esta es una estimación referencial. La aprobación final depende de documentos, validaciones y políticas vigentes de cada entidad.
      </div>
    </div>
  );
}