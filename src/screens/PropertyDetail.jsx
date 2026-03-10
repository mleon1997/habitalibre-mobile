// src/screens/PropertyDetail.jsx
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { moneyUSD } from "../lib/money";
import { mockProperties } from "../data/mockProperties";

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

function formatMatchReason(reason) {
  const map = {
    precio: "precio",
    entrada: "entrada",
    precio_entrada: "precio + entrada",
    cuota: "cuota",
    programa: "programa",
  };
  return map[reason] || "precio";
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
  shadow: "0 10px 30px rgba(0,0,0,0.22)",
  shadowSoft: "0 10px 24px rgba(0,0,0,0.18)",
};

function Pill({ children, tone = "neutral" }) {
  const bg =
    tone === "green" ? "rgba(37,211,166,0.14)" : "rgba(255,255,255,0.08)";
  const br =
    tone === "green" ? "rgba(37,211,166,0.28)" : "rgba(255,255,255,0.10)";

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
          Puede que el id no exista o que todavía no esté cargada en tu inventario mock.
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

  const precioMaxVivienda = pick(snapshot, [
    "precioMaxVivienda",
    "precioMax",
    "valorMaxVivienda",
    "precioMaxPerfil",
  ]);

  const cuotaEstimada = pick(snapshot, ["cuotaEstimada"]);
  const entradaDisponible =
    pick(snapshot, ["entradaDisponible"]) ?? pick(journey, ["entradaDisponible"]) ?? 0;
  const productoElegido = pick(snapshot, ["productoElegido", "productoSugerido"]);
  const bancosTop3 =
    pick(snapshot, ["bancosTop3"]) || pick(snapshot, ["bancosProbabilidad"]) || [];

  const property = useMemo(
    () => mockProperties.find((p) => String(p.id) === String(id)),
    [id]
  );

  if (!property) {
    return <NotFound onBack={() => navigate("/marketplace")} />;
  }

  const precio = Number(property.precio) || 0;
  const maxPrecio = Number(precioMaxVivienda) || 0;
  const entrada = Number(entradaDisponible) || 0;

  const calzaPrecio = maxPrecio > 0 ? precio <= maxPrecio : true;
  const gapPrecio = maxPrecio > 0 ? Math.max(0, precio - maxPrecio) : 0;
  const entradaPct = precio > 0 ? (entrada / precio) * 100 : 0;

  const bankSuggested = Array.isArray(bancosTop3) && bancosTop3.length ? bancosTop3[0] : null;

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
            <Pill tone="green">{property.matchBadge || "Match"}</Pill>
            {property.proyectoNuevo ? <Pill>Proyecto nuevo</Pill> : <Pill>Disponible</Pill>}
            <Pill>{formatMatchReason(property.matchReason)}</Pill>
          </div>

          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 900 }}>
            {property.titulo}
          </div>

          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.78 }}>
            {property.sector || property.zona} • {property.ciudadZona || property.zona}
          </div>

          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 900 }}>
            {moneyUSD(property.precio)}
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
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                background: UI.greenBg,
                border: `1px solid ${UI.greenBorder}`,
                lineHeight: 1.4,
                fontSize: 13,
              }}
            >
              Esta propiedad hace match principalmente por{" "}
              <strong>{formatMatchReason(property.matchReason)}</strong>.
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 16,
                background: UI.cardSoft,
                border: `1px solid ${UI.borderSoft}`,
                lineHeight: 1.45,
                fontSize: 13,
              }}
            >
              {typeof precioMaxVivienda === "number" ? (
                <>
                  Tu precio máximo estimado hoy es <strong>{moneyUSD(precioMaxVivienda)}</strong>.
                  {calzaPrecio ? (
                    <>
                      {" "}
                      Esta propiedad <strong>sí entra</strong> dentro de ese rango.
                    </>
                  ) : (
                    <>
                      {" "}
                      Esta propiedad queda <strong>{moneyUSD(gapPrecio)}</strong> por encima de tu
                      rango estimado actual.
                    </>
                  )}
                </>
              ) : (
                <>Aún no tenemos tu precio máximo calculado.</>
              )}
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 16,
                background: UI.cardSoft,
                border: `1px solid ${UI.borderSoft}`,
                lineHeight: 1.45,
                fontSize: 13,
              }}
            >
              Tu entrada registrada es <strong>{moneyUSD(entrada)}</strong>, equivalente a{" "}
              <strong>{entradaPct.toFixed(1)}%</strong> del valor de esta propiedad.
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Ruta hipotecaria sugerida">
          {bankSuggested ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 16,
                  background: UI.cardSoft,
                  border: `1px solid ${UI.borderSoft}`,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.74, fontWeight: 800 }}>
                  Mejor ruta estimada
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 16 }}>
                  {bankSuggested.banco || "Hipoteca sugerida"}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
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
              </div>

              {productoElegido ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    background: UI.cardSoft,
                    border: `1px solid ${UI.borderSoft}`,
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  Tu producto sugerido actual es <strong>{String(productoElegido)}</strong>.
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
              Aún no tenemos una hipoteca sugerida disponible en el snapshot.
            </div>
          )}
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