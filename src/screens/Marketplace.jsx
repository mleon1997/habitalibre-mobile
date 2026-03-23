import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { moneyUSD } from "../lib/money";
import PropertyCard from "../components/PropertyCard.jsx";
import mockProperties from "../data/mockProperties.js";
import { resolveHousingRecommendation } from "../lib/recommendationResolver.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

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

function pick(snapshot, keys) {
  if (!snapshot) return null;
  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }
  return null;
}

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function toNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function normalizeText(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function cityMatchesProperty(property, zona) {
  if (!zona) return true;

  const target = normalizeText(zona);

  const fields = [
    property?.zona,
    property?.ciudad,
    property?.city,
    property?.ciudadZona,
    property?.sector,
    property?._normalizedCity,
    property?._normalizedSector,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return fields.some((f) => f.includes(target) || target.includes(f));
}

function probTone(label = "") {
  const x = String(label).toLowerCase();
  if (x.includes("alta")) return "green";
  if (x.includes("media")) return "neutral";
  return "neutral";
}

function formatRate(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${(x <= 1 ? x * 100 : x).toFixed(2)}%`;
}

function formatYearsFromMonths(v) {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return "—";
  const years = Math.round(x / 12);
  return `${years} años`;
}

function normalizeMatchedProperties(snapshot) {
  const direct =
    snapshot?.matchedProperties ??
    snapshot?.output?.matchedProperties ??
    snapshot?.marketplace?.items ??
    snapshot?.output?.marketplace?.items ??
    snapshot?.propiedades ??
    snapshot?.output?.propiedades ??
    [];

  if (Array.isArray(direct)) return direct;
  return [];
}

function getScenarioForBank(bank, snapshot) {
  const escenariosHL = pick(snapshot, ["escenariosHL", "escenarios"]) || {};
  const tipo = String(bank?.tipoProducto || "").toUpperCase();

  if (tipo === "VIS") return escenariosHL?.vis || null;
  if (tipo === "VIP") return escenariosHL?.vip || null;
  if (tipo === "BIESS") {
    return (
      escenariosHL?.biess ||
      escenariosHL?.biess_pref ||
      escenariosHL?.biess_std ||
      null
    );
  }
  if (
    tipo === "NORMAL" ||
    tipo === "PRIVADA" ||
    tipo === "COMERCIAL" ||
    tipo === "PRIVATE"
  ) {
    return escenariosHL?.comercial || null;
  }

  return null;
}

function getBankReasons(bank, snapshot, scenario, bestMortgage) {
  const reasons = [];

  if (bank?.probLabel) {
    reasons.push(`Probabilidad ${String(bank.probLabel).toLowerCase()}`);
  }

  const cuota =
    bank?.cuota ??
    scenario?.cuota ??
    bestMortgage?.cuota ??
    pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]);

  if (cuota != null && Number(cuota) > 0) {
    reasons.push(`Cuota estimada ${moneyUSD(cuota)}`);
  }

  if (bank?.tipoProducto) {
    reasons.push(`Ruta ${String(bank.tipoProducto).toLowerCase()}`);
  }

  const precioMax =
    scenario?.precioMaxVivienda ??
    bestMortgage?.precioMaxVivienda ??
    pick(snapshot, [
      "propertyPrice",
      "precioMaxVivienda",
      "precioMax",
      "valorMaxVivienda",
      "maxHomePrice",
      "homePrice",
    ]);

  if (precioMax != null && Number(precioMax) > 0) {
    reasons.push("Compatible con tu perfil actual");
  }

  return reasons.slice(0, 3);
}

function getLegacyRecommendedProductId(snapshot) {
  const ruta = pick(snapshot, ["rutaRecomendada"]);
  const producto =
    ruta?.tipo ||
    pick(snapshot, ["productoElegido", "productoSugerido"]) ||
    "";

  const s = String(producto).toLowerCase();

  if (s.includes("vis")) return "VIS";
  if (s.includes("vip")) return "VIP";
  if (s.includes("biess")) return "BIESS_CREDICASA";
  if (s.includes("priv") || s.includes("comercial") || s.includes("normal")) {
    return "PRIVATE";
  }

  return null;
}

function buildEligibilityFallback(snapshot) {
  const escenariosHL = pick(snapshot, ["escenariosHL", "escenarios"]) || {};

  const vis = escenariosHL?.vis || null;
  const vip = escenariosHL?.vip || null;
  const biess =
    escenariosHL?.biess ||
    escenariosHL?.biess_pref ||
    escenariosHL?.biess_std ||
    null;
  const privada = escenariosHL?.comercial || null;

  return {
    VIS: {
      viable: !!vis?.viable,
      priceMax: Number.isFinite(vis?.precioMaxVivienda)
        ? vis.precioMaxVivienda
        : 0,
      requiresFirstHome: true,
      requiresNewConstruction: true,
      requiresMiduviQualifiedProject: false,
    },
    VIP: {
      viable: !!vip?.viable,
      priceMax: Number.isFinite(vip?.precioMaxVivienda)
        ? vip.precioMaxVivienda
        : 0,
      requiresFirstHome: true,
      requiresNewConstruction: true,
      requiresMiduviQualifiedProject: false,
    },
    BIESS_CREDICASA: {
      viable: !!biess?.viable,
      priceMax: Number.isFinite(biess?.precioMaxVivienda)
        ? biess.precioMaxVivienda
        : 0,
      requiresFirstHome: false,
      requiresNewConstruction: false,
      requiresMiduviQualifiedProject: false,
    },
    PRIVATE: {
      viable: !!privada?.viable,
      priceMax: Number.isFinite(privada?.precioMaxVivienda)
        ? privada.precioMaxVivienda
        : 0,
      requiresFirstHome: false,
      requiresNewConstruction: false,
      requiresMiduviQualifiedProject: false,
    },
  };
}

function getPropertyMatchProducts(
  property,
  eligibilityProducts,
  allowedProductIds = []
) {
  const profile = property?.mortgageProfile;
  const ids = Array.isArray(profile?.productIds) ? profile.productIds : [];
  const allowedSet = new Set(allowedProductIds);

  return ids.filter((id) => {
    if (allowedSet.size && !allowedSet.has(id)) return false;

    const ep = eligibilityProducts?.[id];
    if (!ep?.viable) return false;

    if (
      typeof ep.priceMax === "number" &&
      ep.priceMax > 0 &&
      property.precio > ep.priceMax
    ) {
      return false;
    }

    if (profile?.requiresNewConstruction && !property.proyectoNuevo) {
      return false;
    }

    if (profile?.requiresFirstHome && !ep.requiresFirstHome) {
      return false;
    }

    if (
      profile?.requiresMiduviQualifiedProject &&
      !ep.requiresMiduviQualifiedProject
    ) {
      return false;
    }

    return true;
  });
}

function getPropertyProgramLabel(productId) {
  const map = {
    VIS: "VIS",
    VIP: "VIP",
    VIS_II: "VIS II",
    BIESS_CREDICASA: "BIESS",
    BIESS_VIS_VIP: "BIESS",
    BIESS_MEDIA: "BIESS",
    BIESS_ALTA: "BIESS",
    BIESS_LUJO: "BIESS",
    PRIVATE: "Privada",
  };
  return map[productId] || productId;
}

function deriveMatchedProductsFromEngine(property) {
  const explicit = Array.isArray(property?.matchedProducts)
    ? property.matchedProducts
    : [];
  if (explicit.length) return explicit;

  const selectedId =
    property?.mortgageSelected?.mortgageId ||
    property?.mortgageSelected?.id ||
    property?.mortgageSelected?.productId ||
    property?.evaluacionHipotecaFutura?.mortgageSelected?.mortgageId ||
    property?.evaluacionHipotecaFutura?.productoId ||
    property?.evaluacionHipotecaHoy?.productoId ||
    property?.evaluacionHipoteca?.productoId ||
    null;

  return selectedId ? [selectedId] : [];
}

const UI = {
  bg: "linear-gradient(180deg, #071024 0%, #0b1a35 100%)",
  card: "rgba(255,255,255,0.06)",
  card2: "rgba(0,0,0,0.18)",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  green: "#25d3a6",
  greenBg: "rgba(37,211,166,0.10)",
  greenBorder: "rgba(37,211,166,0.25)",
  amberBg: "rgba(245,158,11,0.10)",
  amberBorder: "rgba(245,158,11,0.24)",
  shadow: "0 10px 30px rgba(0,0,0,0.22)",
  shadowSoft: "0 10px 30px rgba(0,0,0,0.18)",
};

function Pill({ children, onClick, tone = "neutral" }) {
  const isClickable = !!onClick;
  const bg =
    tone === "green"
      ? "rgba(37,211,166,0.14)"
      : tone === "amber"
      ? "rgba(245,158,11,0.14)"
      : "rgba(255,255,255,0.08)";
  const br =
    tone === "green"
      ? "rgba(37,211,166,0.28)"
      : tone === "amber"
      ? "rgba(245,158,11,0.28)"
      : "rgba(255,255,255,0.10)";

  return (
    <span
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${br}`,
        cursor: isClickable ? "pointer" : "default",
        userSelect: "none",
        fontWeight: 900,
        opacity: isClickable ? 1 : 0.95,
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 14,
        border: "none",
        background: UI.green,
        fontWeight: 900,
        color: "#052019",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ marginTop: 14, fontWeight: 900, fontSize: 13, opacity: 0.9 }}>
      {children}
    </div>
  );
}

function Segment({ value, onChange, options }) {
  return (
    <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${
                active ? UI.greenBorder : "rgba(255,255,255,0.14)"
              }`,
              background: active
                ? "rgba(37,211,166,0.14)"
                : "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              boxShadow: active ? UI.shadowSoft : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function hasResult(snapshot) {
  if (!snapshot) return false;

  const bestMortgage = pick(snapshot, ["bestMortgage"]);
  const banks = pick(snapshot, ["bancosTop3"]);
  const cuota = pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]);
  const precioMax = pick(snapshot, [
    "propertyPrice",
    "precioMaxVivienda",
    "precioMax",
    "valorMaxVivienda",
    "maxHomePrice",
    "homePrice",
  ]);
  const score = pick(snapshot, ["score"]);
  const capacidad = pick(snapshot, [
    "capacidad",
    "capacidadPago",
    "loanAmount",
    "maxLoanAmount",
    "financedAmount",
  ]);
  const bancoSugerido = pick(snapshot, ["bancoSugerido"]);
  const productoSugerido = pick(snapshot, ["productoSugerido"]);
  const matchedProperties = normalizeMatchedProperties(snapshot);
  const housingAlternatives =
    snapshot?.housingAlternatives ?? snapshot?.output?.housingAlternatives;

  return (
    snapshot?.unlocked === true ||
    snapshot?.output?.unlocked === true ||
    !!bestMortgage ||
    !!bancoSugerido ||
    !!productoSugerido ||
    !!housingAlternatives ||
    (Array.isArray(banks) && banks.length > 0) ||
    (Array.isArray(matchedProperties) && matchedProperties.length > 0) ||
    cuota != null ||
    precioMax != null ||
    score != null ||
    capacidad != null
  );
}

function LockedMarketplace({ onGoSimular }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 22,
          background: UI.greenBg,
          border: `1px solid ${UI.greenBorder}`,
          boxShadow: UI.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
            🔒 Match bloqueado
          </div>
          <Pill tone="green">2 minutos</Pill>
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
          Completa tu simulación para ver tu match real
        </div>

        <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.35, fontSize: 13 }}>
          HabitaLibre solo muestra propiedades e hipotecas que realmente puedes comprar
          según tu capacidad y entrada.
        </div>

        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onGoSimular}>Ver mi resultado (2 min)</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ZoneChips({ zona, setZona }) {
  const zones = ["Quito", "Cumbayá", "Tumbaco"];
  return (
    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
      {zones.map((z) => {
        const active = z === zona;
        return (
          <button
            key={z}
            onClick={() => setZona(z)}
            style={{
              padding: "10px 12px",
              borderRadius: 999,
              border: `1px solid ${
                active ? UI.greenBorder : "rgba(255,255,255,0.14)"
              }`,
              background: active
                ? "rgba(37,211,166,0.14)"
                : "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              boxShadow: active ? UI.shadowSoft : "none",
            }}
          >
            {z}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ title, subtitle, cta, onClick }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 22,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${UI.border}`,
        boxShadow: UI.shadowSoft,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.35 }}>
        {subtitle}
      </div>
      {cta ? (
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onClick}>{cta}</PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState(() => loadJSON(LS_SNAPSHOT));
  const [journey, setJourney] = useState(() => loadJSON(LS_JOURNEY));

  const [tab, setTab] = useState("props");
  const [zona, setZona] = useState("Quito");
  const [propertyMode, setPropertyMode] = useState("strict");

  useEffect(() => {
    const snap = loadJSON(LS_SNAPSHOT);
    const j = loadJSON(LS_JOURNEY);

    setSnapshot(snap);
    setJourney(j);

    console.log("[HL][Marketplace] snapshot =", snap);
    console.log("[HL][Marketplace] journey =", j);
  }, []);

  const unlocked = useMemo(() => hasResult(snapshot), [snapshot]);

  const uiRecommendation = useMemo(() => {
    return resolveHousingRecommendation(snapshot || {});
  }, [snapshot]);

  const recommendationType = uiRecommendation?.type || "no_clear_route";
  const goalValue = uiRecommendation?.goalValue ?? null;

  const bestMortgage = pick(snapshot, ["bestMortgage"]) || null;
  const bancosTop3 = pick(snapshot, ["bancosTop3"]) || [];
  const bestRoute = pick(snapshot, ["rutaRecomendada"]) || null;
  const matchedProperties = normalizeMatchedProperties(snapshot);

  const eligibilityProducts =
    pick(snapshot, ["eligibilityProducts"]) || buildEligibilityFallback(snapshot);

  const propertyRecommendationPolicy =
    pick(snapshot, ["propertyRecommendationPolicy"]) || null;

  const futureViableProperty = useMemo(() => {
    if (!Array.isArray(matchedProperties) || !matchedProperties.length) return null;

    return (
      matchedProperties.find(
        (p) => String(p?.estadoCompra || "") === "entrada_viable_hipoteca_futura_viable"
      ) ||
      matchedProperties.find((p) => p?.evaluacionHipotecaFutura?.viable === true) ||
      null
    );
  }, [matchedProperties]);

  const futureMortgageSelected =
    futureViableProperty?.evaluacionHipotecaFutura?.mortgageSelected || null;

  const futureProductLabel =
    uiRecommendation?.futureRoute?.productName ||
    futureViableProperty?.evaluacionHipotecaFutura?.productoSugerido ||
    futureMortgageSelected?.label ||
    futureMortgageSelected?.name ||
    "Ruta futura viable";

  const futureProbLabel =
    uiRecommendation?.futureRoute?.raw?.probabilidad ||
    futureViableProperty?.evaluacionHipotecaFutura?.probabilidad ||
    "Alta";

  const futureRate =
    uiRecommendation?.futureRoute?.raw?.annualRate ??
    uiRecommendation?.futureRoute?.raw?.rate ??
    futureMortgageSelected?.annualRate ??
    futureMortgageSelected?.tasaAnual ??
    futureViableProperty?.evaluacionHipotecaFutura?.tasaAnual ??
    null;

  const futureCuota =
    uiRecommendation?.safeNumbers?.futureMonthlyPayment ??
    futureViableProperty?.evaluacionHipotecaFutura?.cuotaReferencia ??
    null;

  const futureMonto =
    futureViableProperty?.evaluacionHipotecaFutura?.montoHipotecaProyectado ?? null;

  const futurePlazoMeses =
    futureMortgageSelected?.plazoMeses ??
    futureMortgageSelected?.termMonths ??
    pick(snapshot, ["plazoMeses", "termMonths", "loanTermMonths"]) ??
    null;

  const futureMesesConstruccion =
    uiRecommendation?.safeNumbers?.futureMonths ??
    futureViableProperty?.evaluacionEntrada?.mesesConstruccionRestantes ??
    null;

  const futurePropertyPrice =
    uiRecommendation?.safeNumbers?.futureProjectedValue ??
    futureViableProperty?.precio ??
    futureViableProperty?.price ??
    null;

  const banks = Array.isArray(bancosTop3) ? bancosTop3 : [];

  const recommendedBank = banks.length
    ? banks[0]
    : pick(snapshot, ["bancoSugerido"])
    ? {
        banco: pick(snapshot, ["bancoSugerido"]),
        tipoProducto: pick(snapshot, ["productoSugerido"]) || "BIESS",
        cuota:
          bestMortgage?.cuota ??
          pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]) ??
          null,
        tasaAnual: pick(snapshot, ["tasaAnual", "annualRate", "interestRate"]),
        montoPrestamo: pick(snapshot, [
          "loanAmount",
          "maxLoanAmount",
          "financedAmount",
          "montoMaximo",
          "montoPrestamoMax",
          "prestamoMax",
        ]),
        probLabel: pick(snapshot, ["probabilidad"]) || null,
      }
    : null;

  const alternativeBanks = banks.slice(1, 3);

  const recommendedScenario = recommendedBank
    ? getScenarioForBank(recommendedBank, snapshot)
    : null;

  const immediateRate =
    uiRecommendation?.immediate?.rate ??
    recommendedBank?.tasaAnual ??
    recommendedScenario?.tasaAnual ??
    bestMortgage?.annualRate ??
    pick(snapshot, ["tasaAnual", "annualRate", "interestRate"]);

  const immediateCuota =
    uiRecommendation?.immediate?.monthlyPayment ??
    recommendedBank?.cuota ??
    recommendedScenario?.cuota ??
    bestMortgage?.cuota ??
    pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]);

  const immediateMonto =
    uiRecommendation?.immediate?.loanAmount ??
    recommendedBank?.montoPrestamo ??
    recommendedScenario?.montoPrestamo ??
    bestMortgage?.montoPrestamo ??
    pick(snapshot, [
      "loanAmount",
      "maxLoanAmount",
      "financedAmount",
      "montoMaximo",
      "montoPrestamoMax",
      "prestamoMax",
    ]);

  const immediatePlazo =
    uiRecommendation?.immediate?.termMonths ??
    recommendedBank?.plazoMeses ??
    recommendedScenario?.plazoMeses ??
    bestMortgage?.plazoMeses ??
    pick(snapshot, ["plazoMeses", "termMonths", "loanTermMonths"]);

  const immediateProbLabel =
    recommendedBank?.probLabel ||
    bestMortgage?.probabilidad ||
    pick(snapshot, ["probabilidad"]) ||
    "";

  const useImmediateAsPrimary = recommendationType === "immediate";
  const useFutureAsPrimary = recommendationType === "future_route";
  const useInventoryAsPrimary = recommendationType === "inventory_fallback";

  const inventoryFallbackProperty = uiRecommendation?.inventoryFallback?.property || null;

  const productoElegido = useImmediateAsPrimary
    ? (
        uiRecommendation?.immediate?.productName ||
        uiRecommendation?.immediate?.bankName ||
        bestMortgage?.label ||
        pick(snapshot, ["bancoSugerido"]) ||
        bestRoute?.tipo ||
        pick(snapshot, ["productoElegido", "productoSugerido"]) ||
        "Hipoteca viable hoy"
      )
    : useFutureAsPrimary
    ? futureProductLabel
    : useInventoryAsPrimary
    ? (
        inventoryFallbackProperty?._normalizedProjectName ||
        inventoryFallbackProperty?.nombre ||
        inventoryFallbackProperty?.title ||
        inventoryFallbackProperty?.proyecto ||
        "Alternativa cercana"
      )
    : "Sin ruta clara hoy";

  const precioMaxVivienda = useImmediateAsPrimary
    ? (
        uiRecommendation?.immediate?.priceMax ??
        bestMortgage?.precioMaxVivienda ??
        pick(snapshot, [
          "propertyPrice",
          "precioMaxVivienda",
          "precioMax",
          "valorMaxVivienda",
          "maxHomePrice",
          "homePrice",
        ])
      )
    : useFutureAsPrimary
    ? futurePropertyPrice
    : useInventoryAsPrimary
    ? (
        inventoryFallbackProperty?._normalizedPrice ??
        inventoryFallbackProperty?.precio ??
        inventoryFallbackProperty?.price ??
        null
      )
    : null;

  const cuotaEstimada = useImmediateAsPrimary
    ? (
        uiRecommendation?.immediate?.monthlyPayment ??
        bestMortgage?.cuota ??
        pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]) ??
        null
      )
    : useFutureAsPrimary
    ? futureCuota
    : null;

  const mainRate = useImmediateAsPrimary
    ? immediateRate
    : useFutureAsPrimary
    ? futureRate
    : null;

  const mainCuota = useImmediateAsPrimary
    ? immediateCuota
    : useFutureAsPrimary
    ? futureCuota
    : null;

  const mainMonto = useImmediateAsPrimary
    ? immediateMonto
    : useFutureAsPrimary
    ? futureMonto
    : null;

  const mainPlazo = useImmediateAsPrimary
    ? immediatePlazo
    : useFutureAsPrimary
    ? futurePlazoMeses
    : null;

  const primaryMortgageTitle = useImmediateAsPrimary
    ? "🏦 Tu mejor hipoteca hoy"
    : useFutureAsPrimary
    ? "🏦 Ruta hipotecaria futura viable"
    : useInventoryAsPrimary
    ? "🏘 Alternativa cercana hoy"
    : "🏦 Sin ruta hipotecaria clara hoy";

  const primaryMortgageName = useImmediateAsPrimary
    ? (
        uiRecommendation?.immediate?.bankName ||
        primaryMortgageName ||
        recommendedBank?.banco ||
        pick(snapshot, ["bancoSugerido"]) ||
        "Aún estamos calculando"
      )
    : useFutureAsPrimary
    ? futureProductLabel
    : useInventoryAsPrimary
    ? (
        inventoryFallbackProperty?._normalizedProjectName ||
        inventoryFallbackProperty?.nombre ||
        inventoryFallbackProperty?.title ||
        inventoryFallbackProperty?.proyecto ||
        "Alternativa concreta del marketplace"
      )
    : "Aún no vemos una ruta sólida";

  const primaryMortgageSubtitle = useImmediateAsPrimary
    ? (
        recommendedBank
          ? "Basado en tu perfil, esta es la mejor ruta para empezar tu solicitud."
          : "Aquí verás tu mejor recomendación hipotecaria."
      )
    : useFutureAsPrimary
    ? (
        futureMesesConstruccion && futureMesesConstruccion > 0
          ? `Podrías completar la estrategia en ${futureMesesConstruccion} meses y luego aplicar a hipoteca.`
          : "Hoy no es compra inmediata, pero sí vemos una ruta futura viable."
      )
    : useInventoryAsPrimary
    ? (
        goalValue != null
          ? `Hoy no vemos una hipoteca ideal para tu meta de ${moneyUSD(goalValue)}, pero sí una propiedad concreta cercana.`
          : "Hoy no vemos una hipoteca ideal, pero sí una propiedad concreta cercana."
      )
    : "Con los datos actuales todavía no vemos una ruta clara de compra.";

  const primaryMortgagePill = useImmediateAsPrimary
    ? (
        recommendedBank?.probLabel
          ? `Prob ${recommendedBank.probLabel}`
          : recommendedBank?.probScore != null
          ? `Score ${recommendedBank.probScore}`
          : "Top match"
      )
    : useFutureAsPrimary
    ? "Ruta futura viable"
    : useInventoryAsPrimary
    ? "Alternativa cercana"
    : "Sin ruta";

  const primaryMortgagePillTone = useImmediateAsPrimary
    ? probTone(recommendedBank?.probLabel || immediateProbLabel)
    : useFutureAsPrimary
    ? "green"
    : useInventoryAsPrimary
    ? "amber"
    : "neutral";

  const primaryReasons = useImmediateAsPrimary
    ? getBankReasons(recommendedBank, snapshot, recommendedScenario, bestMortgage)
    : useFutureAsPrimary
    ? [
        futurePropertyPrice != null ? `Meta o referencia ${moneyUSD(futurePropertyPrice)}` : null,
        futureCuota != null && futureCuota > 0 ? `Cuota proyectada ${moneyUSD(futureCuota)}` : null,
        futureMesesConstruccion != null && futureMesesConstruccion > 0
          ? `Tiempo estimado ${futureMesesConstruccion} meses`
          : null,
      ].filter(Boolean)
    : useInventoryAsPrimary
    ? [
        inventoryFallbackProperty?._normalizedPrice != null
          ? `Propiedad cercana ${moneyUSD(inventoryFallbackProperty._normalizedPrice)}`
          : null,
        goalValue != null ? `Meta original ${moneyUSD(goalValue)}` : null,
        "Fallback concreto del marketplace para tu escenario actual",
      ].filter(Boolean)
    : [
        "Hoy no vemos una hipoteca viable ni una ruta futura suficientemente sólida.",
        "Puedes ajustar ingreso, entrada o valor objetivo para recalcular tu match.",
      ];

  const strictProductIds =
    Array.isArray(propertyRecommendationPolicy?.strictProductIds) &&
    propertyRecommendationPolicy.strictProductIds.length
      ? propertyRecommendationPolicy.strictProductIds
      : (() => {
          const legacyId = getLegacyRecommendedProductId(snapshot);
          return legacyId ? [legacyId] : [];
        })();

  const recommendedProductIds =
    Array.isArray(propertyRecommendationPolicy?.recommendedProductIds) &&
    propertyRecommendationPolicy.recommendedProductIds.length
      ? propertyRecommendationPolicy.recommendedProductIds
      : strictProductIds;

  const allowedProductIds =
    propertyMode === "strict" ? strictProductIds : recommendedProductIds;

  const enrichedProps = useMemo(() => {
    const matchedFromEngine = normalizeMatchedProperties(snapshot);

    if (Array.isArray(matchedFromEngine) && matchedFromEngine.length) {
      let list = matchedFromEngine
        .map((p) => ({
          ...p,
          matchedProducts: [...new Set(deriveMatchedProductsFromEngine(p))],
        }))
        .filter((p) => cityMatchesProperty(p, zona));

      if (recommendationType === "future_route") {
        list = list.sort((a, b) => {
          const aFuture = a?.evaluacionHipotecaFutura?.viable === true ? 1 : 0;
          const bFuture = b?.evaluacionHipotecaFutura?.viable === true ? 1 : 0;
          if (bFuture !== aFuture) return bFuture - aFuture;

          const aScore =
            n(a?.evaluacionHipotecaFutura?.score) ||
            n(a?.evaluacionHipotecaHoy?.score) ||
            n(a?.evaluacionHipoteca?.score);
          const bScore =
            n(b?.evaluacionHipotecaFutura?.score) ||
            n(b?.evaluacionHipotecaHoy?.score) ||
            n(b?.evaluacionHipoteca?.score);

          if (bScore !== aScore) return bScore - aScore;

          return n(a?.precio ?? a?.price, Number.MAX_SAFE_INTEGER) - n(
            b?.precio ?? b?.price,
            Number.MAX_SAFE_INTEGER
          );
        });
      } else if (recommendationType === "inventory_fallback") {
        const target = goalValue || 0;
        list = list.sort((a, b) => {
          const pa = n(a?.precio ?? a?.price, Number.MAX_SAFE_INTEGER);
          const pb = n(b?.precio ?? b?.price, Number.MAX_SAFE_INTEGER);
          if (target > 0) {
            const da = Math.abs(pa - target);
            const db = Math.abs(pb - target);
            if (da !== db) return da - db;
          }
          return pa - pb;
        });
      } else {
        list = list
          .filter((p) => {
            if (propertyMode !== "strict") return true;
            if (!allowedProductIds.length) return true;

            const matched = Array.isArray(p?.matchedProducts) ? p.matchedProducts : [];
            const mortgageSelectedId =
              p?.mortgageSelected?.mortgageId ||
              p?.mortgageSelected?.id ||
              p?.mortgageSelected?.productId ||
              p?.evaluacionHipotecaFutura?.mortgageSelected?.mortgageId ||
              p?.evaluacionHipotecaHoy?.mortgageSelected?.mortgageId ||
              null;

            const estado = String(p?.estadoCompra || "");

            if (matched.some((id) => allowedProductIds.includes(id))) return true;
            if (mortgageSelectedId && allowedProductIds.includes(mortgageSelectedId)) return true;

            if (
              estado === "top_match" ||
              estado === "entrada_viable_hipoteca_futura_viable" ||
              estado === "entrada_viable_hipoteca_futura_debil" ||
              estado === "ruta_cercana"
            ) {
              return true;
            }

            return false;
          })
          .sort((a, b) => {
            const viableA = !!a?.viableProyecto;
            const viableB = !!b?.viableProyecto;
            if (viableA && !viableB) return -1;
            if (!viableA && viableB) return 1;

            const estadoA = String(a?.estadoCompra || "");
            const estadoB = String(b?.estadoCompra || "");

            const rank = {
              top_match: 1,
              entrada_viable_hipoteca_futura_viable: 2,
              entrada_viable_hipoteca_futura_debil: 3,
              ruta_cercana: 4,
              entrada_no_viable: 5,
              fuera_de_reglas: 6,
            };

            const ra = rank[estadoA] || 99;
            const rb = rank[estadoB] || 99;
            if (ra !== rb) return ra - rb;

            const scoreA =
              n(a?.evaluacionHipotecaFutura?.score) ||
              n(a?.evaluacionHipotecaHoy?.score) ||
              n(a?.evaluacionHipoteca?.score);
            const scoreB =
              n(b?.evaluacionHipotecaFutura?.score) ||
              n(b?.evaluacionHipotecaHoy?.score) ||
              n(b?.evaluacionHipoteca?.score);
            if (scoreB !== scoreA) return scoreB - scoreA;

            const entradaA = n(
              a?.evaluacionEntrada?.cuotaEntradaMensual,
              Number.MAX_SAFE_INTEGER
            );
            const entradaB = n(
              b?.evaluacionEntrada?.cuotaEntradaMensual,
              Number.MAX_SAFE_INTEGER
            );
            if (entradaA !== entradaB) return entradaA - entradaB;

            return n(a?.precio ?? a?.price, Number.MAX_SAFE_INTEGER) - n(
              b?.precio ?? b?.price,
              Number.MAX_SAFE_INTEGER
            );
          });
      }

      if (
        recommendationType === "inventory_fallback" &&
        inventoryFallbackProperty &&
        !list.some((p) => (p.id || p._id) === (inventoryFallbackProperty.id || inventoryFallbackProperty._normalizedId))
      ) {
        list.unshift(inventoryFallbackProperty);
      }

      return list;
    }

    return mockProperties
      .filter((p) => cityMatchesProperty(p, zona))
      .map((p) => ({
        ...p,
        matchedProducts: getPropertyMatchProducts(
          p,
          eligibilityProducts,
          allowedProductIds
        ),
      }))
      .filter((p) => p.matchedProducts.length > 0)
      .sort((a, b) => a.precio - b.precio);
  }, [
    snapshot,
    zona,
    eligibilityProducts,
    allowedProductIds,
    propertyMode,
    recommendationType,
    goalValue,
    inventoryFallbackProperty,
  ]);

  const subtitle = unlocked
    ? recommendationType === "immediate"
      ? "Propiedades y rutas según tu precalificación actual"
      : recommendationType === "future_route"
      ? "Propiedades y rutas según tu camino futuro viable"
      : recommendationType === "inventory_fallback"
      ? "Alternativas cercanas según tu escenario actual"
      : "Aún no hay una ruta clara, pero aquí verás referencias útiles"
    : "Haz tu simulación para ver solo lo que realmente puedes comprar";

  function handleChooseProperty(property) {
    const normalizedProperty = {
      ...property,
      nombre:
        property?.nombre ||
        property?.title ||
        property?.proyecto ||
        property?._normalizedProjectName ||
        "Propiedad seleccionada",
      ciudad:
        property?.ciudad ||
        property?.city ||
        property?.zona ||
        property?._normalizedCity ||
        journey?.form?.ciudadCompra ||
        journey?.ciudadCompra ||
        "Quito",
      precio:
        property?.precio ||
        property?.price ||
        property?._normalizedPrice ||
        null,
      cuotaEstimada:
        property?.cuotaEstimada ||
        property?.cuota ||
        property?.evaluacionHipotecaFutura?.cuotaReferencia ||
        property?.evaluacionHipotecaHoy?.cuotaReferencia ||
        property?.evaluacionHipoteca?.cuotaReferencia ||
        snapshot?.cuotaEstimada ||
        snapshot?.cuotaMensual ||
        snapshot?.bestMortgage?.cuota ||
        null,
      selectedAt: new Date().toISOString(),
      source: "marketplace",
    };

    saveJSON(LS_SELECTED_PROPERTY, normalizedProperty);

    saveJSON(LS_JOURNEY, {
      ...(journey || {}),
      propiedadElegida: true,
      propiedadId: property?.id || property?._id || null,
      propiedadSeleccionada: normalizedProperty,
    });

    navigate("/propiedad-ideal");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
        paddingBottom: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>🏘 Marketplace</div>
          <h2 style={{ margin: "6px 0 0 0" }}>Tu match hipotecario</h2>
          <div style={{ opacity: 0.7, marginTop: 4 }}>{subtitle}</div>
        </div>

        <Pill onClick={() => setTab((t) => (t === "props" ? "banks" : "props"))}>
          {tab === "props" ? "Propiedades" : "Hipotecas"}
        </Pill>
      </div>

      {!unlocked ? (
        <LockedMarketplace onGoSimular={() => navigate("/journey/full")} />
      ) : (
        <>
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill
              tone={
                recommendationType === "immediate"
                  ? "green"
                  : recommendationType === "future_route"
                  ? "green"
                  : recommendationType === "inventory_fallback"
                  ? "amber"
                  : "neutral"
              }
            >
              {String(productoElegido)}
            </Pill>

            {typeof precioMaxVivienda === "number" && precioMaxVivienda > 0 ? (
              <Pill>
                {recommendationType === "immediate"
                  ? `Máx ${moneyUSD(precioMaxVivienda)}`
                  : recommendationType === "future_route"
                  ? `Meta ${moneyUSD(precioMaxVivienda)}`
                  : `Referencia ${moneyUSD(precioMaxVivienda)}`}
              </Pill>
            ) : (
              <Pill>Máx —</Pill>
            )}

            {typeof cuotaEstimada === "number" && cuotaEstimada > 0 ? (
              <Pill>
                {recommendationType === "future_route"
                  ? `Cuota proyectada ${moneyUSD(cuotaEstimada)}`
                  : `Cuota ${moneyUSD(cuotaEstimada)}`}
              </Pill>
            ) : null}
          </div>

          <Segment
            value={tab}
            onChange={setTab}
            options={[
              { id: "props", label: "🏘 Propiedades" },
              { id: "banks", label: "🏦 Hipotecas" },
            ]}
          />

          {tab === "props" ? (
            <>
              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${UI.border}`,
                  boxShadow: UI.shadowSoft,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                      Filtro rápido
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 15 }}>
                      Zona donde quieres vivir
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        opacity: 0.78,
                        lineHeight: 1.35,
                      }}
                    >
                      {recommendationType === "immediate"
                        ? "Te mostramos primero propiedades alineadas con tu compra viable hoy."
                        : recommendationType === "future_route"
                        ? "Te mostramos primero propiedades que encajan mejor con tu ruta futura viable."
                        : recommendationType === "inventory_fallback"
                        ? "Te mostramos primero alternativas concretas cercanas a tu escenario actual."
                        : "Aún no hay una ruta clara, pero puedes explorar referencias y ajustar tu escenario."}
                    </div>
                  </div>
                  <Pill
                    tone={
                      recommendationType === "inventory_fallback" ? "amber" : "green"
                    }
                  >
                    Match
                  </Pill>
                </div>

                <SectionTitle>Zona</SectionTitle>
                <ZoneChips zona={zona} setZona={setZona} />

                <SectionTitle>Qué mostrar</SectionTitle>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setPropertyMode("strict")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: `1px solid ${
                        propertyMode === "strict"
                          ? UI.greenBorder
                          : "rgba(255,255,255,0.14)"
                      }`,
                      background:
                        propertyMode === "strict"
                          ? "rgba(37,211,166,0.14)"
                          : "rgba(255,255,255,0.06)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    {recommendationType === "inventory_fallback"
                      ? "Solo alternativas cercanas"
                      : "Solo mi mejor ruta"}
                  </button>

                  <button
                    onClick={() => setPropertyMode("flex")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: `1px solid ${
                        propertyMode === "flex"
                          ? UI.greenBorder
                          : "rgba(255,255,255,0.14)"
                      }`,
                      background:
                        propertyMode === "flex"
                          ? "rgba(37,211,166,0.14)"
                          : "rgba(255,255,255,0.06)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    Ver opciones ampliadas
                  </button>
                </div>
              </div>

              {recommendationType === "future_route" ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderRadius: 22,
                    background: UI.greenBg,
                    border: `1px solid ${UI.greenBorder}`,
                    boxShadow: UI.shadowSoft,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                    🎯 Ruta futura viable
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>
                    {goalValue != null
                      ? `Tu meta de ${moneyUSD(goalValue)} sí podría ser viable`
                      : "Sí existe una ruta futura viable para ti"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9, lineHeight: 1.35 }}>
                    {futureMesesConstruccion != null && futureMesesConstruccion > 0
                      ? `Hoy todavía no es compra inmediata, pero sí existe una estrategia seria para acercarte en ${futureMesesConstruccion} meses.`
                      : "Hoy todavía no es compra inmediata, pero sí existe una ruta futura seria para acercarte a una compra."}
                  </div>
                </div>
              ) : null}

              {recommendationType === "inventory_fallback" ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderRadius: 22,
                    background: UI.amberBg,
                    border: `1px solid ${UI.amberBorder}`,
                    boxShadow: UI.shadowSoft,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                    🏘 Alternativa cercana
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>
                    Hoy no vemos una hipoteca ideal, pero sí una propiedad cercana
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9, lineHeight: 1.35 }}>
                    {goalValue != null
                      ? `Tu meta original sigue siendo ${moneyUSD(goalValue)}, pero hoy vemos mejores opciones concretas cercanas como fallback.`
                      : "Hoy no vemos una ruta sólida, pero sí una propiedad del marketplace relativamente cercana a tu escenario actual."}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {enrichedProps.length ? (
                  enrichedProps.map((p, idx) => {
                    const propertyId =
                      p.id || p._id || p._normalizedId || `prop-${idx}`;

                    const propertyPrice =
                      p.precio ?? p.price ?? p._normalizedPrice ?? null;

                    const isClosestFallback =
                      recommendationType === "inventory_fallback" &&
                      inventoryFallbackProperty &&
                      propertyId ===
                        (inventoryFallbackProperty.id ||
                          inventoryFallbackProperty._id ||
                          inventoryFallbackProperty._normalizedId);

                    return (
                      <div key={propertyId}>
                        <PropertyCard
                          property={{
                            ...p,
                            id: propertyId,
                            precio: propertyPrice,
                            zona: p.zona ?? p.ciudad ?? p.city ?? p._normalizedCity ?? null,
                            evaluacionHipoteca:
                              p.evaluacionHipoteca ?? p.evaluacionHipotecaHoy ?? null,
                            evaluacionHipotecaHoy:
                              p.evaluacionHipotecaHoy ?? p.evaluacionHipoteca ?? null,
                            evaluacionHipotecaFutura: p.evaluacionHipotecaFutura ?? null,
                            evaluacionEntrada: p.evaluacionEntrada ?? null,
                          }}
                          onClick={() => navigate(`/property/${propertyId}`)}
                        />

                        {isClosestFallback ? (
                          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Pill tone="amber">Alternativa cercana principal</Pill>
                            {goalValue != null ? (
                              <Pill>Meta original {moneyUSD(goalValue)}</Pill>
                            ) : null}
                          </div>
                        ) : null}

                        {Array.isArray(p.matchedProducts) && p.matchedProducts.length ? (
                          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {[...new Set(p.matchedProducts)].slice(0, 2).map((prodId, chipIdx) => (
                              <Pill key={`${propertyId}-${prodId}-${chipIdx}`} tone="green">
                                Compatible con {getPropertyProgramLabel(prodId)}
                              </Pill>
                            ))}
                          </div>
                        ) : null}

                        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                          <PrimaryButton onClick={() => handleChooseProperty(p)}>
                            Elegir esta propiedad
                          </PrimaryButton>

                          <SecondaryButton onClick={() => navigate(`/property/${propertyId}`)}>
                            Ver detalle
                          </SecondaryButton>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    title={
                      recommendationType === "inventory_fallback"
                        ? "No encontramos alternativas cercanas en esta zona"
                        : "No encontramos propiedades compatibles en esta zona"
                    }
                    subtitle={
                      recommendationType === "inventory_fallback"
                        ? "Prueba otra zona o cambia a opciones ampliadas para ver más alternativas concretas."
                        : "Prueba otra zona o cambia a opciones ampliadas para ver más alternativas."
                    }
                    cta="Volver a simular"
                    onClick={() => navigate("/journey/full")}
                  />
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <SecondaryButton onClick={() => setTab("banks")}>
                  Ver hipotecas que me convienen →
                </SecondaryButton>
              </div>
            </>
          ) : null}

          {tab === "banks" ? (
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${UI.border}`,
                  boxShadow: UI.shadow,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                      {primaryMortgageTitle}
                    </div>

                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
                      {primaryMortgageName}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        opacity: 0.78,
                        lineHeight: 1.35,
                      }}
                    >
                      {primaryMortgageSubtitle}
                    </div>
                  </div>

                  <Pill tone={primaryMortgagePillTone}>
                    {primaryMortgagePill}
                  </Pill>
                </div>

                {useImmediateAsPrimary || useFutureAsPrimary ? (
                  <>
                    {(mainRate != null || mainCuota != null || mainMonto != null) ? (
                      <>
                        <div
                          style={{
                            marginTop: 14,
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 16,
                              background: "rgba(0,0,0,0.18)",
                              border: `1px solid ${UI.borderSoft}`,
                            }}
                          >
                            <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>
                              Tasa
                            </div>
                            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 15 }}>
                              {mainRate != null ? formatRate(mainRate) : "—"}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: 12,
                              borderRadius: 16,
                              background: "rgba(0,0,0,0.18)",
                              border: `1px solid ${UI.borderSoft}`,
                            }}
                          >
                            <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>
                              {useFutureAsPrimary ? "Cuota proyectada" : "Cuota"}
                            </div>
                            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 15 }}>
                              {mainCuota != null ? moneyUSD(mainCuota) : "—"}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: 12,
                              borderRadius: 16,
                              background: "rgba(0,0,0,0.18)",
                              border: `1px solid ${UI.borderSoft}`,
                            }}
                          >
                            <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>
                              Monto
                            </div>
                            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 15 }}>
                              {mainMonto != null ? moneyUSD(mainMonto) : "—"}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {mainPlazo != null ? <Pill>{formatYearsFromMonths(mainPlazo)}</Pill> : null}
                          {useFutureAsPrimary ? (
                            <Pill>Proyección</Pill>
                          ) : recommendedBank?.tipoProducto ? (
                            <Pill>{String(recommendedBank.tipoProducto)}</Pill>
                          ) : null}
                          {useFutureAsPrimary && futureProbLabel ? (
                            <Pill tone={probTone(futureProbLabel)}>
                              Prob {futureProbLabel}
                            </Pill>
                          ) : null}
                        </div>

                        <div
                          style={{
                            marginTop: 14,
                            padding: 14,
                            borderRadius: 16,
                            background: "rgba(37,211,166,0.08)",
                            border: `1px solid ${UI.greenBorder}`,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                            ¿Por qué te la recomendamos?
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            {primaryReasons.map((reason, idx) => (
                              <div
                                key={idx}
                                style={{
                                  fontSize: 13,
                                  lineHeight: 1.35,
                                  opacity: 0.92,
                                }}
                              >
                                ✓ {reason}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginTop: 14 }}>
                          {useFutureAsPrimary ? (
                            <PrimaryButton onClick={() => setTab("props")}>
                              Ver mi ruta futura en propiedades
                            </PrimaryButton>
                          ) : (
                            <PrimaryButton
                              onClick={() =>
                                navigate("/asesor", {
                                  state: {
                                    selectedBank: recommendedBank,
                                    source: "match_hipotecas",
                                  },
                                })
                              }
                            >
                              Iniciar solicitud con esta opción
                            </PrimaryButton>
                          )}
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        title="Aún no tenemos una hipoteca recomendada"
                        subtitle="Vuelve a simular para recalcular tu match."
                        cta="Volver a simular"
                        onClick={() => navigate("/journey/full")}
                      />
                    )}
                  </>
                ) : useInventoryAsPrimary ? (
                  <>
                    <div
                      style={{
                        marginTop: 14,
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(245,158,11,0.08)",
                        border: `1px solid ${UI.amberBorder}`,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                        ¿Qué significa esto?
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {primaryReasons.map((reason, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: 13,
                              lineHeight: 1.35,
                              opacity: 0.92,
                            }}
                          >
                            ✓ {reason}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <PrimaryButton onClick={() => setTab("props")}>
                        Ver alternativas cercanas
                      </PrimaryButton>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="Hoy todavía no hay una ruta clara"
                    subtitle="No vemos una hipoteca viable hoy, ni una ruta futura suficientemente sólida, ni una alternativa cercana fuerte en este momento."
                    cta="Volver a simular"
                    onClick={() => navigate("/journey/full")}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${UI.border}`,
                  boxShadow: UI.shadowSoft,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                      Otras opciones
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 16 }}>
                      También podrían funcionarte
                    </div>
                  </div>
                  <Pill>Top 3</Pill>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {alternativeBanks.length ? (
                    alternativeBanks.map((b, idx) => {
                      const scenario = getScenarioForBank(b, snapshot);
                      const tasaAlt = b?.tasaAnual ?? scenario?.tasaAnual ?? null;
                      const cuotaAlt = b?.cuota ?? scenario?.cuota ?? null;

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: 14,
                            borderRadius: 18,
                            border: `1px solid ${UI.borderSoft}`,
                            background: UI.card2,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900, fontSize: 14 }}>
                              {b?.banco || "Banco"}
                            </div>
                            <Pill tone={probTone(b?.probLabel)}>
                              {b?.probLabel
                                ? `Prob ${b.probLabel}`
                                : b?.probScore != null
                                ? `Score ${b.probScore}`
                                : "Estimación"}
                            </Pill>
                          </div>

                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.78, lineHeight: 1.35 }}>
                            {b?.tipoProducto ? `Tipo: ${b.tipoProducto}` : "Tipo: —"}
                            {" • "}
                            {tasaAlt != null ? `Tasa: ${formatRate(tasaAlt)}` : "Tasa: —"}
                            {" • "}
                            {cuotaAlt != null && cuotaAlt > 0 ? `Cuota: ${moneyUSD(cuotaAlt)}` : "Cuota: —"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.35 }}>
                      No hay más opciones destacadas por ahora.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <SecondaryButton onClick={() => setTab("props")}>
                    ← Ver propiedades que hacen match
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}