// src/screens/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { summarizeProfile } from "../lib/profileSummary.js";
import { moneyUSD } from "../lib/money";
import { apiGet, API_BASE } from "../lib/api";
import { buildPlan } from "../lib/planEngine.js";

// ✅ token + snapshots backend
import { getCustomerToken } from "../lib/customerSession.js";
import { fetchLatestSnapshot } from "../lib/snapshots.js";

// ✅ UI Kit (unifica look & feel con Ruta)
import { Screen, Card, InnerCard, Chip, PrimaryButton, SecondaryButton, ProgressBar } from "../ui/kit.jsx";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

/* ---------------- UI bits ---------------- */

// ✅ Probabilidad estilo fintech (pero usando ProgressBar del kit)
function ProbabilityBar({ valuePct, hint }) {
  const v = valuePct == null ? null : Math.max(0, Math.min(100, Number(valuePct)));
  return (
    <InnerCard style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 900, color: "rgba(148,163,184,0.95)" }}>
          Probabilidad de aprobación
        </div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 950 }}>
          {v == null ? "—" : `${Math.round(v)}%`}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <ProgressBar value={v ?? 0} />
      </div>

      {hint ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, lineHeight: 1.25, color: "rgba(148,163,184,0.95)" }}>
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

function InsightGrid({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>{it.label}</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>{it.value}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.90)", lineHeight: 1.25 }}>
            {it.hint}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ marginTop: 14, fontWeight: 950, fontSize: 13, color: "rgba(226,232,240,0.92)" }}>
      {children}
    </div>
  );
}

function MiniList({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {items.slice(0, 3).map((it, idx) => (
        <div
          key={it.id || idx}
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.18)",
            fontSize: 13,
            lineHeight: 1.25,
          }}
        >
          <div style={{ fontWeight: 950 }}>{it.title}</div>
          {it.subtitle ? (
            <div style={{ marginTop: 4, color: "rgba(148,163,184,0.95)", fontSize: 12 }}>{it.subtitle}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ---------------- helpers (data) ---------------- */
const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
const toNum = (v) => (isFiniteNum(v) ? v : null);

function pct(v, digits = 0) {
  const x = toNum(v);
  if (x == null) return null;
  return `${(x * 100).toFixed(digits)}%`;
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

function calcLiteAmort({ cuota, plazoMeses, principal }) {
  const c = toNum(cuota);
  const pz = toNum(plazoMeses);
  const pr = toNum(principal);
  if (c == null || pz == null || pz <= 0) return null;

  const totalPagado = c * pz;
  const interesAprox = pr != null ? Math.max(0, totalPagado - pr) : null;

  return { totalPagado, interesAprox };
}

function parseDigitsToNumber(v) {
  if (v == null) return null;
  const s = String(v).replace(/[^\d]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ✅ timeout helper para ping
function withTimeout(promise, ms, msg = "ping timeout") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
}

/**
 * ✅ parsea a porcentaje:
 * - 0.64 -> 64
 * - 64 -> 64
 * - "0,64" -> 64
 * - "64%" -> 64
 */
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

    // ✅ coma decimal
    const s = s0.includes(",") && !s0.includes(".") ? s0.replace(",", ".") : s0;

    const m = s.match(/(\d+(\.\d+)?)/);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;

    const p = s.includes("%") ? n : n <= 1 ? n * 100 : n;
    return clampPct(p);
  }

  // objects: intentar campos típicos
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

    // buscar profundo (limitado)
    let depth = 0;
    const stack = [x];
    const seen = new Set();
    while (stack.length && depth < 250) {
      const node = stack.pop();
      depth += 1;
      if (!node || typeof node !== "object") continue;
      if (seen.has(node)) continue;
      seen.add(node);

      for (const v of Object.values(node)) {
        const p = parseAnyToPctUniversal(v);
        if (p != null) return p;
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }

  return null;
}

/**
 * ✅ Normaliza "probability" (cualquier forma) a { label, pct }
 */
function normalizeProbability(prob) {
  const pctValue = parseAnyToPctUniversal(prob);
  return pctValue == null ? { label: "Estimación", pct: null } : { label: `${Math.round(pctValue)}%`, pct: pctValue };
}

/**
 * ✅ Busca un valor por keys en cualquier parte del objeto (deep).
 */
function findDeepByKeys(obj, keys, maxDepth = 7) {
  if (!obj || typeof obj !== "object") return null;

  const wanted = new Set(keys);
  const seen = new Set();
  const stack = [{ node: obj, depth: 0 }];

  while (stack.length) {
    const { node, depth } = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    for (const k of Object.keys(node)) {
      if (wanted.has(k) && node[k] != null) return node[k];
    }

    if (depth < maxDepth) {
      for (const v of Object.values(node)) {
        if (v && typeof v === "object") stack.push({ node: v, depth: depth + 1 });
      }
    }
  }

  return null;
}

/**
 * ✅ Heurística: busca keys que suenen a probabilidad y toma el primer número creíble.
 */
function findProbabilityHeuristic(obj, maxDepth = 8) {
  if (!obj || typeof obj !== "object") return null;

  const keyLooksProb = (k) => /prob|aprob|chance|likelihood|odds|approval/i.test(String(k || ""));

  const seen = new Set();
  const stack = [{ node: obj, depth: 0 }];

  while (stack.length) {
    const { node, depth } = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    for (const [k, v] of Object.entries(node)) {
      if (keyLooksProb(k)) {
        const p = parseAnyToPctUniversal(v);
        if (p != null) return v; // devolvemos RAW para que normalizeProbability haga label/pct
      }
      if (v && typeof v === "object" && depth < maxDepth) {
        stack.push({ node: v, depth: depth + 1 });
      }
    }
  }

  return null;
}

/**
 * ✅ Fallback: si el backend no manda probabilidad, derivamos aprox desde score (solo UI).
 */
function scoreToPctFallback(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return null;
  // rango típico: 300 - 850
  const pct = ((s - 300) / (850 - 300)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export default function Home() {
  const navigate = useNavigate();

  const [raw, setRaw] = useState(() => loadJSON(LS_SNAPSHOT));
  const [journey, setJourney] = useState(() => loadJSON(LS_JOURNEY));

  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [err, setErr] = useState("");

  // ✅ UI toggle
  const [showAlternatives, setShowAlternatives] = useState(false);

  // ✅ Auth state (opcional)
  const token = getCustomerToken();
  const isLoggedIn = !!token;

  function go(path) {
    navigate(path);
  }

  function goLoginFor(pathAfterLogin) {
    navigate(`/login?next=${encodeURIComponent(pathAfterLogin || "/")}`);
  }

  const snapshot = raw || null;
  const summary = useMemo(() => summarizeProfile(snapshot), [snapshot]);

  useEffect(() => {
    console.log("[HL] Home mounted ✅ (MOBILE)");
    console.log("[HL] API_BASE =", API_BASE);
    console.log("[HL] LS_JOURNEY =", LS_JOURNEY);
    console.log("[HL] isLoggedIn =", isLoggedIn);
    console.log("[HL] summary.progress =", summary?.progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = useMemo(() => {
    try {
      return buildPlan({ journey, snapshot });
    } catch (e) {
      console.error("[HL] buildPlan error:", e);
      return null;
    }
  }, [journey, snapshot]);

  async function checkBackend() {
    setLoading(true);
    setErr("");

    try {
      await withTimeout(apiGet("/api/precalificar/ping"), 12000, "El servidor está despertando (ping timeout).");
      setIsOnline(true);
    } catch (e) {
      setIsOnline(false);
      const msg = e?.message || "No se pudo conectar con el servidor";
      if (String(msg).includes("ping timeout")) {
        console.warn("[HL] ping no respondió rápido:", msg);
        setErr("El servidor está despertando. Puede tardar unos segundos…");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function syncLatestSnapshotFromBackend() {
    try {
      const t = getCustomerToken();
      if (!t) return;

      const res = await fetchLatestSnapshot(); // { ok, snapshot }
      const snap = res?.snapshot ?? null;
      if (!snap) return;

      setRaw(snap);
      saveJSON(LS_SNAPSHOT, snap);
    } catch (e) {
      console.warn("[HL] fetchLatestSnapshot failed:", e?.message || e);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      await checkBackend();
      if (!alive) return;

      const snap = loadJSON(LS_SNAPSHOT);
      const j = loadJSON(LS_JOURNEY);

      if (snap) setRaw(snap);
      if (j) setJourney(j);

      await syncLatestSnapshotFromBackend();
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appTitle = "HabitaLibre";
  const subtitle = "Descubre si puedes comprar casa hoy";

  /* ---------------- VALUE: datos reales del backend ---------------- */
  const flags = pick(snapshot, ["flags"]);
  const sinOferta =
    pick(snapshot, ["sinOferta"]) ??
    (flags && typeof flags === "object" ? flags.sinOferta : null) ??
    null;

  const cuotaEstimada = pick(snapshot, ["cuotaEstimada"]);
  const tasaAnual = pick(snapshot, ["tasaAnual"]);
  const plazoMeses = pick(snapshot, ["plazoMeses"]);
  const dti = pick(snapshot, ["dtiConHipoteca"]);
  const ltv = pick(snapshot, ["ltv"]);

  const bancoSugerido = pick(snapshot, ["bancoSugerido"]);
  const productoSugerido = pick(snapshot, ["productoSugerido"]);

  const checklist = pick(snapshot, ["checklist"]);
  const accionesClave = pick(snapshot, ["accionesClave"]);

  const montoMaximo = pick(snapshot, ["montoMaximo", "montoPrestamoMax", "prestamoMax"]);
  const precioMaxVivienda = pick(snapshot, ["precioMaxVivienda", "precioMax", "valorMaxVivienda"]);

  const valorViviendaJourney = parseDigitsToNumber(journey?.form?.valorVivienda);
  const entradaRecomendada =
    valorViviendaJourney != null && toNum(ltv) != null
      ? Math.max(0, valorViviendaJourney * (1 - ltv))
      : null;

  const insightItemsReal = useMemo(() => {
    const items = [];

    if (cuotaEstimada != null) {
      items.push({
        id: "cuota",
        label: "Cuota estimada",
        value: safeMoney(cuotaEstimada),
        hint: "Pago mensual aproximado según tu perfil.",
      });
    }

    if (tasaAnual != null) {
      const x = Number(tasaAnual);
      const tasaPct = Number.isFinite(x) ? (x <= 1 ? x * 100 : x) : null;
      items.push({
        id: "tasa",
        label: "Tasa anual",
        value: tasaPct == null ? "—" : `${tasaPct.toFixed(2)}%`,
        hint: "Referencia del escenario recomendado.",
      });
    }

    if (plazoMeses != null) {
      const pm = Number(plazoMeses);
      items.push({
        id: "plazo",
        label: "Plazo",
        value: Number.isFinite(pm) ? `${Math.round(pm / 12)} años` : "—",
        hint: "Plazo típico del producto sugerido.",
      });
    }

    if (dti != null) {
      const x = Number(dti);
      const dtiLabel = x <= 0.35 ? "Saludable" : x <= 0.45 ? "Ajustado" : "Riesgoso";
      items.push({
        id: "dti",
        label: "DTI",
        value: pct(x, 0) || "—",
        hint: `Tu deuda/ingreso: ${dtiLabel}.`,
      });
    }

    if (entradaRecomendada != null) {
      items.push({
        id: "entrada",
        label: "Entrada sugerida",
        value: safeMoney(entradaRecomendada),
        hint: "Aprox. para el LTV del escenario.",
      });
    }

    return items.slice(0, 4);
  }, [cuotaEstimada, tasaAnual, plazoMeses, dti, entradaRecomendada]);

  const insightItemsLocked = useMemo(
    () => [
      { id: "l1", label: "Cuota estimada", value: "—", hint: "Completa tu simulación para ver tu estimación." },
      { id: "l2", label: "Tasa anual", value: "—", hint: "Se calcula con tu perfil." },
      { id: "l3", label: "DTI", value: "—", hint: "Te diremos si es saludable o riesgoso." },
      { id: "l4", label: "Entrada sugerida", value: "—", hint: "Te diremos cuánto te falta." },
    ],
    []
  );

  const actionsList = useMemo(() => {
    if (Array.isArray(accionesClave) && accionesClave.length) {
      return accionesClave.slice(0, 3).map((a, idx) => {
        if (typeof a === "string") return { id: `a-${idx}`, title: a, subtitle: "" };
        return {
          id: a.id || `a-${idx}`,
          title: a.title || a.titulo || "Acción recomendada",
          subtitle: a.subtitle || a.descripcion || "",
        };
      });
    }

    const fallbacks = [];
    const d = toNum(dti);

    if (d != null && d > 0.45) {
      fallbacks.push({
        id: "fb-dti",
        title: "Baja tu DTI para subir tu aprobación",
        subtitle: "Reduce deudas mensuales o incrementa ingresos demostrables.",
      });
    }

    if (entradaRecomendada != null && entradaRecomendada > 0) {
      fallbacks.push({
        id: "fb-entrada",
        title: "Construye tu entrada más rápido",
        subtitle: "Una entrada más alta mejora tasa y probabilidad.",
      });
    }

    fallbacks.push({
      id: "fb-docs",
      title: "Prepara tus documentos (te ahorra semanas)",
      subtitle: "Checklist listo acelera el cierre y evita rechazos.",
    });

    return fallbacks.slice(0, 3);
  }, [accionesClave, dti, entradaRecomendada]);

  const checklistTop = useMemo(() => {
    if (!checklist) return null;

    if (Array.isArray(checklist)) {
      return checklist.slice(0, 3).map((c, idx) => ({
        id: `c-${idx}`,
        title: typeof c === "string" ? c : c?.title || c?.nombre || "Documento",
        subtitle: typeof c === "string" ? "" : c?.hint || c?.descripcion || "",
      }));
    }

    if (typeof checklist === "object") {
      const flat = [];
      Object.values(checklist).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach((x) => flat.push(x));
      });

      return flat.slice(0, 3).map((c, idx) => ({
        id: `co-${idx}`,
        title: typeof c === "string" ? c : c?.title || c?.nombre || "Documento",
        subtitle: typeof c === "string" ? "" : c?.hint || c?.descripcion || "",
      }));
    }

    return null;
  }, [checklist]);

  const amortLite = useMemo(() => {
    const principal = toNum(montoMaximo);
    return calcLiteAmort({ cuota: cuotaEstimada, plazoMeses, principal });
  }, [cuotaEstimada, plazoMeses, montoMaximo]);

  const amortItems = useMemo(() => {
    if (!summary?.unlocked) return null;
    if (!amortLite) return null;

    const items = [{ id: "am-total", title: "Total pagado (aprox.)", subtitle: moneyUSD(amortLite.totalPagado) }];

    if (amortLite.interesAprox != null) {
      items.push({ id: "am-int", title: "Intereses (aprox.)", subtitle: moneyUSD(amortLite.interesAprox) });
    }

    if (toNum(precioMaxVivienda) != null) {
      items.push({ id: "am-max", title: "Precio máx. recomendado", subtitle: moneyUSD(precioMaxVivienda) });
    }

    return items.slice(0, 3);
  }, [summary?.unlocked, amortLite, precioMaxVivienda]);

  const bestNext = useMemo(() => {
    if (!summary?.unlocked) {
      return {
        title: "Descubre si puedes comprar casa hoy",
        subtitle: "Te toma menos de 2 minutos. Calculamos tu capacidad, cuota estimada y ruta.",
        cta: "Ver mi resultado",
        to: "/journey/full",
        secondaryCta: isLoggedIn ? null : "Entrar a mi cuenta",
        secondaryTo: "/login",
      };
    }

    if (!isLoggedIn) {
      return {
        title: "Tu resultado está listo ✅",
        subtitle: "Puedes seguir explorando sin cuenta. Si quieres guardarlo y retomarlo después, inicia sesión.",
        cta: "Explorar mi match",
        to: "/marketplace",
        secondaryCta: "Guardar mi resultado",
        secondaryTo: "/login",
      };
    }

    if (sinOferta) {
      const d = toNum(dti);
      if (d != null && d > 0.45) {
        return {
          title: "Tu mejor palanca hoy: bajar tu DTI",
          subtitle: `Tu DTI está en ${pct(d, 0) || "alto"}. Si lo bajas, sube mucho tu probabilidad.`,
          cta: "Ver cómo mejorarlo",
          to: "/mejorar/full",
        };
      }

      if (entradaRecomendada != null && entradaRecomendada > 0) {
        return {
          title: "Tu mejor palanca hoy: aumentar tu entrada",
          subtitle: `Una entrada cercana a ${moneyUSD(entradaRecomendada)} mejora tu ruta y tasa.`,
          cta: "Recalcular con otra entrada",
          to: "/journey/full",
        };
      }

      return {
        title: "Hoy no hay una ruta viable (aún)",
        subtitle: "No es definitivo. Con 2–3 ajustes en ingresos/deudas/entrada, tu escenario cambia.",
        cta: "Ajustar mi escenario",
        to: "/journey/full",
      };
    }

    if (entradaRecomendada != null && entradaRecomendada > 0) {
      return {
        title: "Tu siguiente mejor paso: asegurar tu entrada",
        subtitle: `Con una entrada aprox. de ${moneyUSD(entradaRecomendada)} tu ruta se fortalece y mejoras tasa.`,
        cta: "Ajustar escenario",
        to: "/journey/full",
      };
    }

    return {
      title: "Tu siguiente mejor paso: checklist listo",
      subtitle: "Tener documentos listos acelera aprobación y evita rechazos.",
      cta: "Ver ruta",
      to: "/ruta",
    };
  }, [summary?.unlocked, isLoggedIn, sinOferta, dti, entradaRecomendada]);

  const showConnecting = loading && !snapshot;

  const guiaFromBackend = snapshot?.guia || null;
  const guiaMensaje = guiaFromBackend?.mensaje || bestNext.title;
  const guiaRazon = guiaFromBackend?.razon || bestNext.subtitle;
  const guiaCTA = guiaFromBackend?.microAccion || bestNext.cta;

  const PROB_KEYS = [
    "probability",
    "probabilidad",
    "probabilidadAprobacion",
    "probAprobacion",
    "aprobacionProb",
    "pAprobacion",
    "p_aprobacion",
    "pTotal",
    "totalProb",
  ];

  const probabilityRaw =
    summary?.probability ??
    pick(snapshot, PROB_KEYS) ??
    findDeepByKeys(snapshot, PROB_KEYS, 7) ??
    findProbabilityHeuristic(snapshot, 8) ??
    null;

  const prob = useMemo(() => {
    const n = normalizeProbability(probabilityRaw);
    if (n?.pct == null && summary?.unlocked) {
      const fb = scoreToPctFallback(summary?.score);
      if (fb != null) return { label: `${Math.round(fb)}%`, pct: fb };
    }
    return n;
  }, [probabilityRaw, summary?.unlocked, summary?.score]);

  useEffect(() => {
    console.log("[HL] probabilityRaw =", probabilityRaw);
    console.log("[HL] prob.normalized =", prob);
  }, [probabilityRaw, prob]);

  return (
    <Screen style={{ padding: 22, paddingBottom: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)" }}>Hola Mateo 👋</div>
          <h2 style={{ margin: "6px 0 0 0", fontWeight: 980, letterSpacing: 0.2 }}>{appTitle}</h2>
          <div style={{ color: "rgba(148,163,184,0.95)", marginTop: 4 }}>{subtitle}</div>
        </div>
        <Chip tone="neutral">Camino a Casa 🏠</Chip>
      </div>

      {showConnecting && (
        <div style={{ marginTop: 18, color: "rgba(148,163,184,0.95)", fontSize: 13 }}>
          Conectando con HabitaLibre…
        </div>
      )}

      {!loading && !isOnline && (
        <Card style={{ marginTop: 18, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>No pude conectar ahora</div>
          <div style={{ color: "rgba(226,232,240,0.92)", lineHeight: 1.35 }}>{err}</div>

          <div style={{ marginTop: 10 }}>
            <SecondaryButton onClick={() => checkBackend()}>Reintentar</SecondaryButton>
          </div>

          {!!raw && (
            <div style={{ marginTop: 10, color: "rgba(226,232,240,0.85)" }}>
              Mostrando tu último resultado guardado.
            </div>
          )}
        </Card>
      )}

      {/* ✅ TU GUÍA */}
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", fontWeight: 950 }}>🧭 Tu Guía</div>
          {guiaFromBackend?.tipoEstado ? (
            <Chip tone="neutral">{String(guiaFromBackend.tipoEstado)}</Chip>
          ) : (
            <Chip tone="neutral">{summary?.unlocked ? "Tu resultado" : "2 minutos"}</Chip>
          )}
        </div>

        <div style={{ marginTop: 10, fontWeight: 980, fontSize: 16 }}>{guiaMensaje}</div>

        <div style={{ marginTop: 8, color: "rgba(226,232,240,0.90)", lineHeight: 1.35, fontSize: 13 }}>
          {guiaRazon}
        </div>

        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={() => go(bestNext.to)}>{guiaCTA}</PrimaryButton>
        </div>

        {!isLoggedIn ? (
          <div style={{ marginTop: 10 }}>
            <SecondaryButton onClick={() => goLoginFor(bestNext.to)}>
              Guardar mi resultado (opcional)
            </SecondaryButton>
          </div>
        ) : null}

        <div style={{ marginTop: 10 }}>
          <SecondaryButton onClick={() => setShowAlternatives((v) => !v)}>
            {showAlternatives ? "Ocultar alternativas" : "Ver alternativas"}
          </SecondaryButton>
        </div>
      </Card>

      {/* Hero Card */}
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)" }}>Score HabitaLibre</div>
          {summary?.unlocked ? <Chip tone="good">Listo ✅</Chip> : <Chip tone="neutral">Falta info 🔒</Chip>}
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 44, fontWeight: 980, letterSpacing: -1 }}>
            {summary?.unlocked ? summary.score : "—"}
          </div>
          <div style={{ color: "rgba(148,163,184,0.95)", fontSize: 13 }}>
            {summary?.unlocked
              ? prob?.label
                ? `Probabilidad ${prob.label}`
                : "Probabilidad estimada"
              : "Completa tu simulación para ver tu score"}
          </div>
        </div>

        {summary?.unlocked ? (
          <ProbabilityBar
            valuePct={prob?.pct}
            hint={
              sinOferta
                ? "Hoy no hay ruta viable, pero con ajustes puedes mejorar tu probabilidad."
                : "Entre más suba esta barra, mejores tasas y opciones verás."
            }
          />
        ) : null}

        {summary?.unlocked && !sinOferta && (bancoSugerido || productoSugerido) ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bancoSugerido ? <Chip tone="neutral">{bancoSugerido}</Chip> : null}
            {productoSugerido ? <Chip tone="neutral">{productoSugerido}</Chip> : null}
          </div>
        ) : null}

        {/* Capacidad + Insights */}
        <InnerCard>
          <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)" }}>Capacidad estimada</div>
          <div style={{ fontSize: 22, fontWeight: 980, marginTop: 6 }}>
            {summary?.unlocked ? moneyUSD(summary.capacidad) : "—"}
          </div>

          <InsightGrid
            items={
              summary?.unlocked
                ? insightItemsReal?.length
                  ? insightItemsReal
                  : plan?.insights
                : insightItemsLocked
            }
          />

          {!summary?.unlocked ? (
            <div style={{ marginTop: 12 }}>
              <PrimaryButton onClick={() => go("/journey/full")}>Ver mi resultado</PrimaryButton>
            </div>
          ) : null}

          {summary?.unlocked && !isLoggedIn ? (
            <div style={{ marginTop: 10 }}>
              <SecondaryButton onClick={() => goLoginFor("/")}>Guardar mi resultado (opcional)</SecondaryButton>
            </div>
          ) : null}

          {summary?.unlocked && sinOferta ? (
            <InnerCard
              style={{
                marginTop: 12,
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.22)",
              }}
            >
              <div style={{ fontWeight: 980 }}>Hoy no hay una ruta viable</div>
              <div style={{ marginTop: 6, color: "rgba(226,232,240,0.88)", lineHeight: 1.35, fontSize: 13 }}>
                No es un “no definitivo”. Con 2–3 ajustes podemos mejorar tu probabilidad.
              </div>
            </InnerCard>
          ) : null}

          {summary?.unlocked && amortItems?.length ? (
            <>
              <SectionTitle>Resumen financiero (aprox.)</SectionTitle>
              <MiniList items={amortItems} />
            </>
          ) : null}
        </InnerCard>

        {/* Progress */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
            <span>Progreso de tu perfil</span>
            <span>{summary?.progress ?? 0}%</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={summary?.progress ?? 0} />
          </div>
        </div>

        {/* Alternativas */}
        {showAlternatives ? (
          <>
            <Card soft style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 980, fontSize: 14 }}>{bestNext.title}</div>
              <div style={{ marginTop: 6, color: "rgba(226,232,240,0.88)", fontSize: 13, lineHeight: 1.3 }}>
                {bestNext.subtitle}
              </div>

              <div style={{ marginTop: 10 }}>
                <PrimaryButton onClick={() => go(bestNext.to)}>{bestNext.cta}</PrimaryButton>
              </div>

              {bestNext.secondaryCta ? (
                <div style={{ marginTop: 10 }}>
                  <SecondaryButton
                    onClick={() =>
                      bestNext.secondaryTo === "/login"
                        ? goLoginFor(bestNext.to)
                        : bestNext.secondaryTo
                        ? go(bestNext.secondaryTo)
                        : null
                    }
                  >
                    {bestNext.secondaryCta}
                  </SecondaryButton>
                </div>
              ) : null}
            </Card>

            {summary?.unlocked ? (
              <>
                <SectionTitle>Acciones para mejorar tu aprobación</SectionTitle>
                <MiniList items={actionsList} />
              </>
            ) : null}

            {summary?.unlocked && checklistTop?.length ? (
              <>
                <SectionTitle>Documentos que más importan</SectionTitle>
                <MiniList items={checklistTop} />
                <div style={{ marginTop: 10 }}>
                  <SecondaryButton onClick={() => go("/ruta")}>Ver mi ruta (docs incluidos)</SecondaryButton>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </Card>

      {/* Quick Actions */}
      {showAlternatives ? (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card soft style={{ padding: 14 }} onClick={() => {}}>
            <button
              onClick={() => go("/journey")}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <div style={{ fontWeight: 950 }}>🧮 Simular</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 4 }}>Cuota + escenarios</div>
            </button>
          </Card>

          <Card soft style={{ padding: 14, border: "1px solid rgba(45,212,191,0.22)", background: "rgba(45,212,191,0.08)" }}>
            <button
              onClick={() => go("/mejorar")}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <div style={{ fontWeight: 980 }}>✨ Mejorar mi perfil</div>
              <div style={{ fontSize: 12, color: "rgba(226,232,240,0.85)", marginTop: 4 }}>Sube capacidad bajando deuda</div>
            </button>
          </Card>

          <Card soft style={{ padding: 14 }}>
            <button
              onClick={() => go("/marketplace")}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <div style={{ fontWeight: 950 }}>🏘 Match</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 4 }}>Propiedades + hipotecas</div>
            </button>
          </Card>

          <Card soft style={{ padding: 14 }}>
            <button
              onClick={() => go("/ruta")}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <div style={{ fontWeight: 950 }}>🧭 Ruta</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 4 }}>Checklist + pasos</div>
            </button>
          </Card>

          <Card soft style={{ padding: 14 }}>
            <button
              onClick={() => go("/asesor")}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <div style={{ fontWeight: 950 }}>💬 Asesor</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 4 }}>Guía humana/AI</div>
            </button>
          </Card>

          {!isLoggedIn ? (
            <Card soft style={{ padding: 14 }}>
              <button
                onClick={() => goLoginFor("/")}
                style={{ all: "unset", cursor: "pointer", display: "block" }}
              >
                <div style={{ fontWeight: 980 }}>🔐 Guardar</div>
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 4 }}>Inicia sesión (opcional)</div>
              </button>
            </Card>
          ) : null}
        </div>
      ) : null}
    </Screen>
  );
}