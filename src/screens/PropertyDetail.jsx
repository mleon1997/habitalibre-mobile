// src/screens/PropertyDetail.jsx
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { moneyUSD } from "../lib/money";
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

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function formatMoney(v) {
  const x = Number(v);
  return Number.isFinite(x) ? moneyUSD(x) : "—";
}

function formatPct(v, digits = 1) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(digits)}%`;
}

function formatMonthly(v) {
  const x = Number(v);
  return Number.isFinite(x) ? `${moneyUSD(x)}/mes` : "—";
}

function formatProbability(prob) {
  if (!prob) return "—";
  return String(prob);
}

function formatMatchReason(reason) {
  const map = {
    precio: "precio",
    entrada: "entrada",
    precio_entrada: "precio + entrada",
    cuota: "cuota",
    programa: "programa",
  };
  return map[reason] || reason || "precio";
}

function formatEstadoCompra(estado) {
  const map = {
    top_match: "Top match",
    entrada_viable_hipoteca_futura_viable: "Entrada viable + hipoteca futura viable",
    entrada_viable_hipoteca_futura_debil: "Entrada viable, hipoteca por fortalecer",
    entrada_no_viable: "Entrada no viable",
    ruta_cercana: "Ruta cercana",
    fuera_de_reglas: "Fuera de reglas",
  };
  return map[estado] || "Análisis disponible";
}

const UI = {
  bg: "linear-gradient(180deg, #071024 0%, #0b1a35 100%)",
  card: "rgba(255,255,255,0.06)",
  cardSoft: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  textDim: "rgba(255,255,255,0.72)",
  green: "#25d3a6",
  greenBg: "rgba(37,211,166,0.10)",
  greenBorder: "rgba(37,211,166,0.26)",
  amberBg: "rgba(251,191,36,0.10)",
  amberBorder: "rgba(251,191,36,0.26)",
  redBg: "rgba(239,68,68,0.10)",
  redBorder: "rgba(239,68,68,0.24)",
  shadow: "0 10px 30px rgba(0,0,0,0.22)",
  shadowSoft: "0 10px 24px rgba(0,0,0,0.18)",
};

function Pill({ children, tone = "neutral" }) {
  let bg = "rgba(255,255,255,0.08)";
  let br = "rgba(255,255,255,0.10)";

  if (tone === "green") {
    bg = "rgba(37,211,166,0.14)";
    br = "rgba(37,211,166,0.28)";
  }

  if (tone === "amber") {
    bg = "rgba(251,191,36,0.14)";
    br = "rgba(251,191,36,0.28)";
  }

  if (tone === "red") {
    bg = "rgba(239,68,68,0.14)";
    br = "rgba(239,68,68,0.28)";
  }

  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${br}`,
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: 13,
        borderRadius: 14,
        border: "none",
        background: UI.green,
        color: "#052019",
        fontWeight: 900,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: 13,
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.16)`,
        background: "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function StatChip({ label, value }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: UI.cardSoft,
        border: `1px solid ${UI.borderSoft}`,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 22,
        background: UI.card,
        border: `1px solid ${UI.border}`,
        boxShadow: UI.shadowSoft,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function ToneBox({ tone = "neutral", children }) {
  let background = UI.cardSoft;
  let border = UI.borderSoft;

  if (tone === "green") {
    background = UI.greenBg;
    border = UI.greenBorder;
  } else if (tone === "amber") {
    background = UI.amberBg;
    border = UI.amberBorder;
  } else if (tone === "red") {
    background = UI.redBg;
    border = UI.redBorder;
  }

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background,
        border: `1px solid ${border}`,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

function NotFound({ onBack }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          marginTop: 40,
          padding: 18,
          borderRadius: 22,
          background: UI.card,
          border: `1px solid ${UI.border}`,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8 }}>🏘 Propiedad</div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
          No encontramos esta propiedad
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.4 }}>
          Puede que el id no exista o que todavía no esté cargada en tu inventario.
        </div>
        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={onBack}>Volver al marketplace</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const snapshot = useMemo(() => loadJSON(LS_SNAPSHOT), []);
  const journey = useMemo(() => loadJSON(LS_JOURNEY), []);

  const matchedProperties =
    pick(snapshot, ["matchedProperties"]) ||
    pick(snapshot, ["propiedades"]) ||
    [];

  const propertyFromSnapshot = useMemo(() => {
    if (!Array.isArray(matchedProperties)) return null;
    return matchedProperties.find((p) => String(p.id) === String(id)) || null;
  }, [matchedProperties, id]);

  const propertyFromMock = useMemo(
    () => mockProperties.find((p) => String(p.id) === String(id)) || null,
    [id]
  );

  const property = propertyFromSnapshot || propertyFromMock;

  if (!property) {
    return <NotFound onBack={() => navigate("/marketplace")} />;
  }

  const precio = n(property?.precio);
  const entradaDisponible =
    n(pick(snapshot, ["entradaDisponible"])) ||
    n(journey?.form?.entrada) ||
    n(journey?.entrada) ||
    0;

  const precioMaxVivienda =
    n(pick(snapshot, ["precioMaxVivienda"])) ||
    n(pick(snapshot, ["precioMaxPerfil"])) ||
    n(pick(snapshot, ["precioMax"])) ||
    0;

  const productoElegido = pick(snapshot, ["productoElegido", "productoSugerido"]);
  const bancosTop3 =
    pick(snapshot, ["bancosTop3"]) || pick(snapshot, ["bancosProbabilidad"]) || [];

  const bankSuggested =
    Array.isArray(bancosTop3) && bancosTop3.length ? bancosTop3[0] : null;

  const evaluacionEntrada = property?.evaluacionEntrada || null;
  const evaluacionHipotecaHoy =
    property?.evaluacionHipotecaHoy || property?.evaluacionHipoteca || null;
  const evaluacionHipotecaFutura = property?.evaluacionHipotecaFutura || null;
  const estadoCompra = property?.estadoCompra || null;

  const calzaPrecio = precioMaxVivienda > 0 ? precio <= precioMaxVivienda : true;
  const gapPrecio = precioMaxVivienda > 0 ? Math.max(0, precio - precioMaxVivienda) : 0;
  const entradaPct = precio > 0 ? (entradaDisponible / precio) * 100 : 0;

  const toneEstado =
    estadoCompra === "top_match" ||
    estadoCompra === "entrada_viable_hipoteca_futura_viable"
      ? "green"
      : estadoCompra === "entrada_viable_hipoteca_futura_debil" ||
        estadoCompra === "ruta_cercana"
      ? "amber"
      : "red";

  const entradaRequerida = n(evaluacionEntrada?.entradaRequerida);
  const faltanteEntrada = n(evaluacionEntrada?.faltanteEntrada);
  const cuotaEntradaMensual = evaluacionEntrada?.cuotaEntradaMensual;
  const mesesConstruccion = n(evaluacionEntrada?.mesesConstruccionRestantes);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        fontFamily: "system-ui",
        paddingBottom: 28,
      }}
    >
      <div
        style={{
          height: 280,
          width: "100%",
          background: property.imagen
            ? `linear-gradient(rgba(0,0,0,0.12), rgba(7,16,36,0.48)), url(${property.imagen}) center/cover`
            : "linear-gradient(135deg, rgba(37,211,166,0.18), rgba(255,255,255,0.06))",
          position: "relative",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            border: `1px solid rgba(255,255,255,0.16)`,
            background: "rgba(7,16,36,0.45)",
            color: "white",
            borderRadius: 999,
            padding: "10px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ← Volver
        </button>
      </div>

      <div style={{ marginTop: -28, padding: "0 22px" }}>
        <div
          style={{
            padding: 18,
            borderRadius: 24,
            background: "rgba(7,16,36,0.86)",
            border: `1px solid ${UI.border}`,
            boxShadow: UI.shadow,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill tone={toneEstado}>
              {property?.matchBadgeCalculado || property?.matchBadge || "Match"}
            </Pill>

            <Pill>{formatEstadoCompra(estadoCompra)}</Pill>

            {property.proyectoNuevo ? (
              <Pill>Proyecto nuevo</Pill>
            ) : (
              <Pill>Entrega inmediata</Pill>
            )}

            <Pill>{formatMatchReason(property.matchReason)}</Pill>
          </div>

          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 900 }}>
            {property.titulo}
          </div>

          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.78 }}>
            {property.sector || property.zona} • {property.ciudadZona || property.zona}
          </div>

          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 900 }}>
            {moneyUSD(precio)}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <StatChip label="Área" value={property.m2 != null ? `${property.m2} m²` : "—"} />
            <StatChip
              label="Dormitorios"
              value={property.dormitorios != null ? String(property.dormitorios) : "—"}
            />
            <StatChip
              label="Baños"
              value={property.banos != null ? String(property.banos) : "—"}
            />
            <StatChip
              label="Parqueaderos"
              value={property.parqueaderos != null ? String(property.parqueaderos) : "—"}
            />
          </div>
        </div>

        <InfoCard title="¿Cómo calza con tu perfil?">
          <div style={{ display: "grid", gap: 10 }}>
            <ToneBox tone={toneEstado}>
              <strong>{formatEstadoCompra(estadoCompra)}</strong>
              <div style={{ marginTop: 6 }}>
                {property?.matchReasonCalculado ||
                  "Analizamos esta propiedad con base en tu perfil y en el esquema financiero del proyecto."}
              </div>
            </ToneBox>

            <ToneBox>
              Esta propiedad hace match principalmente por{" "}
              <strong>{formatMatchReason(property.matchReason)}</strong>.
            </ToneBox>

            <ToneBox>
              {precioMaxVivienda > 0 ? (
                <>
                  Tu precio máximo estimado hoy es <strong>{moneyUSD(precioMaxVivienda)}</strong>.
                  {calzaPrecio ? (
                    <> Esta propiedad <strong>sí entra</strong> dentro de ese rango.</>
                  ) : (
                    <>
                      {" "}
                      Esta propiedad queda <strong>{moneyUSD(gapPrecio)}</strong> por encima de tu
                      rango hipotecario actual.
                    </>
                  )}
                </>
              ) : (
                <>Aún no tenemos tu precio máximo calculado.</>
              )}
            </ToneBox>

            <ToneBox>
              Tu entrada registrada es <strong>{moneyUSD(entradaDisponible)}</strong>, equivalente a{" "}
              <strong>{formatPct(entradaPct)}</strong> del valor de esta propiedad.
            </ToneBox>
          </div>
        </InfoCard>

        <InfoCard title="Entrada al proyecto">
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <StatChip label="Entrada requerida" value={formatMoney(entradaRequerida)} />
              <StatChip label="Faltante de entrada" value={formatMoney(faltanteEntrada)} />
              <StatChip
                label="Cuota entrada"
                value={
                  cuotaEntradaMensual == null
                    ? "Pago inmediato"
                    : formatMonthly(cuotaEntradaMensual)
                }
              />
              <StatChip
                label="Meses de construcción"
                value={mesesConstruccion > 0 ? `${mesesConstruccion} meses` : "—"}
              />
            </div>

            <ToneBox tone={evaluacionEntrada?.viableEntrada ? "green" : "red"}>
              <strong>
                {evaluacionEntrada?.viableEntrada
                  ? "La entrada se ve viable para ti."
                  : "La entrada todavía no se ve viable para ti."}
              </strong>
              <div style={{ marginTop: 6 }}>
                {evaluacionEntrada?.razon || "No tenemos todavía el análisis de entrada."}
              </div>
            </ToneBox>
          </div>
        </InfoCard>

        <InfoCard title="Ruta hipotecaria">
          <div style={{ display: "grid", gap: 10 }}>
            {evaluacionHipotecaHoy ? (
              <ToneBox tone={evaluacionHipotecaHoy?.viable ? "green" : "amber"}>
                <strong>Hipoteca en escenario actual</strong>
                <div style={{ marginTop: 6 }}>
                  {evaluacionHipotecaHoy?.razon || "No disponible"}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>
                  Producto: <strong>{evaluacionHipotecaHoy?.productoSugerido || "—"}</strong>
                  {" • "}Probabilidad:{" "}
                  <strong>{formatProbability(evaluacionHipotecaHoy?.probabilidad)}</strong>
                  {" • "}Score: <strong>{n(evaluacionHipotecaHoy?.score)}</strong>
                </div>
              </ToneBox>
            ) : null}

            {evaluacionHipotecaFutura ? (
              <ToneBox tone={evaluacionHipotecaFutura?.viable ? "green" : "amber"}>
                <strong>Hipoteca futura al momento de entrega</strong>
                <div style={{ marginTop: 6 }}>
                  {evaluacionHipotecaFutura?.razon || "No disponible"}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
                  Monto hipotecario proyectado:{" "}
                  <strong>{formatMoney(evaluacionHipotecaFutura?.montoHipotecaProyectado)}</strong>
                  {" • "}Producto:{" "}
                  <strong>{evaluacionHipotecaFutura?.productoSugerido || "—"}</strong>
                  {" • "}Probabilidad:{" "}
                  <strong>{formatProbability(evaluacionHipotecaFutura?.probabilidad)}</strong>
                  {" • "}Score: <strong>{n(evaluacionHipotecaFutura?.score)}</strong>
                </div>
              </ToneBox>
            ) : null}

            {!evaluacionHipotecaHoy && !evaluacionHipotecaFutura && bankSuggested ? (
              <ToneBox>
                <strong>Mejor ruta estimada</strong>
                <div style={{ marginTop: 6 }}>
                  {bankSuggested.banco || "Hipoteca sugerida"}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.4 }}>
                  {bankSuggested.tasaAnual != null
                    ? `Tasa ${(Number(bankSuggested.tasaAnual) * 100).toFixed(2)}%`
                    : "Tasa —"}
                  {" • "}
                  {bankSuggested.cuota != null
                    ? `Cuota aprox. ${moneyUSD(bankSuggested.cuota)}`
                    : "Cuota —"}
                  {" • "}
                  {bankSuggested.montoPrestamo != null
                    ? `Monto aprox. ${moneyUSD(bankSuggested.montoPrestamo)}`
                    : "Monto —"}
                </div>
              </ToneBox>
            ) : null}

            {productoElegido ? (
              <ToneBox>
                Tu producto sugerido general actual es <strong>{String(productoElegido)}</strong>.
              </ToneBox>
            ) : null}
          </div>
        </InfoCard>

        <InfoCard title="Descripción">
          <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.5 }}>
            {property.descripcion ||
              "Proyecto recomendado dentro de tu marketplace inicial. Luego aquí podrás mostrar descripción real, amenidades, promotor, fotos, ubicación y CTA directo para aplicar."}
          </div>
        </InfoCard>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <PrimaryButton
            onClick={() =>
              navigate("/asesor", {
                state: {
                  selectedProperty: property,
                },
              })
            }
          >
            Quiero aplicar a esta propiedad
          </PrimaryButton>

          <SecondaryButton onClick={() => navigate("/marketplace")}>
            Ver más propiedades
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}