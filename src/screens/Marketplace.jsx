import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Landmark,
  MapPin,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { moneyUSD } from "../lib/money";
import PropertyCard from "../components/PropertyCard.jsx";
import mockProperties from "../data/mockProperties.js";
import { resolveHousingRecommendation } from "../lib/recommendationResolver.js";
import { getCustomer } from "../lib/customerSession.js";

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

function getStorageOwnerEmail() {
  try {
    const email = String(getCustomer()?.email || "").trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}

function loadOwnedData(key) {
  const ownerEmail = getStorageOwnerEmail();
  const envelope = loadJSON(key);

  if (!envelope) return null;

  if (envelope?.ownerEmail && "data" in envelope) {
    if (
      ownerEmail &&
      String(envelope.ownerEmail).trim().toLowerCase() === ownerEmail
    ) {
      return envelope.data ?? null;
    }

    if (!ownerEmail) {
      return envelope.data ?? null;
    }

    return null;
  }

  return envelope;
}

function saveOwnedData(key, data) {
  const ownerEmail = getStorageOwnerEmail();
  saveJSON(key, { ownerEmail, data });
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

function getSelectedPropertyStatusMeta(status, isSelected) {
  if (!isSelected) {
    return {
      chip: null,
      chipTone: "neutral",
      secondaryChip: null,
      secondaryTone: "neutral",
      ctaLabel: "Elegir esta propiedad",
      ctaTone: "primary",
    };
  }

  if (status === "selected_viable_now") {
    return {
      chip: "Tu elegida",
      chipTone: "green",
      secondaryChip: "Sigue alineada",
      secondaryTone: "neutral",
      ctaLabel: "Ver en Ruta",
      ctaTone: "route",
    };
  }

  if (status === "selected_future_viable") {
    return {
      chip: "Tu elegida",
      chipTone: "green",
      secondaryChip: "Ruta futura",
      secondaryTone: "neutral",
      ctaLabel: "Ver en Ruta",
      ctaTone: "route",
    };
  }

  if (status === "selected_near_route") {
    return {
      chip: "Tu elegida",
      chipTone: "amber",
      secondaryChip: "Revisar encaje",
      secondaryTone: "amber",
      ctaLabel: "Ver alternativas",
      ctaTone: "alternatives",
    };
  }

  if (status === "selected_no_longer_viable") {
    return {
      chip: "Tu elegida",
      chipTone: "amber",
      secondaryChip: "Ya no calza hoy",
      secondaryTone: "amber",
      ctaLabel: "Ver alternativas",
      ctaTone: "alternatives",
    };
  }

  return {
    chip: "Tu elegida",
    chipTone: "green",
    secondaryChip: "Seleccionada para tu ruta",
    secondaryTone: "neutral",
    ctaLabel: "Ver en Ruta",
    ctaTone: "route",
  };
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

function ScreenWrap({ children }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(1200px 800px at 20% 10%, rgba(45,212,191,0.10), transparent 55%)," +
          "radial-gradient(1000px 700px at 80% 10%, rgba(59,130,246,0.10), transparent 60%)," +
          "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 100%)",
        color: "white",
        padding: "92px 22px 28px",
        fontFamily: "system-ui",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

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
        padding: "8px 12px",
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

function CompactChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
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
      {children}
    </button>
  );
}

function MatchHeader({ subtitle, tab }) {
  return (
    <div style={{ marginBottom: 18 }}>
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
            Propiedades
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.02,
              fontWeight: 980,
              letterSpacing: -1,
              color: "rgba(226,232,240,0.98)",
              maxWidth: 340,
            }}
          >
            Opciones según tu perfil
          </h1>

          <div
            style={{
              marginTop: 14,
              maxWidth: 360,
              fontSize: 16,
              lineHeight: 1.4,
              color: "rgba(148,163,184,0.95)",
            }}
          >
            {subtitle}
          </div>
        </div>

        <Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {tab === "props" ? <Building2 size={12} /> : <Landmark size={12} />}
            {tab === "props" ? "Propiedades" : "Hipotecas"}
          </span>
        </Pill>
      </div>
    </div>
  );
}

function SummaryCard({
  recommendationType,
  productoElegido,
  precioMaxVivienda,
  cuotaEstimada,
  setTab,
}) {
  const summaryTitle =
    recommendationType === "immediate"
      ? "Tu mejor ruta hoy"
      : recommendationType === "future_route"
      ? "Ruta estimada"
      : recommendationType === "inventory_fallback"
      ? "Alternativa cercana"
      : "Tu estado actual";

  const summaryBody =
    recommendationType === "immediate"
      ? "Ya vemos una ruta alineada con tu perfil actual."
      : recommendationType === "future_route"
      ? "Hoy no es compra inmediata, pero sí vemos una ruta seria para acercarte."
      : recommendationType === "inventory_fallback"
      ? "Hoy no vemos una ruta ideal, pero sí alternativas concretas cercanas."
      : "Aún no hay una ruta clara, pero puedes explorar referencias útiles.";

  return (
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
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            Resumen
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 16 }}>
            {summaryTitle}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              opacity: 0.78,
              lineHeight: 1.35,
              maxWidth: 420,
            }}
          >
            {summaryBody}
          </div>
        </div>

        <Pill
          tone={
            recommendationType === "inventory_fallback"
              ? "amber"
              : recommendationType === "future_route" ||
                recommendationType === "immediate"
              ? "green"
              : "neutral"
          }
        >
          {recommendationType === "immediate"
            ? "Viable hoy"
            : recommendationType === "future_route"
            ? "Ruta posible"
            : recommendationType === "inventory_fallback"
            ? "Cercana"
            : "Explorando"}
        </Pill>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
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
            Ruta
          </div>
          <div style={{ marginTop: 4, fontWeight: 900, fontSize: 14 }}>
            {String(productoElegido || "—")}
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
            Meta / referencia
          </div>
          <div style={{ marginTop: 4, fontWeight: 900, fontSize: 14 }}>
            {typeof precioMaxVivienda === "number" && precioMaxVivienda > 0
              ? moneyUSD(precioMaxVivienda)
              : "—"}
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
            Cuota
          </div>
          <div style={{ marginTop: 4, fontWeight: 900, fontSize: 14 }}>
            {typeof cuotaEstimada === "number" && cuotaEstimada > 0
              ? moneyUSD(cuotaEstimada)
              : "—"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <SecondaryButton onClick={() => setTab("banks")}>
          Ver detalle hipotecario
        </SecondaryButton>
      </div>
    </div>
  );
}

function SegmentedControl({ value, onChange }) {
  return (
    <div
      style={{
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}
    >
      <button
        onClick={() => onChange("props")}
        style={{
          padding: 12,
          borderRadius: 16,
          border: `1px solid ${
            value === "props" ? UI.greenBorder : "rgba(255,255,255,0.14)"
          }`,
          background:
            value === "props"
              ? "rgba(37,211,166,0.14)"
              : "rgba(255,255,255,0.06)",
          color: "white",
          fontWeight: 900,
          boxShadow: value === "props" ? UI.shadowSoft : "none",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Building2 size={15} />
          Propiedades
        </span>
      </button>

      <button
        onClick={() => onChange("banks")}
        style={{
          padding: 12,
          borderRadius: 16,
          border: `1px solid ${
            value === "banks" ? UI.greenBorder : "rgba(255,255,255,0.14)"
          }`,
          background:
            value === "banks"
              ? "rgba(37,211,166,0.14)"
              : "rgba(255,255,255,0.06)",
          color: "white",
          fontWeight: 900,
          boxShadow: value === "banks" ? UI.shadowSoft : "none",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Landmark size={15} />
          Hipotecas
        </span>
      </button>
    </div>
  );
}

function hasResult(snapshot) {
  if (!snapshot) return false;

  const bestMortgage = pick(snapshot, ["bestMortgage"]);
  const banks = pick(snapshot, ["bancosTop3"]);
  const cuota = pick(snapshot, [
    "cuotaEstimada",
    "cuotaMensual",
    "monthlyPayment",
  ]);
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
            Camino bloqueado
          </div>
          <Pill tone="green">2 minutos</Pill>
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
          Completa tu información para ver tu camino real
        </div>

        <div
          style={{
            marginTop: 8,
            opacity: 0.9,
            lineHeight: 1.35,
            fontSize: 13,
          }}
        >
          HabitaLibre solo muestra propiedades e hipotecas que realmente pueden
          encajar con tu perfil.
        </div>

        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onGoSimular}>Ver mi resultado</PrimaryButton>
        </div>
      </div>
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
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          opacity: 0.8,
          lineHeight: 1.35,
        }}
      >
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

function FilterCard({
  recommendationType,
  zona,
  setZona,
  propertyMode,
  setPropertyMode,
}) {
  const zones = ["Quito", "Cumbayá", "Tumbaco"];

  const filterSubtitle =
    recommendationType === "immediate"
      ? "Primero te mostramos propiedades alineadas con tu compra viable hoy."
      : recommendationType === "future_route"
      ? "Primero te mostramos propiedades que encajan mejor con tu ruta futura."
      : recommendationType === "inventory_fallback"
      ? "Primero te mostramos alternativas cercanas a tu escenario actual."
      : "Explora por zona y compara opciones.";

  return (
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            Filtros
          </div>
          <div style={{ marginTop: 6, fontWeight: 900, fontSize: 16 }}>
            Ajusta lo que quieres ver
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              opacity: 0.78,
              lineHeight: 1.35,
              maxWidth: 420,
            }}
          >
            {filterSubtitle}
          </div>
        </div>

        <Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <SlidersHorizontal size={12} />
            Match
          </span>
        </Pill>
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 12,
            opacity: 0.82,
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          Zona
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {zones.map((z) => (
            <CompactChip key={z} active={z === zona} onClick={() => setZona(z)}>
              {z}
            </CompactChip>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 12,
            opacity: 0.82,
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          Qué mostrar
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <CompactChip
            active={propertyMode === "strict"}
            onClick={() => setPropertyMode("strict")}
          >
            {recommendationType === "inventory_fallback"
              ? "Solo alternativas cercanas"
              : "Solo mi mejor ruta"}
          </CompactChip>

          <CompactChip
            active={propertyMode === "flex"}
            onClick={() => setPropertyMode("flex")}
          >
            Ver opciones ampliadas
          </CompactChip>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState(() => loadOwnedData(LS_SNAPSHOT));
  const [journey, setJourney] = useState(() => loadOwnedData(LS_JOURNEY));
  const [selectedProperty, setSelectedProperty] = useState(() =>
    loadOwnedData(LS_SELECTED_PROPERTY)
  );

  const [tab, setTab] = useState("props");
  const [zona, setZona] = useState("Quito");
  const [propertyMode, setPropertyMode] = useState("strict");

  useEffect(() => {
    const snap = loadOwnedData(LS_SNAPSHOT);
    const j = loadOwnedData(LS_JOURNEY);
    const sp = loadOwnedData(LS_SELECTED_PROPERTY);

    setSnapshot(snap);
    setJourney(j);
    setSelectedProperty(sp);
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

  const selectedPropertyId = useMemo(() => {
    return (
      selectedProperty?.id ||
      selectedProperty?._id ||
      journey?.propiedadId ||
      journey?.propiedadSeleccionada?.id ||
      journey?.propiedadSeleccionada?._id ||
      null
    );
  }, [selectedProperty, journey]);

  const selectedPropertyStatus =
    journey?.selectedPropertyStatus ||
    selectedProperty?.status ||
    null;

  const eligibilityProducts =
    pick(snapshot, ["eligibilityProducts"]) || buildEligibilityFallback(snapshot);

  const propertyRecommendationPolicy =
    pick(snapshot, ["propertyRecommendationPolicy"]) || null;

  const futureViableProperty = useMemo(() => {
    if (!Array.isArray(matchedProperties) || !matchedProperties.length) return null;

    return (
      matchedProperties.find(
        (p) =>
          String(p?.estadoCompra || "") ===
          "entrada_viable_hipoteca_futura_viable"
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
    futureViableProperty?.evaluacionHipotecaFutura?.montoHipotecaProyectado ??
    null;

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

  const inventoryFallbackProperty =
    uiRecommendation?.inventoryFallback?.property || null;

  const productoElegido = useImmediateAsPrimary
    ? uiRecommendation?.immediate?.productName ||
      recommendedBank?.banco ||
      bestMortgage?.label ||
      pick(snapshot, ["bancoSugerido"]) ||
      bestRoute?.tipo ||
      pick(snapshot, ["productoElegido", "productoSugerido"]) ||
      "Hipoteca viable hoy"
    : useFutureAsPrimary
    ? futureProductLabel
    : useInventoryAsPrimary
    ? inventoryFallbackProperty?._normalizedProjectName ||
      inventoryFallbackProperty?.nombre ||
      inventoryFallbackProperty?.title ||
      inventoryFallbackProperty?.proyecto ||
      "Alternativa cercana"
    : "Sin ruta clara hoy";

  const precioMaxVivienda = useImmediateAsPrimary
    ? uiRecommendation?.immediate?.priceMax ??
      bestMortgage?.precioMaxVivienda ??
      pick(snapshot, [
        "propertyPrice",
        "precioMaxVivienda",
        "precioMax",
        "valorMaxVivienda",
        "maxHomePrice",
        "homePrice",
      ])
    : useFutureAsPrimary
    ? futurePropertyPrice
    : useInventoryAsPrimary
    ? inventoryFallbackProperty?._normalizedPrice ??
      inventoryFallbackProperty?.precio ??
      inventoryFallbackProperty?.price ??
      null
    : null;

  const cuotaEstimada = useImmediateAsPrimary
    ? uiRecommendation?.immediate?.monthlyPayment ??
      bestMortgage?.cuota ??
      pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]) ??
      null
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
    ? "Tu mejor hipoteca hoy"
    : useFutureAsPrimary
    ? "Ruta hipotecaria futura viable"
    : useInventoryAsPrimary
    ? "Alternativa cercana hoy"
    : "Sin ruta hipotecaria clara";

  const primaryMortgageName = useImmediateAsPrimary
    ? uiRecommendation?.immediate?.bankName ||
      recommendedBank?.banco ||
      pick(snapshot, ["bancoSugerido"]) ||
      "Aún estamos calculando"
    : useFutureAsPrimary
    ? futureProductLabel
    : useInventoryAsPrimary
    ? inventoryFallbackProperty?._normalizedProjectName ||
      inventoryFallbackProperty?.nombre ||
      inventoryFallbackProperty?.title ||
      inventoryFallbackProperty?.proyecto ||
      "Alternativa concreta del marketplace"
    : "Aún no vemos una ruta sólida";

  const primaryMortgageSubtitle = useImmediateAsPrimary
    ? recommendedBank
      ? "Basado en tu perfil, esta es la mejor ruta para empezar tu solicitud."
      : "Aquí verás tu mejor recomendación hipotecaria."
    : useFutureAsPrimary
    ? futureMesesConstruccion && futureMesesConstruccion > 0
      ? `Podrías completar la estrategia en ${futureMesesConstruccion} meses y luego aplicar a hipoteca.`
      : "Hoy no es compra inmediata, pero sí vemos una ruta futura viable."
    : useInventoryAsPrimary
    ? goalValue != null
      ? `Hoy no vemos una hipoteca ideal para tu meta de ${moneyUSD(
          goalValue
        )}, pero sí una propiedad concreta cercana.`
      : "Hoy no vemos una hipoteca ideal, pero sí una propiedad concreta cercana."
    : "Con los datos actuales todavía no vemos una ruta clara de compra.";

  const primaryMortgagePill = useImmediateAsPrimary
    ? recommendedBank?.probLabel
      ? `Prob ${recommendedBank.probLabel}`
      : recommendedBank?.probScore != null
      ? `Score ${recommendedBank.probScore}`
      : "Top match"
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
        futurePropertyPrice != null
          ? `Meta o referencia ${moneyUSD(futurePropertyPrice)}`
          : null,
        futureCuota != null && futureCuota > 0
          ? `Cuota proyectada ${moneyUSD(futureCuota)}`
          : null,
        futureMesesConstruccion != null && futureMesesConstruccion > 0
          ? `Tiempo estimado ${futureMesesConstruccion} meses`
          : null,
      ].filter(Boolean)
    : useInventoryAsPrimary
    ? [
        inventoryFallbackProperty?._normalizedPrice != null
          ? `Propiedad cercana ${moneyUSD(
              inventoryFallbackProperty._normalizedPrice
            )}`
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

  function pSafePrice(p) {
    return n(p?.precio ?? p?.price, Number.MAX_SAFE_INTEGER);
  }

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

            const matched = Array.isArray(p?.matchedProducts)
              ? p.matchedProducts
              : [];
            const mortgageSelectedId =
              p?.mortgageSelected?.mortgageId ||
              p?.mortgageSelected?.id ||
              p?.mortgageSelected?.productId ||
              p?.evaluacionHipotecaFutura?.mortgageSelected?.mortgageId ||
              p?.evaluacionHipotecaHoy?.mortgageSelected?.mortgageId ||
              null;

            const estado = String(p?.estadoCompra || "");

            if (matched.some((id) => allowedProductIds.includes(id))) return true;
            if (mortgageSelectedId && allowedProductIds.includes(mortgageSelectedId))
              return true;

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
        !list.some(
          (p) =>
            (p.id || p._id) ===
            (inventoryFallbackProperty.id ||
              inventoryFallbackProperty._normalizedId)
        )
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
      .sort((a, b) => pSafePrice(a) - pSafePrice(b));
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

  const orderedProps = useMemo(() => {
    if (!Array.isArray(enrichedProps)) return [];

    if (!selectedPropertyId) return enrichedProps;

    return [...enrichedProps].sort((a, b) => {
      const aId = a?.id || a?._id || a?._normalizedId || null;
      const bId = b?.id || b?._id || b?._normalizedId || null;

      const aSelected = aId === selectedPropertyId ? 1 : 0;
      const bSelected = bId === selectedPropertyId ? 1 : 0;

      return bSelected - aSelected;
    });
  }, [enrichedProps, selectedPropertyId]);

  const subtitle = unlocked
    ? recommendationType === "immediate"
      ? "Propiedades y rutas según tu precalificación actual"
      : recommendationType === "future_route"
      ? "Propiedades y rutas según tu camino futuro viable"
      : recommendationType === "inventory_fallback"
      ? "Alternativas cercanas según tu escenario actual"
      : "Aún no hay una ruta clara, pero aquí verás referencias útiles"
    : "Completo el formulario para ver solo lo que realmente puede encajar contigo";

  function handleChooseProperty(property) {
    const propertyId =
      property?.id ||
      property?._id ||
      property?._normalizedId ||
      property?.propertyId ||
      null;

    const propertyTitle =
      property?.titulo ||
      property?.nombre ||
      property?.title ||
      property?.name ||
      property?.proyecto ||
      property?._normalizedProjectName ||
      "Propiedad elegida";

    const propertyCity =
      property?.ciudad ||
      property?.city ||
      property?.zona ||
      property?.sector ||
      property?.ciudadZona ||
      property?._normalizedCity ||
      journey?.form?.ciudadCompra ||
      journey?.ciudadCompra ||
      "Ubicación pendiente";

    const propertyPriceRaw =
      property?.precio ??
      property?.price ??
      property?.valor ??
      property?.listPrice ??
      property?._normalizedPrice ??
      null;

    const propertyPrice = Number.isFinite(Number(propertyPriceRaw))
      ? Number(propertyPriceRaw)
      : null;

    const propertyImage =
      property?.imagen ||
      property?.image ||
      property?.imageUrl ||
      property?.foto ||
      property?.cover ||
      null;

    const normalizedProperty = {
      id: propertyId,
      _id: propertyId,
      propertyId: propertyId,
      titulo: propertyTitle,
      nombre: propertyTitle,
      proyecto: propertyTitle,
      ciudad: propertyCity,
      zona: propertyCity,
      sector: property?.sector || propertyCity,
      ciudadZona: property?.ciudadZona || propertyCity,
      precio: propertyPrice,
      price: propertyPrice,
      imagen: propertyImage,
      image: propertyImage,
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
      status:
        journey?.selectedPropertyStatus ||
        selectedProperty?.status ||
        null,
      source: "marketplace",
      selectedAt: new Date().toISOString(),
      raw: property,
    };

    saveOwnedData(LS_SELECTED_PROPERTY, normalizedProperty);

    const nextJourney = {
      ...(journey || {}),
      propiedadElegida: true,
      propiedadId: propertyId,
      propiedadSeleccionada: normalizedProperty,
      selectedPropertyStatus:
        journey?.selectedPropertyStatus || normalizedProperty?.status || null,
    };

    saveOwnedData(LS_JOURNEY, nextJourney);

    setSelectedProperty(normalizedProperty);
    setJourney(nextJourney);

    navigate("/propiedad-ideal");
  }

  return (
    <ScreenWrap>
      <MatchHeader subtitle={subtitle} tab={tab} />

      {!unlocked ? (
        <LockedMarketplace onGoSimular={() => navigate("/journey/full")} />
      ) : (
        <>
          <SummaryCard
            recommendationType={recommendationType}
            productoElegido={productoElegido}
            precioMaxVivienda={precioMaxVivienda}
            cuotaEstimada={cuotaEstimada}
            setTab={setTab}
          />

          <SegmentedControl value={tab} onChange={setTab} />

          {tab === "props" ? (
            <>
              <FilterCard
                recommendationType={recommendationType}
                zona={zona}
                setZona={setZona}
                propertyMode={propertyMode}
                setPropertyMode={setPropertyMode}
              />

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
                    Ruta futura viable
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>
                    {goalValue != null
                      ? `Tu meta de ${moneyUSD(goalValue)} sí podría ser viable`
                      : "Sí existe una ruta futura viable para ti"}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      opacity: 0.9,
                      lineHeight: 1.35,
                    }}
                  >
                    {futureMesesConstruccion != null &&
                    futureMesesConstruccion > 0
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
                    Alternativa cercana
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>
                    Hoy no vemos una hipoteca ideal, pero sí una propiedad cercana
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      opacity: 0.9,
                      lineHeight: 1.35,
                    }}
                  >
                    {goalValue != null
                      ? `Tu meta original sigue siendo ${moneyUSD(goalValue)}, pero hoy vemos mejores opciones concretas cercanas.`
                      : "Hoy no vemos una ruta sólida, pero sí una propiedad del marketplace relativamente cercana a tu escenario actual."}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                {orderedProps.length ? (
                  orderedProps.map((p, idx) => {
                    const propertyId =
                      p.id || p._id || p._normalizedId || `prop-${idx}`;

                    const propertyPrice =
                      p.precio ?? p.price ?? p._normalizedPrice ?? null;

                    const isSelected =
                      !!selectedPropertyId && propertyId === selectedPropertyId;

                    const isClosestFallback =
                      recommendationType === "inventory_fallback" &&
                      inventoryFallbackProperty &&
                      propertyId ===
                        (inventoryFallbackProperty.id ||
                          inventoryFallbackProperty._id ||
                          inventoryFallbackProperty._normalizedId);

                    const selectedStatusMeta = getSelectedPropertyStatusMeta(
                      isSelected ? selectedPropertyStatus : null,
                      isSelected
                    );

                    return (
                      <div key={propertyId}>
                        <PropertyCard
                          property={{
                            ...p,
                            id: propertyId,
                            precio: propertyPrice,
                            zona:
                              p.zona ??
                              p.ciudad ??
                              p.city ??
                              p._normalizedCity ??
                              null,
                            evaluacionHipoteca:
                              p.evaluacionHipoteca ??
                              p.evaluacionHipotecaHoy ??
                              null,
                            evaluacionHipotecaHoy:
                              p.evaluacionHipotecaHoy ??
                              p.evaluacionHipoteca ??
                              null,
                            evaluacionHipotecaFutura:
                              p.evaluacionHipotecaFutura ?? null,
                            evaluacionEntrada: p.evaluacionEntrada ?? null,
                          }}
                          onClick={() => navigate(`/property/${propertyId}`)}
                        />

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {isSelected ? (
                            <>
                              {selectedStatusMeta.chip ? (
                                <Pill tone={selectedStatusMeta.chipTone}>
                                  {selectedStatusMeta.chip}
                                </Pill>
                              ) : null}

                              {selectedStatusMeta.secondaryChip ? (
                                <Pill tone={selectedStatusMeta.secondaryTone}>
                                  {selectedStatusMeta.secondaryChip}
                                </Pill>
                              ) : null}
                            </>
                          ) : null}

                          {isClosestFallback ? (
                            <>
                              <Pill tone="amber">Alternativa cercana principal</Pill>
                              {goalValue != null ? (
                                <Pill>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <Target size={12} />
                                    Meta {moneyUSD(goalValue)}
                                  </span>
                                </Pill>
                              ) : null}
                            </>
                          ) : null}

                          {Array.isArray(p.matchedProducts) &&
                          p.matchedProducts.length
                            ? [...new Set(p.matchedProducts)]
                                .slice(0, 2)
                                .map((prodId, chipIdx) => (
                                  <Pill
                                    key={`${propertyId}-${prodId}-${chipIdx}`}
                                    tone="green"
                                  >
                                    Compatible con{" "}
                                    {getPropertyProgramLabel(prodId)}
                                  </Pill>
                                ))
                            : null}
                        </div>

                        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                          {isSelected ? (
                            <>
                              <SecondaryButton disabled style={{ opacity: 1 }}>
                                {selectedPropertyStatus === "selected_viable_now"
                                  ? "Propiedad elegida"
                                  : selectedPropertyStatus ===
                                    "selected_future_viable"
                                  ? "Propiedad elegida · ruta futura"
                                  : selectedPropertyStatus ===
                                    "selected_near_route"
                                  ? "Propiedad elegida · revisar encaje"
                                  : selectedPropertyStatus ===
                                    "selected_no_longer_viable"
                                  ? "Propiedad elegida · ya no calza hoy"
                                  : "Propiedad elegida"}
                              </SecondaryButton>

                              <PrimaryButton
                                onClick={() =>
                                  selectedStatusMeta.ctaTone === "alternatives"
                                    ? navigate("/marketplace")
                                    : navigate("/ruta")
                                }
                              >
                                {selectedStatusMeta.ctaLabel}
                              </PrimaryButton>

                              <SecondaryButton
                                onClick={() => navigate(`/property/${propertyId}`)}
                              >
                                Ver detalle
                              </SecondaryButton>
                            </>
                          ) : (
                            <>
                              <PrimaryButton onClick={() => handleChooseProperty(p)}>
                                {selectedPropertyId
                                  ? "Elegir en su lugar"
                                  : "Elegir esta propiedad"}
                              </PrimaryButton>

                              <SecondaryButton
                                onClick={() => navigate(`/property/${propertyId}`)}
                              >
                                Ver detalle
                              </SecondaryButton>
                            </>
                          )}
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
                        ? "Prueba otra zona o cambia a opciones ampliadas para ver más alternativas."
                        : "Prueba otra zona o cambia a opciones ampliadas para ver más propiedades."
                    }
                    cta="Volver a calcular"
                    onClick={() => navigate("/journey/full")}
                  />
                )}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
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
                    {mainRate != null || mainCuota != null || mainMonto != null ? (
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

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {mainPlazo != null ? (
                            <Pill>{formatYearsFromMonths(mainPlazo)}</Pill>
                          ) : null}
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
                        subtitle="Vuelve a calcular para recalcular tu match."
                        cta="Volver a calcular"
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
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
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

                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              opacity: 0.78,
                              lineHeight: 1.35,
                            }}
                          >
                            {b?.tipoProducto ? `Tipo: ${b.tipoProducto}` : "Tipo: —"}
                            {" • "}
                            {tasaAlt != null
                              ? `Tasa: ${formatRate(tasaAlt)}`
                              : "Tasa: —"}
                            {" • "}
                            {cuotaAlt != null && cuotaAlt > 0
                              ? `Cuota: ${moneyUSD(cuotaAlt)}`
                              : "Cuota: —"}
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
              </div>
            </div>
          ) : null}
        </>
      )}
    </ScreenWrap>
  );
}