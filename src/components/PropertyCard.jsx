// src/components/PropertyCard.jsx
import React, { useMemo } from "react";
import { moneyUSD } from "../lib/money";
import { buildPropertyPlan } from "../lib/planEngine.js";
import { Card, Chip, UI } from "../ui/kit.jsx";

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

function loadOwnedData(key) {
  const parsed = loadJSON(key);
  if (!parsed) return null;
  if (parsed?.ownerEmail && "data" in parsed) return parsed.data ?? null;
  return parsed;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatMoney(value) {
  const n = toNumber(value);
  return n != null ? moneyUSD(n) : "—";
}

function formatMonthly(value) {
  const n = toNumber(value);
  return n != null && n > 0 ? `${moneyUSD(n)}/mes` : "—";
}

function formatEstadoCompra(estado) {
  const map = {
    top_match: "Dentro de tu rango",
    apto_hoy: "Dentro de tu rango",
    APTO_HOY: "Dentro de tu rango",
    dentro_rango_actual: "Dentro de tu rango",
    entrada_viable_hipoteca_futura_viable: "Meta alcanzable",
    entrada_viable_hipoteca_futura_debil: "Requiere preparación",
    ruta_preparacion: "Requiere preparación",
    ruta_cercana: "Cerca de tu objetivo",
    fuera_de_rango: "Sobre tu rango actual",
    entrada_no_viable: "Entrada por fortalecer",
    fuera_de_reglas: "Por revisar",
  };

  return map[estado] || "Ruta por revisar";
}

function getToneFromEstado(estado, planStatus) {
  if (
    planStatus === "viable_today" ||
    estado === "top_match" ||
    estado === "apto_hoy" ||
    estado === "APTO_HOY" ||
    estado === "dentro_rango_actual" ||
    estado === "entrada_viable_hipoteca_futura_viable"
  ) {
    return "good";
  }

  if (
    planStatus === "needs_down_payment" ||
    estado === "entrada_viable_hipoteca_futura_debil" ||
    estado === "ruta_preparacion" ||
    estado === "ruta_cercana"
  ) {
    return "warn";
  }

  if (
    estado === "entrada_no_viable" ||
    estado === "fuera_de_reglas" ||
    estado === "fuera_de_rango"
  ) {
    return "danger";
  }

  return "neutral";
}

function getToneColors(tone) {
  if (tone === "good") {
    return {
      bg: "rgba(37,211,166,0.10)",
      border: "rgba(37,211,166,0.22)",
      text: "rgba(209,250,229,0.98)",
    };
  }

  if (tone === "warn") {
    return {
      bg: "rgba(245,158,11,0.10)",
      border: "rgba(245,158,11,0.24)",
      text: "rgba(254,243,199,0.98)",
    };
  }

  if (tone === "danger") {
    return {
      bg: "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.24)",
      text: "rgba(254,226,226,0.98)",
    };
  }

  return {
    bg: "rgba(255,255,255,0.055)",
    border: "rgba(255,255,255,0.10)",
    text: UI.text,
  };
}

function sanitizeChipLabel(label) {
  const text = String(label || "").trim();

  const map = {
    "Puedes aplicar hoy": "Dentro de tu rango",
    "Ruta alineada": "Dentro de tu rango",
    "Apto hoy": "Dentro de tu rango",
    "Fuera de rango actual": "Sobre tu rango actual",
  };

  return map[text] || text;
}

function getHeadline({ planStatus, estadoCompra }) {
  if (
    planStatus === "viable_today" ||
    estadoCompra === "top_match" ||
    estadoCompra === "apto_hoy" ||
    estadoCompra === "APTO_HOY" ||
    estadoCompra === "dentro_rango_actual"
  ) {
    return "Dentro de tu rango";
  }

  if (estadoCompra === "entrada_viable_hipoteca_futura_viable") {
    return "Meta alcanzable";
  }

  if (
    planStatus === "needs_down_payment" ||
    estadoCompra === "entrada_viable_hipoteca_futura_debil" ||
    estadoCompra === "ruta_preparacion" ||
    estadoCompra === "ruta_cercana"
  ) {
    return "Requiere preparación";
  }

  if (estadoCompra === "fuera_de_rango") {
    return "Sobre tu rango actual";
  }

  if (estadoCompra === "entrada_no_viable") {
    return "Entrada por fortalecer";
  }

  return formatEstadoCompra(estadoCompra);
}

function getSummaryText({ headline, estadoCompra, planStatus }) {
  if (headline === "Dentro de tu rango") {
    return "Esta propiedad está dentro de tu capacidad estimada actual.";
  }

  if (headline === "Meta alcanzable") {
    return "Podría acercarse si completas entrada o avanzas con tu ruta de preparación.";
  }

  if (headline === "Requiere preparación") {
    return "La propiedad puede ser interesante, pero todavía requiere fortalecer tu perfil o entrada.";
  }

  if (headline === "Sobre tu rango actual") {
    return "Está por encima de tu ruta actual. Puedes revisarla como referencia o comparar opciones menores.";
  }

  if (planStatus === "needs_down_payment" || estadoCompra === "entrada_no_viable") {
    return "La entrada todavía necesita fortalecerse para acercarte a esta opción.";
  }

  return "Toca para revisar el detalle y entender mejor esta propiedad.";
}

function formatFeatureChips({ titulo, tipoInmueble, area, dormitorios, banos, parqueaderos }) {
  const chips = [];

  if (area != null && Number(area) > 0) {
    chips.push(`${area} m²`);
  }

  const title = String(titulo || "").toLowerCase();
  const type = String(tipoInmueble || "").toLowerCase();

  const isStudio =
    type === "estudio" ||
    type === "suite" ||
    title.includes("estudio") ||
    title.includes("suite");

  const dorms = toNumber(dormitorios);

  if (isStudio || dorms === 0) {
    chips.push("Estudio");
  } else if (dorms != null && dorms > 0) {
    chips.push(`${dorms} dorm`);
  }

  const baths = toNumber(banos);
  if (baths != null && baths > 0) {
    chips.push(`${baths} ${baths === 1 ? "baño" : "baños"}`);
  }

  const parking = toNumber(parqueaderos);
  if (parking != null && parking > 0) {
    chips.push(`${parking} ${parking === 1 ? "parqueo" : "parqueos"}`);
  }

  return chips;
}

function MiniStat({ label, value, highlight = false }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 12,
        borderRadius: 16,
        background: highlight
          ? "rgba(37,211,166,0.10)"
          : "rgba(255,255,255,0.045)",
        border: highlight
          ? "1px solid rgba(37,211,166,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: UI.subtext,
          lineHeight: 1.15,
          fontWeight: 800,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 950,
          color: UI.text,
          lineHeight: 1.15,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PropertyCard({ property, onClick }) {
  const snapshot = useMemo(() => loadOwnedData(LS_SNAPSHOT), []);
  const journey = useMemo(() => loadOwnedData(LS_JOURNEY), []);

  const plan = useMemo(() => {
    if (!property) return null;

    try {
      return buildPropertyPlan({
        property,
        journey,
        snapshot,
      });
    } catch (error) {
      console.error("[HL][PropertyCard] buildPropertyPlan error:", error);
      return null;
    }
  }, [property, journey, snapshot]);

  if (!property) return null;

  const {
    titulo,
    precio,
    m2,
    areaM2,
    dormitorios,
    banos,
    parqueaderos,
    tipoInmueble,
    ciudadZona,
    ciudad,
    zona,
    sector,
    proyectoNuevo,
    matchBadge,
    matchBadgeCalculado,
    matchReasonCalculado,
    secondaryChip,
    secondaryChipCalculado,
    routeDifferenceVsRoute,
    routeDifferenceLabel,
    routeFit,
    imagen,
    estadoCompra,
  } = property;

  const price = positiveNumber(precio ?? property?.price ?? property?._normalizedPrice);
  const area = areaM2 ?? m2 ?? null;
  const ubicacion = [sector, ciudadZona || ciudad || zona].filter(Boolean).join(" • ");

  const planStatus = plan?.status || null;
  const estadoTone = getToneFromEstado(estadoCompra, planStatus);
  const toneColors = getToneColors(estadoTone);

  const headline = getHeadline({ planStatus, estadoCompra });
  const summaryText = getSummaryText({ headline, estadoCompra, planStatus });

  const badgeFinal = sanitizeChipLabel(
    matchBadgeCalculado || matchBadge || headline || "Buen match"
  );

  const secondaryFinal = sanitizeChipLabel(
    secondaryChipCalculado || secondaryChip || routeFit?.secondaryChip || null
  );

  const routeLabel =
    plan?.routeLabel ||
    matchReasonCalculado ||
    formatEstadoCompra(estadoCompra) ||
    "Ruta por revisar";

  const entradaTotal =
    plan?.entradaTotal ??
    property?.entradaRequerida ??
    property?.requiredEntry ??
    property?.evaluacionEntrada?.entradaRequerida ??
    (price ? Math.round(price * 0.1) : null);

  const teFaltaHoy = plan?.teFaltaHoy ?? null;
  const cuotaEntrada = plan?.cuotaEntrada ?? null;
  const hipotecaEstimada = plan?.hipotecaEstimada ?? null;
  const cuotaHipotecaEstimada = plan?.cuotaHipotecaEstimada ?? null;

  const routeDifferenceRaw =
    routeDifferenceVsRoute ?? routeFit?.differenceVsRoute ?? null;

  const routeDifferenceNumber = Number.isFinite(Number(routeDifferenceRaw))
    ? Number(routeDifferenceRaw)
    : null;

  const routeDifferenceLabelFinal =
    routeDifferenceLabel || routeFit?.differenceLabel || "Diferencia vs ruta";

  const routeReferenceValue =
    routeDifferenceNumber != null && routeDifferenceNumber > 0 && price != null
      ? Math.max(0, price - routeDifferenceNumber)
      : null;

  const showRouteAdjustmentStats =
    routeDifferenceNumber != null && routeDifferenceNumber > 0;

  const hasValidMortgagePayment =
    Number.isFinite(Number(cuotaHipotecaEstimada)) &&
    Number(cuotaHipotecaEstimada) > 0 &&
    (
      planStatus === "viable_today" ||
      planStatus === "viable_future" ||
      estadoCompra === "top_match" ||
      estadoCompra === "entrada_viable_hipoteca_futura_viable"
    );

  const featureChips = formatFeatureChips({
    titulo,
    tipoInmueble,
    area,
    dormitorios,
    banos,
    parqueaderos,
  });

  const entryStatusLabel =
    teFaltaHoy != null
      ? Number(teFaltaHoy) > 0
        ? formatMoney(teFaltaHoy)
        : "Cubierta"
      : "Por revisar";

  const monthlyEntryLabel =
    cuotaEntrada == null
      ? "Por revisar"
      : Number(cuotaEntrada) > 0
      ? formatMonthly(cuotaEntrada)
      : "No requerida";

  return (
    <Card
      soft
      style={{
        padding: 0,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        borderRadius: 26,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          color: "inherit",
          padding: 0,
          textAlign: "left",
          cursor: onClick ? "pointer" : "default",
        }}
      >
        <div
          style={{
            height: 164,
            width: "100%",
            background: imagen
              ? `linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.58) 100%), url(${imagen}) center/cover`
              : "linear-gradient(135deg, rgba(45,212,191,0.16), rgba(59,130,246,0.14))",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
              <Chip tone={estadoTone}>{badgeFinal}</Chip>
              {secondaryFinal ? <Chip tone="neutral">{secondaryFinal}</Chip> : null}
              {proyectoNuevo ? <Chip tone="neutral">Proyecto nuevo</Chip> : null}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                minWidth: 0,
                padding: "10px 13px",
                borderRadius: 18,
                background: "rgba(9,18,39,0.88)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(8px)",
                fontWeight: 900,
                fontSize: 13,
                color: "rgba(255,255,255,0.98)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {headline}
            </div>

            <div
              style={{
                width: 142,
                padding: "10px 13px",
                borderRadius: 20,
                background: "rgba(9,18,39,0.93)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.74)",
                  marginBottom: 3,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                Precio ref.
              </div>

              <div
                style={{
                  fontWeight: 950,
                  fontSize: 18,
                  color: "rgba(255,255,255,0.98)",
                  lineHeight: 1.1,
                }}
              >
                {price ? moneyUSD(price) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              fontWeight: 950,
              fontSize: 17,
              lineHeight: 1.16,
              color: UI.text,
            }}
          >
            {titulo}
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 13,
              color: UI.subtext,
              lineHeight: 1.35,
            }}
          >
            {ubicacion || "Ubicación por definir"}
          </div>

          {featureChips.length ? (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {featureChips.map((chip) => (
                <Chip key={chip} tone="neutral">
                  {chip}
                </Chip>
              ))}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 22,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.035))",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: UI.subtext,
                fontWeight: 850,
              }}
            >
              Cómo se ve frente a tu ruta
            </div>

            <div
              style={{
                marginTop: 5,
                fontWeight: 950,
                fontSize: 15,
                color: UI.text,
                lineHeight: 1.25,
              }}
            >
              {routeLabel}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <MiniStat
                label={
                  showRouteAdjustmentStats
                    ? routeDifferenceLabelFinal
                    : "Entrada estimada"
                }
                value={
                  showRouteAdjustmentStats
                    ? formatMoney(routeDifferenceNumber)
                    : entradaTotal != null
                    ? formatMoney(entradaTotal)
                    : "—"
                }
                highlight
              />

              <MiniStat
                label={showRouteAdjustmentStats ? "Ruta objetivo" : "Entrada"}
                value={
                  showRouteAdjustmentStats
                    ? routeReferenceValue != null
                      ? formatMoney(routeReferenceValue)
                      : "—"
                    : entryStatusLabel
                }
              />

              <MiniStat
                label={showRouteAdjustmentStats ? "Ajuste sugerido" : "Cuota entrada"}
                value={
                  showRouteAdjustmentStats
                    ? secondaryFinal || "Preparación"
                    : monthlyEntryLabel
                }
              />

              <MiniStat
                label="Ruta estimada"
                value={hipotecaEstimada || "Por revisar"}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 18,
              background: toneColors.bg,
              border: `1px solid ${toneColors.border}`,
              fontSize: 13,
              color: toneColors.text,
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: UI.text }}>{headline}.</strong>
            <div style={{ marginTop: 4 }}>{summaryText}</div>

            {hasValidMortgagePayment ? (
              <div style={{ marginTop: 6 }}>
                Cuota ref. estimada:{" "}
                <strong style={{ color: UI.text }}>
                  {moneyUSD(Number(cuotaHipotecaEstimada))}
                </strong>.
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "rgba(148,163,184,0.9)",
              lineHeight: 1.35,
            }}
          >
            Toca para ver detalle, entrada y financiamiento de esta propiedad.
          </div>
        </div>
      </button>
    </Card>
  );
}