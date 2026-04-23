import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Home as HomeIcon,
  Compass,
  CheckCircle2,
  Target,
  MapPin,
  Lock,
  Calculator,
  Building2,
  ChevronDown,
} from "lucide-react";
import { summarizeProfile } from "../lib/profileSummary.js";
import { moneyUSD } from "../lib/money";
import { apiGet } from "../lib/api";
import { buildPlan } from "../lib/planEngine.js";
import { getCustomerToken, getCustomer } from "../lib/customerSession.js";
import { fetchLatestSnapshot } from "../lib/snapshots.js";

import {
  Screen,
  Card,
  InnerCard,
  Chip,
  PrimaryButton,
  SecondaryButton,
  ProgressBar,
} from "../ui/kit.jsx";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

const COPY = {
  appSubtitle: "Revisa tu capacidad estimada y lo que te conviene hacer ahora.",
  guideTag: "Tu guía",
  guideResultTag: "Tu resultado",

  scoreTitle: "Tu perfil para comprar casa",
  scoreLocked: "Completa tu simulación para ver tu resultado",
  scoreReady: "Listo",
  scoreMissing: "Falta info",

  probabilityTitle: "Qué tan probable es que te aprueben el crédito",
  probabilityFallback: "Estimación",

  quotaInsightLabel: "Pago mensual aprox.",
  quotaInsightHint: "Una referencia mensual para este escenario.",

  rateInsightLabel: "Interés aprox.",
  rateInsightHint: "Tasa estimada para este escenario.",

  amountInsightLabel: "Monto de préstamo",
  amountInsightHint: "Monto estimado del crédito para este escenario.",

  limitInsightLabel: "Factor limitante",
  limitInsightHint: "Lo que más está limitando tu capacidad hoy.",

  alternativesHide: "Ocultar caminos alternativos",
  alternativesShow: "Ver caminos alternativos",

  altSimularTitle: "Simular",
  altSimularBody: "Prueba otros escenarios",

  altMatchTitle: "Match",
  altMatchBody: "Mira propiedades y opciones",

  altRutaTitle: "Ruta",
  altRutaBody: "Checklist y siguientes pasos",

  connecting: "Conectando con HabitaLibre…",
};

function ProbabilityBar({ valuePct, hint, valueText = null }) {
  const v =
    valuePct == null ? null : Math.max(0, Math.min(100, Number(valuePct)));

  return (
    <InnerCard style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div
          style={{
            fontSize: 12,
            opacity: 0.9,
            fontWeight: 900,
            color: "rgba(148,163,184,0.95)",
          }}
        >
          {COPY.probabilityTitle}
        </div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 950 }}>
          {valueText || (v == null ? "—" : `${Math.round(v)}%`)}
        </div>
      </div>

      {v != null ? (
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={v} />
        </div>
      ) : null}

      {hint ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.8,
            lineHeight: 1.3,
            color: "rgba(148,163,184,0.95)",
          }}
        >
          {hint}
        </div>
      ) : null}
    </InnerCard>
  );
}

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

function clearLocalScenarioState() {
  try {
    localStorage.removeItem(LS_SNAPSHOT);
    localStorage.removeItem(LS_JOURNEY);
    localStorage.removeItem(LS_SELECTED_PROPERTY);
  } catch {}
}

function getStorageOwnerEmail() {
  try {
    const email = String(getCustomer()?.email || "").trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}

function snapshotLooksValid(snap) {
  return Boolean(
    snap?.unlocked === true ||
      snap?.output?.unlocked === true ||
      snap?.ok === true ||
      snap?.output?.ok === true ||
      snap?.score != null ||
      snap?.output?.score != null ||
      snap?.financialCapacity?.estimatedMaxPropertyValue != null ||
      snap?.output?.financialCapacity?.estimatedMaxPropertyValue != null
  );
}

function InsightGrid({ items, cols = 2 }) {
  if (!items?.length) return null;

  return (
    <div
      style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: cols === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
        gap: 10,
      }}
    >
      {items.slice(0, 4).map((it) => (
        <div
          key={it.id}
          style={{
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.18)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
            {it.label}
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>
            {it.value}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(148,163,184,0.90)",
              lineHeight: 1.25,
            }}
          >
            {it.hint}
          </div>
        </div>
      ))}
    </div>
  );
}

function SoftMetric({ label, value, hint }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(2,6,23,0.18)",
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 980 }}>{value}</div>
      {hint ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "rgba(148,163,184,0.90)",
            lineHeight: 1.3,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function AccordionSection({
  title,
  subtitle = null,
  open,
  onToggle,
  children,
  style = {},
}) {
  return (
    <InnerCard
      style={{
        marginTop: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(148,163,184,0.16)",
        overflow: "hidden",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          all: "unset",
          cursor: "pointer",
          width: "100%",
          display: "block",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "rgba(148,163,184,0.95)",
              }}
            >
              {title}
            </div>

            {subtitle ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  lineHeight: 1.35,
                  color: "rgba(148,163,184,0.86)",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 1,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.25s ease",
              color: "rgba(226,232,240,0.82)",
              flexShrink: 0,
            }}
          >
            <ChevronDown size={18} strokeWidth={2.4} />
          </div>
        </div>
      </button>

      <div
        style={{
          maxHeight: open ? 1200 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s ease, opacity 0.25s ease",
        }}
      >
        <div style={{ paddingTop: open ? 12 : 0 }}>{children}</div>
      </div>
    </InnerCard>
  );
}

const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);

const toNum = (v) => {
  if (isFiniteNum(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function pickLegacyCompatible(snapshot, keys) {
  if (!snapshot) return null;
  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
    if (snapshot?.legacy?.[k] != null) return snapshot.legacy[k];
    if (snapshot?.output?.legacy?.[k] != null) return snapshot.output.legacy[k];
  }
  return null;
}

function pickMatcherFirst(snapshot, keys) {
  if (!snapshot) return null;

  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
  }

  for (const k of keys) {
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }

  return null;
}

function safeMoney(n) {
  const x = toNum(n);
  return x == null ? "—" : moneyUSD(x);
}

function withTimeout(promise, ms, msg = "ping timeout") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
}

function parseAnyToPctUniversal(x) {
  const clampPct = (p) => {
    if (!Number.isFinite(p)) return null;
    return Math.max(0, Math.min(100, p));
  };

  if (x == null) return null;

  if (typeof x === "number") return clampPct(x <= 1 ? x * 100 : x);

  if (typeof x === "string") {
    const s0 = x.trim();
    if (!s0) return null;

    const lower = s0.toLowerCase();
    if (lower === "alta") return 85;
    if (lower === "media") return 60;
    if (lower === "baja") return 35;
    if (lower.includes("sin oferta")) return 0;

    const s =
      s0.includes(",") && !s0.includes(".")
        ? s0.replace(",", ".")
        : s0;

    const m = s.match(/(\d+(\.\d+)?)/);
    if (!m) return null;

    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;

    const p = s.includes("%") ? n : n <= 1 ? n * 100 : n;
    return clampPct(p);
  }

  if (typeof x === "object") {
    const direct =
      parseAnyToPctUniversal(x.pct) ??
      parseAnyToPctUniversal(x.value) ??
      parseAnyToPctUniversal(x.total) ??
      parseAnyToPctUniversal(x.pTotal) ??
      parseAnyToPctUniversal(x.prob) ??
      parseAnyToPctUniversal(x.probabilidad) ??
      parseAnyToPctUniversal(x.aprobacion) ??
      parseAnyToPctUniversal(x.score);

    if (direct != null) return direct;
  }

  return null;
}

function normalizeProbability(prob) {
  if (prob == null) return { label: COPY.probabilityFallback, pct: null };

  if (typeof prob === "string") {
    const s = prob.trim().toLowerCase();
    if (s === "alta") return { label: "Alta", pct: 85 };
    if (s === "media") return { label: "Media", pct: 60 };
    if (s === "baja") return { label: "Baja", pct: 35 };
    if (s.includes("sin oferta")) return { label: "Sin oferta hoy", pct: 0 };
  }

  const pctValue = parseAnyToPctUniversal(prob);

  return pctValue == null
    ? { label: COPY.probabilityFallback, pct: null }
    : { label: `${Math.round(pctValue)}%`, pct: pctValue };
}

function scoreToPctFallback(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return null;

  if (s >= 0 && s <= 100) {
    return Math.max(0, Math.min(100, s));
  }

  const pct = ((s - 300) / (850 - 300)) * 100;
  return Math.max(0, Math.min(100, pct));
}

function safePctFromRate(rate) {
  const x = Number(rate);
  if (!Number.isFinite(x)) return "—";
  const pctRate = x <= 1 ? x * 100 : x;
  return `${pctRate.toFixed(2)}%`;
}

function normalizeLimitingFactor(v) {
  const s = String(v || "").toLowerCase();
  if (s === "cuota") return "Cuota";
  if (s === "entrada") return "Entrada";
  if (s === "programa") return "Programa";
  return "—";
}

function calculateProgressFromSnapshot(
  snapshot,
  {
    hasImmediateViableMortgage = false,
    estimatedMaxPropertyValue = null,
    probabilityPct = null,
  }
) {
  if (!snapshot) return 0;

  const unlocked =
    snapshot?.unlocked === true ||
    snapshot?.output?.unlocked === true ||
    snapshot?.ok === true ||
    snapshot?.output?.ok === true;

  if (!unlocked) return 0;

  if (hasImmediateViableMortgage) {
    const pct = toNum(probabilityPct);
    if (pct != null) {
      if (pct >= 80) return 100;
      if (pct >= 60) return 88;
      if (pct >= 40) return 76;
      return 68;
    }
    return 82;
  }

  if (toNum(estimatedMaxPropertyValue) > 0) {
    const pct = toNum(probabilityPct);
    if (pct != null) {
      if (pct >= 80) return 82;
      if (pct >= 60) return 74;
      if (pct >= 40) return 66;
      return 58;
    }
    return 72;
  }

  return 35;
}

function buildAlternativeSubtitle(alt) {
  const parts = [];

  if (toNum(alt?.rangeMin) != null && toNum(alt?.rangeMax) != null) {
    parts.push(`${safeMoney(alt.rangeMin)} – ${safeMoney(alt.rangeMax)}`);
  } else if (toNum(alt?.alternativePrice) != null) {
    parts.push(`Hasta ${safeMoney(alt.alternativePrice)}`);
  }

  if (toNum(alt?.monthlyPayment) != null && toNum(alt?.monthlyPayment) > 0) {
    parts.push(`Cuota aprox. ${safeMoney(alt.monthlyPayment)}`);
  }

  if (toNum(alt?.monthsToViable) != null && toNum(alt?.monthsToViable) > 0) {
    parts.push(`≈ ${Math.round(alt.monthsToViable)} meses`);
  }

  return parts.join(" · ");
}

function useCountUp(target, duration = 900, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const finalValue = Number(target);

    if (!enabled) return;
    if (!Number.isFinite(finalValue)) {
      setValue(0);
      return;
    }

    let frameId = null;
    let startTime = null;
    const startValue = 0;

    const tick = (ts) => {
      if (startTime == null) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      const next = startValue + (finalValue - startValue) * eased;

      setValue(next);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    setValue(0);
    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [target, duration, enabled]);

  return Math.round(value);
}

function useFadeIn(delay = 0) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0px)" : "translateY(10px)",
    transition: "opacity 0.45s ease, transform 0.45s ease",
  };
}


const visibleInViewStyle = {
  opacity: 1,
  transform: "translateY(0px)",
  transition: "opacity 0.5s ease, transform 0.5s ease",
};

export default function Home() {
  const navigate = useNavigate();

  const [raw, setRaw] = useState(null);
  const [journey, setJourney] = useState(null);

  const [loading, setLoading] = useState(true);
  const [, setIsOnline] = useState(false);
  const [, setErr] = useState("");

  const [showAlternatives, setShowAlternatives] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    actionGuide: true,
    blocker: false,
    rhythm: false,
    alternatives: false,
  });

  function toggleSection(key) {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function go(path) {
    navigate(path);
  }

  const snapshot = raw || null;

  const snapshotEngine =
    snapshot?.engine ||
    snapshot?.output?.engine ||
    null;

  const canonicalBestMortgage =
    snapshot?.bestMortgage ??
    snapshot?.output?.bestMortgage ??
    null;

  const financialCapacity =
    snapshot?.financialCapacity ??
    snapshot?.output?.financialCapacity ??
    null;

  const hasImmediateViableMortgage =
    !!financialCapacity?.hasImmediateViableMortgage;

  const estimatedMaxPropertyValue =
    toNum(financialCapacity?.estimatedMaxPropertyValue) ??
    toNum(canonicalBestMortgage?.precioMaxVivienda) ??
    toNum(
      pickMatcherFirst(snapshot, [
        "precioMaxVivienda",
        "propertyPrice",
      ])
    ) ??
    null;

  const estimatedMaxLoanAmount =
    toNum(financialCapacity?.estimatedMaxLoanAmount) ??
    toNum(canonicalBestMortgage?.montoPrestamo) ??
    toNum(
      pickMatcherFirst(snapshot, [
        "montoMaximo",
        "loanAmount",
      ])
    ) ??
    null;

  const estimatedMonthlyPayment =
    toNum(financialCapacity?.estimatedMonthlyPayment) ??
    toNum(canonicalBestMortgage?.cuota) ??
    toNum(
      pickMatcherFirst(snapshot, [
        "cuotaEstimada",
        "monthlyPayment",
      ])
    ) ??
    null;

  const estimatedAnnualRate =
    toNum(financialCapacity?.estimatedAnnualRate) ??
    toNum(canonicalBestMortgage?.annualRate) ??
    toNum(
      pickMatcherFirst(snapshot, [
        "tasaAnual",
        "annualRate",
      ])
    ) ??
    null;

  const limitingFactor =
    financialCapacity?.limitingFactor ||
    canonicalBestMortgage?.factorLimitante ||
    null;

  const homeRecommendation =
    snapshot?.homeRecommendation ??
    snapshot?.output?.homeRecommendation ??
    null;

  const homeActionHints = Array.isArray(homeRecommendation?.actionHints)
    ? homeRecommendation.actionHints
    : [];

  const homeAlternatives = Array.isArray(homeRecommendation?.alternatives)
    ? homeRecommendation.alternatives
    : [];

  const realityCheck = homeRecommendation?.realityCheck || null;
  const goalSummary = homeRecommendation?.goalSummary || null;

  const probabilityRaw =
    pickMatcherFirst(snapshot, ["probabilidad"]) ??
    canonicalBestMortgage?.probabilidad ??
    summarizeProfile(snapshot)?.probability ??
    null;

  const summary = useMemo(() => {
    const base = summarizeProfile(snapshot) || {};

    const unlocked =
      snapshot?.unlocked === true ||
      snapshot?.output?.unlocked === true ||
      snapshot?.ok === true ||
      snapshot?.output?.ok === true ||
      snapshot?.score != null ||
      snapshot?.output?.score != null ||
      financialCapacity?.estimatedMaxPropertyValue != null;

    const score =
      snapshot?.score ??
      snapshot?.output?.score ??
      canonicalBestMortgage?.score ??
      base?.score ??
      null;

    const probability =
      snapshot?.probabilidad ??
      snapshot?.output?.probabilidad ??
      canonicalBestMortgage?.probabilidad ??
      base?.probability ??
      null;

    return {
      ...base,
      unlocked,
      score,
      probability,
      progress: base?.progress ?? 0,
    };
  }, [snapshot, financialCapacity, canonicalBestMortgage]);

  const plan = useMemo(() => {
    try {
      return buildPlan({ journey, snapshot });
    } catch (e) {
      console.error("[HL] buildPlan error:", e);
      return null;
    }
  }, [journey, snapshot]);

  const entryTrajectory = plan?.entryTrajectory || null;

  async function checkBackend() {
    setLoading(true);
    setErr("");

    try {
      await withTimeout(
        apiGet("/api/precalificar/ping"),
        12000,
        "El servidor está despertando (ping timeout)."
      );
      setIsOnline(true);
    } catch (e) {
      setIsOnline(false);
      const msg = e?.message || "No se pudo conectar con el servidor";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function syncLatestSnapshotFromBackend() {
    try {
      const t = getCustomerToken();
      if (!t) {
        clearLocalScenarioState();
        setRaw(null);
        return;
      }

      const res = await fetchLatestSnapshot();
      const snap = res?.snapshot ?? null;

      if (!snapshotLooksValid(snap)) {
        return;
      }

      const ownerEmail = getStorageOwnerEmail();

      setRaw(snap);
      saveJSON(LS_SNAPSHOT, {
        ownerEmail,
        data: snap,
      });
    } catch (e) {
      console.warn("[HL] fetchLatestSnapshot failed:", e?.message || e);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      await checkBackend();
      if (!alive) return;

      const token = getCustomerToken();

      if (!token) {
        clearLocalScenarioState();
        setRaw(null);
        setJourney(null);
        return;
      }

      const currentOwnerEmail = getStorageOwnerEmail();

      const snapEnvelope = loadJSON(LS_SNAPSHOT);
      const journeyEnvelope = loadJSON(LS_JOURNEY);

      const snap =
        snapEnvelope?.ownerEmail &&
        snapEnvelope.ownerEmail === currentOwnerEmail
          ? snapEnvelope.data
          : null;

      const j =
        journeyEnvelope?.ownerEmail &&
        journeyEnvelope.ownerEmail === currentOwnerEmail
          ? journeyEnvelope.data
          : null;

      if (snapshotLooksValid(snap)) {
        setRaw(snap);
      } else {
        setRaw(null);
      }

      setJourney(j || null);

      await syncLatestSnapshotFromBackend();
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    console.log("[HOME] snapshotEngine:", snapshotEngine);
    console.log("[HOME] canonicalBestMortgage:", canonicalBestMortgage);
    console.log("[HOME] financialCapacity:", snapshot?.financialCapacity);
    console.log("[HOME] homeRecommendation:", snapshot?.homeRecommendation);
    console.log("[HOME] plan:", plan);
  }, [snapshot, snapshotEngine, canonicalBestMortgage, plan]);

  const prob = useMemo(() => {
    const normal = normalizeProbability(probabilityRaw);

    if ((normal?.pct == null || normal?.pct === 0) && summary?.unlocked) {
      const fb = scoreToPctFallback(summary?.score);
      if (fb != null) return { label: `${Math.round(fb)}%`, pct: fb };
    }

    return normal;
  }, [probabilityRaw, summary?.unlocked, summary?.score]);

  const isGoalAboveCapacity =
    homeRecommendation?.type === "goal_above_capacity";

  const isImmediateRoute =
    homeRecommendation?.type === "immediate_viable";

  const displayProgress = useMemo(() => {
    return calculateProgressFromSnapshot(snapshot, {
      hasImmediateViableMortgage,
      estimatedMaxPropertyValue,
      probabilityPct: prob?.pct,
    });
  }, [
    snapshot,
    hasImmediateViableMortgage,
    estimatedMaxPropertyValue,
    prob?.pct,
  ]);

  const useCompactScoreDisplay = isGoalAboveCapacity;

  const displayScoreBadge = useMemo(() => {
    if (!summary?.unlocked) return "—";
    if (isGoalAboveCapacity) return "Meta aspiracional";
    return null;
  }, [summary?.unlocked, isGoalAboveCapacity]);

  const displayScoreValue = useMemo(() => {
    if (!summary?.unlocked) return "—";

    const baseScore = toNum(summary?.score);
    if (baseScore != null && baseScore > 0) return baseScore;

    const fb = scoreToPctFallback(prob?.pct);
    if (fb != null) return Math.round(fb);

    return 0;
  }, [summary?.unlocked, summary?.score, prob?.pct]);

  const displayScoreLabel = useMemo(() => {
    if (!summary?.unlocked) return COPY.scoreLocked;
    if (isGoalAboveCapacity) return "Meta por encima de capacidad actual";
    if (hasImmediateViableMortgage) return prob?.label || COPY.probabilityFallback;
    if (toNum(estimatedMaxPropertyValue) > 0) return "Capacidad estimada detectada";
    return prob?.label || COPY.probabilityFallback;
  }, [
    summary?.unlocked,
    isGoalAboveCapacity,
    hasImmediateViableMortgage,
    prob?.label,
    estimatedMaxPropertyValue,
  ]);

  const bestNext = useMemo(() => {
    if (!summary?.unlocked) {
      return {
        title: "Descubre si hoy ya podrías comprar casa",
        subtitle:
          "Te toma menos de 2 minutos. Te mostramos cuánto podrías comprar, cuánto pagarías al mes y cuál podría ser tu mejor camino.",
        cta: "Ver mi resultado",
        to: "/journey/full",
      };
    }

    if (homeRecommendation) {
      return {
        title: homeRecommendation?.title || "Tu mejor siguiente paso",
        subtitle:
          homeRecommendation?.subtitle ||
          "Ya tenemos una recomendación base para seguir avanzando.",
        cta: homeRecommendation?.cta?.label || "Continuar",
        to: homeRecommendation?.cta?.path || "/marketplace",
      };
    }

    if (hasImmediateViableMortgage) {
      return {
        title: "Hoy ya tienes una ruta hipotecaria clara.",
        subtitle:
          "Tu perfil sí muestra una opción de crédito viable hoy. Ahora lo más útil es revisar propiedades que encajen con esa capacidad.",
        cta: "Ver propiedades compatibles",
        to: "/marketplace",
      };
    }

    if (toNum(estimatedMaxPropertyValue) > 0) {
      return {
        title: "Hoy tienes una ruta posible",
        subtitle:
          `Hoy todavía no aparece aprobación inmediata, pero tu capacidad estimada llega alrededor de ${safeMoney(
            estimatedMaxPropertyValue
          )} con una cuota de ${safeMoney(estimatedMonthlyPayment)}.`,
        cta: "Ver propiedades que hacen match",
        to: "/marketplace",
      };
    }

    return {
      title: "Hoy todavía no hay una ruta clara",
      subtitle:
        "Con los datos actuales, todavía no aparece una opción de crédito sólida. Ajustar ingreso, entrada o valor de vivienda puede mejorar tu resultado.",
      cta: "Ajustar mi escenario",
      to: "/journey/full",
    };
  }, [
    summary?.unlocked,
    homeRecommendation,
    hasImmediateViableMortgage,
    estimatedMaxPropertyValue,
    estimatedMonthlyPayment,
  ]);

  const heroHint =
    homeRecommendation?.mainMessage ||
    (hasImmediateViableMortgage
      ? `Hoy sí vemos una ruta hipotecaria viable. Tu capacidad estimada llega alrededor de ${safeMoney(
          estimatedMaxPropertyValue
        )} con una cuota aproximada de ${safeMoney(estimatedMonthlyPayment)}.`
      : toNum(estimatedMaxPropertyValue) > 0
      ? `Aunque hoy todavía no veamos aprobación inmediata, tu capacidad financiera estimada llega alrededor de ${safeMoney(
          estimatedMaxPropertyValue
        )} con una cuota aproximada de ${safeMoney(estimatedMonthlyPayment)}.`
      : "Con los datos actuales, todavía no aparece una opción de crédito viable. Ajustar ingreso, entrada o valor de vivienda puede mejorar tu resultado.");

  const showConnecting = loading && !snapshot;

  const homeProgressText = useMemo(() => {
    if (!summary?.unlocked) {
      return "Empieza tu simulación para ver tu avance.";
    }

    if (homeRecommendation?.progressMessage) {
      return homeRecommendation.progressMessage;
    }

    if (hasImmediateViableMortgage) {
      return "Vas muy bien. Hoy ya vemos una ruta hipotecaria viable.";
    }

    if (toNum(estimatedMaxPropertyValue) > 0) {
      return "Vas bien. Ya vemos una capacidad financiera estimada y una ruta hipotecaria posible.";
    }

    return "Todavía puedes fortalecer tu perfil para abrir una mejor ruta hipotecaria.";
  }, [
    summary?.unlocked,
    homeRecommendation,
    hasImmediateViableMortgage,
    estimatedMaxPropertyValue,
  ]);

const firstName = useMemo(() => {
  const customer = getCustomer?.() || {};
  const nombre =
    journey?.form?.nombre ||
    journey?.nombre ||
    customer?.nombre ||
    customer?.name ||
    "";

  return String(nombre).trim().split(" ")[0] || "";
}, [journey]);

  const mainInsightItems = useMemo(() => {
    const items = [];

    if (estimatedMonthlyPayment != null) {
      items.push({
        id: "cuota",
        label: COPY.quotaInsightLabel,
        value: safeMoney(estimatedMonthlyPayment),
        hint: COPY.quotaInsightHint,
      });
    }

    if (!isGoalAboveCapacity && estimatedAnnualRate != null) {
      items.push({
        id: "tasa",
        label: COPY.rateInsightLabel,
        value: safePctFromRate(estimatedAnnualRate),
        hint: COPY.rateInsightHint,
      });
    }

    if (!isGoalAboveCapacity && estimatedMaxLoanAmount != null) {
      items.push({
        id: "monto",
        label: COPY.amountInsightLabel,
        value: safeMoney(estimatedMaxLoanAmount),
        hint: COPY.amountInsightHint,
      });
    }

    if (limitingFactor) {
      items.push({
        id: "limitante",
        label: COPY.limitInsightLabel,
        value: normalizeLimitingFactor(limitingFactor),
        hint: COPY.limitInsightHint,
      });
    }

    return items.slice(0, 4);
  }, [
    estimatedMonthlyPayment,
    estimatedAnnualRate,
    estimatedMaxLoanAmount,
    limitingFactor,
    isGoalAboveCapacity,
  ]);

  const primaryHeadlineValue = useMemo(() => {
    if (isGoalAboveCapacity) {
      const min = toNum(realityCheck?.recommendedSearchMin);
      const max = toNum(realityCheck?.recommendedSearchMax);

      if (min != null && max != null) {
        return `${safeMoney(min)} – ${safeMoney(max)}`;
      }

      if (max != null) {
        return safeMoney(max);
      }
    }

    return safeMoney(
      realityCheck?.currentMaxPropertyValue ?? estimatedMaxPropertyValue
    );
  }, [isGoalAboveCapacity, realityCheck, estimatedMaxPropertyValue]);

  const primaryHeadlineLabel = isGoalAboveCapacity
    ? "Rango recomendado hoy"
    : "Capacidad financiera estimada";

  const primaryHeadlineHelp = isGoalAboveCapacity
    ? "Este es el rango donde tu perfil tiene mayor probabilidad de aprobación hoy."
    : hasImmediateViableMortgage
    ? `Tu perfil ya tiene una ruta hipotecaria viable hoy${
        canonicalBestMortgage?.label ? ` con ${canonicalBestMortgage.label}` : ""
      }.`
    : "Este valor resume la capacidad que hoy podría sostener tu perfil.";

  const currentEntryAmount =
    toNum(journey?.form?.entradaDisponible) ??
    toNum(journey?.entradaDisponible) ??
    toNum(snapshot?.input?.entradaDisponible) ??
    toNum(snapshot?.perfilInput?.entradaDisponible) ??
    toNum(snapshot?.__entrada?.entradaDisponible) ??
    toNum(snapshot?.inputNormalizado?.entradaDisponible) ??
    toNum(snapshot?.entradaDisponible) ??
    toNum(pickLegacyCompatible(snapshot, ["entradaDisponible"])) ??
    0;

  const homePrimaryBlocker =
    homeRecommendation?.blockers?.primary ||
    limitingFactor ||
    null;

  const blockerExplanationTitle = useMemo(() => {
    if (!summary?.unlocked) return null;
    if (homePrimaryBlocker === "entrada") return "Qué está frenando tu capacidad hoy";
    if (homePrimaryBlocker === "cuota") return "Qué está frenando tu capacidad hoy";
    if (homePrimaryBlocker === "programa") return "Qué está frenando tu capacidad hoy";
    return null;
  }, [summary?.unlocked, homePrimaryBlocker]);

  const blockerExplanationBody = useMemo(() => {
    if (!summary?.unlocked) return null;

    if (homePrimaryBlocker === "entrada") {
      return `Tu ingreso sí tiene potencial, pero con una entrada disponible de ${safeMoney(
        currentEntryAmount
      )} hoy tu rango más realista baja a ${primaryHeadlineValue}.`;
    }

    if (homePrimaryBlocker === "cuota") {
      return "Tu ingreso sí tiene base, pero hoy la cuota que el sistema considera sana todavía limita el rango al que podrías apuntar con más probabilidad de aprobación.";
    }

    if (homePrimaryBlocker === "programa") {
      return "Hoy no solo influye tu perfil financiero. También te limita el tipo de programa o segmento de vivienda al que estás apuntando.";
    }

    return null;
  }, [
    summary?.unlocked,
    homePrimaryBlocker,
    currentEntryAmount,
    primaryHeadlineValue,
  ]);

  const filteredHomeAlternatives = useMemo(() => {
    if (!isGoalAboveCapacity) return homeAlternatives.slice(0, 3);

    return homeAlternatives
      .filter((alt) =>
        ["search_range", "entry_installments"].includes(alt?.kind)
      )
      .slice(0, 2);
  }, [homeAlternatives, isGoalAboveCapacity]);

  const heroAnim = useFadeIn(40);
const resultInView = true;
const guideInView = true;
const progressInView = true;
const capacityInView = true;
const alternativesInView = true;

  const animatedScore = useCountUp(
    useCompactScoreDisplay ? 0 : Number(displayScoreValue) || 0,
    950,
    resultInView
  );

  const animatedProgress = useCountUp(displayProgress, 950, progressInView);

  return (
    <Screen
      style={{
        padding: 22,
        paddingTop: 78,
        paddingBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          ...heroAnim,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(148,163,184,0.95)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{firstName ? `Hola, ${firstName}` : "Hola"}</span>
            <Sparkles
              size={14}
              strokeWidth={2.2}
              style={{ opacity: 0.95, flexShrink: 0 }}
            />
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 31,
              letterSpacing: -1,
              maxWidth: 320,
              fontWeight: 980,
              lineHeight: 1.02,
            }}
          >
Tu avance para comprar vivienda          </div>

          <div
            style={{
              color: "rgba(226,232,240,0.88)",
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.4,
              maxWidth: 330,
            }}
          >
            {COPY.appSubtitle}
          </div>
        </div>

        <Chip tone="neutral">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <HomeIcon size={13} strokeWidth={2.2} />
            Camino a Casa
          </span>
        </Chip>
      </div>

      {showConnecting ? (
        <div
          style={{
            marginTop: 18,
            color: "rgba(148,163,184,0.95)",
            fontSize: 13,
          }}
        >
          {COPY.connecting}
        </div>
      ) : null}

    <div style={visibleInViewStyle}>
        <Card style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)" }}>
              Tu resultado hoy
            </div>

            {summary?.unlocked ? (
              <Chip tone="good">
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <CheckCircle2 size={13} strokeWidth={2.4} />
                  {COPY.scoreReady}
                </span>
              </Chip>
            ) : (
              <Chip tone="neutral">
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Lock size={13} strokeWidth={2.4} />
                  {COPY.scoreMissing}
                </span>
              </Chip>
            )}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              {useCompactScoreDisplay ? (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.16)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 13,
                    fontWeight: 950,
                    color: "rgba(226,232,240,0.95)",
                  }}
                >
                  {displayScoreBadge}
                </div>
              ) : (
                <div style={{ fontSize: 42, fontWeight: 980, letterSpacing: -1 }}>
                  {animatedScore}
                </div>
              )}

              <div
                style={{
                  marginTop: 6,
                  color: "rgba(148,163,184,0.95)",
                  fontSize: 13,
                  lineHeight: 1.35,
                  maxWidth: 240,
                }}
              >
                {displayScoreLabel}
              </div>
            </div>

            {summary?.unlocked ? (
              <Chip tone={hasImmediateViableMortgage ? "good" : "neutral"}>
                {hasImmediateViableMortgage
                  ? "Ruta viable hoy"
                  : "Perfil en construcción"}
              </Chip>
            ) : null}
          </div>

          {summary?.unlocked ? (
            <ProbabilityBar
              valuePct={isGoalAboveCapacity ? null : prob?.pct}
              valueText={isGoalAboveCapacity ? "Baja" : null}
              hint={heroHint}
            />
          ) : null}

          {homeActionHints.length > 0 ? (
            <AccordionSection
              title="Qué te conviene hacer ahora"
              subtitle="Te mostramos solo el siguiente mejor movimiento para avanzar."
              open={expandedSections.actionGuide}
              onToggle={() => toggleSection("actionGuide")}
              style={{
                background: isImmediateRoute
                  ? "rgba(16,185,129,0.10)"
                  : "rgba(37,211,166,0.08)",
                border: isImmediateRoute
                  ? "1px solid rgba(16,185,129,0.22)"
                  : "1px solid rgba(37,211,166,0.20)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {homeActionHints.slice(0, 3).map((hint, idx) => (
                  <div
                    key={`${hint}-${idx}`}
                    style={{
                      fontSize: 13,
                      lineHeight: 1.35,
                      color: "rgba(226,232,240,0.88)",
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(2,6,23,0.18)",
                      border: "1px solid rgba(148,163,184,0.12)",
                    }}
                  >
                    {idx + 1}. {hint}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <SecondaryButton onClick={() => go(bestNext.to)}>
                  {isGoalAboveCapacity
                    ? "Ver propiedades en mi rango"
                    : bestNext.cta}
                </SecondaryButton>
              </div>
            </AccordionSection>
          ) : null}
        </Card>
      </div>
<div style={visibleInViewStyle}>
        <Card style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "rgba(148,163,184,0.95)",
                fontWeight: 950,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Compass
                size={13}
                strokeWidth={2.3}
                style={{ opacity: 0.95, flexShrink: 0 }}
              />
              {COPY.guideTag}
            </div>
            <Chip tone="neutral">{COPY.guideResultTag}</Chip>
          </div>

          <div
            style={{
              marginTop: 10,
              fontWeight: 980,
              fontSize: 18,
              lineHeight: 1.2,
            }}
          >
            {bestNext.title}
          </div>

          <div
            style={{
              marginTop: 8,
              color: "rgba(226,232,240,0.90)",
              lineHeight: 1.35,
              fontSize: 13,
            }}
          >
            {bestNext.subtitle}
          </div>

          <div style={{ marginTop: 12 }}>
            <PrimaryButton onClick={() => go(bestNext.to)}>
              {isGoalAboveCapacity ? "Ver propiedades en mi rango" : bestNext.cta}
            </PrimaryButton>
          </div>
        </Card>
      </div>

      <div style={visibleInViewStyle}>
        <Card style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(148,163,184,0.95)",
                  fontWeight: 900,
                }}
              >
                Tu progreso hacia comprar casa
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 28,
                  fontWeight: 980,
                  lineHeight: 1,
                }}
              >
                {animatedProgress}%
              </div>
            </div>

            <Chip tone={displayProgress >= 85 ? "good" : "neutral"}>
              {displayProgress >= 85 ? "Vas muy bien" : "Sigue avanzando"}
            </Chip>
          </div>

          <div style={{ marginTop: 10 }}>
            <ProgressBar value={animatedProgress} />
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "rgba(148,163,184,0.92)",
              lineHeight: 1.35,
            }}
          >
            {homeProgressText}
          </div>
        </Card>
      </div>

      {summary?.unlocked ? (
       <div style={visibleInViewStyle}>
          <Card style={{ marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)" }}>
                  {primaryHeadlineLabel}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 24,
                    fontWeight: 980,
                    lineHeight: 1.1,
                  }}
                >
                  {primaryHeadlineValue}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "rgba(148,163,184,0.95)",
                    lineHeight: 1.35,
                  }}
                >
                  {primaryHeadlineHelp}
                </div>
              </div>

              <Chip tone={hasImmediateViableMortgage ? "good" : "neutral"}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {hasImmediateViableMortgage ? (
                    <>
                      <CheckCircle2 size={13} strokeWidth={2.4} />
                      Hoy viable
                    </>
                  ) : isGoalAboveCapacity ? (
                    <>
                      <Target size={13} strokeWidth={2.4} />
                      Aterrizar meta
                    </>
                  ) : (
                    <>
                      <MapPin size={13} strokeWidth={2.4} />
                      Ruta estimada
                    </>
                  )}
                </span>
              </Chip>
            </div>

            {blockerExplanationTitle && blockerExplanationBody ? (
              <AccordionSection
                title={blockerExplanationTitle}
                subtitle="Esto te ayuda a entender qué variable pesa más hoy."
                open={expandedSections.blocker}
                onToggle={() => toggleSection("blocker")}
              >
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: "rgba(226,232,240,0.90)",
                  }}
                >
                  {blockerExplanationBody}
                </div>

                {homePrimaryBlocker === "entrada" ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      lineHeight: 1.35,
                      color: "rgba(148,163,184,0.88)",
                    }}
                  >
                    La buena noticia: si aumentas tu entrada, tu capacidad puede subir mucho más rápido.
                  </div>
                ) : null}
              </AccordionSection>
            ) : null}

            {isGoalAboveCapacity && toNum(goalSummary?.targetPropertyValue) > 0 ? (
              <InnerCard
                style={{
                  marginTop: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(148,163,184,0.16)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <SoftMetric
                    label="Tu objetivo de vivienda"
                    value={safeMoney(goalSummary?.targetPropertyValue)}
                  />
                  <SoftMetric
                    label="Lo más realista hoy"
                    value={primaryHeadlineValue}
                  />
                </div>
              </InnerCard>
            ) : null}

            {summary?.unlocked && entryTrajectory ? (
              <AccordionSection
                title="Si mantienes este ritmo"
                subtitle="Una proyección simple para visualizar cómo se podría mover tu entrada."
                open={expandedSections.rhythm}
                onToggle={() => toggleSection("rhythm")}
              >
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: "rgba(226,232,240,0.90)",
                  }}
                >
                  Hoy tienes {safeMoney(entryTrajectory.entradaActual)} de entrada y podrías
                  destinar {safeMoney(entryTrajectory.capacidadMensual)} al mes para seguir
                  construyéndola.
                </div>

                {entryTrajectory.mejorRutaActual ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(2,6,23,0.18)",
                      border: "1px solid rgba(148,163,184,0.12)",
                      fontSize: 13,
                      lineHeight: 1.35,
                      color: "rgba(226,232,240,0.88)",
                    }}
                  >
                    Para tu rango más realista de hoy, la forma más rápida de fortalecer tu
                    entrada sería con{" "}
                    <strong>{entryTrajectory.mejorRutaActual.producto}</strong>. Manteniendo
                    este ritmo, podrías completar una entrada referencial en{" "}
                    <strong>
                      {entryTrajectory.mejorRutaActual.mesesActual}{" "}
                      {entryTrajectory.mejorRutaActual.mesesActual === 1 ? "mes" : "meses"}
                    </strong>.
                  </div>
                ) : null}

                {isGoalAboveCapacity && entryTrajectory.mejorRutaMeta ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(2,6,23,0.18)",
                      border: "1px solid rgba(148,163,184,0.12)",
                      fontSize: 13,
                      lineHeight: 1.35,
                      color: "rgba(226,232,240,0.88)",
                    }}
                  >
                    Para acercarte a tu meta de vivienda, la ruta más rápida estimada sería
                    con <strong>{entryTrajectory.mejorRutaMeta.producto}</strong>, y tomaría
                    alrededor de{" "}
                    <strong>
                      {entryTrajectory.mejorRutaMeta.mesesMeta}{" "}
                      {entryTrajectory.mejorRutaMeta.mesesMeta === 1 ? "mes" : "meses"}
                    </strong>{" "}
                    solo para fortalecer la entrada.
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 1.35,
                    color: "rgba(148,163,184,0.85)",
                  }}
                >
                  Esto mejora tu capacidad de entrada. La aprobación final también dependerá
                  del programa y de tu perfil crediticio al momento de aplicar.
                </div>
              </AccordionSection>
            ) : null}

            <InsightGrid items={mainInsightItems} />

            <div style={{ marginTop: 12 }}>
              <PrimaryButton onClick={() => go("/marketplace")}>
                {isGoalAboveCapacity
                  ? "Ver propiedades en mi rango"
                  : "Ver propiedades compatibles"}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      ) : null}

      {summary?.unlocked && filteredHomeAlternatives.length > 0 ? (
       <div style={visibleInViewStyle}>
          <Card style={{ marginTop: 18 }}>
            <AccordionSection
              title={
                isGoalAboveCapacity
                  ? "Opciones para acercarte a tu meta"
                  : "Caminos que también podrían servirte"
              }
              subtitle="Alternativas para explorar sin saturar tu pantalla principal."
              open={expandedSections.alternatives}
              onToggle={() => toggleSection("alternatives")}
              style={{
                marginTop: 0,
                background: "transparent",
                border: "none",
                padding: 0,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                {filteredHomeAlternatives.map((alt, idx) => (
                  <div
                    key={`${alt?.kind || "alt"}-${idx}`}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.16)",
                      background: "rgba(2,6,23,0.18)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 950, fontSize: 15 }}>
                          {alt?.title || "Alternativa"}
                        </div>

                        {buildAlternativeSubtitle(alt) ? (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "rgba(148,163,184,0.95)",
                            }}
                          >
                            {buildAlternativeSubtitle(alt)}
                          </div>
                        ) : null}

                        {alt?.description ? (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              lineHeight: 1.35,
                              color: "rgba(226,232,240,0.88)",
                            }}
                          >
                            {alt.description}
                          </div>
                        ) : null}
                      </div>

                      <Chip tone="neutral">
                        {alt?.kind === "entry_installments"
                          ? "Entrada en cuotas"
                          : alt?.kind === "search_range"
                          ? "Tu rango"
                          : "Alternativa"}
                      </Chip>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <SecondaryButton
                        onClick={() => go(alt?.ctaPath || "/marketplace")}
                      >
                        {alt?.ctaLabel || "Ver opción"}
                      </SecondaryButton>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionSection>
          </Card>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setShowAlternatives((v) => !v)}
          style={{
            width: "100%",
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(255,255,255,0.04)",
            color: "white",
            borderRadius: 16,
            padding: 14,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {showAlternatives ? COPY.alternativesHide : COPY.alternativesShow}
        </button>
      </div>

      {showAlternatives ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <Card soft style={{ padding: 14 }}>
            <button
              onClick={() => go("/journey")}
              style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
            >
              <div
                style={{
                  fontWeight: 950,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Calculator size={14} strokeWidth={2.3} />
                {COPY.altSimularTitle}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(148,163,184,0.95)",
                  marginTop: 4,
                }}
              >
                {COPY.altSimularBody}
              </div>
            </button>
          </Card>

          <Card soft style={{ padding: 14 }}>
            <button
              onClick={() => go("/marketplace")}
              style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
            >
              <div
                style={{
                  fontWeight: 950,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Building2 size={14} strokeWidth={2.3} />
                {COPY.altMatchTitle}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(148,163,184,0.95)",
                  marginTop: 4,
                }}
              >
                {COPY.altMatchBody}
              </div>
            </button>
          </Card>

          <Card soft style={{ padding: 14 }}>
            <button
              onClick={() => go("/ruta")}
              style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
            >
              <div
                style={{
                  fontWeight: 950,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Compass size={14} strokeWidth={2.3} />
                {COPY.altRutaTitle}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(148,163,184,0.95)",
                  marginTop: 4,
                }}
              >
                {COPY.altRutaBody}
              </div>
            </button>
          </Card>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          color: "rgba(148,163,184,0.78)",
          lineHeight: 1.4,
          textAlign: "center",
        }}
      >
        Los resultados de HabitaLibre son referenciales y pueden variar según la evaluación final de cada entidad financiera.
      </div>
    </Screen>
  );
}