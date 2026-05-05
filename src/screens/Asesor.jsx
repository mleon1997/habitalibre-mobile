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
    PRIVATE_BANK: "Banca Privada",
    PRIVATE: "Banca Privada",
    BANCA_PRIVADA: "Banca Privada",
    BIESS: "BIESS",
  };

  return map[key] || String(value || "Entidad financiera");
}

function getMortgageProductLabel(value, fallback = "Hipoteca") {
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
    PRIVATE: "Hipoteca Privada",
    PRIVATE_BANK: "Banca Privada",
  };

  return map[key] || fallback || String(value || "Hipoteca");
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
    getMortgageProductLabel(mortgageId, "Hipoteca");

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

function buildQuestionAnswer(questionId, ctx) {
  const route = ctx.route || {};
  const property = ctx.property || null;

  const bank = route.providerLabel || "la entidad recomendada";
  const product = route.productLabel || "esta hipoteca";
  const cuota = n(route.cuota);
  const monto = n(route.montoPrestamo);
  const rate = route.annualRate;
  const valorVivienda = n(route.valorViviendaEstimado);
  const factor = String(route.factorLimitante || "").toLowerCase();

  if (questionId === "why") {
    return {
      title: "¿Por qué esta ruta puede servirte?",
      paragraphs: [
        `Esta ruta aparece porque tu perfil encaja con las condiciones principales de ${product}.`,
        `La referencia actual es ${bank}, con una cuota estimada de ${
          cuota ? moneyUSD(cuota) : "—"
        } y una tasa referencial de ${rate != null ? formatRate(rate) : "—"}.`,
      ],
      bullets: [
        route.probabilidad
          ? `Probabilidad estimada: ${route.probabilidad}.`
          : null,
        valorVivienda
          ? `Valor de vivienda estimado: hasta ${moneyUSD(valorVivienda)}.`
          : null,
        monto ? `Monto financiado aproximado: ${moneyUSD(monto)}.` : null,
      ].filter(Boolean),
    };
  }

  if (questionId === "payment") {
    return {
      title: "¿Qué significa mi cuota estimada?",
      paragraphs: [
        "La cuota estimada es una referencia mensual para comparar si esta ruta entra dentro de tu capacidad actual.",
        "No es una aprobación final ni una oferta definitiva del banco. Es una estimación para ayudarte a decidir mejor.",
      ],
      bullets: [
        cuota ? `Cuota referencial: ${moneyUSD(cuota)} al mes.` : null,
        rate != null ? `Tasa usada en la estimación: ${formatRate(rate)}.` : null,
        valorVivienda
          ? `Valor de vivienda usado como referencia: ${moneyUSD(valorVivienda)}.`
          : null,
        monto ? `Monto financiado aproximado: ${moneyUSD(monto)}.` : null,
      ].filter(Boolean),
    };
  }

  if (questionId === "improve") {
    let mainAdvice =
      "Mantener deudas bajas, mejorar ingreso demostrable y elegir una propiedad dentro de tu rango puede fortalecer tu perfil.";

    if (factor === "cuota") {
      mainAdvice =
        "Tu principal punto a cuidar parece ser la cuota. Reducir deudas o mejorar ingreso disponible puede ayudarte a sostener mejor esta ruta.";
    }

    if (factor === "entrada") {
      mainAdvice =
        "Tu principal punto a mejorar parece ser la entrada. Aumentar la entrada disponible puede abrir mejores opciones.";
    }

    if (factor === "programa") {
      mainAdvice =
        "Tu principal punto a revisar parece ser el encaje con el programa. Conviene verificar que la vivienda cumpla las condiciones de esta ruta.";
    }

    return {
      title: "¿Qué puedo mejorar?",
      paragraphs: [mainAdvice],
      bullets: [
        "Evita asumir nuevas deudas antes de avanzar.",
        "Mantén ingresos demostrables y consistentes.",
        "Compara propiedades dentro del rango sugerido.",
        "Confirma que la vivienda elegida calce con el programa hipotecario.",
      ],
    };
  }

  if (questionId === "docs") {
    return {
      title: "¿Qué documentos debería preparar?",
      paragraphs: [
        "Todavía no necesitas enviar nada desde aquí. Esta guía solo te ayuda a entender qué deberías tener listo cuando decidas avanzar.",
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
        "Cambiar de propiedad puede cambiar el resultado, porque el precio, tipo de vivienda y programa aplicable influyen en la ruta hipotecaria.",
        property
          ? `Ahora estás usando como referencia: ${property.titulo}.`
          : "Todavía no vemos una propiedad elegida como base en esta pantalla.",
      ],
      bullets: [
        "Una vivienda más barata puede mejorar la viabilidad.",
        "Una vivienda nueva puede abrir rutas VIS/VIP si cumple condiciones.",
        "Una vivienda fuera del rango del programa puede requerir otra hipoteca.",
      ],
    };
  }

  if (questionId === "ready") {
    const isCurrentGoal = route.appliesToCurrentGoal === true;
    const isAdjusted = route.couldWorkIfAdjusted === true;

    return {
      title: "¿Estoy listo para avanzar?",
      paragraphs: [
        isCurrentGoal
          ? "Con los datos actuales, esta ruta se ve alineada con tu perfil y con la meta que estás revisando."
          : isAdjusted
          ? "Esta ruta podría servir como camino de trabajo, pero quizá requiere ajustar rango, entrada o condiciones antes de avanzar."
          : "Esta ruta es una referencia útil, pero todavía conviene revisar bien propiedad, documentos y condiciones antes de avanzar.",
      ],
      bullets: [
        property
          ? "Ya tienes una propiedad base para revisar."
          : "Te conviene elegir una propiedad base.",
        route.status === "confirmed"
          ? "Esta ruta ya fue confirmada en tu camino."
          : "Puedes confirmar esta ruta para que aparezca como paso completado en Ruta.",
        "Después de confirmar, el siguiente paso lógico es preparar documentos.",
      ],
    };
  }

  return {
    title: "Guía rápida",
    paragraphs: [
      "Esta guía usa tu información de HabitaLibre para explicar tu ruta hipotecaria de forma simple.",
    ],
    bullets: [],
  };
}

const quickQuestions = [
  {
    id: "why",
    label: "¿Por qué me recomiendan esta hipoteca?",
  },
  {
    id: "payment",
    label: "¿Qué significa mi cuota estimada?",
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
    label: "¿Estoy listo para avanzar?",
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
              Guía AI hipotecaria
            </div>

            <h1
              style={{
                margin: "8px 0 0 0",
                fontSize: 30,
                lineHeight: 1.05,
                letterSpacing: -0.6,
              }}
            >
              Aclaremos tu hipoteca
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
              Te explicamos esta ruta antes de que decidas avanzar.
            </div>
          </div>

          <Chip tone="neutral">AI</Chip>
        </div>

        {hasRoute ? (
          <Card style={{ marginTop: 18 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip tone={routeConfirmed ? "good" : "neutral"}>
                {routeConfirmed ? "Ruta confirmada" : "Estás revisando"}
              </Chip>

              {route?.productLabel ? (
                <Chip tone="neutral">{String(route.productLabel)}</Chip>
              ) : null}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>
                {route?.providerLabel || "Ruta hipotecaria"}
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
                Esta es la ruta que estás revisando. La guía te ayuda a entender
                cuota, monto y próximos pasos.
              </div>
            </div>

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
                  Valor vivienda estimado
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
                  {route?.valorViviendaEstimado != null
                    ? moneyUSD(route.valorViviendaEstimado)
                    : "—"}
                </div>
              </InnerCard>

              <InnerCard style={{ marginTop: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.68, fontWeight: 800 }}>
                  Cuota estimada
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
                  Monto financiado {moneyUSD(route.montoPrestamo)}
                </Chip>
              ) : null}

              {route?.annualRate != null ? (
                <Chip tone="neutral">Tasa {formatRate(route.annualRate)}</Chip>
              ) : null}

              {route?.probabilidad ? (
                <Chip tone="neutral">Probabilidad {route.probabilidad}</Chip>
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
                  : "Confirmar esta ruta en mi camino"}
              </PrimaryButton>

              <SecondaryButton onClick={() => nav("/marketplace")}>
                Volver a comparar hipotecas
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
              Primero compara tus opciones hipotecarias en Match. Luego vuelve
              aquí para resolver dudas sobre la ruta que más te interese.
            </div>

            <div style={{ marginTop: 14 }}>
              <PrimaryButton onClick={() => nav("/marketplace")}>
                Ver hipotecas en Match
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
              <div>1) Entiende por qué esta ruta encaja contigo.</div>
              <div>2) Resuelve dudas sobre cuota, tasa y monto posible.</div>
              <div>3) Confirma la hipoteca si quieres avanzar.</div>
              <div>4) Sigue tu progreso desde la pantalla Ruta.</div>
            </div>
          </InnerCard>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              opacity: 0.62,
              lineHeight: 1.4,
            }}
          >
            Esta guía usa los datos calculados por HabitaLibre. No representa
            una aprobación final ni una oferta definitiva de una entidad
            financiera.
          </div>
        </Card>
      </div>
    </Screen>
  );
}