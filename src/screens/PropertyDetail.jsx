// src/screens/PropertyDetail.jsx
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { moneyUSD } from "../lib/money";
import mockProperties from "../data/mockProperties.js";
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

  // Formato nuevo: { ownerEmail, data }
  if (envelope?.ownerEmail && "data" in envelope) {
    if (
      ownerEmail &&
      String(envelope.ownerEmail).trim().toLowerCase() === ownerEmail
    ) {
      return envelope.data ?? null;
    }

    // si no hay owner actual, permitir leer igual
    if (!ownerEmail) {
      return envelope.data ?? null;
    }

    return null;
  }

  // Formato viejo / legacy
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

function maybeNum(v) {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
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
    precio: "Precio",
    entrada: "Entrada",
    precio_entrada: "Precio + entrada",
    cuota: "Cuota",
    programa: "Programa",
  };
  return map[reason] || reason || "Precio";
}

function formatEstadoCompra(estado) {
  const map = {
    top_match: "Top match",
    entrada_viable_hipoteca_futura_viable:
      "Entrada viable + hipoteca futura viable",
    entrada_viable_hipoteca_futura_debil:
      "Entrada viable, hipoteca por fortalecer",
    entrada_no_viable: "Entrada no viable",
    ruta_cercana: "Ruta cercana",
    fuera_de_reglas: "Fuera de reglas",
  };
  return map[estado] || "Pendiente de análisis";
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
        padding: "7px 11px",
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
        padding: 14,
        borderRadius: 16,
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
        padding: 14,
        borderRadius: 16,
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

function StatCard({ label, value }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: UI.cardSoft,
        border: `1px solid ${UI.borderSoft}`,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function InfoCard({ title, subtitle, children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 18,
        borderRadius: 22,
        background: UI.card,
        border: `1px solid ${UI.border}`,
        boxShadow: UI.shadowSoft,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
      {subtitle ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            lineHeight: 1.4,
            color: UI.textDim,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      <div style={{ marginTop: 12 }}>{children}</div>
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
        padding: 14,
        borderRadius: 18,
        background,
        border: `1px solid ${border}`,
        fontSize: 14,
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
          marginTop: 60,
          padding: 20,
          borderRadius: 24,
          background: UI.card,
          border: `1px solid ${UI.border}`,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8 }}>Propiedad</div>
        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>
          No encontramos esta propiedad
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
          Puede que el id no exista o que todavía no esté cargada en tu inventario.
        </div>
        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={onBack}>Volver a propiedades</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const snapshot = useMemo(() => loadOwnedData(LS_SNAPSHOT), []);
  const journey = useMemo(() => loadOwnedData(LS_JOURNEY), []);

  const matchedProperties =
    pick(snapshot, ["matchedProperties"]) ||
    snapshot?.plan?.routeSignals?.matchedProperties ||
    snapshot?.routeSignals?.matchedProperties ||
    snapshot?.output?.routeSignals?.matchedProperties ||
    journey?.match?.propiedades ||
    journey?.match?.items ||
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

  const entradaDisponibleRaw =
    pick(snapshot, ["entradaDisponible"]) ??
    snapshot?.plan?.currentEntry ??
    snapshot?.financialCapacity?.plannedEntry?.currentEntry ??
    journey?.form?.entradaDisponible ??
    journey?.form?.entrada ??
    journey?.entrada ??
    property?.evaluacionEntrada?.entradaDisponibleHoy ??
    null;

  const entradaDisponible = maybeNum(entradaDisponibleRaw);

  const precioMaxViviendaRaw =
    pick(snapshot, ["precioMaxVivienda"]) ??
    pick(snapshot, ["precioMaxPerfil"]) ??
    pick(snapshot, ["precioMax"]) ??
    snapshot?.financialCapacity?.estimatedMaxPropertyValue ??
    snapshot?.homeRecommendation?.profileProgramsThatCouldWorkIfRangeAdjusted?.[0]?.priceMax ??
    property?.evaluacionHipotecaHoy?.precioMaxVivienda ??
    property?.evaluacionHipotecaFutura?.precioMaxVivienda ??
    null;

  const precioMaxVivienda = maybeNum(precioMaxViviendaRaw);

  const productoElegido =
    pick(snapshot, ["productoElegido", "productoSugerido"]) ||
    property?.evaluacionHipotecaHoy?.productoSugerido ||
    property?.evaluacionHipotecaFutura?.productoSugerido ||
    null;

  const bancosTop3 =
    pick(snapshot, ["bancosTop3"]) ||
    pick(snapshot, ["bancosProbabilidad"]) ||
    snapshot?.rankedMortgages ||
    [];

  const bankSuggested =
    Array.isArray(bancosTop3) && bancosTop3.length ? bancosTop3[0] : null;

  const evaluacionEntrada = property?.evaluacionEntrada || null;
  const evaluacionHipotecaHoy =
    property?.evaluacionHipotecaHoy || property?.evaluacionHipoteca || null;
  const evaluacionHipotecaFutura = property?.evaluacionHipotecaFutura || null;
  const estadoCompra = property?.estadoCompra || null;

  const hasPrecioMax = precioMaxVivienda != null && precioMaxVivienda > 0;
  const hasEntradaDisponible = entradaDisponible != null;
  const hasEvaluacionEntrada = !!evaluacionEntrada;
  const hasHipotecaData =
    !!evaluacionHipotecaHoy || !!evaluacionHipotecaFutura || !!bankSuggested;

  const calzaPrecio = hasPrecioMax ? precio <= precioMaxVivienda : null;
  const gapPrecio = hasPrecioMax ? Math.max(0, precio - precioMaxVivienda) : null;
  const entradaPct =
    hasEntradaDisponible && precio > 0 ? (entradaDisponible / precio) * 100 : null;

  const entradaRequerida =
    evaluacionEntrada?.entradaRequerida == null
      ? null
      : maybeNum(evaluacionEntrada?.entradaRequerida);

  const faltanteEntrada =
    evaluacionEntrada?.faltanteEntrada == null
      ? null
      : maybeNum(evaluacionEntrada?.faltanteEntrada);

  const cuotaEntradaMensual =
    evaluacionEntrada?.cuotaEntradaMensual == null
      ? null
      : maybeNum(evaluacionEntrada?.cuotaEntradaMensual);

  const mesesConstruccion =
    evaluacionEntrada?.mesesConstruccionRestantes == null
      ? null
      : maybeNum(evaluacionEntrada?.mesesConstruccionRestantes);

  const hasAnalisisCompletoMinimo =
    hasPrecioMax && hasEntradaDisponible && (hasEvaluacionEntrada || hasHipotecaData);

  let toneEstado = "neutral";
  if (hasAnalisisCompletoMinimo) {
    toneEstado =
      estadoCompra === "top_match" ||
      estadoCompra === "entrada_viable_hipoteca_futura_viable"
        ? "green"
        : estadoCompra === "entrada_viable_hipoteca_futura_debil" ||
          estadoCompra === "ruta_cercana"
        ? "amber"
        : "red";
  } else {
    toneEstado = "amber";
  }

  const heroTitle =
    property.titulo || property.nombre || property.proyecto || "Propiedad";
  const heroLocation =
    property.sector || property.zona || property.ciudadZona || property.ciudad || "Quito";

  const descripcionReal =
    property.descripcion ||
    `${heroTitle} es una propiedad orientada a primera vivienda, ubicada en ${heroLocation}. Esta opción se muestra porque se alinea con tu perfil actual y con una ruta estimada de compra dentro de la app.`;

  const mainBadgeLabel = hasAnalisisCompletoMinimo
    ? property?.matchBadgeCalculado || property?.matchBadge || formatEstadoCompra(estadoCompra)
    : "Pendiente de análisis";

  const estadoLabel = hasAnalisisCompletoMinimo
    ? formatEstadoCompra(estadoCompra)
    : "Análisis parcial";

  const futureReasonText =
    evaluacionHipotecaFutura?.viable
      ? faltanteEntrada === 0
        ? "Con la entrada requerida ya cubierta, esta propiedad podría calzar con tu ruta hipotecaria al momento de la entrega."
        : evaluacionHipotecaFutura?.razon || "No disponible"
      : evaluacionHipotecaFutura?.razon || "No disponible";

function handleSelectProperty() {
  const propertyId =
    property?.id ||
    property?._id ||
    property?.propertyId ||
    id ||
    null;

  const propertyTitle =
    property?.titulo ||
    property?.nombre ||
    property?.title ||
    property?.name ||
    property?.proyecto ||
    "Propiedad elegida";

  const propertyCity =
    property?.ciudad ||
    property?.zona ||
    property?.ciudadZona ||
    property?.sector ||
    journey?.form?.ciudadCompra ||
    journey?.ciudadCompra ||
    "Ubicación pendiente";

  const propertyPriceRaw =
    property?.precio ??
    property?.price ??
    property?.valor ??
    property?.listPrice ??
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
    // ids
    id: propertyId,
    _id: propertyId,
    propertyId: propertyId,

    // naming estándar
    titulo: propertyTitle,
    nombre: propertyTitle,
    proyecto: propertyTitle,

    // location estándar
    ciudad: propertyCity,
    zona: propertyCity,
    sector: property?.sector || propertyCity,
    ciudadZona: property?.ciudadZona || propertyCity,

    // price estándar
    precio: propertyPrice,
    price: propertyPrice,

    // media
    imagen: propertyImage,
    image: propertyImage,

    // detalles útiles
    cuotaEstimada:
      property?.cuotaEstimada ||
      property?.cuota ||
      property?.evaluacionHipotecaFutura?.cuotaReferencia ||
      property?.evaluacionHipotecaHoy?.cuotaReferencia ||
      snapshot?.cuotaEstimada ||
      snapshot?.cuotaMensual ||
      snapshot?.bestMortgage?.cuota ||
      null,

    entradaMinima:
      property?.entradaMinima ??
      property?.entradaRequerida ??
      property?.evaluacionEntrada?.entradaRequerida ??
      null,

    descripcion:
      property?.descripcion ||
      `${propertyTitle} es una propiedad que hoy se alinea con tu ruta estimada dentro de HabitaLibre.`,

    source: "property_detail",
    selectedAt: new Date().toISOString(),

    raw: property,
  };

  saveOwnedData(LS_SELECTED_PROPERTY, normalizedProperty);

  saveOwnedData(LS_JOURNEY, {
    ...(journey || {}),
    propiedadElegida: true,
    propiedadId: propertyId,
    propiedadSeleccionada: normalizedProperty,
  });

  navigate("/ruta");
}

  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        fontFamily: "system-ui",
        paddingBottom: 150,
      }}
    >
      <div
        style={{
          height: 300,
          width: "100%",
          background: property.imagen
            ? `linear-gradient(rgba(0,0,0,0.16), rgba(7,16,36,0.52)), url(${property.imagen}) center/cover`
            : "linear-gradient(135deg, rgba(37,211,166,0.18), rgba(255,255,255,0.06))",
          position: "relative",
        }}
      >
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/marketplace");
            }
          }}
          aria-label="Volver"
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 18px)",
            left: 16,
            width: 56,
            height: 56,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(9, 18, 38, 0.88)",
            color: "white",
            borderRadius: 999,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ marginTop: -36, padding: "0 22px" }}>
        <div
          style={{
            padding: 20,
            borderRadius: 26,
            background: "rgba(7,16,36,0.88)",
            border: `1px solid ${UI.border}`,
            boxShadow: UI.shadow,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill tone={toneEstado}>{mainBadgeLabel}</Pill>

            {property.proyectoNuevo ? <Pill>Proyecto nuevo</Pill> : <Pill>Entrega inmediata</Pill>}

            <Pill>{formatMatchReason(property.matchReason)}</Pill>
          </div>

          <div style={{ marginTop: 14, fontSize: 30, fontWeight: 980, lineHeight: 1.02 }}>
            {heroTitle}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 15,
              color: "rgba(255,255,255,0.78)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <MapPin size={14} />
            {heroLocation}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: UI.textDim, fontWeight: 800 }}>
                Precio
              </div>
              <div style={{ marginTop: 4, fontSize: 40, fontWeight: 980, lineHeight: 1 }}>
                {moneyUSD(precio)}
              </div>
            </div>

            <Pill tone={toneEstado}>{estadoLabel}</Pill>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <StatCard label="Área" value={property.m2 != null ? `${property.m2} m²` : "—"} />
            <StatCard
              label="Dormitorios"
              value={property.dormitorios != null ? String(property.dormitorios) : "—"}
            />
            <StatCard
              label="Baños"
              value={property.banos != null ? String(property.banos) : "—"}
            />
            <StatCard
              label="Parqueaderos"
              value={property.parqueaderos != null ? String(property.parqueaderos) : "—"}
            />
          </div>
        </div>

        <InfoCard
          title="Cómo se alinea con tu perfil"
          subtitle="Aquí resumimos cómo se alinea esta propiedad con tu perfil actual y qué podrías ajustar."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <ToneBox tone={toneEstado}>
              <strong>{estadoLabel}</strong>
              <div style={{ marginTop: 6 }}>
                {hasAnalisisCompletoMinimo
                  ? property?.matchReasonCalculado ||
                    "Analizamos esta propiedad con base en tu perfil y en el esquema financiero del proyecto."
                  : "Todavía no tenemos suficiente información para confirmar el encaje completo de esta propiedad con tu perfil."}
              </div>
            </ToneBox>

            <ToneBox>
              Esta propiedad se alinea principalmente por{" "}
              <strong>{formatMatchReason(property.matchReason)}</strong>.
            </ToneBox>

            <ToneBox>
              {hasPrecioMax ? (
                <>
                  Tu precio máximo estimado hoy es <strong>{moneyUSD(precioMaxVivienda)}</strong>.
                  {calzaPrecio ? (
                    <> Esta propiedad <strong>sí entra</strong> dentro de ese rango.</>
                  ) : (
                    <>
                      {" "}Esta propiedad queda <strong>{moneyUSD(gapPrecio)}</strong> por encima de tu
                      rango hipotecario actual.
                    </>
                  )}
                </>
              ) : (
                <>Aún no tenemos tu precio máximo calculado.</>
              )}
            </ToneBox>

            <ToneBox>
              {hasEntradaDisponible ? (
                <>
                  Tu entrada registrada es <strong>{moneyUSD(entradaDisponible)}</strong>, equivalente a{" "}
                  <strong>{formatPct(entradaPct)}</strong> del valor de esta propiedad.
                </>
              ) : (
                <>Aún no tenemos una entrada registrada para esta propiedad.</>
              )}
            </ToneBox>
          </div>
        </InfoCard>

        <InfoCard
          title="Entrada al proyecto"
          subtitle="Te mostramos cuánto pide el proyecto, cuánto te faltaría y cómo se ve esa entrada para tu situación."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <StatCard label="Entrada requerida" value={formatMoney(entradaRequerida)} />

              <StatCard
                label="Faltante de entrada"
                value={
                  faltanteEntrada == null
                    ? "—"
                    : faltanteEntrada === 0
                    ? "$0 (completo)"
                    : formatMoney(faltanteEntrada)
                }
              />

              <StatCard
                label="Cuota mensual de entrada"
                value={
                  cuotaEntradaMensual == null
                    ? "No disponible"
                    : cuotaEntradaMensual === 0
                    ? "No requerida"
                    : formatMonthly(cuotaEntradaMensual)
                }
              />

              <StatCard
                label="Meses de construcción"
                value={
                  mesesConstruccion != null && mesesConstruccion > 0
                    ? `${mesesConstruccion} meses`
                    : "—"
                }
              />
            </div>

            {hasEvaluacionEntrada ? (
              <ToneBox tone={evaluacionEntrada?.viableEntrada ? "green" : "red"}>
                <strong>
                  {evaluacionEntrada?.viableEntrada
                    ? faltanteEntrada === 0
                      ? "Ya cumples la entrada requerida para este proyecto."
                      : "La entrada se ve viable para ti."
                    : "La entrada todavía no se ve viable para ti."}
                </strong>
                <div style={{ marginTop: 6 }}>
                  {evaluacionEntrada?.viableEntrada
                    ? faltanteEntrada === 0
                      ? "No necesitas completar una cuota mensual de entrada en esta etapa."
                      : evaluacionEntrada?.razon || "La entrada podría completarse dentro del plazo estimado."
                    : evaluacionEntrada?.razon || "No tenemos todavía el análisis de entrada."}
                </div>
              </ToneBox>
            ) : (
              <ToneBox tone="amber">
                <strong>Entrada pendiente de análisis</strong>
                <div style={{ marginTop: 6 }}>
                  Todavía no tenemos suficiente información para calcular la entrada de esta propiedad.
                </div>
              </ToneBox>
            )}
          </div>
        </InfoCard>

        <InfoCard
          title="Ruta hipotecaria"
          subtitle="Aquí ves si esta propiedad se alinea con una hipoteca hoy, una hipoteca futura o una recomendación general de tu perfil."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {evaluacionHipotecaHoy ? (
              <ToneBox tone={evaluacionHipotecaHoy?.viable ? "green" : "amber"}>
                <strong>Hipoteca en escenario actual</strong>
                <div style={{ marginTop: 6 }}>
                  {evaluacionHipotecaHoy?.razon || "No disponible"}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
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
                  {futureReasonText}
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
              <ToneBox tone="amber">
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

            {!hasHipotecaData ? (
              <ToneBox tone="amber">
                <strong>Ruta hipotecaria pendiente</strong>
                <div style={{ marginTop: 6 }}>
                  Todavía no hay una ruta hipotecaria calculada para esta propiedad.
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

        <InfoCard
          title="Descripción"
          subtitle="Resumen de la propiedad y de su encaje estimado dentro de tu escenario actual."
        >
          <div style={{ fontSize: 14, color: UI.textDim, lineHeight: 1.5 }}>
            {descripcionReal}
          </div>
        </InfoCard>

        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <PrimaryButton onClick={handleSelectProperty}>
            Seleccionar esta propiedad
          </PrimaryButton>

          <SecondaryButton onClick={() => navigate("/marketplace")}>
            Ver más propiedades
          </SecondaryButton>
        </div>

        <div style={{ height: 140 }} />
      </div>
    </div>
  );
}