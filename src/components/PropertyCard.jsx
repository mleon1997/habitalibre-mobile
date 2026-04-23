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

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function formatMoney(v) {
  const x = Number(v);
  return Number.isFinite(x) ? moneyUSD(x) : "—";
}

function formatMonthly(v) {
  const x = Number(v);
  return Number.isFinite(x) ? `${moneyUSD(x)}/mes` : "—";
}

function formatEstadoCompra(estado) {
  const map = {
    top_match: "Compra inmediata",
    entrada_viable_hipoteca_futura_viable: "Entrada viable + hipoteca viable",
    entrada_viable_hipoteca_futura_debil: "Entrada viable, hipoteca por fortalecer",
    entrada_no_viable: "Entrada no viable",
    ruta_cercana: "Ruta cercana",
    fuera_de_reglas: "Fuera de reglas",
  };
  return map[estado] || "Ruta por definir";
}

function getToneFromEstado(estado) {
  if (
    estado === "top_match" ||
    estado === "entrada_viable_hipoteca_futura_viable"
  ) {
    return "good";
  }

  if (
    estado === "entrada_viable_hipoteca_futura_debil" ||
    estado === "ruta_cercana"
  ) {
    return "warn";
  }

  if (estado === "entrada_no_viable" || estado === "fuera_de_reglas") {
    return "danger";
  }

  return "neutral";
}

function getToneColors(estadoTone) {
  if (estadoTone === "good") {
    return {
      bg: "rgba(37,211,166,0.10)",
      border: "rgba(37,211,166,0.22)",
      dot: "rgba(37,211,166,0.95)",
      soft: "rgba(37,211,166,0.16)",
    };
  }

  if (estadoTone === "warn") {
    return {
      bg: "rgba(245,158,11,0.10)",
      border: "rgba(245,158,11,0.22)",
      dot: "rgba(245,158,11,0.95)",
      soft: "rgba(245,158,11,0.16)",
    };
  }

  if (estadoTone === "danger") {
    return {
      bg: "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.22)",
      dot: "rgba(239,68,68,0.95)",
      soft: "rgba(239,68,68,0.16)",
    };
  }

  return {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
    dot: "rgba(255,255,255,0.9)",
    soft: "rgba(255,255,255,0.08)",
  };
}

function MiniStat({ label, value, highlight = false }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 14,
        borderRadius: 16,
        background: highlight
          ? "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.05))"
          : "rgba(255,255,255,0.04)",
        border: highlight
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: highlight ? "0 10px 20px rgba(0,0,0,0.14)" : "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: UI.subtext,
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 950,
          color: UI.text,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StepRow({ index, title, text, tone = "neutral" }) {
  const colors = getToneColors(tone);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "30px 1fr",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 900,
          color: "white",
          background: colors.soft,
          border: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        {index}
      </div>

      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: UI.text,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 12.5,
            color: UI.subtext,
            lineHeight: 1.35,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

export default function PropertyCard({ property, onClick }) {
  if (!property) return null;

  const snapshot = useMemo(() => loadJSON(LS_SNAPSHOT), []);
  const journey = useMemo(() => loadJSON(LS_JOURNEY), []);

  const plan = useMemo(() => {
    try {
      return buildPropertyPlan({
        property,
        journey,
        snapshot,
      });
    } catch (e) {
      console.error("[HL][PropertyCard] buildPropertyPlan error:", e);
      return null;
    }
  }, [property, journey, snapshot]);

  const {
    titulo,
    precio,
    m2,
    areaM2,
    dormitorios,
    banos,
    parqueaderos,
    ciudadZona,
    ciudad,
    zona,
    sector,
    proyectoNuevo,
    matchBadge,
    matchBadgeCalculado,
    matchReasonCalculado,
    imagen,
    estadoCompra,
  } = property;

  const area = m2 ?? areaM2 ?? null;
  const ubicacion = [sector, ciudadZona || ciudad || zona].filter(Boolean).join(" • ");

  const estadoLabel = formatEstadoCompra(estadoCompra);
  const estadoTone = getToneFromEstado(estadoCompra);
  const toneColors = getToneColors(estadoTone);

  const badgeFinal = matchBadgeCalculado || matchBadge || "Buen match";

  const routeLabel = plan?.routeLabel || matchReasonCalculado || estadoLabel || "Ruta por definir";

  const headline =
  plan?.status === "viable_today"
    ? "Ruta viable"
    : plan?.status === "needs_down_payment"
    ? "Ruta cercana"
    : estadoCompra === "top_match"
    ? "Compra posible"
    : estadoCompra === "entrada_viable_hipoteca_futura_viable"
    ? "Ruta viable"
    : estadoCompra === "entrada_viable_hipoteca_futura_debil"
    ? "Con ajustes"
    : estadoCompra === "entrada_no_viable"
    ? "Explorar ruta"
    : "Ruta por definir";

  const summaryText =
    plan?.status === "viable_today"
      ? "Esta propiedad sí podría encajar con tu perfil actual."
      : plan?.status === "needs_down_payment"
      ? "Todavía necesitas fortalecer la entrada para avanzar con esta propiedad."
      : estadoCompra === "top_match"
      ? "Tu perfil sí podría sostener esta compra hoy."
      : estadoCompra === "entrada_viable_hipoteca_futura_viable"
      ? "Puedes completar la entrada y luego aplicar a hipoteca."
      : estadoCompra === "entrada_viable_hipoteca_futura_debil"
      ? "La entrada se ve alcanzable, pero la hipoteca requiere fortalecerse."
      : estadoCompra === "entrada_no_viable"
      ? "La entrada todavía no calza con tu capacidad actual."
      : "Explora cómo se ve tu ruta estimada de entrada y financiamiento.";

  const entradaTotal = plan?.entradaTotal ?? null;
  const teFaltaHoy = plan?.teFaltaHoy ?? null;
  const cuotaEntrada = plan?.cuotaEntrada ?? null;
  const hipotecaEstimada = plan?.hipotecaEstimada ?? null;
  const cuotaHipotecaEstimada = plan?.cuotaHipotecaEstimada ?? null;
  const mesesConstruccion = n(property?.evaluacionEntrada?.mesesConstruccionRestantes, 0);

  const steps = Array.isArray(plan?.steps) ? plan.steps : [];

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
            height: 176,
            width: "100%",
            background: imagen
              ? `linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.50) 100%), url(${imagen}) center/cover`
              : "linear-gradient(135deg, rgba(45,212,191,0.16), rgba(59,130,246,0.14))",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              maxWidth: "82%",
            }}
          >
            <Chip tone={estadoTone}>{badgeFinal}</Chip>
            {proyectoNuevo ? <Chip tone="neutral">Proyecto nuevo</Chip> : null}
          </div>

          <div
            style={{
              position: "absolute",
              left: 12,
              right: 170,
              bottom: 12,
              padding: "10px 14px",
              borderRadius: 18,
              background: "rgba(9,18,39,0.86)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(8px)",
              fontWeight: 900,
              fontSize: 13,
              color: "rgba(255,255,255,0.98)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
          >
            {headline}
          </div>

          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              width: 146,
              padding: "10px 14px",
              borderRadius: 20,
              background: "rgba(9,18,39,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
              boxSizing: "border-box",
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.78)",
                marginBottom: 2,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              Precio
            </div>
            <div
              style={{
                fontWeight: 950,
                fontSize: 18,
                color: "rgba(255,255,255,0.98)",
                lineHeight: 1.1,
              }}
            >
              {moneyUSD(precio)}
            </div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div>
            <div
              style={{
                fontWeight: 950,
                fontSize: 17,
                lineHeight: 1.15,
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
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {area != null ? <Chip tone="neutral">{area} m²</Chip> : null}
            {dormitorios != null ? <Chip tone="neutral">{dormitorios} dorm</Chip> : null}
            {banos != null ? <Chip tone="neutral">{banos} baños</Chip> : null}
            {parqueaderos != null ? <Chip tone="neutral">{parqueaderos} parqueo</Chip> : null}
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 22,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: UI.subtext,
                fontWeight: 800,
              }}
            >
              Plan de compra estimado
            </div>

            <div
              style={{
                marginTop: 4,
                fontWeight: 950,
                fontSize: 15,
                color: UI.text,
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
                label="Entrada total"
                value={entradaTotal != null ? formatMoney(entradaTotal) : "—"}
                highlight
              />

              <MiniStat
                label="Te falta hoy"
                value={
                  teFaltaHoy != null
                    ? teFaltaHoy > 0
                      ? formatMoney(teFaltaHoy)
                      : "$0"
                    : "—"
                }
              />

              <MiniStat
                label="Cuota entrada"
                value={
                  cuotaEntrada == null
                    ? "Pago inmediato"
                    : cuotaEntrada === 0
                    ? "$0"
                    : formatMonthly(cuotaEntrada)
                }
              />

              <MiniStat
                label="Hipoteca estimada"
                value={hipotecaEstimada || "Por definir"}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 12,
              }}
            >
              {steps.length ? (
                steps.map((step, idx) => (
                  <StepRow
                    key={step.id || idx}
                    index={idx + 1}
                    title={step.title}
                    text={step.subtitle}
                    tone={step.tone || "neutral"}
                  />
                ))
              ) : (
                <>
                  <StepRow
                    index={1}
                    title="Reserva / entrada"
                    text="Revisa cuánto necesitas para separar y completar tu entrada."
                    tone="neutral"
                  />
                  <StepRow
                    index={2}
                    title="Hipoteca"
                    text="Todavía no hay una ruta hipotecaria sólida."
                    tone="danger"
                  />
                  <StepRow
                    index={3}
                    title="Resultado"
                    text="Explora cómo se ve tu ruta estimada de entrada y financiamiento."
                    tone="neutral"
                  />
                </>
              )}
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
              color: UI.subtext,
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: UI.text }}>{headline}.</strong>
            <div style={{ marginTop: 4 }}>{summaryText}</div>

            {mesesConstruccion > 0 ? (
              <div style={{ marginTop: 6 }}>
                Tiempo de construcción estimado:{" "}
                <strong style={{ color: UI.text }}>{mesesConstruccion} meses</strong>.
              </div>
            ) : null}

            {cuotaHipotecaEstimada != null ? (
              <div style={{ marginTop: 6 }}>
                Cuota hipotecaria estimada:{" "}
                <strong style={{ color: UI.text }}>
                  {moneyUSD(cuotaHipotecaEstimada)}
                </strong>.
              </div>
            ) : null}
          </div>
        </div>
      </button>
    </Card>
  );
}