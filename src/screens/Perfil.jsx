// src/screens/Perfil.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Screen,
  Card,
  InnerCard,
  Chip,
  ProgressBar,
  SecondaryButton,
  UI,
} from "../ui/kit.jsx";
import {
  getCustomerToken,
  getCustomer,
  clearCustomerSession,
} from "../lib/customerSession.js";

const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";

const LEGAL_LINKS = {
  privacidad: "https://www.habitalibre.com/privacy.html",
  terminos: "https://www.habitalibre.com/terms.html",
  cookies: "https://www.habitalibre.com/cookies.html",
};

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function openExternal(url) {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = url;
  }
}

function SectionTitle({ children, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
        paddingLeft: 2,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          color: UI.subtext,
          letterSpacing: 0.1,
        }}
      >
        {children}
      </div>

      {right ? (
        <button
          type="button"
          onClick={right.onClick}
          style={{
            border: "none",
            background: "transparent",
            color: UI.accent || "#5eead4",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {right.label}
        </button>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 14,
        borderRadius: UI.radiusInner,
        background: UI.innerBg,
        border: UI.borderSoft,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: UI.subtext,
          marginBottom: 8,
          lineHeight: 1.25,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 950,
          color: UI.text,
          lineHeight: 1.05,
          letterSpacing: -0.4,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ListRow({
  label,
  value,
  muted = false,
  onClick,
  danger = false,
  compact = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: compact ? "14px 16px" : "16px 18px",
        borderRadius: UI.radiusCard,
        border: danger ? "1px solid rgba(239,68,68,0.18)" : UI.border,
        background: danger ? "rgba(239,68,68,0.06)" : UI.cardBgSoft,
        color: UI.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: onClick ? "pointer" : "default",
        boxShadow: UI.shadowSoft,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: compact ? 13 : 14,
            color: danger ? "rgba(252,165,165,0.95)" : UI.subtext,
            marginBottom: 5,
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: compact ? 15 : 16,
            fontWeight: 850,
            color: danger
              ? "#fecaca"
              : muted
              ? "rgba(148,163,184,0.88)"
              : UI.text,
            lineHeight: 1.25,
            wordBreak: "break-word",
          }}
        >
          {value || "No definido"}
        </div>
      </div>

      <div
        style={{
          marginLeft: 14,
          fontSize: 22,
          lineHeight: 1,
          color: danger
            ? "rgba(252,165,165,0.9)"
            : "rgba(148,163,184,0.9)",
          flexShrink: 0,
        }}
      >
        ›
      </div>
    </button>
  );
}

function InlineInfo({ label, value }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: UI.borderSoft,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: UI.subtext,
          marginBottom: 6,
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          color: UI.text,
          fontWeight: 850,
          lineHeight: 1.25,
          wordBreak: "break-word",
        }}
      >
        {value || "No definido"}
      </div>
    </div>
  );
}

export default function Perfil() {
  const navigate = useNavigate();

  const token = getCustomerToken();
  const isLoggedIn = !!token;
  const customer = getCustomer();

  const rawJourney = readJSON(LS_JOURNEY, {}) || {};
  const snapshot = readJSON(LS_SNAPSHOT, {}) || {};

  const form = rawJourney?.form || {};
  const journey = Object.keys(form).length ? form : rawJourney;

  const user = useMemo(() => {
    const nombre =
      journey.nombre ||
      form.nombre ||
      customer?.nombre ||
      customer?.name ||
      "";

    const apellido =
      journey.apellido ||
      form.apellido ||
      customer?.apellido ||
      customer?.lastName ||
      "";

    const fullNameFromCustomer =
      customer?.fullName ||
      customer?.nombreCompleto ||
      "";

    const nombreCompleto =
      `${String(nombre || "").trim()} ${String(apellido || "").trim()}`
        .trim() || fullNameFromCustomer || "Usuario";

    return {
      nombre: String(nombre || "").trim(),
      apellido: String(apellido || "").trim(),
      nombreCompleto,
      email: customer?.email || journey.email || form.email || "No registrado",
      telefono:
        journey.telefono ||
        form.telefono ||
        customer?.telefono ||
        customer?.phone ||
        "",
    };
  }, [journey, form, customer]);

  const profileCompletion = useMemo(() => {
    const checks = [
      user.nombre,
      user.apellido,
      user.email !== "No registrado" ? user.email : "",
      user.telefono,
      journey.edad,
      journey.estadoCivil,
      journey.ingreso,
      journey.tipoIngreso,
      journey.aniosEstabilidad,
      journey.deudas,
      journey.entrada,
      journey.primeraVivienda,
      journey.horizonteCompra,
      journey.tipoVivienda,
    ];

    const complete = checks.filter(Boolean).length;
    return Math.round((complete / checks.length) * 100);
  }, [journey, user]);

  const estadoPerfil = useMemo(() => {
    if (profileCompletion >= 85) return "Muy completo";
    if (profileCompletion >= 60) return "Bien encaminado";
    return "Por completar";
  }, [profileCompletion]);

  const score = snapshot?.score ?? snapshot?.hlScore ?? 100;
  const estadoActual =
    snapshot?.probabilidadLabel ||
    snapshot?.probabilidad ||
    snapshot?.perfilLabel ||
    "Alta";

  const completionTone =
    profileCompletion >= 85
      ? "good"
      : profileCompletion >= 60
      ? "warn"
      : "neutral";

  const resumenRuta = useMemo(() => {
    const partes = [];

    if (journey.ciudadCompra) partes.push(journey.ciudadCompra);
    if (journey.horizonteCompra) partes.push(`${journey.horizonteCompra} meses`);
    if (journey.tipoVivienda) partes.push(journey.tipoVivienda);

    return partes.length ? partes.join(" · ") : "Aún no completas tu ruta";
  }, [journey]);

  const ingresoLabel = journey.ingreso ? `$${journey.ingreso}` : "No definido";
  const entradaLabel = journey.entrada ? `$${journey.entrada}` : "No definido";
  const viviendaLabel = journey.primeraVivienda || "No definido";

  function handleLogout() {
    clearCustomerSession();
    navigate("/login", { replace: true });
  }

  function goEditarPerfil() {
    navigate("/perfil/editar");
  }

  return (
    <Screen style={{ paddingBottom: 110 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: UI.subtext,
                marginBottom: 8,
                fontWeight: 800,
              }}
            >
              Tu cuenta
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.02,
                fontWeight: 950,
                letterSpacing: -0.8,
                color: UI.text,
              }}
            >
              Perfil
            </h1>
          </div>

          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background:
                "linear-gradient(180deg, rgba(45,212,191,0.16), rgba(59,130,246,0.12))",
              border: UI.border,
              boxShadow: UI.shadowSoft,
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            {(user.nombreCompleto || "U").slice(0, 1).toUpperCase()}
          </div>
        </div>

        <Card style={{ marginBottom: 18, padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 24,
                fontWeight: 950,
                color: UI.text,
                background:
                  "linear-gradient(180deg, rgba(45,212,191,0.16), rgba(59,130,246,0.14))",
                border: UI.border,
                flexShrink: 0,
              }}
            >
              {(user.nombreCompleto || "U").slice(0, 1).toUpperCase()}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 950,
                  color: UI.text,
                  lineHeight: 1.05,
                  marginBottom: 4,
                  wordBreak: "break-word",
                }}
              >
                {user.nombreCompleto}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: UI.subtext,
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                  marginBottom: 8,
                }}
              >
                {user.email}
              </div>

              <Chip tone={isLoggedIn ? "good" : "neutral"}>
                {isLoggedIn ? "Sesión activa" : "Modo invitado"}
              </Chip>
            </div>
          </div>

          <InnerCard style={{ marginTop: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: UI.subtext,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  Completitud de tu perfil
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 950,
                    color: UI.text,
                    lineHeight: 1.05,
                    letterSpacing: -0.4,
                  }}
                >
                  {profileCompletion}% · {estadoPerfil}
                </div>
              </div>

              <Chip tone={completionTone}>
                {profileCompletion >= 85 ? "Listo" : "Mejorable"}
              </Chip>
            </div>

            <ProgressBar value={profileCompletion} />

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: UI.subtext,
                lineHeight: 1.45,
              }}
            >
              Completar mejor tu información ayuda a mostrarte rutas y resultados
              más precisos.
            </div>
          </InnerCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <MetricCard label="Score HabitaLibre" value={score} />
            <MetricCard label="Estado actual" value={estadoActual} />
          </div>
        </Card>

        <div style={{ marginBottom: 18 }}>
          <SectionTitle right={{ label: "Editar", onClick: goEditarPerfil }}>
            Datos personales
          </SectionTitle>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InlineInfo label="Nombre" value={user.nombre || "No definido"} />
              <InlineInfo label="Apellido" value={user.apellido || "No definido"} />
            </div>

            <InlineInfo
              label="Email"
              value={user.email === "No registrado" ? "No registrado" : user.email}
            />
            <InlineInfo
              label="Teléfono"
              value={user.telefono || "Agrega tu número"}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InlineInfo
                label="Edad"
                value={journey.edad ? `${journey.edad} años` : "No definido"}
              />
              <InlineInfo
                label="Estado civil"
                value={journey.estadoCivil || "No definido"}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <SectionTitle
            right={{ label: "Ver ruta", onClick: () => navigate("/ruta") }}
          >
            Tu ruta hipotecaria
          </SectionTitle>

          <Card style={{ padding: 14 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: UI.text,
                marginBottom: 6,
              }}
            >
              Resumen de tu escenario
            </div>

            <div
              style={{
                fontSize: 13,
                color: UI.subtext,
                lineHeight: 1.45,
                marginBottom: 14,
              }}
            >
              {resumenRuta}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InlineInfo label="Ingreso" value={ingresoLabel} />
              <InlineInfo label="Entrada" value={entradaLabel} />
              <InlineInfo label="Primera vivienda" value={viviendaLabel} />
            </div>

            <button
              type="button"
              onClick={() => navigate("/journey")}
              style={{
                marginTop: 14,
                width: "100%",
                padding: 14,
                borderRadius: 16,
                border: UI.border,
                background: "rgba(255,255,255,0.04)",
                color: UI.text,
                fontWeight: 900,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Actualizar mi ruta
            </button>
          </Card>
        </div>

        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Cuenta y soporte</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            <ListRow
              label="Editar mis datos"
              value="Actualizar información personal"
              onClick={goEditarPerfil}
            />
            <ListRow
              label="Mi ruta"
              value="Ver mi camino a casa"
              onClick={() => navigate("/ruta")}
            />
            <ListRow
              label="Ayuda"
              value="Hablar con un asesor"
              onClick={() => navigate("/asesor")}
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Legal</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            <ListRow
              label="Política de privacidad"
              value="Cómo protegemos y usamos tus datos"
              onClick={() => openExternal(LEGAL_LINKS.privacidad)}
              compact
            />
            <ListRow
              label="Términos de uso"
              value="Condiciones para usar HabitaLibre"
              onClick={() => openExternal(LEGAL_LINKS.terminos)}
              compact
            />
            <ListRow
              label="Política de cookies"
              value="Uso de cookies y tecnologías similares"
              onClick={() => openExternal(LEGAL_LINKS.cookies)}
              compact
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <SectionTitle>Seguridad</SectionTitle>
          <div style={{ display: "grid", gap: 10 }}>
            <ListRow
              label="Eliminar cuenta"
              value="Eliminar permanentemente mi cuenta"
              onClick={() => navigate("/eliminar-cuenta")}
              danger
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: "0 2px",
            fontSize: 12,
            color: UI.subtext,
            lineHeight: 1.5,
          }}
        >
          Las simulaciones y resultados mostrados en HabitaLibre son
          referenciales y pueden variar según la evaluación y verificación final
          de cada entidad financiera.
        </div>

        <SecondaryButton
          onClick={handleLogout}
          style={{
            height: 50,
            borderRadius: 16,
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          Cerrar sesión
        </SecondaryButton>
      </div>
    </Screen>
  );
}