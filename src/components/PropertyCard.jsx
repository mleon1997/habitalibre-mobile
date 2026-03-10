// src/components/PropertyCard.jsx
import React from "react";
import { moneyUSD } from "../lib/money";
import { Card, Chip, UI } from "../ui/kit.jsx";

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

export default function PropertyCard({ property, onClick }) {
  if (!property) return null;

  const {
    titulo,
    precio,
    m2,
    areaM2,
    dormitorios,
    banos,
    ciudadZona,
    ciudad,
    zona,
    sector,
    proyectoNuevo,
    matchReason,
    matchBadge,
    imagen,
  } = property;

  const area = m2 ?? areaM2 ?? null;
  const ubicacion = [sector, ciudadZona || ciudad || zona].filter(Boolean).join(" • ");

  return (
    <Card
      soft
      style={{
        padding: 0,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
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
            height: 170,
            width: "100%",
            background: imagen
              ? `linear-gradient(180deg, rgba(2,6,23,0.05) 0%, rgba(2,6,23,0.38) 100%), url(${imagen}) center/cover`
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
            }}
          >
            <Chip tone="good">{matchBadge || "Recomendado"}</Chip>
            {proyectoNuevo ? <Chip tone="neutral">Nuevo</Chip> : null}
          </div>

          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(2,6,23,0.70)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(8px)",
              fontWeight: 950,
              fontSize: 18,
              color: "rgba(255,255,255,0.96)",
            }}
          >
            {moneyUSD(precio)}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0 }}>
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
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: UI.subtext,
              lineHeight: 1.4,
            }}
          >
            Match por <strong style={{ color: UI.text }}>{formatMatchReason(matchReason)}</strong>
          </div>
        </div>
      </button>
    </Card>
  );
}