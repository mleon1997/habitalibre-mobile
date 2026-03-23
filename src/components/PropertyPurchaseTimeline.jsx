import React from "react";
import { motion } from "framer-motion";

const n = (v, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

function money(v) {
  return `$${Math.round(n(v)).toLocaleString("en-US")}`;
}

function getProbColor(probabilidad) {
  const p = String(probabilidad || "").toLowerCase();
  if (p === "alta") {
    return {
      bg: "rgba(16,185,129,0.14)",
      border: "rgba(16,185,129,0.28)",
      color: "#10b981",
      label: "Alta",
    };
  }
  if (p === "media") {
    return {
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.28)",
      color: "#f59e0b",
      label: "Media",
    };
  }
  return {
    bg: "rgba(239,68,68,0.14)",
    border: "rgba(239,68,68,0.28)",
    color: "#ef4444",
    label: probabilidad || "Baja",
  };
}

function getEstadoConfig(estadoCompra) {
  const map = {
    top_match: {
      label: "Listo para compra inmediata",
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.22)",
    },
    entrada_viable_hipoteca_futura_viable: {
      label: "Ruta de compra viable",
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.22)",
    },
    entrada_viable_hipoteca_futura_debil: {
      label: "Ruta cercana",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.22)",
    },
    entrada_no_viable: {
      label: "Necesita más entrada",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.22)",
    },
    fuera_de_reglas: {
      label: "No compatible",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.22)",
    },
  };

  return (
    map[estadoCompra] || {
      label: "Ruta de compra",
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.12)",
      border: "rgba(148,163,184,0.22)",
    }
  );
}

function StepCard({
  icon,
  title,
  value,
  subtitle,
  delay = 0,
  accent = "#7c3aed",
  isLast = false,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        columnGap: 14,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            zIndex: 2,
          }}
        >
          {icon}
        </motion.div>

        {!isLast && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "calc(100% + 18px)", opacity: 1 }}
            transition={{ duration: 0.4, delay: delay + 0.1 }}
            style={{
              position: "absolute",
              top: 28,
              width: 2,
              background:
                "linear-gradient(to bottom, rgba(124,58,237,.55), rgba(124,58,237,.12))",
              borderRadius: 999,
            }}
          />
        )}
      </div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, delay }}
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.6)",
          borderRadius: 18,
          padding: "14px 16px",
          boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.1,
            marginBottom: subtitle ? 8 : 0,
          }}
        >
          {value}
        </div>

        {subtitle ? (
          <div
            style={{
              fontSize: 14,
              color: "#475569",
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

export default function PropertyPurchaseTimeline({
  property,
  compact = false,
}) {
  if (!property) return null;

  const estado = getEstadoConfig(property?.estadoCompra);
  const evaluacionEntrada = property?.evaluacionEntrada || {};
  const hipotecaFutura = property?.evaluacionHipotecaFutura || {};
  const hipotecaHoy = property?.evaluacionHipotecaHoy || {};
  const mortgage = property?.mortgageSelected || hipotecaFutura?.mortgageSelected || null;
  const prob = getProbColor(
    hipotecaFutura?.probabilidad || hipotecaHoy?.probabilidad
  );

  const reserva = n(property?.reservaMinima);
  const entradaRequerida = n(evaluacionEntrada?.entradaRequerida);
  const faltanteEntrada = n(evaluacionEntrada?.faltanteEntrada);
  const cuotaEntradaMensual = n(evaluacionEntrada?.cuotaEntradaMensual);
  const mesesConstruccion = n(evaluacionEntrada?.mesesConstruccionRestantes);
  const cuotaHipoteca = n(
    hipotecaFutura?.cuotaReferencia || hipotecaHoy?.cuotaReferencia
  );
  const precio = n(property?.precio);
  const porcentajeCubiertoEntrada =
    entradaRequerida > 0
      ? Math.min(100, Math.round((n(property?.entradaDisponibleHoy) / entradaRequerida) * 100))
      : 0;

  const showFuture =
    property?.tipoEntrega === "construccion" &&
    evaluacionEntrada?.modalidadEntrada === "construccion";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 28,
        padding: compact ? 18 : 22,
        background:
          "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.10) 45%, rgba(255,255,255,0.92) 100%)",
        border: "1px solid rgba(124,58,237,0.10)",
        boxShadow: "0 22px 60px rgba(15,23,42,0.10)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -70,
          right: -70,
          width: 180,
          height: 180,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(124,58,237,0.16), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: compact ? 18 : 22,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.15,
            }}
          >
            Plan de compra
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 14,
              color: "#475569",
            }}
          >
            {property?.titulo}
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            background: estado.bg,
            border: `1px solid ${estado.border}`,
            color: estado.color,
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          {estado.label}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1.15fr 0.85fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div>
          <StepCard
            icon="🏠"
            title="Hoy"
            value={reserva > 0 ? `Reserva ${money(reserva)}` : `Precio ${money(precio)}`}
            subtitle={
              reserva > 0
                ? "Este es el monto mínimo para separar o iniciar el proceso."
                : "Primero debes cubrir la entrada inicial."
            }
            delay={0}
            accent="#7c3aed"
          />

          <StepCard
            icon="💸"
            title="Entrada"
            value={money(entradaRequerida)}
            subtitle={
              evaluacionEntrada?.viableEntrada
                ? `Te faltan ${money(faltanteEntrada)}. ${
                    cuotaEntradaMensual > 0
                      ? `Puedes completarla con ${money(cuotaEntradaMensual)} al mes`
                      : "Ya la tienes cubierta"
                  }${mesesConstruccion > 0 ? ` durante ${mesesConstruccion} meses.` : "."}`
                : evaluacionEntrada?.razon || "Todavía no se ajusta a tu capacidad."
            }
            delay={0.1}
            accent="#2563eb"
          />

          {showFuture ? (
            <>
              <StepCard
                icon="🏗️"
                title="Durante obra"
                value={
                  cuotaEntradaMensual > 0
                    ? `${money(cuotaEntradaMensual)} / mes`
                    : "Entrada cubierta"
                }
                subtitle={
                  mesesConstruccion > 0
                    ? `${mesesConstruccion} meses para completar la entrada.`
                    : "Proyecto con tiempo estimado de construcción."
                }
                delay={0.2}
                accent="#0ea5e9"
              />

              <StepCard
                icon="🏦"
                title="Entrega + hipoteca"
                value={
                  hipotecaFutura?.viable && cuotaHipoteca > 0
                    ? `${money(cuotaHipoteca)} / mes`
                    : "Ruta hipotecaria no viable"
                }
                subtitle={
                  hipotecaFutura?.viable
                    ? `${hipotecaFutura?.productoSugerido || "Hipoteca estimada"} · ${
                        mortgage?.termMonths
                          ? `${Math.round(n(mortgage.termMonths) / 12)} años`
                          : "plazo estimado"
                      }`
                    : hipotecaFutura?.razon ||
                      "Al momento de entrega todavía no habría una hipoteca compatible."
                }
                delay={0.3}
                accent="#10b981"
                isLast
              />
            </>
          ) : (
            <StepCard
              icon="🏦"
              title="Hipoteca"
              value={
                hipotecaHoy?.viable && cuotaHipoteca > 0
                  ? `${money(cuotaHipoteca)} / mes`
                  : "No viable hoy"
              }
              subtitle={
                hipotecaHoy?.viable
                  ? `${hipotecaHoy?.productoSugerido || "Hipoteca estimada"}`
                  : hipotecaHoy?.razon || "Todavía no aplica."
              }
              delay={0.2}
              accent="#10b981"
              isLast
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.65)",
            borderRadius: 22,
            padding: 18,
            boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            Resumen rápido
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            {money(precio)}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "#475569",
            }}
          >
            Precio de la propiedad
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                <span>Entrada</span>
                <span>{money(entradaRequerida)}</span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(148,163,184,0.18)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      entradaRequerida > 0
                        ? (n(property?.entradaDisponibleHoy ?? 0) / entradaRequerida) * 100
                        : 0
                    )}%`,
                    height: "100%",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #7c3aed 0%, #3b82f6 100%)",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                Hoy tienes cubierto aprox. {porcentajeCubiertoEntrada}% de la entrada.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  background: "rgba(248,250,252,0.9)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Te falta
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                  {money(faltanteEntrada)}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  background: "rgba(248,250,252,0.9)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Hipoteca estimada
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                  {cuotaHipoteca > 0 ? money(cuotaHipoteca) : "—"}
                </div>
              </div>
            </div>

            {(hipotecaFutura?.probabilidad || hipotecaHoy?.probabilidad) && (
              <div
                style={{
                  marginTop: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: prob.bg,
                  border: `1px solid ${prob.border}`,
                  color: prob.color,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <span>Probabilidad</span>
                <span>{prob.label}</span>
              </div>
            )}

            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              {property?.matchReasonCalculado ||
                hipotecaFutura?.razon ||
                hipotecaHoy?.razon}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}