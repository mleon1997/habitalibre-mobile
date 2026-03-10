// src/screens/Marketplace.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { moneyUSD } from "../lib/money";
import PropertyCard from "../components/PropertyCard.jsx";
import mockProperties from "../data/mockProperties.js";

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

function pick(snapshot, keys) {
  if (!snapshot) return null;
  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }
  return null;
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
  return `${(x * 100).toFixed(2)}%`;
}

function formatYearsFromMonths(v) {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return "—";
  const years = Math.round(x / 12);
  return `${years} años`;
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
  if (tipo === "NORMAL" || tipo === "PRIVADA" || tipo === "COMERCIAL") {
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
    pick(snapshot, ["cuotaEstimada"]);

  if (cuota != null) {
    reasons.push(`Cuota estimada ${moneyUSD(cuota)}`);
  }

  if (bank?.tipoProducto) {
    reasons.push(`Ruta ${String(bank.tipoProducto).toLowerCase()}`);
  }

  const precioMax =
    scenario?.precioMaxVivienda ??
    bestMortgage?.precioMaxVivienda ??
    pick(snapshot, ["precioMaxVivienda", "precioMax", "valorMaxVivienda"]);

  if (precioMax != null) {
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
      priceMax: Number.isFinite(vis?.precioMaxVivienda) ? vis.precioMaxVivienda : 0,
      requiresFirstHome: true,
      requiresNewConstruction: true,
      requiresMiduviQualifiedProject: false,
    },
    VIP: {
      viable: !!vip?.viable,
      priceMax: Number.isFinite(vip?.precioMaxVivienda) ? vip.precioMaxVivienda : 0,
      requiresFirstHome: true,
      requiresNewConstruction: true,
      requiresMiduviQualifiedProject: false,
    },
    BIESS_CREDICASA: {
      viable: !!biess?.viable,
      priceMax: Number.isFinite(biess?.precioMaxVivienda) ? biess.precioMaxVivienda : 0,
      requiresFirstHome: false,
      requiresNewConstruction: false,
      requiresMiduviQualifiedProject: false,
    },
    PRIVATE: {
      viable: !!privada?.viable,
      priceMax: Number.isFinite(privada?.precioMaxVivienda) ? privada.precioMaxVivienda : 0,
      requiresFirstHome: false,
      requiresNewConstruction: false,
      requiresMiduviQualifiedProject: false,
    },
  };
}

function getPropertyMatchProducts(property, eligibilityProducts, allowedProductIds = []) {
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

/* ---------------- design tokens ---------------- */
const UI = {
  bg: "linear-gradient(180deg, #071024 0%, #0b1a35 100%)",
  card: "rgba(255,255,255,0.06)",
  card2: "rgba(0,0,0,0.18)",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  green: "#25d3a6",
  greenBg: "rgba(37,211,166,0.10)",
  greenBorder: "rgba(37,211,166,0.25)",
  shadow: "0 10px 30px rgba(0,0,0,0.22)",
  shadowSoft: "0 10px 30px rgba(0,0,0,0.18)",
};

function Pill({ children, onClick, tone = "neutral" }) {
  const isClickable = !!onClick;
  const bg =
    tone === "green" ? "rgba(37,211,166,0.14)" : "rgba(255,255,255,0.08)";
  const br =
    tone === "green" ? "rgba(37,211,166,0.28)" : "rgba(255,255,255,0.10)";

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
        border: `1px solid rgba(255,255,255,0.16)`,
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
              border: `1px solid ${active ? UI.greenBorder : "rgba(255,255,255,0.14)"}`,
              background: active ? "rgba(37,211,166,0.14)" : "rgba(255,255,255,0.06)",
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
  const bestMortgage = pick(snapshot, ["bestMortgage"]);
  const banks = pick(snapshot, ["bancosTop3"]);
  const cuota = pick(snapshot, ["cuotaEstimada"]);
  const precioMax = pick(snapshot, ["precioMaxVivienda", "precioMax", "valorMaxVivienda"]);

  return (
    !!bestMortgage ||
    (Array.isArray(banks) && banks.length > 0) ||
    cuota != null ||
    precioMax != null
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>🔒 Match bloqueado</div>
          <Pill tone="green">2 minutos</Pill>
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
          Completa tu simulación para ver tu match real
        </div>

        <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.35, fontSize: 13 }}>
          HabitaLibre solo muestra propiedades e hipotecas que realmente puedes comprar según tu
          capacidad y entrada.
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
              border: `1px solid ${active ? UI.greenBorder : "rgba(255,255,255,0.14)"}`,
              background: active ? "rgba(37,211,166,0.14)" : "rgba(255,255,255,0.06)",
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

  const snapshot = useMemo(() => loadJSON(LS_SNAPSHOT), []);
  useMemo(() => loadJSON(LS_JOURNEY), []);
  const unlocked = useMemo(() => hasResult(snapshot), [snapshot]);

  const [tab, setTab] = useState("props");
  const [zona, setZona] = useState("Quito");
  const [propertyMode, setPropertyMode] = useState("strict");

  const bestMortgage = pick(snapshot, ["bestMortgage"]) || null;
  const bancosTop3 = pick(snapshot, ["bancosTop3"]) || [];
  const bestRoute = pick(snapshot, ["rutaRecomendada"]) || null;

  const eligibilityProducts =
    pick(snapshot, ["eligibilityProducts"]) || buildEligibilityFallback(snapshot);

  const propertyRecommendationPolicy =
    pick(snapshot, ["propertyRecommendationPolicy"]) || null;

  const productoElegido =
    bestMortgage?.label ||
    bestRoute?.tipo ||
    pick(snapshot, ["productoElegido", "productoSugerido"]) ||
    "Sin oferta viable hoy";

  const precioMaxVivienda =
    bestMortgage?.precioMaxVivienda ??
    pick(snapshot, ["precioMaxVivienda", "precioMax", "valorMaxVivienda"]);

  const cuotaEstimada =
    bestMortgage?.cuota ??
    pick(snapshot, ["cuotaEstimada"]) ??
    null;

  const banks = Array.isArray(bancosTop3) ? bancosTop3 : [];
  const recommendedBank = banks.length ? banks[0] : null;
  const alternativeBanks = banks.slice(1, 3);

  const recommendedScenario = recommendedBank
    ? getScenarioForBank(recommendedBank, snapshot)
    : null;

  const mainRate =
    recommendedBank?.tasaAnual ??
    recommendedScenario?.tasaAnual ??
    pick(snapshot, ["tasaAnual"]);

  const mainCuota =
    recommendedBank?.cuota ??
    recommendedScenario?.cuota ??
    pick(snapshot, ["cuotaEstimada"]);

  const mainMonto =
    recommendedBank?.montoPrestamo ??
    recommendedScenario?.montoPrestamo ??
    pick(snapshot, ["montoMaximo"]);

  const mainPlazo =
    recommendedBank?.plazoMeses ??
    recommendedScenario?.plazoMeses ??
    pick(snapshot, ["plazoMeses"]);

  const strictProductIds = Array.isArray(propertyRecommendationPolicy?.strictProductIds) &&
    propertyRecommendationPolicy.strictProductIds.length
    ? propertyRecommendationPolicy.strictProductIds
    : (() => {
        const legacyId = getLegacyRecommendedProductId(snapshot);
        return legacyId ? [legacyId] : [];
      })();

  const recommendedProductIds = Array.isArray(propertyRecommendationPolicy?.recommendedProductIds) &&
    propertyRecommendationPolicy.recommendedProductIds.length
    ? propertyRecommendationPolicy.recommendedProductIds
    : strictProductIds;

  const allowedProductIds =
    propertyMode === "strict" ? strictProductIds : recommendedProductIds;

  const enrichedProps = useMemo(() => {
    return mockProperties
      .filter((p) => (zona ? p.zona === zona : true))
      .map((p) => ({
        ...p,
        matchedProducts: getPropertyMatchProducts(p, eligibilityProducts, allowedProductIds),
      }))
      .filter((p) => p.matchedProducts.length > 0)
      .sort((a, b) => a.precio - b.precio);
  }, [zona, eligibilityProducts, allowedProductIds]);

  const subtitle = unlocked
    ? "Propiedades y rutas según tu precalificación"
    : "Haz tu simulación para ver solo lo que realmente puedes comprar";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
            <Pill tone="green">{String(productoElegido)}</Pill>
            {typeof precioMaxVivienda === "number" ? (
              <Pill>Máx {moneyUSD(precioMaxVivienda)}</Pill>
            ) : (
              <Pill>Máx —</Pill>
            )}
            {typeof cuotaEstimada === "number" ? (
              <Pill>Cuota {moneyUSD(cuotaEstimada)}</Pill>
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
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.35 }}>
                      Por defecto te mostramos solo propiedades alineadas con tu ruta recomendada.
                    </div>
                  </div>
                  <Pill tone="green">Match</Pill>
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
                        propertyMode === "strict" ? UI.greenBorder : "rgba(255,255,255,0.14)"
                      }`,
                      background:
                        propertyMode === "strict"
                          ? "rgba(37,211,166,0.14)"
                          : "rgba(255,255,255,0.06)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    Solo mi mejor ruta
                  </button>

                  <button
                    onClick={() => setPropertyMode("flex")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: `1px solid ${
                        propertyMode === "flex" ? UI.greenBorder : "rgba(255,255,255,0.14)"
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

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {enrichedProps.length ? (
                  enrichedProps.map((p) => (
                    <div key={p.id}>
                      <PropertyCard
                        property={p}
                        onClick={() => navigate(`/property/${p.id}`)}
                      />

                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {p.matchedProducts.slice(0, 2).map((prodId) => (
                          <Pill key={prodId} tone="green">
                            Compatible con {getPropertyProgramLabel(prodId)}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No encontramos propiedades compatibles en esta zona"
                    subtitle="Prueba otra zona o cambia a opciones ampliadas para ver más alternativas."
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
                      🏦 Tu mejor hipoteca hoy
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>
                      {recommendedBank?.banco || pick(snapshot, ["bancoSugerido"]) || "Aún estamos calculando"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.35 }}>
                      {recommendedBank
                        ? "Basado en tu perfil, esta es la mejor ruta para empezar tu solicitud."
                        : "Aquí verás tu mejor recomendación hipotecaria."}
                    </div>
                  </div>

                  {recommendedBank ? (
                    <Pill tone={probTone(recommendedBank?.probLabel)}>
                      {recommendedBank?.probLabel
                        ? `Prob ${recommendedBank.probLabel}`
                        : recommendedBank?.probScore != null
                          ? `Score ${recommendedBank.probScore}`
                          : "Top match"}
                    </Pill>
                  ) : (
                    <Pill>Estimando</Pill>
                  )}
                </div>

                {(recommendedBank || mainRate != null || mainCuota != null || mainMonto != null) ? (
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
                        <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>Tasa</div>
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
                        <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>Cuota</div>
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
                        <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>Monto</div>
                        <div style={{ marginTop: 4, fontWeight: 900, fontSize: 15 }}>
                          {mainMonto != null ? moneyUSD(mainMonto) : "—"}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {mainPlazo != null ? <Pill>{formatYearsFromMonths(mainPlazo)}</Pill> : null}
                      {recommendedBank?.tipoProducto ? (
                        <Pill>{String(recommendedBank.tipoProducto)}</Pill>
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
                        {getBankReasons(recommendedBank, snapshot, recommendedScenario, bestMortgage).map((reason, idx) => (
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                            {cuotaAlt != null ? `Cuota: ${moneyUSD(cuotaAlt)}` : "Cuota: —"}
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