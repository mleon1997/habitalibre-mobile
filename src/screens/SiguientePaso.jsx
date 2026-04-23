import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Home,
  Target,
  Send,
  Building2,
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
import mockProperties from "../data/mockProperties.js";

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
    raw.id ||
    raw._id ||
    raw.propertyId ||
    raw.slug ||
    raw._normalizedId ||
    null;

  const title =
    raw.titulo ||
    raw.nombre ||
    raw.name ||
    raw.title ||
    raw.proyecto ||
    raw.projectName ||
    raw.propertyName ||
    raw._normalizedProjectName ||
    null;

  const city =
    raw.ciudad ||
    raw.city ||
    raw.zona ||
    raw.sector ||
    raw.location ||
    raw.ciudadZona ||
    raw._normalizedCity ||
    null;

  const price =
    raw.precio ??
    raw.price ??
    raw.valor ??
    raw.valorVivienda ??
    raw.listPrice ??
    raw._normalizedPrice ??
    null;

  const image =
    raw.imagen ||
    raw.image ||
    raw.imageUrl ||
    raw.foto ||
    raw.cover ||
    null;

  if (!id && !title) return null;

  return {
    id,
    title: title || "Propiedad elegida",
    city: city || "Ubicación pendiente",
    price: Number.isFinite(Number(price)) ? Number(price) : null,
    image,
    status: raw.status || raw.selectedPropertyStatus || null,
    lastEvaluatedAt: raw.lastEvaluatedAt || null,
    raw,
  };
}

function findPropertyById(propertyId, snapshot, journey) {
  if (!propertyId) return null;

  const pools = [
    snapshot?.matchedProperties,
    snapshot?.output?.matchedProperties,
    snapshot?.plan?.routeSignals?.matchedProperties,
    snapshot?.routeSignals?.matchedProperties,
    journey?.match?.propiedades,
    journey?.match?.items,
    snapshot?.propiedades,
    snapshot?.output?.propiedades,
    mockProperties,
  ];

  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;

    const found =
      pool.find(
        (p) =>
          String(p?.id) === String(propertyId) ||
          String(p?._id) === String(propertyId) ||
          String(p?.propertyId) === String(propertyId) ||
          String(p?._normalizedId) === String(propertyId)
      ) || null;

    if (found) return found;
  }

  return null;
}

function ChecklistStat({ label, value }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(148,163,184,0.92)",
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 16,
          color: "rgba(226,232,240,0.98)",
          fontWeight: 950,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoCard({ title, subtitle, children }) {
  return (
    <Card style={{ padding: 16 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 950,
          color: "rgba(226,232,240,0.98)",
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13.5,
            lineHeight: 1.45,
            color: "rgba(148,163,184,0.95)",
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>{children}</div>
    </Card>
  );
}

function StageCard({ icon, title, text }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
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
        {icon}
        {title}
      </div>

      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.45,
          color: "rgba(148,163,184,0.95)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function getStatusMeta(selectedPropertyStatus, hasChosenProperty) {
  if (!hasChosenProperty) {
    return {
      chip: "Sin propiedad elegida",
      tone: "neutral",
    };
  }

  if (selectedPropertyStatus === "selected_viable_now") {
    return {
      chip: "Elegida · Sigue alineada",
      tone: "good",
    };
  }

  if (selectedPropertyStatus === "selected_future_viable") {
    return {
      chip: "Elegida · Ruta futura",
      tone: "neutral",
    };
  }

  if (selectedPropertyStatus === "selected_near_route") {
    return {
      chip: "Elegida · Revisar encaje",
      tone: "neutral",
    };
  }

  if (selectedPropertyStatus === "selected_no_longer_viable") {
    return {
      chip: "Elegida · Ya no calza hoy",
      tone: "neutral",
    };
  }

  return {
    chip: "Propiedad elegida",
    tone: "good",
  };
}

function getCaseReadinessStatus({
  hasChosenProperty,
  selectedPropertyStatus,
  docsReady,
}) {
  if (!hasChosenProperty) return "no_listo";
  if (selectedPropertyStatus === "selected_no_longer_viable") return "revisar_ruta";
  if (selectedPropertyStatus === "selected_near_route") return "comparar_propiedades";
  if (!docsReady) return "no_listo";
  return "listo_para_promotor_y_banco";
}

function getReadinessMeta({
  caseReadinessStatus,
  hasChosenProperty,
}) {
  if (caseReadinessStatus === "no_listo") {
    return {
      heroTitle: hasChosenProperty
        ? "Todavía falta preparación para activar tu caso"
        : "Antes de activar tu caso, falta elegir una propiedad base",
      heroBody: hasChosenProperty
        ? "Tu caso va bien, pero todavía conviene completar mejor tu base documental antes de moverlo."
        : "El sistema necesita una propiedad base para saber a qué proyecto debe dirigirse tu caso.",
      cardTitle: "Tu caso todavía no está listo",
      cardBody: hasChosenProperty
        ? "Aún no vemos suficiente preparación para activar el caso con HabitaLibre. Primero conviene reforzar tu checklist."
        : "Antes de activar tu caso, debes elegir una propiedad del proyecto que te interesa.",
      cta: hasChosenProperty ? "Ver qué me falta" : "Elegir propiedad",
      path: hasChosenProperty ? "/checklist-documentos" : "/marketplace",
      chip: hasChosenProperty ? "Falta preparación" : "Falta propiedad base",
      tone: "neutral",
      nextActionTitle: hasChosenProperty
        ? "Completar tu checklist"
        : "Elegir una propiedad base",
      nextActionBody: hasChosenProperty
        ? "Eso le da al sistema una mejor base para revisar si tu caso ya puede entrar a la cola operativa."
        : "Eso define el proyecto correcto y mejora la activación del caso.",
    };
  }

  if (caseReadinessStatus === "revisar_ruta") {
    return {
      heroTitle: "Tu caso no conviene activarlo todavía",
      heroBody:
        "La propiedad elegida ya no se ve alineada con tu perfil actual. Primero conviene recalibrar tu ruta.",
      cardTitle: "Primero conviene revisar tu ruta",
      cardBody:
        "Antes de activar tu caso con HabitaLibre, es mejor revisar nuevas opciones que sí calcen con tu situación actual.",
      cta: "Ver nuevas opciones",
      path: "/marketplace",
      chip: "Ruta en revisión",
      tone: "neutral",
      nextActionTitle: "Comparar alternativas",
      nextActionBody:
        "Eso evita mover tu caso a actores que hoy no son los correctos.",
    };
  }

  if (caseReadinessStatus === "comparar_propiedades") {
    return {
      heroTitle: "Tu caso está cerca, pero conviene comparar antes de activarlo",
      heroBody:
        "La propiedad elegida quedó cerca de tu ruta, pero vale la pena compararla con otras opciones antes de mover tu caso.",
      cardTitle: "Primero conviene revisar el encaje",
      cardBody:
        "Todavía no es ideal activar tu caso. Primero conviene validar si esta sigue siendo tu mejor propiedad base.",
      cta: "Comparar opciones",
      path: "/marketplace",
      chip: "Comparar primero",
      tone: "neutral",
      nextActionTitle: "Revisar si esta sigue siendo tu mejor opción",
      nextActionBody:
        "Si otra propiedad encaja mejor, tu caso llegará más sólido a la cola operativa.",
    };
  }

  return {
    heroTitle: "Tu caso ya está listo para revisión HabitaLibre",
    heroBody:
      "Ya tienes una propiedad base alineada y una preparación suficiente. El siguiente paso es enviar tu caso a la cola operativa de HabitaLibre.",
    cardTitle: "Tu caso está listo",
    cardBody:
      "El sistema ya tiene una base suficiente para que HabitaLibre reciba tu caso y decida cómo moverlo.",
    cta: "Activar mi caso",
    path: "/caso",
    chip: "Listo para revisión",
    tone: "good",
    nextActionTitle: "Enviar caso a HabitaLibre",
    nextActionBody:
      "HabitaLibre recibirá tu caso, lo revisará internamente y luego decidirá si lo mueve al proyecto, al banco o a ambos.",
  };
}

export default function SiguientePaso() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  const normalizedSelectedProperty = useMemo(() => {
    const fromSelected = normalizeProperty(selectedPropertyRef);
    if (fromSelected) return fromSelected;

    const fromJourney =
      normalizeProperty(journey?.propiedadSeleccionada) ||
      normalizeProperty(journey?.selectedProperty) ||
      normalizeProperty(journey?.property);

    if (fromJourney) return fromJourney;

    const resolvedById = findPropertyById(
      journey?.propiedadId,
      snapshot,
      journey
    );
    const normalizedById = normalizeProperty(resolvedById);
    if (normalizedById) return normalizedById;

    if (journey?.propiedadId) {
      return {
        id: journey.propiedadId,
        title: "Propiedad elegida",
        city: "Ubicación pendiente",
        price: null,
        image: null,
        status: journey?.selectedPropertyStatus || null,
        raw: null,
      };
    }

    return null;
  }, [selectedPropertyRef, journey, snapshot]);

  const hasChosenProperty = Boolean(normalizedSelectedProperty?.id);

  const docsDone = Object.values(docsChecklist).filter(Boolean).length;
  const docsTotal = 10;
  const docsProgress = Math.max(
    0,
    Math.min(100, Math.round((docsDone / docsTotal) * 100))
  );
  const docsReady = docsProgress >= 60;

  const maxCompra =
    snapshot?.maxCompra ??
    snapshot?.kpis?.maxCompra ??
    snapshot?.resultado?.maxCompra ??
    snapshot?.precioMaxVivienda ??
    snapshot?.montoMaximo ??
    null;

  const cuota =
    snapshot?.cuotaMensual ??
    snapshot?.kpis?.cuotaMensual ??
    snapshot?.resultado?.cuotaMensual ??
    snapshot?.cuotaEstimada ??
    snapshot?.bestMortgage?.cuota ??
    null;

  const selectedPropertyStatus =
    journey?.selectedPropertyStatus ||
    selectedPropertyRef?.status ||
    normalizedSelectedProperty?.status ||
    null;

  const statusMeta = getStatusMeta(selectedPropertyStatus, hasChosenProperty);

  const caseReadinessStatus = getCaseReadinessStatus({
    hasChosenProperty,
    selectedPropertyStatus,
    docsReady,
  });

  const readinessMeta = getReadinessMeta({
    caseReadinessStatus,
    hasChosenProperty,
  });

  const alreadyRequested = Boolean(
    journey?.activationRequestId ||
      journey?.activationRequestedAt ||
      journey?.activationRequestStatus === "pendiente_revision_habitalibre"
  );

  const activationStatus =
    journey?.activationRequestLabel || "Caso recibido por HabitaLibre";

  async function submitCaseActivation() {
    const token = getCustomerToken?.();

    if (!token) {
      throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
    }

    const customer = getCustomer?.() || {};

    const probabilityNumeric =
      snapshot?.probability ??
      snapshot?.probabilidadNumerica ??
      snapshot?.approvalProbability ??
      null;

    const probabilityLabel =
      snapshot?.probabilidad ||
      snapshot?.probabilityLabel ||
      snapshot?.approvalProbabilityLabel ||
      null;

    const payload = {
      customerName:
        `${customer?.nombre || ""} ${customer?.apellido || ""}`.trim() ||
        customer?.name ||
        journey?.form?.nombre ||
        journey?.nombre ||
        "Cliente HabitaLibre",
      customerEmail:
        customer?.email || journey?.form?.email || journey?.email || "",
      customerPhone:
        customer?.telefono || customer?.phone || journey?.form?.telefono || "",
      selectedProperty: normalizedSelectedProperty
        ? {
            id: normalizedSelectedProperty.id,
            title: normalizedSelectedProperty.title,
            city: normalizedSelectedProperty.city,
            price: normalizedSelectedProperty.price,
            projectName:
              normalizedSelectedProperty?.raw?.projectName ||
              normalizedSelectedProperty?.raw?.proyecto ||
              normalizedSelectedProperty.title,
            developerName:
              normalizedSelectedProperty?.raw?.developerName ||
              normalizedSelectedProperty?.raw?.promotor ||
              null,
            status: normalizedSelectedProperty.status || null,
          }
        : null,
      snapshot,
      journey,
      docsChecklist,
      score:
        snapshot?.score ??
        snapshot?.scoreHL ??
        snapshot?.puntajeHabitaLibre ??
        null,
      probability: probabilityNumeric,
      probabilityLabel,
      estimatedQuota: cuota,
      estimatedMaxPurchase: maxCompra,
      readinessStatus: caseReadinessStatus,
    };

    const res = await fetch(`${API_BASE}/casos-activacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.error || "No se pudo enviar tu caso a revisión HabitaLibre."
      );
    }

    return data;
  }

  async function handlePrimaryAction() {
    setSubmitError("");

    if (alreadyRequested) {
      navigate("/caso");
      return;
    }

    if (caseReadinessStatus !== "listo_para_promotor_y_banco") {
      navigate(readinessMeta.path);
      return;
    }

    try {
      setIsSubmitting(true);

      const data = await submitCaseActivation();
      const now = data?.requestedAt || new Date().toISOString();

      const nextJourney = {
        ...(journey || {}),
        caseReadinessStatus,
        activationRequestId: data?.casoId || null,
        activationRequestedAt: now,
        activationRequestStatus:
          data?.statusGeneral || "pendiente_revision_habitalibre",
        activationRequestLabel: "Caso recibido por HabitaLibre",
        caseSubmittedAt: now,

        statusGeneral: data?.statusGeneral || "pendiente_revision_habitalibre",
        projectStatus: data?.projectStatus || "por_revisar",
        bankStatus: data?.bankStatus || "por_revisar",

        caseReadyForPromoter: false,
        caseReadyForBank: false,
        pendingProjectSubmission: true,
        pendingBankSubmission: true,

        projectSubmittedAt: null,
        bankSubmittedAt: null,
        projectSubmissionStatus: "Por revisar por HabitaLibre",
        bankSubmissionStatus: "Por revisar por HabitaLibre",
      };

      saveOwnedData(LS_JOURNEY, nextJourney);
      navigate("/caso");
    } catch (error) {
      setSubmitError(
        error?.message || "No se pudo enviar tu caso a HabitaLibre."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen
      style={{
        paddingTop: 78,
        paddingBottom: 110,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
          paddingTop: 0,
          paddingBottom: 110,
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <button
            onClick={() => navigate("/ruta")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "white",
              borderRadius: 999,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 850,
              width: "fit-content",
              marginTop: 8,
            }}
          >
            <ArrowLeft size={15} />
            Volver a Ruta
          </button>

          <div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(148,163,184,0.95)",
                fontWeight: 850,
                marginBottom: 8,
              }}
            >
              Siguiente paso
            </div>

            <div
              style={{
                fontSize: 30,
                lineHeight: 1.02,
                fontWeight: 980,
                letterSpacing: -0.9,
                color: "rgba(226,232,240,0.98)",
                maxWidth: 560,
              }}
            >
              {alreadyRequested
                ? "Tu caso fue recibido por HabitaLibre"
                : readinessMeta.heroTitle}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 15,
                lineHeight: 1.45,
                color: "rgba(148,163,184,0.95)",
                maxWidth: 560,
              }}
            >
              {alreadyRequested
                ? "Ya recibimos tu caso en la cola operativa de HabitaLibre. Ahora revisaremos internamente cómo moverlo con el proyecto y con una entidad financiera compatible."
                : readinessMeta.heroBody}
            </div>
          </div>
        </div>

        <InfoCard
          title={alreadyRequested ? "Caso recibido" : readinessMeta.cardTitle}
          subtitle={
            alreadyRequested
              ? "Tu caso ya entró a revisión operativa interna de HabitaLibre."
              : readinessMeta.cardBody
          }
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <Chip tone={alreadyRequested ? "good" : readinessMeta.tone}>
              {alreadyRequested ? activationStatus : readinessMeta.chip}
            </Chip>

            <Chip tone={statusMeta.tone}>{statusMeta.chip}</Chip>

            <Chip tone={docsReady ? "good" : "neutral"}>
              {docsDone} de {docsTotal} ítems listos
            </Chip>
          </div>

          <PrimaryButton onClick={handlePrimaryAction} disabled={isSubmitting}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {alreadyRequested
                ? "Ver estado de mi caso"
                : isSubmitting
                ? "Enviando caso..."
                : readinessMeta.cta}
              <ArrowRight size={16} />
            </span>
          </PrimaryButton>

          {submitError ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                lineHeight: 1.45,
                color: "rgba(248,113,113,0.98)",
                fontWeight: 700,
              }}
            >
              {submitError}
            </div>
          ) : null}
        </InfoCard>

        <InfoCard
          title="Qué debe pasar ahora"
          subtitle="Esta es la acción más lógica según tu situación actual."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <StageCard
              icon={<Target size={15} />}
              title="Acción inmediata"
              text={
                alreadyRequested
                  ? "Esperar la revisión interna de HabitaLibre. Si hace falta algo más, te lo mostraremos."
                  : readinessMeta.nextActionTitle
              }
            />

            <StageCard
              icon={<Building2 size={15} />}
              title="Proyecto"
              text={
                alreadyRequested
                  ? "HabitaLibre decidirá si tu caso ya debe moverse al proyecto elegido y en qué momento."
                  : "Cuando envíes tu caso a HabitaLibre, entra primero a revisión interna antes de salir al proyecto."
              }
            />

            <StageCard
              icon={<Landmark size={15} />}
              title="Entidad financiera"
              text={
                alreadyRequested
                  ? "HabitaLibre también revisará si conviene mover tu caso al frente financiero y con qué entidad."
                  : "Cuando envíes tu caso a HabitaLibre, primero se valida internamente la mejor ruta financiera."
              }
            />
          </div>
        </InfoCard>

        <InfoCard
          title="Tu estado actual"
          subtitle="Este resumen te ayuda a entender desde dónde estás avanzando."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <ChecklistStat
              label="Propiedad"
              value={
                !hasChosenProperty
                  ? "Pendiente"
                  : selectedPropertyStatus === "selected_viable_now"
                  ? "Sigue alineada"
                  : selectedPropertyStatus === "selected_future_viable"
                  ? "Ruta futura"
                  : selectedPropertyStatus === "selected_near_route"
                  ? "Revisar encaje"
                  : selectedPropertyStatus === "selected_no_longer_viable"
                  ? "Ya no calza hoy"
                  : "Elegida"
              }
            />
            <ChecklistStat label="Checklist" value={`${docsDone}/${docsTotal}`} />
            <ChecklistStat
              label="Meta estimada"
              value={maxCompra ? moneyUSD(maxCompra) : "—"}
            />
            <ChecklistStat
              label="Cuota estimada"
              value={cuota ? moneyUSD(cuota) : "—"}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 12,
                color: "rgba(148,163,184,0.92)",
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Nivel de preparación documental
            </div>
            <ProgressBar value={docsProgress} />
          </div>
        </InfoCard>

        <InfoCard
          title="Propiedad base"
          subtitle="La propiedad que hoy está guiando tu ruta."
        >
          <div
            style={{
              padding: 14,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                color: "rgba(226,232,240,0.98)",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.2,
              }}
            >
              <Home size={15} />
              {hasChosenProperty
                ? normalizedSelectedProperty.title
                : "Aún no has elegido una propiedad"}
            </div>

            <div
              style={{
                fontSize: 13.5,
                color: "rgba(148,163,184,0.95)",
                lineHeight: 1.45,
              }}
            >
              {hasChosenProperty ? (
                <>
                  {normalizedSelectedProperty.city || "Ubicación pendiente"}
                  {normalizedSelectedProperty.price != null
                    ? ` · ${moneyUSD(normalizedSelectedProperty.price)}`
                    : ""}
                </>
              ) : (
                "Ubicación pendiente"
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {hasChosenProperty ? (
              <PrimaryButton
                onClick={() =>
                  navigate(`/property/${normalizedSelectedProperty.id}`)
                }
              >
                Ver propiedad elegida
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => navigate("/marketplace")}>
                Elegir una propiedad
              </PrimaryButton>
            )}

            <SecondaryButton onClick={() => navigate("/marketplace")}>
              Ver mi Match
            </SecondaryButton>
          </div>
        </InfoCard>

        <InfoCard
          title="Cómo agrega valor HabitaLibre aquí"
          subtitle="La idea es que no dependas de un solo actor para avanzar."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <StageCard
              icon={<FileText size={15} />}
              title="Recibe y revisa tu caso"
              text="No se trata solo de haber hecho el journey, sino de que HabitaLibre revise internamente si ya conviene mover tu caso."
            />

            <StageCard
              icon={<Building2 size={15} />}
              title="Decide el momento correcto para el proyecto"
              text="HabitaLibre decide cuándo dirigir tu caso al promotor del proyecto elegido."
            />

            <StageCard
              icon={<Landmark size={15} />}
              title="También define el frente financiero"
              text="Así no dependes del promotor para llegar al banco y mantienes ambos frentes bajo el control de HabitaLibre."
            />
          </div>
        </InfoCard>

        {alreadyRequested ? (
          <InfoCard
            title="Tu caso ya fue recibido"
            subtitle="Ya puedes pasar a la vista de seguimiento para ver el estado de la revisión operativa."
          >
            <PrimaryButton onClick={() => navigate("/caso")}>
              Ver mi caso
            </PrimaryButton>
          </InfoCard>
        ) : null}
      </div>
    </Screen>
  );
}