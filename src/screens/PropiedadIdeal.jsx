import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Screen,
  Card,
  Chip,
  PrimaryButton,
  SecondaryButton,
  UI,
} from "../ui/kit.jsx";
import { getCustomer } from "../lib/customerSession.js";
import {
  getPropertyMatchStatus,
  PROPERTY_MATCH_STATUS,
} from "../utils/propertyMatch";
const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

function safeParseLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
  const envelope = safeParseLS(key);

  if (!envelope) return null;

  if (envelope?.ownerEmail && "data" in envelope) {
    if (
      ownerEmail &&
      String(envelope.ownerEmail).trim().toLowerCase() === ownerEmail
    ) {
      return envelope.data ?? null;
    }

    if (!ownerEmail) return envelope.data ?? null;

    return null;
  }

  return envelope;
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `$${Math.round(x).toLocaleString("en-US")}`;
}

function normalizeProperty(raw, fallbackCity = "Quito") {
  if (!raw || typeof raw !== "object") return null;

  const id =
    raw?.id ||
    raw?._id ||
    raw?.propertyId ||
    raw?._normalizedId ||
    null;

  const nombre =
    raw?.nombre ||
    raw?.titulo ||
    raw?.title ||
    raw?.name ||
    raw?.proyecto ||
    raw?._normalizedProjectName ||
    "Propiedad elegida";

  const ciudad =
    raw?.ciudad ||
    raw?.city ||
    raw?.zona ||
    raw?.sector ||
    raw?.location ||
    raw?._normalizedCity ||
    fallbackCity ||
    "Ubicación pendiente";

  const precioRaw =
    raw?.precio ??
    raw?.price ??
    raw?.valor ??
    raw?.valorVivienda ??
    raw?.listPrice ??
    raw?._normalizedPrice ??
    null;

  const precio = Number.isFinite(Number(precioRaw))
    ? Number(precioRaw)
    : null;

  const cuotaEstimadaRaw =
    raw?.cuotaEstimada ??
    raw?.cuota ??
    raw?.evaluacionHipotecaFutura?.cuotaReferencia ??
    raw?.evaluacionHipotecaHoy?.cuotaReferencia ??
    raw?.evaluacionHipoteca?.cuotaReferencia ??
    null;

  const cuotaEstimada = Number.isFinite(Number(cuotaEstimadaRaw))
    ? Number(cuotaEstimadaRaw)
    : null;

  const entradaMinimaRaw =
    raw?.entradaMinima ??
    raw?.entrada ??
    raw?.entradaRequerida ??
    null;

  const entradaMinima = Number.isFinite(Number(entradaMinimaRaw))
    ? Number(entradaMinimaRaw)
    : null;

  const imagen =
    raw?.imagen ||
    raw?.image ||
    raw?.imageUrl ||
    raw?.foto ||
    raw?.cover ||
    null;

  const descripcion =
    raw?.descripcion ||
    raw?.description ||
    "Una opción alineada con tu perfil y tu capacidad estimada de compra.";

  if (!id && !nombre) return null;

  return {
    id,
    _id: id,
    propertyId: id,
    nombre,
    titulo: nombre,
    proyecto: nombre,
    ciudad,
    sector: ciudad,
    precio,
    price: precio,
    cuotaEstimada,
    entradaMinima,
    imagen,
    descripcion,

        capacidadActual:
      raw?.capacidadActual ??
      raw?.capacidadActualCompraHoy ??
      raw?.currentCapacity ??
      null,

    capacidadObjetivo:
      raw?.capacidadObjetivo ??
      raw?.capacidadObjetivoCompra ??
      raw?.targetCapacity ??
      null,

    estadoMatch:
      raw?.estadoMatch ??
      raw?.matchStatus ??
      raw?.selectedPropertyMatchStatus ??
      null,

    matchLabel:
      raw?.matchLabel ??
      raw?.matchBadge ??
      null,

    matchDescription:
      raw?.matchDescription ??
      raw?.matchReason ??
      null,

    matchCta:
      raw?.matchCta ??
      null,

    brecha:
      raw?.brecha ??
      raw?.matchGap ??
      raw?.brechaContraCapacidadActual ??
      raw?.matchGapAgainstCurrent ??
      null,

    puedeAplicarHoy:
      raw?.puedeAplicarHoy === true ||
      raw?.isReadyNow === true,

    alcanzableConPlan:
      raw?.alcanzableConPlan === true ||
      raw?.isReachableWithPlan === true,

    fueraDeRango:
      raw?.fueraDeRango === true ||
      raw?.isOutOfRange === true,
    raw,
  };
}

function pickRecommendedProperty(snapshot, journey) {
  const market =
    journey?.match?.propiedades ||
    journey?.match?.items ||
    snapshot?.marketplace?.items ||
    snapshot?.propiedades ||
    snapshot?.output?.marketplace?.items ||
    snapshot?.output?.propiedades ||
    [];

  if (Array.isArray(market) && market.length > 0) {
    return normalizeProperty(
      market[0],
      journey?.form?.ciudadCompra || journey?.ciudadCompra || "Quito"
    );
  }

  const ciudad = journey?.form?.ciudadCompra || journey?.ciudadCompra || "Quito";

  const capacidadVivienda =
    snapshot?.precioMaxVivienda ||
    snapshot?.output?.precioMaxVivienda ||
    snapshot?.maxCompra ||
    snapshot?.output?.maxCompra ||
    snapshot?.montoMaximo ||
    snapshot?.output?.montoMaximo ||
    snapshot?.financialCapacity?.estimatedMaxPropertyValue ||
    snapshot?.output?.financialCapacity?.estimatedMaxPropertyValue ||
    90000;

  const precio = Math.max(
    30000,
    Math.round(Number(capacidadVivienda || 90000) * 0.92)
  );

  const cuota =
    snapshot?.cuotaEstimada ||
    snapshot?.output?.cuotaEstimada ||
    snapshot?.cuotaMensual ||
    snapshot?.output?.cuotaMensual ||
    snapshot?.bestMortgage?.cuota ||
    snapshot?.output?.bestMortgage?.cuota ||
    snapshot?.financialCapacity?.estimatedMonthlyPayment ||
    snapshot?.output?.financialCapacity?.estimatedMonthlyPayment ||
    450;

  return {
    id: "demo-prop-1",
    _id: "demo-prop-1",
    propertyId: "demo-prop-1",
    nombre: "Proyecto recomendado para ti",
    titulo: "Proyecto recomendado para ti",
    ciudad,
    sector: ciudad,
    precio,
    price: precio,
    cuotaEstimada: cuota,
    entradaMinima: Math.round(precio * 0.1),
    imagen:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
    descripcion:
      "Una opción alineada con tu perfil y tu capacidad estimada de compra.",
  };
}

export default function PropiedadIdeal() {
  const navigate = useNavigate();

  const snapshot = loadOwnedData(LS_SNAPSHOT) || {};
  const journey = loadOwnedData(LS_JOURNEY) || {};
  const selectedPropertyRaw = loadOwnedData(LS_SELECTED_PROPERTY);

  const selectedProperty = useMemo(() => {
    return normalizeProperty(
      selectedPropertyRaw,
      journey?.form?.ciudadCompra || journey?.ciudadCompra || "Quito"
    );
  }, [selectedPropertyRaw, journey]);

  const property = useMemo(() => {
    return selectedProperty || pickRecommendedProperty(snapshot, journey);
  }, [selectedProperty, snapshot, journey]);

  const isUserSelected = !!selectedProperty;

  const viviendaPosible =
    snapshot?.precioMaxVivienda ||
    snapshot?.output?.precioMaxVivienda ||
    snapshot?.maxCompra ||
    snapshot?.output?.maxCompra ||
    snapshot?.montoMaximo ||
    snapshot?.output?.montoMaximo ||
    snapshot?.montoPrestamoMax ||
    snapshot?.output?.montoPrestamoMax ||
    snapshot?.financialCapacity?.estimatedMaxPropertyValue ||
    snapshot?.output?.financialCapacity?.estimatedMaxPropertyValue ||
    null;

  const prestamoBanco =
    snapshot?.montoPrestamoBest ||
    snapshot?.output?.montoPrestamoBest ||
    snapshot?.montoPrestamo ||
    snapshot?.output?.montoPrestamo ||
    snapshot?.bestMortgage?.montoPrestamo ||
    snapshot?.output?.bestMortgage?.montoPrestamo ||
    snapshot?.montoMaximo ||
    snapshot?.output?.montoMaximo ||
    snapshot?.financialCapacity?.estimatedMaxLoanAmount ||
    snapshot?.output?.financialCapacity?.estimatedMaxLoanAmount ||
    null;

  const cuota =
    property?.cuotaEstimada ||
    property?.cuota ||
    snapshot?.cuotaEstimada ||
    snapshot?.output?.cuotaEstimada ||
    snapshot?.cuotaMensual ||
    snapshot?.output?.cuotaMensual ||
    snapshot?.bestMortgage?.cuota ||
    snapshot?.output?.bestMortgage?.cuota ||
    snapshot?.financialCapacity?.estimatedMonthlyPayment ||
    snapshot?.output?.financialCapacity?.estimatedMonthlyPayment ||
    null;

  const probabilidadRaw =
    snapshot?.probabilidadLabel ||
    snapshot?.output?.probabilidadLabel ||
    snapshot?.probabilidad ||
    snapshot?.output?.probabilidad ||
    snapshot?.bestMortgage?.probabilidad ||
    snapshot?.output?.bestMortgage?.probabilidad ||
    "Alta";

  const nombreUsuario = journey?.form?.nombre || journey?.nombre || "Hola";

  const entradaMinima =
    property?.entradaMinima ??
    journey?.form?.entrada ??
    journey?.entrada ??
    snapshot?.entradaDisponible ??
    snapshot?.output?.entradaDisponible ??
    null;

  const valorViviendaPropiedad = property?.precio ?? null;

  const ciudadMostrar =
    property?.sector ||
    property?.ciudad ||
    journey?.form?.ciudadCompra ||
    journey?.ciudadCompra ||
    "Ubicación por definir";

      const capacidadActual =
    property?.capacidadActual ??
    selectedPropertyRaw?.capacidadActual ??
    selectedPropertyRaw?.capacidadActualCompraHoy ??
    journey?.capacidadActualCompraHoy ??
    viviendaPosible ??
    null;

  const capacidadObjetivo =
    property?.capacidadObjetivo ??
    selectedPropertyRaw?.capacidadObjetivo ??
    selectedPropertyRaw?.capacidadObjetivoCompra ??
    journey?.capacidadObjetivoCompra ??
    valorViviendaPropiedad ??
    capacidadActual ??
    null;

  const calculatedMatch =
    valorViviendaPropiedad != null
      ? getPropertyMatchStatus({
          propertyPrice: valorViviendaPropiedad,
          capacidadActual,
          capacidadObjetivo,
        })
      : null;

  const estadoMatch =
    property?.estadoMatch ||
    selectedPropertyRaw?.estadoMatch ||
    selectedPropertyRaw?.matchStatus ||
    journey?.selectedPropertyMatchStatus ||
    calculatedMatch?.status ||
    null;

  const isAptoHoy = estadoMatch === PROPERTY_MATCH_STATUS.APTO_HOY;

  const isMetaAlcanzable =
    estadoMatch === PROPERTY_MATCH_STATUS.META_ALCANZABLE;

  const isFueraDeRango =
    estadoMatch === PROPERTY_MATCH_STATUS.FUERA_DE_RANGO;

  const brechaActual =
    property?.brecha ??
    selectedPropertyRaw?.brecha ??
    selectedPropertyRaw?.brechaContraCapacidadActual ??
    calculatedMatch?.gap ??
    (valorViviendaPropiedad != null && capacidadActual != null
      ? Math.max(0, valorViviendaPropiedad - capacidadActual)
      : null);

  const matchChipLabel = isMetaAlcanzable
    ? "Alcanzable con plan"
    : isAptoHoy
    ? "Puedes aplicar hoy"
    : isFueraDeRango
    ? "Fuera de rango"
    : `Probabilidad ${String(probabilidadRaw)}`;

  const headerTitle = isMetaAlcanzable
    ? "Tu propiedad objetivo"
    : isAptoHoy
    ? "Una opción lista para explorar"
    : "Una opción alineada contigo";

  const headerSubtitle = isMetaAlcanzable
    ? `${nombreUsuario}, esta propiedad supera tu capacidad actual, pero puede servir como meta si completas tu plan de preparación.`
    : isAptoHoy
    ? `${nombreUsuario}, esta propiedad está dentro de tu capacidad estimada actual.`
    : isUserSelected
    ? `${nombreUsuario}, esta propiedad puede servir como base para seguir avanzando dentro de tu ruta.`
    : `${nombreUsuario}, esta es una opción que sí encaja con tu capacidad actual de compra.`;

  const mainPropertyChip = isMetaAlcanzable
    ? "Meta de tu ruta"
    : isAptoHoy
    ? "Lista para ruta"
    : isUserSelected
    ? "Base de tu ruta"
    : "Alineada contigo";

  const capacityCardLabel = isMetaAlcanzable
    ? "Capacidad actual"
    : "Vivienda que podrías comprar";

  const positiveBoxTitle = isMetaAlcanzable
    ? "Guardamos esta propiedad como meta"
    : isAptoHoy
    ? "Esta opción está dentro de tu rango actual"
    : isUserSelected
    ? "Elegiste una opción alineada contigo"
    : "Esta opción va bien con tu perfil";

  const positiveBoxBody = isMetaAlcanzable
    ? "Hoy todavía no está lista para aplicar, pero HabitaLibre puede usarla como objetivo para mostrarte qué debes mejorar y cómo acercarte."
    : property?.descripcion ||
      "Por precio, cuota y capacidad de compra, esta es una de las opciones más alineadas contigo.";

  const primaryCtaLabel = isMetaAlcanzable
    ? "Ver plan para esta propiedad"
    : "Quiero avanzar con esta propiedad";

  const nextStepCopy = isMetaAlcanzable
    ? "Como esta propiedad es una meta alcanzable, el siguiente paso no es aplicar todavía, sino ver qué brecha debes cerrar para acercarte a ella."
    : "Si esta opción te interesa, HabitaLibre la puede tomar como base para seguir guiando tu caso y mostrarte el siguiente paso más conveniente.";

  const nextStepButtonLabel = isMetaAlcanzable
    ? "Ir a mi plan"
    : "Volver a mi ruta";


  return (
    <Screen
      style={{
        paddingLeft: 22,
        paddingRight: 22,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 26px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 150px)",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                color: UI.subtext,
                marginBottom: 8,
                fontWeight: 800,
              }}
            >
              Basado en tu perfil
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.02,
                fontWeight: 950,
                letterSpacing: -0.8,
                color: UI.text,
              }}
            >
              {headerTitle}
            </h1>

            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.45,
                color: UI.subtext,
                maxWidth: 420,
              }}
            >
             {headerSubtitle}
            </div>
          </div>

          <div style={{ marginTop: 4, flexShrink: 0 }}>
<Chip tone="good">{matchChipLabel}</Chip>
          </div>
        </div>

        <Card style={{ overflow: "hidden", padding: 0, marginBottom: 18 }}>
          <div
            style={{
              width: "100%",
              height: 170,
              backgroundImage: property?.imagen ? `url(${property.imagen})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: property?.imagen
                ? undefined
                : "rgba(255,255,255,0.04)",
              borderBottom: UI.border,
            }}
          />

          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 950,
                    color: UI.text,
                    lineHeight: 1.05,
                    marginBottom: 6,
                  }}
                >
                  {property?.nombre || "Proyecto recomendado"}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: UI.subtext,
                    lineHeight: 1.35,
                  }}
                >
                  {ciudadMostrar}
                </div>
              </div>

       <Chip tone="good">{mainPropertyChip}</Chip>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  padding: 14,
                  borderRadius: UI.radiusInner,
                  background: UI.innerBg,
                  border: UI.borderSoft,
                }}
              >
                <div style={{ fontSize: 13, color: UI.subtext, marginBottom: 8 }}>
                  Valor de esta vivienda
                </div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>
                  {money(valorViviendaPropiedad)}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: UI.radiusInner,
                  background: UI.innerBg,
                  border: UI.borderSoft,
                }}
              >
                <div style={{ fontSize: 13, color: UI.subtext, marginBottom: 8 }}>
                  Cuota estimada
                </div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>
                  {money(cuota)}
                  <span style={{ fontSize: 13, color: UI.subtext }}> / mes</span>
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: UI.radiusInner,
                  background: UI.innerBg,
                  border: UI.borderSoft,
                }}
              >
                <div style={{ fontSize: 13, color: UI.subtext, marginBottom: 8 }}>
                  Entrada aproximada
                </div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>
                  {money(entradaMinima)}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: UI.radiusInner,
                  background: "rgba(45,212,191,0.08)",
                  border: "1px solid rgba(45,212,191,0.18)",
                }}
              >
             <div style={{ fontSize: 13, color: UI.subtext, marginBottom: 8 }}>
  {capacityCardLabel}
</div>
<div style={{ fontSize: 22, fontWeight: 950 }}>
  {money(capacidadActual)}
</div>
              </div>
            </div>

            {isMetaAlcanzable ? (
  <div
    style={{
      padding: 14,
      borderRadius: UI.radiusInner,
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.24)",
      marginBottom: 14,
    }}
  >
    <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 6 }}>
      Esta propiedad es una meta, no una aplicación inmediata
    </div>

    <div
      style={{
        fontSize: 13,
        color: UI.subtext,
        lineHeight: 1.45,
      }}
    >
      Hoy tu capacidad estimada es de {money(capacidadActual)}. Esta propiedad
      cuesta {money(valorViviendaPropiedad)}, por lo que existe una brecha
      aproximada de {money(brechaActual)}. La usaremos como objetivo para
      construir tu plan.
    </div>
  </div>
) : null}

            <div
              style={{
                padding: 14,
                borderRadius: UI.radiusInner,
                background: "rgba(2,6,23,0.18)",
                border: UI.borderSoft,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: UI.subtext,
                  marginBottom: 10,
                  fontWeight: 900,
                }}
              >
                Cómo se arma tu escenario
              </div>

       <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr",
    gap: 8,
    alignItems: "center",
  }}
>
  {isMetaAlcanzable ? (
    <>
      <div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
          Capacidad hoy
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>
          {money(capacidadActual)}
        </div>
      </div>

      <div style={{ fontSize: 18, opacity: 0.55 }}>→</div>

      <div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
          Brecha actual
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>
          {money(brechaActual)}
        </div>
      </div>

      <div style={{ fontSize: 18, opacity: 0.55 }}>→</div>

      <div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
          Propiedad objetivo
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>
          {money(valorViviendaPropiedad)}
        </div>
      </div>
    </>
  ) : (
    <>
      <div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
          Pago mensual
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>
          {money(cuota)}
        </div>
      </div>

      <div style={{ fontSize: 18, opacity: 0.55 }}>→</div>

      <div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
          Préstamo del banco
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>
          {money(prestamoBanco)}
        </div>
      </div>

      <div style={{ fontSize: 18, opacity: 0.55 }}>→</div>

      <div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
          Vivienda que podrías comprar
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>
          {money(viviendaPosible)}
        </div>
      </div>
    </>
  )}
</div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "rgba(148,163,184,0.9)",
                  lineHeight: 1.35,
                }}
              >
{isMetaAlcanzable
  ? "Esta vista separa tu capacidad actual de tu propiedad objetivo para que sepas exactamente qué estás intentando alcanzar."
  : "Tu entrada ayuda a convertir el préstamo en el valor total de vivienda que podrías alcanzar."}
              </div>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: UI.radiusInner,
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.22)",
                marginBottom: 14,
              }}
            >
<div style={{ fontSize: 14, fontWeight: 900, marginBottom: 6 }}>
  ✔ {positiveBoxTitle}
</div>
              <div
                style={{
                  fontSize: 13,
                  color: UI.subtext,
                  lineHeight: 1.45,
                }}
              >
                {positiveBoxBody}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
         <PrimaryButton onClick={() => navigate("/ruta")}>
  {primaryCtaLabel}
</PrimaryButton>

              <SecondaryButton onClick={() => navigate("/marketplace")}>
                Ver más opciones
              </SecondaryButton>
            </div>
          </div>
        </Card>

        <Card soft>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            ¿Qué sigue?
          </div>

          <div
            style={{
              fontSize: 13,
              color: UI.subtext,
              lineHeight: 1.45,
              marginBottom: 12,
            }}
          >
      {nextStepCopy}
          </div>

<SecondaryButton onClick={() => navigate("/ruta")}>
  {nextStepButtonLabel}
</SecondaryButton>
        </Card>
      </div>
    </Screen>
  );
}