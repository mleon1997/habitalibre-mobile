import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  FileText,
  Home,
  Send,
  User,
  Sparkles,
  Landmark,
} from "lucide-react";
import {
  Screen,
  Card,
  Chip,
  PrimaryButton,
  SecondaryButton,
  ProgressBar,
} from "../ui/kit.jsx";
import { moneyUSD } from "../lib/money";
import { getCustomer, getCustomerToken } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";
const LS_DOCS_CHECKLIST = "hl_docs_checklist_v1";

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE || "https://habitalibre-backend.onrender.com";

const API_BASE = RAW_API_BASE.endsWith("/api")
  ? RAW_API_BASE
  : `${RAW_API_BASE}/api`;

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

function saveOwnedData(key, data) {
  const ownerEmail = getStorageOwnerEmail();
  try {
    localStorage.setItem(key, JSON.stringify({ ownerEmail, data }));
  } catch {}
}

function normalizeProperty(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id =
    raw?.id || raw?._id || raw?.propertyId || raw?._normalizedId || null;

  const title =
    raw?.titulo ||
    raw?.nombre ||
    raw?.title ||
    raw?.name ||
    raw?.proyecto ||
    raw?.projectName ||
    raw?._normalizedProjectName ||
    "Propiedad elegida";

  const city =
    raw?.ciudad ||
    raw?.city ||
    raw?.zona ||
    raw?.sector ||
    raw?.ciudadZona ||
    raw?._normalizedCity ||
    "Ubicación pendiente";

  const priceRaw =
    raw?.precio ??
    raw?.price ??
    raw?.valor ??
    raw?.listPrice ??
    raw?._normalizedPrice ??
    null;

  const price = Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null;

  return {
    id,
    title,
    city,
    price,
    status: raw?.status || raw?.selectedPropertyStatus || null,
    raw,
  };
}

const styles = {
  content: {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)",
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 148px)",
    display: "grid",
    gap: 18,
    boxSizing: "border-box",
  },

  header: {
    display: "grid",
    gap: 18,
  },

  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    minHeight: 42,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.09)",
    color: "rgba(226,232,240,0.98)",
    borderRadius: 999,
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13.5,
    boxShadow: "0 10px 26px rgba(0,0,0,0.14)",
    backdropFilter: "blur(14px)",
  },

  eyebrow: {
    fontSize: 13,
    color: "rgba(148,163,184,0.95)",
    fontWeight: 850,
    marginBottom: 8,
  },

  title: {
    fontSize: "clamp(34px, 9.3vw, 44px)",
    lineHeight: 0.98,
    fontWeight: 980,
    letterSpacing: -1.25,
    color: "rgba(226,232,240,0.98)",
  },

  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 1.5,
    color: "rgba(148,163,184,0.96)",
  },

  softCard: {
    padding: 18,
    borderRadius: 28,
    border: "1px solid rgba(148,163,184,0.14)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(15,23,42,0.62))",
    boxShadow: "0 18px 55px rgba(0,0,0,0.16)",
  },

  sectionTitle: {
    fontSize: 22,
    lineHeight: 1.12,
    fontWeight: 950,
    letterSpacing: -0.45,
    color: "rgba(226,232,240,0.98)",
  },

  sectionSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 1.48,
    color: "rgba(148,163,184,0.95)",
  },

  innerSurface: {
    padding: 15,
    borderRadius: 20,
    border: "1px solid rgba(148,163,184,0.11)",
    background: "rgba(255,255,255,0.035)",
  },
};

function InfoCard({ title, subtitle, children }) {
  return (
    <Card style={styles.softCard}>
      <div style={styles.sectionTitle}>{title}</div>

      {subtitle ? <div style={styles.sectionSubtitle}>{subtitle}</div> : null}

      <div style={{ marginTop: 16 }}>{children}</div>
    </Card>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={styles.innerSurface}>
      <div
        style={{
          fontSize: 11.5,
          color: "rgba(148,163,184,0.92)",
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 18,
          color: "rgba(226,232,240,0.98)",
          fontWeight: 950,
          letterSpacing: -0.25,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionRow({ icon, title, body }) {
  return (
    <div style={styles.innerSurface}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14.5,
          fontWeight: 900,
          color: "rgba(226,232,240,0.98)",
          marginBottom: 8,
        }}
      >
        {icon}
        {title}
      </div>

      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "rgba(148,163,184,0.95)",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function TimelineItem({ title, body, done = false }) {
  return (
    <div
      style={{
        padding: 15,
        borderRadius: 20,
        border: `1px solid ${
          done ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.11)"
        }`,
        background: done
          ? "linear-gradient(135deg, rgba(34,197,94,0.105), rgba(20,184,166,0.045))"
          : "rgba(255,255,255,0.035)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          color: "rgba(226,232,240,0.98)",
          marginBottom: 6,
        }}
      >
        {done ? "✓ " : ""}
        {title}
      </div>

      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "rgba(148,163,184,0.95)",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function FinancialDisclaimer({ compact = false }) {
  return (
    <div
      style={{
        marginTop: compact ? 12 : 16,
        padding: compact ? "11px 12px" : "13px 14px",
        borderRadius: 20,
        border: "1px solid rgba(245,158,11,0.18)",
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.09), rgba(245,158,11,0.045))",
        color: "rgba(254,243,199,0.95)",
        fontSize: compact ? 11.5 : 12,
        lineHeight: 1.48,
      }}
    >
      <strong>Estimación referencial.</strong>{" "}
      {compact
        ? "HabitaLibre no otorga ni aprueba créditos. Las condiciones finales dependen de cada entidad financiera."
        : "HabitaLibre no es banco, cooperativa, prestamista ni entidad financiera. No otorgamos, aprobamos, financiamos, intermediamos ni cobramos créditos. Las cifras mostradas son estimaciones referenciales para orientación hipotecaria. La aprobación final, tasa, plazo, cuota, fechas de pago y condiciones dependen exclusivamente de la entidad financiera regulada."}
    </div>
  );
}

function getSimpleCaseDefinition({
  hasChosenProperty,
  docsReady,
  activationRequestedAt,
  statusGeneral,
  projectStatus,
  bankStatus,
}) {
  const wasReceived = Boolean(
    activationRequestedAt || statusGeneral === "pendiente_revision_habitalibre"
  );

  const wasSent =
    statusGeneral === "enviado" ||
    projectStatus === "enviado" ||
    bankStatus === "enviado";

  if (wasSent) {
    return {
      statusLabel: "Compartido por HabitaLibre",
      statusTone: "good",
      heroTitle: "Tu caso ya fue compartido",
      heroBody:
        "HabitaLibre ya compartió información de tu caso con los actores correspondientes, únicamente para orientación y contacto. Esto no representa aprobación, oferta ni promesa de financiamiento.",
      nextActorLabel: "Caso compartido",
      nextActorText:
        "Tu caso ya salió de la revisión interna de HabitaLibre hacia el frente que corresponde según tu situación.",
      userAction:
        "Esperar el siguiente contacto o respuesta según el estado de tu caso.",
      habitalibreAction:
        "Compartió información de tu caso para facilitar orientación y seguimiento.",
      nextExternalStep:
        "El proyecto y/o una entidad financiera podrán revisar la información y contactarte si corresponde dentro de sus propios procesos.",
      ctaLabel: "Volver a mi ruta",
      ctaPath: "/ruta",
      projectStatusLabel:
        projectStatus === "enviado"
          ? "Compartido con proyecto"
          : "Pendiente de revisión",
      bankStatusLabel:
        bankStatus === "enviado"
          ? "Compartido con entidad financiera"
          : "Pendiente de revisión",
      timelineProjectTitle: "Caso compartido con proyecto",
      timelineProjectBody:
        projectStatus === "enviado"
          ? "HabitaLibre ya compartió información de tu caso con el proyecto elegido."
          : "Todavía no se ha compartido con el proyecto.",
      timelineBankTitle: "Caso compartido con entidad financiera",
      timelineBankBody:
        bankStatus === "enviado"
          ? "HabitaLibre ya compartió información de tu caso con una entidad financiera para orientación/contacto. Las condiciones finales dependen exclusivamente de esa entidad."
          : "Todavía no se ha compartido con una entidad financiera.",
    };
  }

  if (wasReceived) {
    return {
      statusLabel: "En revisión interna",
      statusTone: "good",
      heroTitle: "Tu caso fue recibido por HabitaLibre",
      heroBody:
        "Ya recibimos tu caso. Ahora HabitaLibre lo revisará internamente para definir cuál podría ser el siguiente paso más adecuado.",
      nextActorLabel: "Revisión interna",
      nextActorText:
        "Tu caso ya fue recibido por HabitaLibre y está en revisión operativa interna.",
      userAction:
        "Esperar mientras HabitaLibre revisa tu información y define el siguiente paso sugerido.",
      habitalibreAction:
        "Revisar tu propiedad base, tu preparación documental y tu ruta referencial.",
      nextExternalStep:
        "Una vez revisado, aquí podrás ver si corresponde avanzar hacia el proyecto, hacia una conversación futura con una entidad financiera o mantener el caso en preparación.",
      ctaLabel: "Volver a mi ruta",
      ctaPath: "/ruta",
      projectStatusLabel: "Por revisar por HabitaLibre",
      bankStatusLabel: "Por revisar por HabitaLibre",
      timelineProjectTitle: "Frente proyecto pendiente",
      timelineProjectBody:
        "HabitaLibre todavía no ha compartido tu caso con el proyecto.",
      timelineBankTitle: "Frente financiero pendiente",
      timelineBankBody:
        "HabitaLibre todavía no ha compartido tu caso con una entidad financiera.",
    };
  }

  if (!hasChosenProperty) {
    return {
      statusLabel: "Esperando propiedad base",
      statusTone: "neutral",
      heroTitle: "Antes de avanzar, falta elegir una propiedad base",
      heroBody:
        "Tu caso todavía no está listo porque falta definir la propiedad que va a guiar tu ruta referencial.",
      nextActorLabel: "Primero propiedad",
      nextActorText:
        "Antes de compartir tu caso con HabitaLibre, conviene elegir una propiedad base.",
      userAction:
        "Elegir la propiedad que más te interese para aterrizar tu ruta.",
      habitalibreAction:
        "Usar esa propiedad para ordenar mejor tu ruta y revisar qué siguiente paso podría tener sentido.",
      nextExternalStep:
        "Después podrás compartir tu caso con HabitaLibre para revisión interna.",
      ctaLabel: "Elegir propiedad",
      ctaPath: "/marketplace",
      projectStatusLabel: "Pendiente",
      bankStatusLabel: "Pendiente",
      timelineProjectTitle: "Frente proyecto pendiente",
      timelineProjectBody:
        "Todavía no puede revisarse este frente porque falta una propiedad base.",
      timelineBankTitle: "Frente financiero pendiente",
      timelineBankBody:
        "Todavía no puede revisarse este frente porque falta una base suficiente del caso.",
    };
  }

  if (!docsReady) {
    return {
      statusLabel: "Esperando preparación",
      statusTone: "neutral",
      heroTitle: "Tu caso va bien, pero todavía falta preparación",
      heroBody:
        "Ya tienes una propiedad base. Antes de compartir tu caso con HabitaLibre, conviene completar mejor tu checklist documental.",
      nextActorLabel: "Primero preparación",
      nextActorText:
        "Antes de compartir tu caso, conviene fortalecer tu base documental.",
      userAction:
        "Completar tu checklist para llegar más ordenado al siguiente paso.",
      habitalibreAction:
        "Revisar si tu caso ya tiene una base suficiente para pasar a revisión interna.",
      nextExternalStep:
        "Cuando tu preparación sea suficiente, podrás compartir tu caso con HabitaLibre.",
      ctaLabel: "Ver checklist",
      ctaPath: "/checklist-documentos",
      projectStatusLabel: "Pendiente",
      bankStatusLabel: "Pendiente",
      timelineProjectTitle: "Frente proyecto pendiente",
      timelineProjectBody:
        "Todavía no conviene avanzar mientras falta preparación.",
      timelineBankTitle: "Frente financiero pendiente",
      timelineBankBody:
        "Todavía no conviene avanzar mientras falta preparación.",
    };
  }

  return {
    statusLabel: "Caso en preparación",
    statusTone: "neutral",
    heroTitle: "Tu caso todavía no está listo para compartirse",
    heroBody:
      "Primero conviene revisar qué te falta antes de pasar a revisión interna.",
    nextActorLabel: "Preparación",
    nextActorText: "Antes de compartir el caso, conviene fortalecer su base.",
    userAction: "Revisar tu propiedad, checklist y ruta actual.",
    habitalibreAction:
      "Usar esa información para revisar si el caso ya puede pasar a la siguiente etapa.",
    nextExternalStep: "Después podrás compartirlo con HabitaLibre.",
    ctaLabel: "Volver al siguiente paso",
    ctaPath: "/siguiente-paso",
    projectStatusLabel: "Pendiente",
    bankStatusLabel: "Pendiente",
    timelineProjectTitle: "Frente proyecto pendiente",
    timelineProjectBody: "Todavía no se ha habilitado este frente.",
    timelineBankTitle: "Frente financiero pendiente",
    timelineBankBody: "Todavía no se ha habilitado este frente.",
  };
}

export default function Caso() {
  const navigate = useNavigate();
  const [remoteCase, setRemoteCase] = useState(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(true);

  const snapshot = useMemo(() => loadOwnedData(LS_SNAPSHOT) || {}, []);
  const journey = useMemo(() => loadOwnedData(LS_JOURNEY) || {}, []);
  const selectedPropertyRef = useMemo(
    () => loadOwnedData(LS_SELECTED_PROPERTY),
    []
  );
  const docsChecklist = useMemo(
    () => loadOwnedData(LS_DOCS_CHECKLIST) || {},
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLatestCase() {
      try {
        const token = getCustomerToken?.();
        if (!token) {
          if (!cancelled) setIsLoadingRemote(false);
          return;
        }

        const res = await fetch(`${API_BASE}/casos-activacion/mine/latest`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!cancelled) setIsLoadingRemote(false);
          return;
        }

        const caso = data?.caso || null;

        if (!cancelled) {
          setRemoteCase(caso);
          setIsLoadingRemote(false);
        }

        if (caso && !cancelled) {
          const nextJourney = {
            ...(journey || {}),
            activationRequestId: caso?._id || null,
            activationRequestedAt: caso?.requestedAt || null,
            activationRequestStatus: caso?.statusGeneral || null,
            activationRequestLabel:
              caso?.statusGeneral === "pendiente_revision_habitalibre"
                ? "Caso recibido por HabitaLibre"
                : caso?.statusGeneral === "enviado"
                ? "Compartido por HabitaLibre"
                : journey?.activationRequestLabel || null,
            statusGeneral: caso?.statusGeneral || null,
            projectStatus: caso?.projectStatus || null,
            bankStatus: caso?.bankStatus || null,
            projectSubmittedAt: caso?.projectSubmittedAt || null,
            bankSubmittedAt: caso?.bankSubmittedAt || null,
            projectSubmissionStatus:
              caso?.projectStatus === "enviado"
                ? "Compartido con proyecto"
                : "Pendiente de revisión",
            bankSubmissionStatus:
              caso?.bankStatus === "enviado"
                ? "Compartido con entidad financiera"
                : "Pendiente de revisión",
          };

          saveOwnedData(LS_JOURNEY, nextJourney);
        }
      } catch {
        if (!cancelled) setIsLoadingRemote(false);
      }
    }

    loadLatestCase();

    return () => {
      cancelled = true;
    };
  }, [journey]);

  const property =
    normalizeProperty(remoteCase?.selectedProperty) ||
    normalizeProperty(selectedPropertyRef) ||
    normalizeProperty(journey?.propiedadSeleccionada) ||
    normalizeProperty(journey?.selectedProperty) ||
    normalizeProperty(journey?.property) ||
    null;

  const hasChosenProperty = Boolean(property?.id);

  const remoteDocsChecklist = remoteCase?.docsChecklist || null;
  const effectiveDocsChecklist = remoteDocsChecklist || docsChecklist;

  const docsDone = Object.values(effectiveDocsChecklist).filter(Boolean).length;
  const docsTotal = 10;
  const docsProgress = Math.max(
    0,
    Math.min(100, Math.round((docsDone / docsTotal) * 100))
  );
  const docsReady = docsProgress >= 60;

  const effectiveSnapshot = remoteCase?.snapshot || snapshot;

  const cuota =
    remoteCase?.estimatedQuota ??
    effectiveSnapshot?.cuotaMensual ??
    effectiveSnapshot?.kpis?.cuotaMensual ??
    effectiveSnapshot?.resultado?.cuotaMensual ??
    effectiveSnapshot?.cuotaEstimada ??
    effectiveSnapshot?.bestMortgage?.cuota ??
    null;

  const maxCompra =
    remoteCase?.estimatedMaxPurchase ??
    effectiveSnapshot?.maxCompra ??
    effectiveSnapshot?.kpis?.maxCompra ??
    effectiveSnapshot?.resultado?.maxCompra ??
    effectiveSnapshot?.precioMaxVivienda ??
    effectiveSnapshot?.montoMaximo ??
    null;

  const activationRequestedAt =
    remoteCase?.requestedAt || journey?.activationRequestedAt || null;

  const statusGeneral =
    remoteCase?.statusGeneral || journey?.statusGeneral || null;

  const projectStatus =
    remoteCase?.projectStatus || journey?.projectStatus || "por_revisar";

  const bankStatus =
    remoteCase?.bankStatus || journey?.bankStatus || "por_revisar";

  const caseDef = getSimpleCaseDefinition({
    hasChosenProperty,
    docsReady,
    activationRequestedAt,
    statusGeneral,
    projectStatus,
    bankStatus,
  });

  return (
    <Screen>
      <div style={styles.content}>
        <div style={styles.header}>
          <button onClick={() => navigate("/ruta")} style={styles.backButton}>
            <ArrowLeft size={16} />
            Volver a Ruta
          </button>

          <div>
            <div style={styles.eyebrow}>Mi caso</div>

            <div style={styles.title}>{caseDef.heroTitle}</div>

            <div style={styles.subtitle}>{caseDef.heroBody}</div>

            <FinancialDisclaimer />

            {isLoadingRemote ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12.5,
                  color: "rgba(148,163,184,0.85)",
                  fontWeight: 700,
                }}
              >
                Actualizando estado desde HabitaLibre...
              </div>
            ) : null}
          </div>
        </div>

        <InfoCard
          title="Estado actual"
          subtitle="Esto resume en qué punto está tu caso hoy."
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <Chip tone={caseDef.statusTone}>{caseDef.statusLabel}</Chip>

            <Chip tone={hasChosenProperty ? "good" : "neutral"}>
              {hasChosenProperty ? "Propiedad base lista" : "Sin propiedad base"}
            </Chip>

            <Chip tone={docsReady ? "good" : "neutral"}>
              {docsDone}/{docsTotal} ítems listos
            </Chip>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <MiniStat
              label="Rango estimado"
              value={maxCompra ? moneyUSD(maxCompra) : "—"}
            />

            <MiniStat
              label="Cuota ref."
              value={cuota ? moneyUSD(cuota) : "—"}
            />
          </div>

          {activationRequestedAt ? (
            <div
              style={{
                marginTop: 14,
                padding: "11px 12px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(148,163,184,0.1)",
                fontSize: 12.5,
                lineHeight: 1.4,
                color: "rgba(148,163,184,0.92)",
              }}
            >
              Caso recibido: {new Date(activationRequestedAt).toLocaleString()}
            </div>
          ) : null}
        </InfoCard>

        <InfoCard title="Qué pasa ahora" subtitle={caseDef.nextActorText}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <Chip tone={caseDef.statusTone}>{caseDef.nextActorLabel}</Chip>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <ActionRow
              icon={<User size={15} />}
              title="Tu acción ahora"
              body={caseDef.userAction}
            />

            <ActionRow
              icon={<Sparkles size={15} />}
              title="Lo que hará HabitaLibre"
              body={caseDef.habitalibreAction}
            />

            <ActionRow
              icon={<Send size={15} />}
              title="Lo que sigue después"
              body={caseDef.nextExternalStep}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <PrimaryButton onClick={() => navigate(caseDef.ctaPath)}>
              {caseDef.ctaLabel}
            </PrimaryButton>
          </div>
        </InfoCard>

        <InfoCard
          title="Estado por frente"
          subtitle="Así avanza tu caso según cada frente de revisión."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <ActionRow
              icon={<Building2 size={15} />}
              title="Proyecto / promotor"
              body={caseDef.projectStatusLabel}
            />

            <ActionRow
              icon={<Landmark size={15} />}
              title="Frente financiero"
              body={caseDef.bankStatusLabel}
            />
          </div>
        </InfoCard>

        <InfoCard
          title="Resumen de tu base"
          subtitle="Lo que hoy está sosteniendo tu caso."
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={styles.innerSurface}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 900,
                  color: "rgba(226,232,240,0.98)",
                  marginBottom: 8,
                }}
              >
                <Home size={15} />
                Propiedad base
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "rgba(226,232,240,0.98)",
                  lineHeight: 1.3,
                }}
              >
                {property ? property.title : "Aún no definida"}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13.5,
                  color: "rgba(148,163,184,0.95)",
                  lineHeight: 1.45,
                }}
              >
                {property
                  ? `${property.city}${
                      property.price != null ? ` · ${moneyUSD(property.price)}` : ""
                    }`
                  : "Primero debes elegir una propiedad."}
              </div>
            </div>

            <div style={styles.innerSurface}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 900,
                  color: "rgba(226,232,240,0.98)",
                  marginBottom: 10,
                }}
              >
                <FileText size={15} />
                Preparación documental
              </div>

              <div style={{ marginBottom: 10 }}>
                <ProgressBar value={docsProgress} />
              </div>

              <div
                style={{
                  fontSize: 13.5,
                  color: "rgba(148,163,184,0.95)",
                  lineHeight: 1.45,
                }}
              >
                Tienes {docsDone} de {docsTotal} ítems marcados en tu checklist.
              </div>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Timeline del caso" subtitle="Esto es lo que ya quedó resuelto.">
          <div style={{ display: "grid", gap: 10 }}>
            <TimelineItem
              title="Orientación inicial completada"
              body="Tus datos declarados ya fueron usados para generar una estimación referencial."
              done
            />

            <TimelineItem
              title="Propiedad base"
              body={
                hasChosenProperty
                  ? "Ya tienes una propiedad base para guiar tu ruta."
                  : "Todavía falta definir una propiedad base."
              }
              done={hasChosenProperty}
            />

            <TimelineItem
              title="Preparación documental"
              body={
                docsReady
                  ? "Ya tienes una base documental útil para avanzar."
                  : "Todavía conviene completar tu checklist."
              }
              done={docsReady}
            />

            <TimelineItem
              title="Caso recibido por HabitaLibre"
              body={
                activationRequestedAt
                  ? "Tu caso ya fue recibido por HabitaLibre para revisión interna."
                  : "Todavía no has compartido tu caso con HabitaLibre."
              }
              done={Boolean(activationRequestedAt)}
            />

            <TimelineItem
              title={caseDef.timelineProjectTitle}
              body={caseDef.timelineProjectBody}
              done={projectStatus === "enviado"}
            />

            <TimelineItem
              title={caseDef.timelineBankTitle}
              body={caseDef.timelineBankBody}
              done={bankStatus === "enviado"}
            />
          </div>
        </InfoCard>

        <InfoCard
          title="Qué puedes hacer desde aquí"
          subtitle="Accesos rápidos según tu situación actual."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {property ? (
              <PrimaryButton onClick={() => navigate(`/property/${property.id}`)}>
                Ver propiedad elegida
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => navigate("/marketplace")}>
                Elegir propiedad
              </PrimaryButton>
            )}

            <SecondaryButton onClick={() => navigate("/checklist-documentos")}>
              Ver checklist
            </SecondaryButton>

            <SecondaryButton onClick={() => navigate("/ruta")}>
              Volver a mi ruta
            </SecondaryButton>
          </div>
        </InfoCard>
      </div>
    </Screen>
  );
}