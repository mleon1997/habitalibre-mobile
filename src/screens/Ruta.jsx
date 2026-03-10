// src/screens/Ruta.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { moneyUSD } from "../lib/money";
import { Screen, Card, Chip, PrimaryButton, SecondaryButton, ProgressBar } from "../ui/kit.jsx";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

function safeParseLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n || 0)));
function toPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const pct = x <= 1 ? x * 100 : x;
  return clamp(Math.round(pct), 0, 100);
}
function probMeta(probPct) {
  if (probPct == null) return { label: "—", tone: "neutral" };
  if (probPct >= 70) return { label: "Alta", tone: "good" };
  if (probPct >= 45) return { label: "Media", tone: "warn" };
  return { label: "Baja", tone: "bad" };
}

function StatusDot({ status }) {
  const map = {
    done: "rgba(34,197,94,1)",
    next: "rgba(45,212,191,1)",
    pending: "rgba(148,163,184,0.85)",
    locked: "rgba(148,163,184,0.35)",
  };
  const c = map[status] || map.pending;
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: c,
        boxShadow: status === "next" ? "0 0 0 6px rgba(45,212,191,0.12)" : "none",
        flex: "0 0 auto",
      }}
    />
  );
}

function StepTimelineCard({
  stepNum,
  title,
  subtitle,
  status,
  rightChips = null,
  ctaLabel,
  onClick,
  disabled,
  hint,
}) {
  const isLocked = status === "locked" || disabled;
  const statusLabel =
    status === "done" ? "Completado" : status === "next" ? "Siguiente" : status === "locked" ? "Bloqueado" : "Pendiente";
  const statusTone = status === "done" ? "good" : status === "next" ? "good" : "neutral";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <StatusDot status={status} />
        <div
          style={{
            width: 2,
            flex: 1,
            marginTop: 8,
            borderRadius: 999,
            background: "rgba(148,163,184,0.18)",
          }}
        />
      </div>

      <Card soft style={{ padding: 14, boxShadow: isLocked ? "none" : undefined, opacity: isLocked ? 0.82 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Chip tone={statusTone}>{statusLabel}</Chip>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", fontWeight: 800 }}>
                Paso {stepNum}
              </span>
            </div>

            <div style={{ marginTop: 6, fontSize: 15, fontWeight: 980, letterSpacing: 0.15 }}>
              {title}
            </div>

            <div style={{ marginTop: 6, fontSize: 12.5, color: "rgba(148,163,184,0.95)", lineHeight: 1.35 }}>
              {subtitle}
            </div>
          </div>

          {!!rightChips && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              {rightChips}
            </div>
          )}
        </div>

        {!!hint && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
            {hint}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <SecondaryButton disabled={isLocked} onClick={onClick}>
            {ctaLabel}
          </SecondaryButton>
        </div>
      </Card>
    </div>
  );
}

export default function Ruta() {
  const nav = useNavigate();

  const snapshot = useMemo(() => safeParseLS(LS_SNAPSHOT), []);
  const journey = useMemo(() => safeParseLS(LS_JOURNEY), []);

  const cuota = snapshot?.cuotaMensual ?? snapshot?.kpis?.cuotaMensual ?? snapshot?.resultado?.cuotaMensual;
  const maxCompra = snapshot?.maxCompra ?? snapshot?.kpis?.maxCompra ?? snapshot?.resultado?.maxCompra;
  const visTag = snapshot?.programa ?? snapshot?.kpis?.programa ?? snapshot?.resultado?.programa ?? "VIS";

  const probPct = toPct(snapshot?.probAprobacion ?? snapshot?.kpis?.probAprobacion ?? snapshot?.resultado?.probAprobacion);
  const prob = probMeta(probPct);

  const propsCount =
    journey?.match?.propiedades?.length ??
    journey?.match?.items?.length ??
    journey?.matchCount ??
    null;

  const flags = {
    precalificacion: true,
    matchExplorado: Boolean(journey?.matchExplorado || journey?.match?.visto),
    propiedadElegida: Boolean(journey?.propiedadElegida || journey?.propiedadId),
    docsSubidos: Boolean(journey?.docsSubidos || journey?.docs?.length),
    solicitudEnviada: Boolean(journey?.solicitudEnviada || journey?.solicitudId),
    aprobacion: Boolean(journey?.aprobado || journey?.estado === "aprobado"),
  };

  const stepsOrder = ["precalificacion", "matchExplorado", "propiedadElegida", "docsSubidos", "solicitudEnviada", "aprobacion"];
  const doneCount = stepsOrder.filter((k) => flags[k]).length;
  const progressPct = clamp(Math.round((doneCount / stepsOrder.length) * 100), 0, 100);
  const remaining = stepsOrder.length - doneCount;

  const nextStepKey = stepsOrder.find((k) => !flags[k]) || "aprobacion";
  const nextStepLabel =
    nextStepKey === "matchExplorado" ? "Explorar tu Match" :
    nextStepKey === "propiedadElegida" ? "Elegir una propiedad" :
    nextStepKey === "docsSubidos" ? "Subir documentos" :
    nextStepKey === "solicitudEnviada" ? "Enviar solicitud" :
    "Ver estado";

  const goNext = () => {
    if (nextStepKey === "matchExplorado") nav("/match");
    else if (nextStepKey === "propiedadElegida") nav("/match");
    else if (nextStepKey === "docsSubidos") nav("/documentos");
    else if (nextStepKey === "solicitudEnviada") nav("/solicitud");
    else nav("/estado");
  };

  return (
    <Screen>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 980, letterSpacing: 0.2 }}>Tu camino a tu casa</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "rgba(148,163,184,0.95)" }}>
              Pasos claros. Progreso real.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <Chip tone={prob.tone}>Probabilidad: {prob.label}{probPct != null ? ` · ${probPct}%` : ""}</Chip>
            <Chip tone="neutral">{progressPct}% completado</Chip>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", fontWeight: 800 }}>Progreso</div>
            <div style={{ fontSize: 12, color: "rgba(226,232,240,0.92)", fontWeight: 950 }}>{progressPct}%</div>
          </div>

          <ProgressBar value={progressPct} />

          <div style={{ marginTop: 10, fontSize: 12.5, color: "rgba(148,163,184,0.95)" }}>
            {remaining > 0 ? (
              <>Te faltan <b style={{ color: "rgba(226,232,240,0.95)" }}>{remaining}</b> pasos para aplicar.</>
            ) : (
              <>¡Listo! Ya completaste todos los pasos.</>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <PrimaryButton onClick={goNext}>Siguiente paso: {nextStepLabel} →</PrimaryButton>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <StepTimelineCard
          stepNum={1}
          title="Precalificación"
          subtitle="Tu perfil hipotecario ya está listo."
          status="done"
          rightChips={
            <>
              <Chip tone="neutral">Score</Chip>
              <Chip tone="neutral">{cuota ? `Cuota ${moneyUSD(cuota)}` : "Cuota —"}</Chip>
            </>
          }
          ctaLabel="Ver mi resultado"
          onClick={() => nav("/resultado")}
          hint="Tip: este es el paso más importante. Lo demás es elegir la mejor opción."
        />

        <StepTimelineCard
          stepNum={2}
          title="Explorar tu Match"
          subtitle="Ver las casas que sí puedes comprar con tu perfil."
          status={flags.matchExplorado ? "done" : "next"}
          rightChips={
            <>
              <Chip tone="neutral">{visTag}</Chip>
              <Chip tone="neutral">{maxCompra ? `Hasta ${moneyUSD(maxCompra)}` : "Hasta —"}</Chip>
            </>
          }
          ctaLabel={propsCount ? `Ver ${propsCount} propiedades` : "Ir a Match"}
          onClick={() => nav("/match")}
          hint={
            cuota && maxCompra
              ? <>Tu rango: <b style={{ color: "rgba(226,232,240,0.95)" }}>{moneyUSD(maxCompra)}</b> · cuotas desde <b style={{ color: "rgba(226,232,240,0.95)" }}>{moneyUSD(cuota)}</b>.</>
              : "Aquí ves casas + cuotas en un solo lugar (sin perder tiempo)."
          }
        />

        <StepTimelineCard
          stepNum={3}
          title="Elegir una propiedad"
          subtitle="Selecciona la vivienda para iniciar tu solicitud real."
          status={flags.propiedadElegida ? "done" : flags.matchExplorado ? "pending" : "locked"}
          rightChips={<Chip tone={flags.propiedadElegida ? "good" : "neutral"}>{flags.propiedadElegida ? "Elegida" : "Pendiente"}</Chip>}
          ctaLabel="Elegir en Match"
          onClick={() => nav("/match")}
          disabled={!flags.matchExplorado}
          hint="Elegir una propiedad acelera el proceso porque la solicitud se arma con datos exactos."
        />

        <StepTimelineCard
          stepNum={4}
          title="Documentos"
          subtitle="Sube tus documentos para respaldar tu solicitud."
          status={flags.docsSubidos ? "done" : flags.propiedadElegida ? "pending" : "locked"}
          rightChips={<Chip tone={flags.docsSubidos ? "good" : "neutral"}>{flags.docsSubidos ? "Listo" : "Bloqueado"}</Chip>}
          ctaLabel="Ir a Docs"
          onClick={() => nav("/documentos")}
          disabled={!flags.propiedadElegida}
          hint="Mientras más completo esté esto, más rápido avanzas."
        />

        <StepTimelineCard
          stepNum={5}
          title="Enviar solicitud"
          subtitle="Envía tu solicitud de crédito con un clic."
          status={flags.solicitudEnviada ? "done" : flags.docsSubidos ? "pending" : "locked"}
          rightChips={<Chip tone={flags.solicitudEnviada ? "good" : "neutral"}>{flags.solicitudEnviada ? "Enviada" : "Bloqueado"}</Chip>}
          ctaLabel="Enviar"
          onClick={() => nav("/solicitud")}
          disabled={!flags.docsSubidos}
          hint="Aquí empieza el proceso real. Te guiamos paso a paso."
        />

        <StepTimelineCard
          stepNum={6}
          title="Aprobación y firma"
          subtitle="Seguimiento del banco + firma final."
          status={flags.aprobacion ? "done" : flags.solicitudEnviada ? "pending" : "locked"}
          rightChips={<Chip tone={flags.aprobacion ? "good" : "neutral"}>{flags.aprobacion ? "Aprobado" : "Bloqueado"}</Chip>}
          ctaLabel="Ver estado"
          onClick={() => nav("/estado")}
          disabled={!flags.solicitudEnviada}
          hint="Te mostramos el estado para que no tengas que perseguir a nadie."
        />
      </div>
    </Screen>
  );
}