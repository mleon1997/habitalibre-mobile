import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3 } from "lucide-react";
import { API_BASE } from "../lib/api";
import { getCustomerToken, getCustomer } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

const TOTAL_STEPS = 4;

const SNAPSHOT_ENGINE = "mortgage_matcher_app";
const SNAPSHOT_VERSION = "app_v2";

const HORIZONTE_OPCIONES = [
  { value: "0-3", label: "En los próximos 0–3 meses" },
  { value: "3-12", label: "En 3–12 meses" },
  { value: "12-24", label: "En 12–24 meses" },
  { value: "explorando", label: "Solo estoy explorando" },
];

const CIUDADES_COMPRA = [
  { value: "", label: "Selecciona una ciudad" },
  { value: "Quito", label: "Quito" },
  { value: "Cumbayá", label: "Cumbayá" },
  { value: "Tumbaco", label: "Tumbaco" },
  { value: "Los Chillos", label: "Los Chillos" },
  { value: "Sangolquí", label: "Sangolquí" },
  { value: "Guayaquil", label: "Guayaquil" },
  { value: "Samborondón", label: "Samborondón" },
  { value: "Daule", label: "Daule" },
  { value: "Vía a la Costa", label: "Vía a la Costa" },
  { value: "Cuenca", label: "Cuenca" },
  { value: "Manta", label: "Manta" },
  { value: "Portoviejo", label: "Portoviejo" },
  { value: "Salinas", label: "Salinas" },
  { value: "Machala", label: "Machala" },
  { value: "Ambato", label: "Ambato" },
  { value: "Loja", label: "Loja" },
  { value: "Riobamba", label: "Riobamba" },
  { value: "Ibarra", label: "Ibarra" },
  { value: "Santo Domingo", label: "Santo Domingo" },
  { value: "Babahoyo", label: "Babahoyo" },
  { value: "Quevedo", label: "Quevedo" },
  { value: "Esmeraldas", label: "Esmeraldas" },
  { value: "Otra", label: "Otra ciudad" },
];

const OBJETIVO_VIVIENDA_OPCIONES = [
  { value: "aun_no", label: "Aún no sé qué vivienda quiero" },
  { value: "rango", label: "Sí, tengo un rango en mente" },
  { value: "propiedad", label: "Sí, ya tengo una propiedad en mente" },
];

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

function normalizeSelectedProperty(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id =
    raw.id ||
    raw._id ||
    raw.propertyId ||
    raw._normalizedId ||
    null;

  const titulo =
    raw.titulo ||
    raw.nombre ||
    raw.title ||
    raw.name ||
    raw.proyecto ||
    raw._normalizedProjectName ||
    "Propiedad elegida";

  const ciudad =
    raw.ciudad ||
    raw.city ||
    raw.zona ||
    raw.sector ||
    raw.ciudadZona ||
    raw._normalizedCity ||
    "Ubicación pendiente";

  const precioRaw =
    raw.precio ??
    raw.price ??
    raw.valor ??
    raw.listPrice ??
    raw._normalizedPrice ??
    null;

  const precio = Number.isFinite(Number(precioRaw))
    ? Number(precioRaw)
    : null;

  const imagen =
    raw.imagen ||
    raw.image ||
    raw.imageUrl ||
    raw.foto ||
    raw.cover ||
    null;

  return {
    id,
    _id: id,
    propertyId: id,
    titulo,
    nombre: titulo,
    proyecto: titulo,
    ciudad,
    zona: ciudad,
    sector: raw?.sector || ciudad,
    ciudadZona: raw?.ciudadZona || ciudad,
    precio,
    price: precio,
    imagen,
    image: imagen,
    cuotaEstimada:
      raw?.cuotaEstimada ||
      raw?.cuota ||
      raw?.evaluacionHipotecaFutura?.cuotaReferencia ||
      raw?.evaluacionHipotecaHoy?.cuotaReferencia ||
      raw?.evaluacionHipoteca?.cuotaReferencia ||
      null,
    entradaMinima:
      raw?.entradaMinima ??
      raw?.entradaRequerida ??
      raw?.evaluacionEntrada?.entradaRequerida ??
      null,
    descripcion:
      raw?.descripcion ||
      `${titulo} se mantiene como referencia dentro de tu ruta.`,
    source: raw?.source || "journey_recalc",
    selectedAt: raw?.selectedAt || new Date().toISOString(),
    raw,
  };
}

function getSelectedPropertyStatus(property) {
  if (!property) return null;

  const estado = String(property?.estadoCompra || "");

  if (
    property?.evaluacionHipotecaHoy?.viable === true ||
    estado === "top_match"
  ) {
    return "selected_viable_now";
  }

  if (
    property?.evaluacionHipotecaFutura?.viable === true ||
    estado === "entrada_viable_hipoteca_futura_viable"
  ) {
    return "selected_future_viable";
  }

  if (
    estado === "entrada_viable_hipoteca_futura_debil" ||
    estado === "ruta_cercana"
  ) {
    return "selected_near_route";
  }

  return "selected_no_longer_viable";
}

function findMatchedPropertyById(matchedProperties = [], selectedProperty = null) {
  if (!Array.isArray(matchedProperties) || !selectedProperty?.id) return null;

  return (
    matchedProperties.find(
      (p) =>
        String(p?.id) === String(selectedProperty.id) ||
        String(p?._id) === String(selectedProperty.id) ||
        String(p?.propertyId) === String(selectedProperty.id) ||
        String(p?._normalizedId) === String(selectedProperty.id)
    ) || null
  );
}

function getStorageOwnerEmail() {
  try {
    const email = String(getCustomer()?.email || "").trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `$${Math.round(x).toLocaleString("en-US")}`;
}

function buildLegacyOutputFromMatcher(resultado = {}, entradaPayload = {}) {
  const bestMortgage = resultado?.bestMortgage || null;
  const bestOption = resultado?.bestOption || null;
  const bestMortgageFull = bestOption?.mortgage || null;

  const rankedMortgages = Array.isArray(resultado?.rankedMortgages)
    ? resultado.rankedMortgages
    : [];

  const fallbackRanked = rankedMortgages.length ? rankedMortgages[0] : null;

  const effectiveBestMortgage = bestMortgage || fallbackRanked || null;

  const effectiveBestOption =
    bestOption ||
    (fallbackRanked
      ? {
          mortgage: fallbackRanked,
          viable: false,
          score: fallbackRanked.score ?? 0,
          probabilidad: fallbackRanked.probabilidad ?? null,
        }
      : null);

  const bancosTop3 = Array.isArray(resultado?.bancosTop3)
    ? resultado.bancosTop3
    : [];

  const eligibilityProducts = resultado?.eligibilityProducts || {};
  const propertyRecommendationPolicy =
    resultado?.propertyRecommendationPolicy || {};

  const scenarios = Array.isArray(resultado?.scenarios)
    ? resultado.scenarios
    : [];

  const bestSegment =
    bestMortgageFull?.segment ||
    effectiveBestOption?.mortgage?.segment ||
    effectiveBestMortgage?.segment ||
    null;

  const bestRate =
    effectiveBestMortgage?.annualRate ??
    bestMortgageFull?.annualRate ??
    null;

  const bestCuota =
    effectiveBestMortgage?.cuota ??
    bestMortgageFull?.cuota ??
    null;

  const bestMonto =
    effectiveBestMortgage?.montoPrestamo ??
    bestMortgageFull?.montoPrestamo ??
    null;

  const bestPlazo =
    effectiveBestMortgage?.termMonths ??
    bestMortgageFull?.termMonths ??
    null;

  const bestPrecioMax =
    effectiveBestMortgage?.precioMaxVivienda ??
    bestMortgageFull?.precioMaxVivienda ??
    null;

  const bestProb =
    effectiveBestMortgage?.probabilidad ||
    effectiveBestOption?.probabilidad ||
    null;

  const bestScore =
    effectiveBestMortgage?.score ??
    effectiveBestOption?.score ??
    0;

  const capacidadPago = bestCuota != null ? bestCuota * 3 : null;

  const escenariosHL = {
    vis: null,
    vip: null,
    biess: null,
    biess_pref: null,
    biess_std: null,
    comercial: null,
  };

  for (const s of scenarios) {
    const mortgage = s?.mortgage;
    if (!mortgage) continue;

    const item = {
      viable: !!s.viable,
      tasaAnual: mortgage.annualRate ?? null,
      cuota: mortgage.cuota ?? null,
      montoPrestamo: mortgage.montoPrestamo ?? null,
      plazoMeses: mortgage.termMonths ?? null,
      precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
      score: mortgage.score ?? s.score ?? null,
      probabilidad: mortgage.probabilidad ?? s.probabilidad ?? null,
    };

    if (mortgage.id === "VIS") escenariosHL.vis = item;
    if (mortgage.id === "VIP") escenariosHL.vip = item;

    if (
      mortgage.segment === "BIESS" &&
      [
        "BIESS_CREDICASA",
        "BIESS_VIS_VIP",
        "BIESS_MEDIA",
        "BIESS_ALTA",
        "BIESS_LUJO",
      ].includes(mortgage.id)
    ) {
      if (!escenariosHL.biess || s.viable) {
        escenariosHL.biess = item;
      }

      if (mortgage.id === "BIESS_CREDICASA") {
        escenariosHL.biess_pref = item;
      } else {
        escenariosHL.biess_std = item;
      }
    }

    if (mortgage.id === "PRIVATE" || mortgage.segment === "PRIVATE") {
      escenariosHL.comercial = item;
    }
  }

  const rutasViables = scenarios
    .filter((s) => s?.viable)
    .map((s) => ({
      tipo:
        s?.mortgage?.segment === "PRIVATE"
          ? "Privada"
          : s?.mortgage?.segment || s?.mortgage?.id || s?.label || null,
      tasa: s?.annualRate ?? null,
      plazo: s?.mortgage?.termMonths ?? null,
      cuota: s?.cuota ?? null,
      viable: !!s?.viable,
    }));

  const rutaRecomendada = effectiveBestMortgage
    ? {
        tipo:
          bestSegment === "PRIVATE"
            ? "Privada"
            : bestSegment || effectiveBestMortgage?.label || null,
        tasa: bestRate,
        plazo: bestPlazo,
        cuota: bestCuota,
        viable: !!effectiveBestOption?.viable,
      }
    : null;

  const bancoSugerido =
    bancosTop3?.[0]?.banco || effectiveBestMortgage?.label || null;

  const productoSugerido =
    bestSegment === "PRIVATE" ? "Banca privada" : bestSegment || null;

  const sinOferta = !bestMortgage;
  const tieneAlternativa = !!effectiveBestMortgage;

  return {
    ok: true,
    unlocked: true,
    completed: true,
    hasResultado: true,
    score: bestScore,
    probabilidad: bestProb,
    capacidad: capacidadPago,
    capacidadPago,
    cuotaEstimada: bestCuota,
    tasaAnual: bestRate,
    plazoMeses: bestPlazo,
    montoMaximo: bestMonto,
    precioMaxVivienda: bestPrecioMax,
    productoElegido: productoSugerido,
    productoSugerido,
    bancoSugerido,
    bancosTop3,
    bancosProbabilidad: bancosTop3,
    mejorBanco: bancosTop3?.[0] || null,
    bestMortgage,
    bestOption,
    fallbackRecommendation: fallbackRanked,
    tieneAlternativa,
    rankedMortgages,
    recommendationExplanation:
      resultado?.recommendationExplanation || null,
    eligibilityProducts,
    propertyRecommendationPolicy,
    matchedProperties: Array.isArray(resultado?.matchedProperties)
      ? resultado.matchedProperties
      : [],
    housingAlternatives: resultado?.housingAlternatives || null,
    primaryHousingAlternative:
      resultado?.housingAlternatives?.primaryHousingAlternative || null,
    secondaryHousingAlternative:
      resultado?.housingAlternatives?.secondaryHousingAlternative || null,
    escenariosHL,
    rutasViables,
    rutaRecomendada,
    flags: { sinOferta },
    _echo: {
      valorVivienda: entradaPayload?.valorVivienda ?? null,
      entradaDisponible: entradaPayload?.entradaDisponible ?? null,
      capacidadEntradaMensual: entradaPayload?.capacidadEntradaMensual ?? null,
      ingresoNetoMensual: entradaPayload?.ingresoNetoMensual ?? null,
      ciudadCompra: entradaPayload?.ciudadCompra ?? null,
      objetivoViviendaModo: entradaPayload?.objetivoViviendaModo ?? null,
    },
  };
}

function buildDurableSnapshot(resultado = {}, entradaPayload = {}) {
  const legacyOutput = buildLegacyOutputFromMatcher(resultado, entradaPayload);

  const matchedProperties = Array.isArray(resultado?.matchedProperties)
    ? resultado.matchedProperties
    : [];

  const housingAlternatives = resultado?.housingAlternatives || null;
  const primaryHousingAlternative =
    resultado?.primaryHousingAlternative ||
    housingAlternatives?.primaryHousingAlternative ||
    null;
  const secondaryHousingAlternative =
    resultado?.secondaryHousingAlternative ||
    housingAlternatives?.secondaryHousingAlternative ||
    null;

  return {
    ok: true,
    unlocked: true,
    completed: true,
    hasResultado: true,
    engine: SNAPSHOT_ENGINE,
    snapshotVersion: SNAPSHOT_VERSION,
    source: "mobile_app",
    generatedBy: "journey_mobile",
    matcherType: "mortgage_matcher",
    isAppSnapshot: true,
    ...legacyOutput,
    ...resultado,
    matchedProperties,
    housingAlternatives,
    primaryHousingAlternative,
    secondaryHousingAlternative,
    rawMatcherResult: resultado,
    input: entradaPayload,
    perfilInput: entradaPayload,
    __entrada: entradaPayload,
    legacy: legacyOutput,
    output: {
      engine: SNAPSHOT_ENGINE,
      snapshotVersion: SNAPSHOT_VERSION,
      source: "mobile_app",
      matcherType: "mortgage_matcher",
      isAppSnapshot: true,
      ...legacyOutput,
      ...resultado,
      matchedProperties,
      housingAlternatives,
      primaryHousingAlternative,
      secondaryHousingAlternative,
    },
    ts: Date.now(),
  };
}

function ScreenWrap({ children, scrollRef }) {
  return (
    <div
      ref={scrollRef}
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(1200px 800px at 20% 10%, rgba(45,212,191,0.10), transparent 55%)," +
          "radial-gradient(1000px 700px at 80% 10%, rgba(59,130,246,0.10), transparent 60%)," +
          "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 100%)",
        color: "white",
        padding: "92px 22px 170px",
        fontFamily: "system-ui",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const bg =
    tone === "good" ? "rgba(37,211,166,0.12)" : "rgba(255,255,255,0.08)";
  const border =
    tone === "good"
      ? "1px solid rgba(37,211,166,0.30)"
      : "1px solid rgba(255,255,255,0.10)";

  return (
    <span
      style={{
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 999,
        background: bg,
        border,
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({ children, style }) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: 18,
        borderRadius: 24,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {eyebrow ? (
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "rgba(148,163,184,0.92)",
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <div
        style={{
          fontSize: 15,
          fontWeight: 950,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            lineHeight: 1.4,
            color: "rgba(148,163,184,0.90)",
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function StatBox({ label, value, accent = false }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: "rgba(2,6,23,0.18)",
        border: accent
          ? "1px solid rgba(37,211,166,0.24)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.72 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function SliderField({
  label,
  helper,
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (v) => v,
}) {
  const num = Number(value) || 0;

  const handleRange = (e) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    onChange(String(v));
  };

  const handleText = (e) => {
    let raw = String(e.target.value ?? "").replace(/[^\d]/g, "");
    if (!raw) raw = "0";
    let n = Number(raw);
    if (!Number.isFinite(n)) n = 0;
    n = clamp(n, min, max);
    onChange(String(n));
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          opacity: 0.96,
          marginBottom: 8,
          lineHeight: 1.25,
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          opacity: 0.78,
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 900, opacity: 0.98 }}>{format(num)}</span>
        <span>
          {format(min)} – {format(max)}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={handleRange}
          aria-label={label || "slider"}
          style={{
            flex: 1,
            height: 10,
            borderRadius: 999,
            cursor: "pointer",
            touchAction: "pan-y",
          }}
        />

        <input
          type="text"
          value={format(num)}
          onChange={handleText}
          inputMode="numeric"
          pattern="[0-9]*"
          style={{
            width: 112,
            height: 48,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            padding: "0 12px",
            textAlign: "right",
            outline: "none",
            fontWeight: 900,
            fontSize: 14,
          }}
        />
      </div>

      {helper ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.72,
            lineHeight: 1.4,
            color: "rgba(148,163,184,0.92)",
          }}
        >
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options, helper }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          opacity: 0.96,
          marginBottom: 8,
          lineHeight: 1.25,
        }}
      >
        {label}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 54,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          padding: "0 14px",
          outline: "none",
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#0b1020" }}>
            {o.label}
          </option>
        ))}
      </select>

      {helper ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.72,
            lineHeight: 1.4,
            color: "rgba(148,163,184,0.92)",
          }}
        >
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function StepButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 18,
        padding: 14,
        textAlign: "left",
        border: selected
          ? "1px solid rgba(37,211,166,0.65)"
          : "1px solid rgba(255,255,255,0.12)",
        background: selected
          ? "rgba(37,211,166,0.12)"
          : "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 13,
          lineHeight: 1.25,
          opacity: 0.96,
        }}
      >
        {children}
      </span>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: selected
            ? "1px solid rgba(0,0,0,0.5)"
            : "1px solid rgba(255,255,255,0.25)",
          background: selected ? "#052019" : "transparent",
          color: selected ? "#25d3a6" : "rgba(255,255,255,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        ✓
      </span>
    </button>
  );
}

async function apiPost(path, body) {
  const token = getCustomerToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function Journey() {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

  const currentOwnerEmail = getStorageOwnerEmail();

  const existingEnvelope = loadJSON(LS_JOURNEY);
  const snapshotEnvelope = loadJSON(LS_SNAPSHOT);
  const selectedPropertyEnvelope = loadJSON(LS_SELECTED_PROPERTY);

  const existing =
    existingEnvelope?.ownerEmail &&
    existingEnvelope.ownerEmail === currentOwnerEmail
      ? existingEnvelope.data
      : null;

  const snapshotGuardado =
    snapshotEnvelope?.ownerEmail &&
    snapshotEnvelope.ownerEmail === currentOwnerEmail
      ? snapshotEnvelope.data
      : null;

  const selectedPropertyGuardada =
    selectedPropertyEnvelope?.ownerEmail &&
    selectedPropertyEnvelope.ownerEmail === currentOwnerEmail
      ? normalizeSelectedProperty(selectedPropertyEnvelope.data)
      : null;

  const hasResult =
    !!snapshotGuardado?.hasResultado || !!snapshotGuardado?.unlocked;

  const [step, setStep] = useState(
    hasResult ? 3 : existing?.step ? Number(existing.step) : 1
  );

  const [nacionalidad, setNacionalidad] = useState(
    existing?.form?.nacionalidad || "ecuatoriana"
  );
  const [estadoCivil, setEstadoCivil] = useState(
    existing?.form?.estadoCivil || "soltero"
  );
  const [edad, setEdad] = useState(existing?.form?.edad || "30");

  const [tipoIngreso, setTipoIngreso] = useState(
    existing?.form?.tipoIngreso || "Dependiente"
  );
  const [tipoContrato, setTipoContrato] = useState(
    existing?.form?.tipoContrato || "indefinido"
  );
  const [aniosEstabilidad, setAniosEstabilidad] = useState(
    existing?.form?.aniosEstabilidad || "2"
  );
  const [mesesActividad, setMesesActividad] = useState(
    existing?.form?.mesesActividad || "24"
  );
  const [sustentoIndependiente, setSustentoIndependiente] = useState(
    existing?.form?.sustentoIndependiente || "facturacion_ruc"
  );

  const [ingreso, setIngreso] = useState(existing?.form?.ingreso || "1200");
  const [ingresoPareja, setIngresoPareja] = useState(
    existing?.form?.ingresoPareja || "0"
  );
  const [deudas, setDeudas] = useState(existing?.form?.deudas || "300");

  const [afiliadoIESS, setAfiliadoIESS] = useState(
    existing?.form?.afiliadoIESS || "no"
  );
  const [aportesTotales, setAportesTotales] = useState(
    existing?.form?.aportesTotales || "0"
  );
  const [aportesConsecutivos, setAportesConsecutivos] = useState(
    existing?.form?.aportesConsecutivos || "0"
  );

  const [ciudadCompra, setCiudadCompra] = useState(
    existing?.form?.ciudadCompra || ""
  );
  const [objetivoViviendaModo, setObjetivoViviendaModo] = useState(
    existing?.form?.objetivoViviendaModo || "aun_no"
  );
  const [valorVivienda, setValorVivienda] = useState(
    existing?.form?.valorVivienda || ""
  );
  const [entrada, setEntrada] = useState(existing?.form?.entrada || "15000");
  const [capacidadEntradaMensual, setCapacidadEntradaMensual] = useState(
    existing?.form?.capacidadEntradaMensual || "300"
  );
  const [tieneVivienda, setTieneVivienda] = useState(
    existing?.form?.tieneVivienda || "no"
  );
  const [primeraVivienda, setPrimeraVivienda] = useState(
    existing?.form?.primeraVivienda || "sí"
  );
  const [tipoVivienda, setTipoVivienda] = useState(
    existing?.form?.tipoVivienda || "por_estrenar"
  );
  const [horizonteCompra, setHorizonteCompra] = useState(
    existing?.form?.horizonteCompra || ""
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const afiliadoBool = afiliadoIESS === "sí";
  const esParejaFormal =
    estadoCivil === "casado" || estadoCivil === "union_de_hecho";

  const esDependiente = tipoIngreso === "Dependiente";
  const esIndependiente = tipoIngreso === "Independiente";
  const esMixto = tipoIngreso === "Mixto";

  const toNum = (v) => {
    const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const ingresoUsado =
    toNum(ingreso) + (esParejaFormal ? toNum(ingresoPareja) : 0);

  const shouldAskTargetValue = objetivoViviendaModo !== "aun_no";

  const entradaPct = useMemo(() => {
    const v = toNum(valorVivienda);
    const e = toNum(entrada);
    if (!v) return 0;
    return Math.round((e / v) * 100);
  }, [valorVivienda, entrada]);

  const capacidadActual =
    snapshotGuardado?.precioMaxVivienda ||
    snapshotGuardado?.maxCompra ||
    snapshotGuardado?.montoMaximo ||
    null;

  const cuotaActual =
    snapshotGuardado?.cuotaEstimada ||
    snapshotGuardado?.cuotaMensual ||
    snapshotGuardado?.bestMortgage?.cuota ||
    null;

  useEffect(() => {
    const previousJourneyEnvelope = loadJSON(LS_JOURNEY);
    const previousJourney =
      previousJourneyEnvelope?.ownerEmail === currentOwnerEmail
        ? previousJourneyEnvelope.data || {}
        : {};

    const payload = {
      ...previousJourney,
      step,
      updatedAt: new Date().toISOString(),
      form: {
        nacionalidad,
        estadoCivil,
        edad,
        tipoIngreso,
        tipoContrato,
        aniosEstabilidad,
        mesesActividad,
        sustentoIndependiente,
        ingreso,
        ingresoPareja,
        deudas,
        afiliadoIESS,
        aportesTotales,
        aportesConsecutivos,
        ciudadCompra,
        objetivoViviendaModo,
        valorVivienda,
        entrada,
        capacidadEntradaMensual,
        tieneVivienda,
        primeraVivienda,
        tipoVivienda,
        horizonteCompra,
      },
    };

    saveJSON(LS_JOURNEY, {
      ownerEmail: currentOwnerEmail,
      data: payload,
    });
  }, [
    currentOwnerEmail,
    step,
    nacionalidad,
    estadoCivil,
    edad,
    tipoIngreso,
    tipoContrato,
    aniosEstabilidad,
    mesesActividad,
    sustentoIndependiente,
    ingreso,
    ingresoPareja,
    deudas,
    afiliadoIESS,
    aportesTotales,
    aportesConsecutivos,
    ciudadCompra,
    objetivoViviendaModo,
    valorVivienda,
    entrada,
    capacidadEntradaMensual,
    tieneVivienda,
    primeraVivienda,
    tipoVivienda,
    horizonteCompra,
  ]);

  function validate(s) {
    if (s === 1) {
      const e = toNum(edad);
      if (e < 21 || e > 75) return "La edad debe estar entre 21 y 75.";

      if ((esDependiente || esMixto) && toNum(aniosEstabilidad) < 1) {
        return "Para ingresos dependientes pedimos al menos 1 año de estabilidad.";
      }

      if ((esIndependiente || esMixto) && toNum(mesesActividad) < 24) {
        return "Para ingresos independientes normalmente se requieren al menos 2 años de actividad.";
      }

      if ((esIndependiente || esMixto) && !sustentoIndependiente) {
        return "Selecciona cómo sustentas tus ingresos.";
      }

      if ((esDependiente || esMixto) && !tipoContrato) {
        return "Selecciona tu tipo de contrato.";
      }
    }

    if (s === 2) {
      if (ingresoUsado < 450) {
        return "El ingreso considerado debe ser al menos $450.";
      }

      if (toNum(deudas) < 0) {
        return "Las deudas no pueden ser negativas.";
      }

      if (afiliadoBool) {
        if (
          toNum(aportesTotales) < 0 ||
          toNum(aportesConsecutivos) < 0
        ) {
          return "Revisa tus aportes IESS.";
        }
      }
    }

    if (s === 3) {
      if (!ciudadCompra) {
        return "Selecciona la ciudad donde quieres comprar.";
      }

      if (shouldAskTargetValue && toNum(valorVivienda) < 30000) {
        return "El valor mínimo de vivienda que analizamos es $30.000.";
      }

      if (!horizonteCompra) {
        return "Elige en qué plazo te gustaría adquirir tu vivienda.";
      }

      if (shouldAskTargetValue && toNum(entrada) > toNum(valorVivienda)) {
        return "Tu entrada no puede ser mayor al valor de la vivienda.";
      }

      if (toNum(capacidadEntradaMensual) < 0) {
        return "La capacidad mensual para completar la entrada no puede ser negativa.";
      }
    }

    return null;
  }

  const next = () => {
    const e = validate(step);
    if (e) return setErr(e);
    setErr("");
    setStep((x) => Math.min(TOTAL_STEPS, x + 1));
  };

  const back = () => {
    setErr("");
    setStep((x) => Math.max(1, x - 1));
  };

  function buildEntradaPayload() {
    return {
      nacionalidad,
      estadoCivil,
      edad: toNum(edad),
      tipoIngreso,
      tipoContrato,
      aniosEstabilidad: toNum(aniosEstabilidad),
      mesesActividad: toNum(mesesActividad),
      sustentoIndependiente,
      ingresoNetoMensual: toNum(ingreso),
      ingresoPareja: esParejaFormal ? toNum(ingresoPareja) : 0,
      otrasDeudasMensuales: toNum(deudas),
      afiliadoIess: afiliadoBool,
      iessAportesTotales: toNum(aportesTotales),
      iessAportesConsecutivos: toNum(aportesConsecutivos),
      ciudadCompra,
      objetivoViviendaModo,
      valorVivienda:
        shouldAskTargetValue && toNum(valorVivienda) > 0
          ? toNum(valorVivienda)
          : null,
      entradaDisponible: toNum(entrada),
      capacidadEntradaMensual: toNum(capacidadEntradaMensual),
      tieneVivienda: tieneVivienda === "sí",
      primeraVivienda: primeraVivienda === "sí",
      viviendaEstrenar: tipoVivienda === "por_estrenar",
      tipoVivienda,
      tiempoCompra: horizonteCompra || null,
      origen: "journey_mobile",
    };
  }

  async function handleCalcular() {
    if (loading) return;

    const token = getCustomerToken();

    if (!token) {
      navigate("/login?next=/journey", { replace: true });
      return;
    }

    const e = validate(3);
    if (e) return setErr(e);

    setLoading(true);
    setErr("");

    try {
      const entradaPayload = buildEntradaPayload();
      const resultado = await apiPost("/api/mortgage/match", entradaPayload);

      const snapshot = buildDurableSnapshot(resultado, entradaPayload);

      const ownerEmail = getStorageOwnerEmail();

      saveJSON(LS_SNAPSHOT, {
        ownerEmail,
        data: snapshot,
      });

      const previousJourneyEnvelope = loadJSON(LS_JOURNEY);
      const previousJourney =
        previousJourneyEnvelope?.ownerEmail === ownerEmail
          ? previousJourneyEnvelope.data || {}
          : {};

      const previousSelectedEnvelope = loadJSON(LS_SELECTED_PROPERTY);
      const previousSelected =
        previousSelectedEnvelope?.ownerEmail === ownerEmail
          ? normalizeSelectedProperty(previousSelectedEnvelope.data)
          : null;

      const matchedProperties = Array.isArray(snapshot?.matchedProperties)
        ? snapshot.matchedProperties
        : [];

      const reEvaluatedSelectedRaw = findMatchedPropertyById(
        matchedProperties,
        previousSelected
      );

      const reEvaluatedSelected = reEvaluatedSelectedRaw
        ? normalizeSelectedProperty({
            ...reEvaluatedSelectedRaw,
            selectedAt: previousSelected?.selectedAt || new Date().toISOString(),
            source: previousSelected?.source || "journey_recalc",
          })
        : previousSelected;

      const selectedPropertyStatus = reEvaluatedSelected
        ? getSelectedPropertyStatus(reEvaluatedSelectedRaw || reEvaluatedSelected)
        : null;

      if (reEvaluatedSelected) {
        saveJSON(LS_SELECTED_PROPERTY, {
          ownerEmail,
          data: {
            ...reEvaluatedSelected,
            status: selectedPropertyStatus,
            lastEvaluatedAt: new Date().toISOString(),
          },
        });
      }

      saveJSON(LS_JOURNEY, {
        ownerEmail,
        data: {
          ...previousJourney,
          step: 4,
          updatedAt: new Date().toISOString(),
          form: {
            nacionalidad,
            estadoCivil,
            edad,
            tipoIngreso,
            tipoContrato,
            aniosEstabilidad,
            mesesActividad,
            sustentoIndependiente,
            ingreso,
            ingresoPareja,
            deudas,
            afiliadoIESS,
            aportesTotales,
            aportesConsecutivos,
            ciudadCompra,
            objetivoViviendaModo,
            valorVivienda,
            entrada,
            capacidadEntradaMensual,
            tieneVivienda,
            primeraVivienda,
            tipoVivienda,
            horizonteCompra,
          },
          resultado: snapshot,
          propiedadElegida: !!reEvaluatedSelected,
          propiedadId: reEvaluatedSelected?.id || previousJourney?.propiedadId || null,
          propiedadSeleccionada: reEvaluatedSelected
            ? {
                ...reEvaluatedSelected,
                status: selectedPropertyStatus,
                lastEvaluatedAt: new Date().toISOString(),
              }
            : previousJourney?.propiedadSeleccionada || null,
          selectedPropertyStatus,
        },
      });

      navigate("/", { replace: true });
    } catch (ex) {
      console.error(ex);
      setErr(ex?.message || "No se pudo calcular tu resultado ahora.");
    } finally {
      setLoading(false);
    }
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <ScreenWrap scrollRef={scrollerRef}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 850,
              color: "rgba(148,163,184,0.95)",
              marginBottom: 10,
            }}
          >
            {hasResult ? "Mi capacidad" : "Precalificador HabitaLibre"}
          </div>

          <div
            style={{
              fontSize: 32,
              lineHeight: 1.02,
              fontWeight: 980,
              letterSpacing: -1,
              color: "rgba(226,232,240,0.98)",
              maxWidth: 320,
            }}
          >
            {hasResult ? "Tu capacidad de compra" : "Completa tu perfil"}
          </div>

          <div
            style={{
              marginTop: 14,
              maxWidth: 340,
              fontSize: 16,
              lineHeight: 1.4,
              color: "rgba(148,163,184,0.95)",
            }}
          >
            {hasResult
              ? "Ajusta tu escenario y actualiza tu cálculo para ver qué vivienda podrías comprar."
              : "Te toma menos de 2 minutos. Te damos capacidad estimada, cuota y ruta sugerida."}
          </div>
        </div>

        {!hasResult ? (
          <Pill>
            Paso {step}/{TOTAL_STEPS}
          </Pill>
        ) : (
          <Pill>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Edit3 size={12} strokeWidth={2.2} />
              Editable
            </span>
          </Pill>
        )}
      </div>

      {!hasResult ? (
        <div
          style={{
            marginTop: 16,
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background: "#25d3a6",
              transition: "width 200ms ease",
            }}
          />
        </div>
      ) : null}

      {hasResult ? (
        <SectionCard
          style={{
            background: "rgba(37,211,166,0.10)",
            border: "1px solid rgba(37,211,166,0.22)",
          }}
        >
          <SectionTitle
            title="Tu escenario actual"
            subtitle="Un resumen rápido de lo que hoy podría sostener tu perfil."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <StatBox
              label="Vivienda aprox."
              value={capacidadActual ? money(capacidadActual) : "—"}
            />
            <StatBox
              label="Cuota estimada"
              value={cuotaActual ? money(cuotaActual) : "—"}
              accent
            />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard>
        {step === 1 && (
          <>
            <SectionTitle
              eyebrow="Paso 1"
              title="Tu perfil base"
              subtitle="Esto nos ayuda a entender qué tan sólido es tu perfil para aplicar."
            />

            <SelectField
              label="Nacionalidad"
              value={nacionalidad}
              onChange={setNacionalidad}
              options={[
                { value: "ecuatoriana", label: "Ecuatoriana" },
                { value: "otra", label: "Otra nacionalidad" },
              ]}
            />

            <SelectField
              label="Estado civil"
              helper="Si estás casad@ o en unión de hecho, podremos considerar el ingreso de tu pareja."
              value={estadoCivil}
              onChange={setEstadoCivil}
              options={[
                { value: "soltero", label: "Soltero/a" },
                { value: "casado", label: "Casado/a" },
                { value: "union_de_hecho", label: "Unión de hecho" },
                { value: "divorciado", label: "Divorciado/a" },
                { value: "viudo", label: "Viudo/a" },
              ]}
            />

            <SliderField
              label="Edad"
              min={21}
              max={75}
              step={1}
              value={edad}
              onChange={setEdad}
              format={(v) => `${v} años`}
            />

            <SelectField
              label="Tipo de ingreso"
              value={tipoIngreso}
              onChange={setTipoIngreso}
              options={[
                { value: "Dependiente", label: "Relación de dependencia" },
                { value: "Independiente", label: "Independiente / actividad propia" },
                { value: "Mixto", label: "Mixto" },
              ]}
            />

            {(esDependiente || esMixto) && (
              <>
                <SectionTitle
                  eyebrow="Ingresos dependientes"
                  title="Tu estabilidad laboral"
                />

                <SelectField
                  label="Tipo de contrato"
                  value={tipoContrato}
                  onChange={setTipoContrato}
                  options={[
                    { value: "indefinido", label: "Indefinido" },
                    { value: "temporal", label: "Temporal" },
                    { value: "servicios", label: "Servicios profesionales" },
                  ]}
                  helper="Algunos bancos son más favorables con contratos indefinidos."
                />

                <SliderField
                  label="Años en tu trabajo actual"
                  helper="Para ingresos dependientes normalmente se pide mínimo 1 año."
                  min={0}
                  max={40}
                  step={1}
                  value={aniosEstabilidad}
                  onChange={setAniosEstabilidad}
                  format={(v) => `${v} años`}
                />
              </>
            )}

            {(esIndependiente || esMixto) && (
              <>
                <SectionTitle
                  eyebrow="Ingresos independientes"
                  title="Tu trayectoria económica"
                />

                <SliderField
                  label="Meses en tu actividad económica actual"
                  helper="Para ingresos independientes normalmente se piden al menos 24 meses."
                  min={0}
                  max={240}
                  step={1}
                  value={mesesActividad}
                  onChange={setMesesActividad}
                  format={(v) => `${v} meses`}
                />

                <SelectField
                  label="¿Cómo sustentas tus ingresos?"
                  helper="Esto puede afectar la facilidad de aprobación."
                  value={sustentoIndependiente}
                  onChange={setSustentoIndependiente}
                  options={[
                    {
                      value: "facturacion_ruc",
                      label: "Facturación con RUC",
                    },
                    {
                      value: "movimientos_bancarizados",
                      label: "Ingresos bancarizados",
                    },
                    {
                      value: "declaracion_sri",
                      label: "Declaración SRI",
                    },
                    {
                      value: "mixto",
                      label: "Mixto",
                    },
                    {
                      value: "informal",
                      label: "No los puedo sustentar bien",
                    },
                  ]}
                />
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle
              eyebrow="Paso 2"
              title="Tu capacidad mensual"
              subtitle="Aquí definimos cuánto podrías sostener de forma sana cada mes."
            />

            <SliderField
              label="Tu ingreso neto mensual"
              min={450}
              max={15000}
              step={50}
              value={ingreso}
              onChange={setIngreso}
              format={(v) => money(v)}
            />

            {esParejaFormal && (
              <SliderField
                label="Ingreso neto mensual de tu pareja"
                min={0}
                max={15000}
                step={50}
                value={ingresoPareja}
                onChange={setIngresoPareja}
                format={(v) => money(v)}
              />
            )}

            <SliderField
              label="Otras deudas mensuales"
              min={0}
              max={5000}
              step={50}
              value={deudas}
              onChange={setDeudas}
              format={(v) => money(v)}
            />

            <SelectField
              label="¿Estás afiliado al IESS?"
              value={afiliadoIESS}
              onChange={setAfiliadoIESS}
              options={[
                { value: "no", label: "No" },
                { value: "sí", label: "Sí" },
              ]}
            />

            {afiliadoBool && (
              <>
                <SectionTitle
                  eyebrow="BIESS"
                  title="Tus aportes"
                  subtitle="Esto solo aplica si luego quieres evaluar una ruta BIESS."
                />

                <SliderField
                  label="Aportes IESS totales"
                  helper="Para BIESS suelen requerirse al menos 36 aportes totales."
                  min={0}
                  max={600}
                  step={1}
                  value={aportesTotales}
                  onChange={setAportesTotales}
                  format={(v) => `${v} meses`}
                />

                <SliderField
                  label="Aportes IESS consecutivos"
                  helper="Suelen pedir mínimo 13 aportes consecutivos."
                  min={0}
                  max={600}
                  step={1}
                  value={aportesConsecutivos}
                  onChange={setAportesConsecutivos}
                  format={(v) => `${v} meses`}
                />
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle
              eyebrow="Paso 3"
              title="Tu punto de partida"
              subtitle="Primero define tu entrada, tu ciudad y si ya tienes una vivienda en mente."
            />

            <SelectField
              label="Ciudad donde quieres comprar"
              value={ciudadCompra}
              onChange={setCiudadCompra}
              options={CIUDADES_COMPRA}
              helper="Esto nos ayuda a darte una guía más útil según tu mercado objetivo."
            />

            <SelectField
              label="¿Ya tienes una vivienda o un rango en mente?"
              value={objetivoViviendaModo}
              onChange={setObjetivoViviendaModo}
              options={OBJETIVO_VIVIENDA_OPCIONES}
              helper="Si todavía no sabes el valor, no pasa nada. Primero calculamos qué sí podrías comprar."
            />

            {shouldAskTargetValue ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <StatBox label="Valor objetivo" value={money(valorVivienda)} />
                  <StatBox
                    label="Entrada aprox."
                    value={`${money(entrada)} (${entradaPct}%)`}
                    accent
                  />
                </div>

                <SliderField
                  label={
                    objetivoViviendaModo === "propiedad"
                      ? "Valor aproximado de la propiedad (USD)"
                      : "Valor aproximado del rango que te interesa (USD)"
                  }
                  min={30000}
                  max={500000}
                  step={1000}
                  value={valorVivienda || "30000"}
                  onChange={setValorVivienda}
                  format={(v) => money(v)}
                />
              </>
            ) : null}

            <SliderField
              label="Entrada disponible (USD)"
              helper="Incluye ahorros, cesantía, fondos de reserva u otros."
              min={0}
              max={500000}
              step={500}
              value={entrada}
              onChange={setEntrada}
              format={(v) => money(v)}
            />

            <SliderField
              label="¿Cuánto podrías pagar al mes para completar la entrada?"
              helper="Útil sobre todo en proyectos en construcción, donde puedes completar la entrada durante la obra."
              min={0}
              max={2000}
              step={50}
              value={capacidadEntradaMensual}
              onChange={setCapacidadEntradaMensual}
              format={(v) => money(v)}
            />

            <SectionTitle
              eyebrow="Condiciones"
              title="Tu situación actual"
            />

            <SelectField
              label="¿Tienes actualmente una vivienda?"
              value={tieneVivienda}
              onChange={setTieneVivienda}
              options={[
                { value: "no", label: "No" },
                { value: "sí", label: "Sí" },
              ]}
            />

            <SelectField
              label="¿Es tu primera vivienda?"
              value={primeraVivienda}
              onChange={setPrimeraVivienda}
              options={[
                { value: "sí", label: "Sí" },
                { value: "no", label: "No" },
              ]}
            />

            <SelectField
              label="Estado de la vivienda"
              value={tipoVivienda}
              onChange={setTipoVivienda}
              options={[
                {
                  value: "por_estrenar",
                  label: "Por estrenar / proyecto nuevo",
                },
                { value: "usada", label: "Usada / segunda mano" },
              ]}
            />

            <SectionTitle
              eyebrow="Horizonte"
              title="¿En qué plazo te gustaría adquirir tu vivienda?"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {HORIZONTE_OPCIONES.map((opt) => {
                const selected = horizonteCompra === opt.value;
                return (
                  <StepButton
                    key={opt.value}
                    selected={selected}
                    onClick={() => setHorizonteCompra(opt.value)}
                  >
                    {opt.label}
                  </StepButton>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && !hasResult && (
          <>
            <SectionTitle
              eyebrow="Último paso"
              title="Listo para ver tu resultado"
              subtitle="Vamos a estimar tu capacidad, tu cuota y tu mejor ruta posible."
            />

            <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
              Ciudad objetivo:{" "}
              <strong style={{ color: "white" }}>{ciudadCompra || "—"}</strong>
            </div>

            {shouldAskTargetValue ? (
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
                Monto referencial a analizar:{" "}
                <strong style={{ color: "white" }}>
                  {money(toNum(valorVivienda) - toNum(entrada))}
                </strong>
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
                Vamos a estimar primero tu capacidad máxima de compra con tu perfil actual.
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
              Capacidad mensual para completar entrada:{" "}
              <strong style={{ color: "white" }}>
                {money(toNum(capacidadEntradaMensual))}
              </strong>
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                opacity: 0.72,
                lineHeight: 1.4,
                color: "rgba(148,163,184,0.92)",
              }}
            >
              Las precalificaciones son estimaciones referenciales. No constituyen aprobación ni oferta formal.
            </div>
          </>
        )}

        {err ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 16,
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.30)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 28,
            marginBottom: 18,
            display: "flex",
            gap: 10,
            position: "relative",
            zIndex: 2,
          }}
        >
          {step > 1 ? (
            <button
              onClick={back}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              Atrás
            </button>
          ) : null}

          {step < 3 ? (
            <button
              onClick={next}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 18,
                border: "none",
                background: "#25d3a6",
                color: "#052019",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleCalcular}
              disabled={loading}
              style={{
                flex: 1,
                minHeight: 58,
                padding: "16px 18px",
                borderRadius: 20,
                border: "none",
                background: "#25d3a6",
                color: "#052019",
                fontWeight: 950,
                fontSize: 16,
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 12px 28px rgba(37,211,166,0.18)",
              }}
            >
              {loading
                ? "Analizando…"
                : hasResult
                ? "Actualizar"
                : getCustomerToken()
                ? "Ver resultados"
                : "Entrar para ver resultados"}
            </button>
          )}
        </div>
      </SectionCard>

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          opacity: 0.6,
          lineHeight: 1.4,
          color: "rgba(148,163,184,0.90)",
        }}
      >
        {getCustomerToken()
          ? "Sesión activa: tu resultado se guardará en tu cuenta."
          : "Tip: crea una cuenta para guardar tu progreso y retomar tu camino."}
      </div>

      <div style={{ height: 90 }} />
    </ScreenWrap>
  );
}