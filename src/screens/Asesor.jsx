// src/screens/Asesor.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { moneyUSD } from "../lib/money";
import {
  Screen,
  Card,
  InnerCard,
  Chip,
  PrimaryButton,
  SecondaryButton,
} from "../ui/kit.jsx";
import { getCustomer } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";
const LS_SELECTED_MORTGAGE_ROUTE = "hl_selected_mortgage_route_v1";

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

function deepPick(snapshot, paths) {
  if (!snapshot) return null;

  for (const path of paths) {
    const parts = String(path).split(".");
    let current = snapshot;

    for (const part of parts) {
      if (current == null) break;
      current = current?.[part];
    }

    if (current != null) return current;
  }

  return null;
}

function n(v, def = null) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function formatRate(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";

  const rate = x <= 1 ? x * 100 : x;
  return `${rate.toFixed(2)}%`;
}

function getProviderLabel(value) {
  const key = String(value || "").trim().toUpperCase();

  const map = {
    PRIVATE_BANK: "Banca privada",
    PRIVATE: "Banca privada",
    BANCA_PRIVADA: "Banca privada",
    BIESS: "BIESS",
  };

  return map[key] || String(value || "Entidad financiera");
}

function getMortgageProductLabel(value, fallback = "Ruta hipotecaria referencial") {
  const key = String(value || "").trim().toUpperCase();

  const map = {
    VIS: "Vivienda de Interés Social",
    VIP: "Vivienda de Interés Público",
    VIS_II: "Subsidio VIS II",
    BIESS: "BIESS",
    BIESS_CREDICASA: "BIESS Vivienda Premier 2.99%",
    BIESS_VIS_VIP: "BIESS Vivienda VIS / VIP",
    BIESS_MEDIA: "BIESS Vivienda Media",
    BIESS_ALTA: "BIESS Vivienda Alta",
    BIESS_LUJO: "BIESS Vivienda de Lujo",
    PRIVATE: "Ruta hipotecaria privada",
    PRIVATE_BANK: "Banca privada",
  };

  return map[key] || fallback || String(value || "Ruta hipotecaria referencial");
}

function normalizeMortgageRoute(route, snapshot) {
  if (!route && !snapshot) return null;

  const bestMortgage = pick(snapshot, ["bestMortgage"]);
  const mortgageMarketplace = pick(snapshot, ["mortgageMarketplace"]) || {};

  const marketplaceOption =
    mortgageMarketplace?.bestForCurrentGoal ||
    (Array.isArray(mortgageMarketplace?.couldWorkIfAdjusted)
      ? mortgageMarketplace.couldWorkIfAdjusted[0]
      : null);

  const source = route || marketplaceOption || bestMortgage || {};

  const mortgageId =
    source?.mortgageId ||
    source?.id ||
    source?.product?.id ||
    bestMortgage?.mortgageId ||
    null;

  const providerRaw =
    source?.provider ||
    source?.channel ||
    source?.product?.channel ||
    source?.banco ||
    source?.providerLabel ||
    bestMortgage?.provider ||
    null;

  const providerLabel =
    source?.providerLabel ||
    source?.banco ||
    getProviderLabel(providerRaw);

  const productLabel =
    source?.productLabel ||
    source?.tipoProducto ||
    source?.label ||
    source?.name ||
    source?.product?.name ||
    getMortgageProductLabel(mortgageId, "Ruta hipotecaria referencial");

  const montoPrestamo =
    source?.montoPrestamo ??
    source?.loanAmount ??
    source?.monto ??
    bestMortgage?.montoPrestamo ??
    pick(snapshot, ["montoMaximo", "loanAmount", "maxLoanAmount"]) ??
    null;

  const cuota =
    source?.cuota ??
    source?.monthlyPayment ??
    bestMortgage?.cuota ??
    pick(snapshot, ["cuotaEstimada", "cuotaMensual", "monthlyPayment"]) ??
    null;

  const annualRate =
    source?.annualRate ??
    source?.tasaAnual ??
    source?.rate ??
    bestMortgage?.annualRate ??
    pick(snapshot, ["tasaAnual", "annualRate", "interestRate"]) ??
    null;

  const probabilidad =
    source?.probabilidad ||
    source?.probLabel ||
    bestMortgage?.probabilidad ||
    pick(snapshot, ["probabilidad"]) ||
    null;

  const precioMaxVivienda =
    source?.precioMaxVivienda ??
    source?.priceMax ??
    bestMortgage?.precioMaxVivienda ??
    pick(snapshot, [
      "precioMaxVivienda",
      "precioMax",
      "valorMaxVivienda",
      "precioMaxPerfil",
      "propertyPrice",
    ]) ??
    null;

  const valorViviendaEstimado =
    source?.valorViviendaEstimado ??
    source?.valorVivienda ??
    source?.homeValue ??
    source?.propertyValue ??
    source?.precioMaxVivienda ??
    source?.priceMax ??
    deepPick(snapshot, [
      "financialCapacity.estimatedMaxPropertyValue",
      "output.financialCapacity.estimatedMaxPropertyValue",
      "maxCompra",
      "kpis.maxCompra",
      "resultado.maxCompra",
      "precioMaxVivienda",
      "output.precioMaxVivienda",
      "precioMax",
      "output.precioMax",
      "valorMaxVivienda",
      "output.valorMaxVivienda",
      "homePrice",
      "output.homePrice",
    ]) ??
    precioMaxVivienda ??
    null;

  return {
    scenarioId: source?.scenarioId || null,
    mortgageId,
    providerLabel,
    productLabel,
    banco: providerLabel,
    tipoProducto: productLabel,
    montoPrestamo,
    cuota,
    annualRate,
    tasaAnual: annualRate,
    probabilidad,
    probLabel: probabilidad,
    precioMaxVivienda,
    priceMax: precioMaxVivienda,
    valorViviendaEstimado,
    factorLimitante: source?.factorLimitante || null,
    appliesToCurrentGoal: source?.appliesToCurrentGoal === true,
    couldWorkIfAdjusted: source?.couldWorkIfAdjusted === true,
    status: source?.status || "reviewing",
    source: source?.source || "guia_ai",
    selectedAt: source?.selectedAt || null,
  };
}

function normalizeSelectedProperty(property) {
  if (!property) return null;

  return {
    id: property?.id || property?._id || property?.propertyId || null,
    titulo:
      property?.titulo ||
      property?.nombre ||
      property?.title ||
      property?.name ||
      property?.proyecto ||
      "Propiedad elegida",
    ciudad:
      property?.ciudad ||
      property?.city ||
      property?.zona ||
      property?.sector ||
      "Ubicación pendiente",
    precio: property?.precio ?? property?.price ?? property?.valor ?? null,
    dormitorios: property?.dormitorios ?? property?.rooms ?? null,
    m2: property?.m2 ?? property?.area ?? null,
  };
}

function FinancialDisclaimer({ compact = false }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: 16,
        border: "1px solid rgba(245,158,11,0.22)",
        background: "rgba(245,158,11,0.08)",
        color: "rgba(254,243,199,0.96)",
        fontSize: 11,
        lineHeight: 1.42,
      }}
    >
      <strong>Estimación referencial.</strong>{" "}
      {compact
        ? "HabitaLibre no otorga ni aprueba créditos. Las condiciones finales dependen de cada entidad financiera."
        : "HabitaLibre no es banco, cooperativa, prestamista ni entidad financiera. No otorgamos, aprobamos, financiamos, intermediamos ni cobramos créditos. Esta guía usa datos declarados y simulaciones referenciales para orientación hipotecaria. La aprobación final, tasa, plazo, cuota, fechas de pago y condiciones dependen exclusivamente de la entidad financiera regulada."}
    </div>
  );
}

function buildQuestionAnswer(questionId, ctx) {
  const route = ctx.route || {};
  const property = ctx.property || null;

  const provider = route.providerLabel || "la entidad de referencia";
  const product = route.productLabel || "esta ruta referencial";
  const cuota = n(route.cuota);
  const monto = n(route.montoPrestamo);
  const rate = route.annualRate;
  const valorVivienda = n(route.valorViviendaEstimado);
  const factor = String(route.factorLimitante || "").toLowerCase();

  if (questionId === "why") {
    return {
      title: "¿Por qué aparece esta ruta referencial?",
      paragraphs: [
        `Esta ruta aparece porque tus datos declarados parecen compatibles con criterios generales de ${product}.`,
        `Como referencia de mercado, se muestra ${provider}, con una cuota referencial de ${
          cuota ? moneyUSD(cuota) : "—"
        } y una tasa anual referencial de ${rate != null ? formatRate(rate) : "—"}.`,
      ],
      bullets: [
        route.probabilidad
          ? `Compatibilidad estimada: ${route.probabilidad}.`
          : null,
        valorVivienda
          ? `Valor de vivienda usado como referencia: hasta ${moneyUSD(valorVivienda)}.`
          : null,
        monto ? `Monto estimado a financiar: ${moneyUSD(monto)}.` : null,
      ].filter(Boolean),
    };
  }

  if (questionId === "payment") {
    return {
      title: "¿Qué significa mi cuota referencial?",
      paragraphs: [
        "La cuota referencial es una estimación mensual para comparar si esta ruta podría entrar dentro de tu rango actual.",
        "No es aprobación, oferta, promesa de financiamiento ni evaluación formal de ninguna entidad financiera.",
      ],
      bullets: [
        cuota ? `Cuota referencial: ${moneyUSD(cuota)} al mes.` : null,
        rate != null ? `Tasa anual usada como referencia: ${formatRate(rate)}.` : null,
        valorVivienda
          ? `Valor de vivienda usado como referencia: ${moneyUSD(valorVivienda)}.`
          : null,
        monto ? `Monto estimado a financiar: ${moneyUSD(monto)}.` : null,
      ].filter(Boolean),
    };
  }

  if (questionId === "improve") {
    let mainAdvice =
      "Mantener deudas bajas, mejorar ingreso demostrable y elegir una propiedad dentro de tu rango estimado puede fortalecer tu preparación.";

    if (factor === "cuota") {
      mainAdvice =
        "Tu principal punto a cuidar parece ser la cuota referencial. Reducir deudas o mejorar ingreso disponible puede ayudarte a sostener mejor esta ruta.";
    }

    if (factor === "entrada") {
      mainAdvice =
        "Tu principal punto a mejorar parece ser la entrada. Aumentar la entrada disponible puede abrir rutas referenciales más cómodas.";
    }

    if (factor === "programa") {
      mainAdvice =
        "Tu principal punto a revisar parece ser el encaje con la categoría hipotecaria. Conviene verificar que la vivienda cumpla las condiciones generales de esta ruta.";
    }

    return {
      title: "¿Qué puedo mejorar?",
      paragraphs: [mainAdvice],
      bullets: [
        "Evita asumir nuevas deudas antes de avanzar.",
        "Mantén ingresos demostrables y consistentes.",
        "Compara propiedades dentro de tu rango estimado.",
        "Confirma que la vivienda elegida calce con la categoría hipotecaria referencial.",
      ],
    };
  }

  if (questionId === "docs") {
    return {
      title: "¿Qué documentos debería preparar?",
      paragraphs: [
        "Todavía no necesitas enviar nada desde aquí. Esta guía solo te ayuda a entender qué podrías tener listo si decides avanzar en tu proceso de compra.",
      ],
      bullets: [
        "Cédula o documento de identidad.",
        "Justificativos de ingresos.",
        "Soporte de estabilidad laboral o actividad económica.",
        "Información básica de la propiedad que quieres comprar.",
        "Detalle de deudas o compromisos mensuales actuales.",
      ],
    };
  }

  if (questionId === "property") {
    return {
      title: "¿Qué pasa si cambio de propiedad?",
      paragraphs: [
        "Cambiar de propiedad puede cambiar tu estimación, porque el precio, tipo de vivienda y categoría aplicable influyen en la ruta referencial.",
        property
          ? `Ahora estás usando como referencia: ${property.titulo}.`
          : "Todavía no vemos una propiedad elegida como base en esta pantalla.",
      ],
      bullets: [
        "Una vivienda más barata puede mejorar tu rango estimado.",
        "Una vivienda nueva puede abrir rutas VIS/VIP si cumple condiciones generales.",
        "Una vivienda fuera del rango de una categoría puede requerir otra ruta referencial.",
      ],
    };
  }

  if (questionId === "ready") {
    const isCurrentGoal = route.appliesToCurrentGoal === true;
    const isAdjusted = route.couldWorkIfAdjusted === true;

    return {
      title: "¿Estoy preparado para avanzar?",
      paragraphs: [
        isCurrentGoal
          ? "Con los datos actuales, esta ruta se ve alineada de forma referencial con tu perfil y con la meta que estás revisando."
          : isAdjusted
          ? "Esta ruta podría servir como camino de trabajo, pero quizá requiere ajustar rango, entrada o condiciones antes de avanzar."
          : "Esta ruta es una referencia útil, pero todavía conviene revisar bien propiedad, documentos y condiciones antes de avanzar.",
      ],
      bullets: [
        property
          ? "Ya tienes una propiedad base para revisar."
          : "Te conviene elegir una propiedad base.",
        route.status === "confirmed"
          ? "Esta ruta ya fue guardada en tu camino."
          : "Puedes guardar esta ruta referencial para que aparezca como paso completado en Ruta.",
        "Después de guardar la ruta, el siguiente paso lógico es preparar documentos.",
      ],
    };
  }

  return {
    title: "Guía rápida",
    paragraphs: [
      "Esta guía usa tu información de HabitaLibre para explicar tu ruta hipotecaria referencial de forma simple.",
    ],
    bullets: [],
  };
}

const quickQuestions = [
  {
    id: "why",
    label: "¿Por qué aparece esta ruta?",
  },
  {
    id: "payment",
    label: "¿Qué significa mi cuota referencial?",
  },
  {
    id: "improve",
    label: "¿Qué puedo mejorar?",
  },
  {
    id: "docs",
    label: "¿Qué documentos debería preparar?",
  },
  {
    id: "property",
    label: "¿Qué pasa si cambio de propiedad?",
  },
  {
    id: "ready",
    label: "¿Estoy preparado para avanzar?",
  },
];

export default function Asesor() {
  const location = useLocation();
  const nav = useNavigate();

  const snapshot = useMemo(() => loadOwnedData(LS_SNAPSHOT), []);
  const journey = useMemo(() => loadOwnedData(LS_JOURNEY), []);
  const storedMortgageRoute = useMemo(
    () => loadOwnedData(LS_SELECTED_MORTGAGE_ROUTE),
    []
  );
  const storedProperty = useMemo(() => loadOwnedData(LS_SELECTED_PROPERTY), []);

  const stateBank = location.state?.selectedBank || null;
  const stateProperty = location.state?.selectedProperty || null;

  const route = useMemo(
    () => normalizeMortgageRoute(stateBank || storedMortgageRoute, snapshot),
    [stateBank, storedMortgageRoute, snapshot]
  );

  const selectedProperty = useMemo(
    () => normalizeSelectedProperty(stateProperty || storedProperty),
    [stateProperty, storedProperty]
  );

  const [selectedQuestion, setSelectedQuestion] = useState("why");

  const answer = buildQuestionAnswer(selectedQuestion, {
    route,
    property: selectedProperty,
    snapshot,
    journey,
  });

  function handleConfirmRoute() {
    if (!route) return;

    const confirmedRoute = {
      ...route,
      status: "confirmed",
      source: "guia_ai_hipotecaria",
      selectedAt: route?.selectedAt || new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    saveOwnedData(LS_SELECTED_MORTGAGE_ROUTE, confirmedRoute);

    const nextJourney = {
      ...(journey || {}),
      matchExplorado: true,
      mortgageRouteConfirmed: true,
      mortgageRoute: confirmedRoute,
      mortgageRouteConfirmedAt: new Date().toISOString(),
    };

    saveOwnedData(LS_JOURNEY, nextJourney);

    nav("/ruta");
  }

  const hasRoute = !!route;
  const routeConfirmed = route?.status === "confirmed";

  return (
    <Screen
      style={{
        paddingTop: 92,
        paddingBottom: 130,
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
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
                opacity: 0.72,
                fontWeight: 850,
              }}
            >
              Guía educativa
            </div>

            <h1
              style={{
                margin: "8px 0 0 0",
                fontSize: 30,
                lineHeight: 1.05,
                letterSpacing: -0.6,
              }}
            >
              Aclaremos tu ruta referencial
            </h1>

            <div
              style={{
                marginTop: 8,
                opacity: 0.8,
                fontSize: 15,
                lineHeight: 1.45,
                maxWidth: 420,
              }}
            >
              Te explicamos esta ruta antes de que decidas tu siguiente paso.
            </div>
          </div>

          <Chip tone="neutral">Guía</Chip>
        </div>

        {hasRoute ? (
          <Card style={{ marginTop: 18 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip tone={routeConfirmed ? "good" : "neutral"}>
                {routeConfirmed ? "Ruta guardada" : "Estás revisando"}
              </Chip>

              {route?.productLabel ? (
                <Chip tone="neutral">{String(route.productLabel)}</Chip>
              ) : null}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>
                {route?.providerLabel || "Ruta hipotecaria referencial"}
              </div>

              {route?.productLabel ? (
                <div
                  style={{
                    marginTop: 5,
                    opacity: 0.82,
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  {route.productLabel}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 8,
                  opacity: 0.78,
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                Esta es la ruta referencial que estás revisando. La guía te
                ayuda a entender cuota estimada, monto referencial y próximos
                pasos.
              </div>
            </div>

            <FinancialDisclaimer compact />

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InnerCard style={{ marginTop: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.68, fontWeight: 800 }}>
                  Valor vivienda ref.
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
                  {route?.valorViviendaEstimado != null
                    ? moneyUSD(route.valorViviendaEstimado)
                    : "—"}
                </div>
              </InnerCard>

              <InnerCard style={{ marginTop: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.68, fontWeight: 800 }}>
                  Cuota ref.
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
                  {route?.cuota != null ? moneyUSD(route.cuota) : "—"}
                </div>
              </InnerCard>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {route?.montoPrestamo != null ? (
                <Chip tone="neutral">
                  Monto estimado a financiar {moneyUSD(route.montoPrestamo)}
                </Chip>
              ) : null}

              {route?.annualRate != null ? (
                <Chip tone="neutral">Tasa ref. {formatRate(route.annualRate)}</Chip>
              ) : null}

              {route?.probabilidad ? (
                <Chip tone="neutral">Compatibilidad {route.probabilidad}</Chip>
              ) : null}

              {route?.factorLimitante ? (
                <Chip tone="neutral">
                  Revisar {String(route.factorLimitante).toLowerCase()}
                </Chip>
              ) : null}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <PrimaryButton disabled={!hasRoute} onClick={handleConfirmRoute}>
                {routeConfirmed
                  ? "Ver esta ruta en mi camino"
                  : "Guardar esta ruta referencial"}
              </PrimaryButton>

              <SecondaryButton onClick={() => nav("/marketplace")}>
                Volver a comparar rutas
              </SecondaryButton>
            </div>
          </Card>
        ) : (
          <Card style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              Todavía no hay una ruta seleccionada
            </div>

            <div
              style={{
                marginTop: 8,
                opacity: 0.8,
                lineHeight: 1.45,
                fontSize: 14,
              }}
            >
              Primero compara tus rutas hipotecarias referenciales en Match.
              Luego vuelve aquí para resolver dudas sobre la ruta que más te
              interese.
            </div>

            <FinancialDisclaimer compact />

            <div style={{ marginTop: 14 }}>
              <PrimaryButton onClick={() => nav("/marketplace")}>
                Ver rutas en Match
              </PrimaryButton>
            </div>
          </Card>
        )}

        <Card style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{answer.title}</div>

          <InnerCard>
            <div
              style={{
                display: "grid",
                gap: 10,
                fontSize: 14,
                lineHeight: 1.48,
                opacity: 0.88,
              }}
            >
              {answer.paragraphs.map((p, idx) => (
                <div key={`p-${idx}`}>{p}</div>
              ))}

              {answer.bullets.length ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  {answer.bullets.map((b, idx) => (
                    <div key={`b-${idx}`}>✓ {b}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </InnerCard>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            Otras dudas frecuentes
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 8,
            }}
          >
            {quickQuestions
              .filter((q) => q.id !== selectedQuestion)
              .map((q) => {
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuestion(q.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.045)",
                      color: "white",
                      fontWeight: 850,
                      cursor: "pointer",
                    }}
                  >
                    {q.label}
                  </button>
                );
              })}
          </div>
        </Card>

        {selectedProperty ? (
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              Propiedad usada como referencia
            </div>

            <InnerCard>
              <div style={{ fontWeight: 900, fontSize: 17 }}>
                {selectedProperty.titulo}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  opacity: 0.82,
                  lineHeight: 1.45,
                }}
              >
                {selectedProperty.ciudad}
                {selectedProperty.precio != null
                  ? ` · ${moneyUSD(selectedProperty.precio)}`
                  : ""}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {selectedProperty.m2 != null ? (
                  <Chip tone="neutral">{selectedProperty.m2} m²</Chip>
                ) : null}

                {selectedProperty.dormitorios != null ? (
                  <Chip tone="neutral">{selectedProperty.dormitorios} dorm</Chip>
                ) : null}
              </div>
            </InnerCard>
          </Card>
        ) : null}

        <Card style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            Cómo usar esta guía
          </div>

          <InnerCard>
            <div
              style={{
                display: "grid",
                gap: 8,
                fontSize: 14,
                lineHeight: 1.45,
                opacity: 0.86,
              }}
            >
              <div>1) Entiende por qué esta ruta aparece como referencia.</div>
              <div>2) Revisa cuota referencial, tasa referencial y monto estimado.</div>
              <div>3) Guarda la ruta si quieres usarla como base en tu camino.</div>
              <div>4) Sigue tu progreso desde la pantalla Ruta.</div>
            </div>
          </InnerCard>

          <FinancialDisclaimer />

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              opacity: 0.62,
              lineHeight: 1.4,
            }}
          >
            Esta guía usa los datos calculados por HabitaLibre. No representa
            aprobación, oferta, promesa de financiamiento ni evaluación formal
            de una entidad financiera.
          </div>
        </Card>
      </div>
    </Screen>
  );
}