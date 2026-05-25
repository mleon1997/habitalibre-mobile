import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  FileText,
  FolderOpen,
  Home,
  Briefcase,
  FileSignature,
  Building2,
  KeyRound,
} from "lucide-react";
import {
  Screen,
  Card,
  Chip,
  PrimaryButton,
  SecondaryButton,
  ProgressBar,
} from "../ui/kit.jsx";
import { getCustomer } from "../lib/customerSession.js";
import { saveDocsChecklistToBackend } from "../lib/userAppState.js";

const LS_DOCS_CHECKLIST = "hl_docs_checklist_v1";

function safeParseLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  saveLS(key, { ownerEmail, data });
}

const BASE_SECTIONS = [
  {
    id: "personales",
    title: "Documentos personales",
    icon: <FileText size={14} />,
    items: [
      { id: "cedula", label: "Cédula o documento de identidad" },
      { id: "papeleta", label: "Papeleta de votación, si aplica" },
      { id: "civil", label: "Documento de estado civil, si aplica" },
    ],
  },
  {
    id: "ingresos",
    title: "Ingresos y respaldo financiero",
    icon: <Briefcase size={14} />,
    items: [
      { id: "ingresos", label: "Comprobantes de ingresos" },
      { id: "rol", label: "Rol de pagos o respaldo laboral" },
      { id: "bancos", label: "Estados de cuenta bancarios recientes" },
      {
        id: "deudas",
        label: "Información de obligaciones mensuales, si aplica",
      },
    ],
  },
  {
    id: "propiedad",
    title: "Propiedad o proyecto",
    icon: <Home size={14} />,
    items: [
      { id: "proforma", label: "Información del proyecto o propiedad elegida" },
      { id: "reserva", label: "Reserva o documento comercial, si existe" },
      { id: "promotor", label: "Datos del promotor o vendedor" },
    ],
  },
];

const NEXT_STAGES = [
  {
    id: "reserva-separacion",
    icon: <Building2 size={15} />,
    title: "Reserva o separación",
    text: "En algunos proyectos, este paso viene después de elegir la propiedad para asegurar disponibilidad o fijar condiciones comerciales.",
  },
  {
    id: "promesa-compraventa",
    icon: <FileSignature size={15} />,
    title: "Promesa de compraventa",
    text: "En proyectos en construcción, esta suele ser una etapa importante antes de la entrega final y antes de la escritura.",
  },
  {
    id: "gestion-entidad",
    icon: <FolderOpen size={15} />,
    title: "Conversaciones con actores externos",
    text: "Aquí el proceso real puede continuar con el promotor del proyecto o con una entidad financiera regulada, fuera de HabitaLibre.",
  },
  {
    id: "escritura-cierre",
    icon: <KeyRound size={15} />,
    title: "Escritura y cierre",
    text: "Cuando el proceso avance y la operación esté lista, esta suele ser una de las etapas finales de formalización.",
  },
];

const styles = {
  content: {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)",
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 132px)",
    display: "grid",
    gap: 18,
    boxSizing: "border-box",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.09)",
    color: "rgba(226,232,240,0.98)",
    borderRadius: 999,
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13.5,
    flex: "0 0 auto",
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
    fontSize: "clamp(34px, 10vw, 46px)",
    lineHeight: 0.98,
    fontWeight: 980,
    letterSpacing: -1.3,
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

  sectionPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.045)",
    fontSize: 14,
    fontWeight: 900,
    color: "rgba(226,232,240,0.96)",
  },
};

function ChecklistRow({ checked, label, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 13,
        minHeight: 58,
        padding: "13px 14px",
        borderRadius: 20,
        border: `1px solid ${
          checked ? "rgba(37,211,166,0.24)" : "rgba(148,163,184,0.12)"
        }`,
        background: checked
          ? "linear-gradient(135deg, rgba(37,211,166,0.14), rgba(20,184,166,0.07))"
          : "rgba(255,255,255,0.035)",
        color: "white",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: checked ? "0 12px 30px rgba(20,184,166,0.07)" : "none",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: checked
            ? "rgba(37,211,166,0.18)"
            : "rgba(255,255,255,0.035)",
          border: `1px solid ${
            checked ? "rgba(37,211,166,0.38)" : "rgba(148,163,184,0.24)"
          }`,
          flex: "0 0 auto",
          boxShadow: checked ? "0 0 0 6px rgba(37,211,166,0.07)" : "none",
          color: checked ? "rgba(209,250,229,0.98)" : "rgba(148,163,184,0.7)",
        }}
      >
        {checked ? <Check size={15} strokeWidth={3} /> : null}
      </div>

      <div
        style={{
          fontSize: 15,
          lineHeight: 1.32,
          color: checked ? "rgba(226,232,240,0.98)" : "rgba(203,213,225,0.92)",
          fontWeight: checked ? 850 : 750,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </div>
    </button>
  );
}

function StageCard({ icon, title, text }) {
  return (
    <div
      style={{
        padding: 15,
        borderRadius: 20,
        border: "1px solid rgba(148,163,184,0.11)",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
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
        {text}
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
      <strong>Preparación referencial.</strong>{" "}
      {compact
        ? "HabitaLibre no otorga ni aprueba créditos. Las condiciones finales dependen de cada entidad financiera."
        : "HabitaLibre no es banco, cooperativa, prestamista ni entidad financiera. No otorgamos, aprobamos, financiamos, intermediamos ni cobramos créditos. Esta checklist es únicamente una guía de preparación; cualquier revisión, aprobación, tasa, plazo, cuota, fecha de pago o condición final depende exclusivamente de entidades externas reguladas."}
    </div>
  );
}

export default function ChecklistDocumentos() {
  const navigate = useNavigate();

  const stored = useMemo(() => loadOwnedData(LS_DOCS_CHECKLIST), []);
  const [checks, setChecks] = useState(stored || {});
  const [syncState, setSyncState] = useState("idle");

  const totalItems = BASE_SECTIONS.reduce(
    (acc, section) => acc + section.items.length,
    0
  );

  const doneItems = Object.values(checks).filter(Boolean).length;
  const progress =
    totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  async function syncDocsToBackend(nextChecklist) {
    try {
      setSyncState("saving");
      await saveDocsChecklistToBackend(nextChecklist);
      setSyncState("saved");

      window.setTimeout(() => {
        setSyncState((current) => (current === "saved" ? "idle" : current));
      }, 1400);
    } catch (err) {
      setSyncState("error");
      console.warn(
        "[HL] No se pudo guardar checklist documental en backend:",
        err?.message || err
      );

      window.setTimeout(() => {
        setSyncState((current) => (current === "error" ? "idle" : current));
      }, 2200);
    }
  }

  function toggleItem(id) {
    setChecks((prev) => {
      const next = { ...(prev || {}), [id]: !prev?.[id] };

      saveOwnedData(LS_DOCS_CHECKLIST, next);
      void syncDocsToBackend(next);

      return next;
    });
  }

  function getSyncChip() {
    if (syncState === "saving") {
      return <Chip tone="neutral">Guardando...</Chip>;
    }

    if (syncState === "saved") {
      return <Chip tone="good">Guardado</Chip>;
    }

    if (syncState === "error") {
      return <Chip tone="neutral">Pendiente de sincronizar</Chip>;
    }

    return null;
  }

  return (
    <Screen>
      <div style={styles.content}>
        <div style={{ display: "grid", gap: 18 }}>
          <div style={styles.topBar}>
            <button onClick={() => navigate("/ruta")} style={styles.backButton}>
              <ArrowLeft size={16} />
              Volver a Ruta
            </button>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {getSyncChip()}

              <Chip tone={progress === 100 ? "good" : "neutral"}>
                {progress}% listo
              </Chip>
            </div>
          </div>

          <div>
            <div style={styles.eyebrow}>Preparación documental</div>

            <div style={styles.title}>Prepara tus documentos</div>

            <div style={styles.subtitle}>
              Organiza lo que podrías necesitar para llegar mejor preparado a
              futuras conversaciones con un promotor o una entidad financiera
              regulada.
            </div>

            <FinancialDisclaimer />
          </div>
        </div>

        <Card style={styles.softCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "rgba(148,163,184,0.95)",
                  fontWeight: 850,
                }}
              >
                Tu avance
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 22,
                  lineHeight: 1.1,
                  fontWeight: 950,
                  letterSpacing: -0.4,
                  color: "rgba(226,232,240,0.98)",
                }}
              >
                {doneItems} de {totalItems} ítems listos
              </div>
            </div>

            <Chip tone={progress === 100 ? "good" : "neutral"}>
              {progress === 100 ? "Completa" : "En preparación"}
            </Chip>
          </div>

          <div style={{ marginTop: 16 }}>
            <ProgressBar value={progress} />
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 13.5,
              color: "rgba(148,163,184,0.92)",
              lineHeight: 1.45,
            }}
          >
            Checklist referencial para ordenar tu información. No representa
            aprobación, oferta ni evaluación formal de ninguna entidad
            financiera.
          </div>
        </Card>

        {BASE_SECTIONS.map((section) => (
          <Card key={section.id} style={styles.softCard}>
            <div style={styles.sectionPill}>
              {section.icon}
              {section.title}
            </div>

            <div style={{ display: "grid", gap: 11 }}>
              {section.items.map((item) => (
                <ChecklistRow
                  key={item.id}
                  checked={!!checks?.[item.id]}
                  label={item.label}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </div>
          </Card>
        ))}

        <Card style={styles.softCard}>
          <div style={styles.sectionPill}>
            <FolderOpen size={14} />
            Etapas que podrían venir después
          </div>

          <div
            style={{
              marginBottom: 14,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "rgba(148,163,184,0.95)",
            }}
          >
            Esto no es una solicitud de crédito dentro de HabitaLibre. Son hitos
            generales que podrían aparecer más adelante en un proceso real de
            compra, fuera de la app.
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {NEXT_STAGES.map((stage) => (
              <StageCard
                key={stage.id}
                icon={stage.icon}
                title={stage.title}
                text={stage.text}
              />
            ))}
          </div>
        </Card>

        <Card style={styles.softCard}>
          <div style={styles.sectionPill}>
            <FolderOpen size={14} />
            Nota importante
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "rgba(203,213,225,0.95)",
            }}
          >
            HabitaLibre no procesa, otorga, aprueba ni financia créditos. Esta
            checklist existe para ayudarte a organizar tu información y llegar
            mejor preparado a conversaciones futuras con actores externos.
          </div>

          <FinancialDisclaimer compact />

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <PrimaryButton onClick={() => navigate("/ruta")}>
              Volver a mi ruta
            </PrimaryButton>

            <SecondaryButton onClick={() => navigate("/marketplace")}>
              Ver mi Match otra vez
            </SecondaryButton>
          </div>
        </Card>
      </div>
    </Screen>
  );
}