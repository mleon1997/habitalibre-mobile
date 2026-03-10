// src/screens/Asesor.jsx
import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { moneyUSD } from "../lib/money";
import {
  Screen,
  Card,
  InnerCard,
  Chip,
  PrimaryButton,
  SecondaryButton,
} from "../ui/kit.jsx";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";

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

function formatRate(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(2)}%`;
}

export default function Asesor() {
  const location = useLocation();
  const snapshot = useMemo(() => loadJSON(LS_SNAPSHOT), []);

  const selectedProperty = location.state?.selectedProperty || null;
  const selectedBank = location.state?.selectedBank || null;

  const cuotaEstimada =
    pick(snapshot, ["cuotaEstimada"]) ??
    pick(snapshot, ["bestMortgage"])?.cuota ??
    selectedBank?.cuota ??
    null;

  const productoElegido =
    pick(snapshot, ["productoElegido", "productoSugerido"]) ||
    pick(snapshot, ["bestMortgage"])?.label ||
    null;

  const precioMaxVivienda = pick(snapshot, [
    "precioMaxVivienda",
    "precioMax",
    "valorMaxVivienda",
    "precioMaxPerfil",
  ]);

  const hasStartedFlow = !!selectedProperty || !!selectedBank;

  return (
    <Screen>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, opacity: 0.72 }}>💬 Asesor</div>
            <h1 style={{ margin: "6px 0 0 0", fontSize: 34, lineHeight: 1.02 }}>
              Tu guía (humana + AI)
            </h1>
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 15 }}>
              Resolver dudas, armar expediente y enviar a bancos.
            </div>
          </div>

          <Chip tone="neutral">Soporte</Chip>
        </div>

        {hasStartedFlow ? (
          <Card style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip tone="good">Solicitud iniciada</Chip>

              {selectedProperty?.proyectoNuevo ? (
                <Chip tone="neutral">Proyecto nuevo</Chip>
              ) : null}

              {selectedBank?.tipoProducto ? (
                <Chip tone="neutral">{String(selectedBank.tipoProducto)}</Chip>
              ) : productoElegido ? (
                <Chip tone="neutral">{String(productoElegido)}</Chip>
              ) : null}
            </div>

            <div style={{ marginTop: 12, fontWeight: 900, fontSize: 22 }}>
              {selectedProperty?.titulo ||
                selectedBank?.banco ||
                "Proceso hipotecario iniciado"}
            </div>

            <div style={{ marginTop: 6, opacity: 0.78, fontSize: 14, lineHeight: 1.4 }}>
              {selectedProperty ? (
                <>
                  {selectedProperty?.sector || selectedProperty?.zona || "Ubicación"}
                  {" • "}
                  {selectedProperty?.ciudadZona || selectedProperty?.ciudad || ""}
                </>
              ) : selectedBank ? (
                <>
                  Banco sugerido para iniciar tu solicitud
                  {selectedBank?.probLabel ? ` • Probabilidad ${selectedBank.probLabel}` : ""}
                </>
              ) : (
                "Estamos listos para ayudarte a avanzar."
              )}
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
                  {selectedProperty ? "Precio" : "Monto posible"}
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
                  {selectedProperty?.precio != null
                    ? moneyUSD(selectedProperty.precio)
                    : selectedBank?.montoPrestamo != null
                    ? moneyUSD(selectedBank.montoPrestamo)
                    : typeof precioMaxVivienda === "number"
                    ? moneyUSD(precioMaxVivienda)
                    : "—"}
                </div>
              </InnerCard>

              <InnerCard style={{ marginTop: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.68, fontWeight: 800 }}>
                  Cuota estimada
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20 }}>
                  {cuotaEstimada != null ? moneyUSD(cuotaEstimada) : "—"}
                </div>
              </InnerCard>
            </div>

            {(selectedProperty || selectedBank) && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedProperty?.m2 != null && (
                  <Chip tone="neutral">{selectedProperty.m2} m²</Chip>
                )}

                {selectedProperty?.dormitorios != null && (
                  <Chip tone="neutral">{selectedProperty.dormitorios} dorm</Chip>
                )}

                {selectedBank?.banco ? (
                  <Chip tone="neutral">{selectedBank.banco}</Chip>
                ) : null}

                {selectedBank?.tasaAnual != null ? (
                  <Chip tone="neutral">Tasa {formatRate(selectedBank.tasaAnual)}</Chip>
                ) : null}
              </div>
            )}
          </Card>
        ) : null}

        {selectedBank ? (
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              Hipoteca que te recomendamos iniciar
            </div>

            <InnerCard>
              <div style={{ fontWeight: 900, fontSize: 17 }}>
                {selectedBank?.banco || "Banco sugerido"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  opacity: 0.82,
                  lineHeight: 1.45,
                }}
              >
                {selectedBank?.tipoProducto
                  ? `Ruta ${selectedBank.tipoProducto}. `
                  : ""}
                {selectedBank?.probLabel
                  ? `Probabilidad ${selectedBank.probLabel.toLowerCase()}. `
                  : ""}
                {selectedBank?.tasaAnual != null
                  ? `Tasa estimada ${formatRate(selectedBank.tasaAnual)}. `
                  : ""}
                {selectedBank?.cuota != null
                  ? `Cuota aproximada ${moneyUSD(selectedBank.cuota)}.`
                  : ""}
              </div>
            </InnerCard>
          </Card>
        ) : null}

        <Card style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {hasStartedFlow ? "Próximos pasos" : "Lo que viene aquí"}
          </div>

          <InnerCard>
            <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.45 }}>
              <div>1) Resolver dudas rápidas sobre tu compra y tu crédito</div>
              <div>2) Confirmar la mejor ruta hipotecaria según tu perfil</div>
              <div>3) Armar expediente y enviarlo a bancos</div>
              <div>4) Hacer seguimiento de tu trámite hasta avanzar</div>
            </div>
          </InnerCard>

          <div style={{ marginTop: 14 }}>
            <PrimaryButton onClick={() => alert("Luego: abrir chat")}>
              {hasStartedFlow ? "Continuar mi solicitud" : "Abrir chat"}
            </PrimaryButton>
          </div>

          <div style={{ marginTop: 10 }}>
            <SecondaryButton onClick={() => alert("Luego: agendar llamada")}>
              Agendar llamada
            </SecondaryButton>
          </div>
        </Card>
      </div>
    </Screen>
  );
}