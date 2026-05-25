// src/lib/userAppState.js
import { getCustomer, getCustomerToken } from "./customerSession.js";

const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";
const LS_DOCS_CHECKLIST = "hl_docs_checklist_v1";
const LS_SELECTED_MORTGAGE_ROUTE = "hl_selected_mortgage_route_v1";

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE || "https://habitalibre-backend.onrender.com";

const API_BASE = RAW_API_BASE.endsWith("/api")
  ? RAW_API_BASE
  : `${RAW_API_BASE}/api`;

function getToken() {
  return getCustomerToken?.() || "";
}

function getOwnerEmail(ownerEmailOverride = null) {
  if (ownerEmailOverride) {
    return String(ownerEmailOverride).trim().toLowerCase();
  }

  try {
    const email = String(getCustomer()?.email || "").trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function loadOwnedLS(key, ownerEmail) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = safeParse(raw);

    if (!parsed) return null;

    if (parsed?.ownerEmail && "data" in parsed) {
      if (
        ownerEmail &&
        String(parsed.ownerEmail).trim().toLowerCase() === ownerEmail
      ) {
        return parsed.data ?? null;
      }

      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveOwnedLS(key, ownerEmail, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ownerEmail,
        data,
      })
    );
  } catch {}
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasKeys(obj) {
  return isPlainObject(obj) && Object.keys(obj).length > 0;
}

function scrubSensitiveDeep(value) {
  if (Array.isArray(value)) {
    return value.map(scrubSensitiveDeep);
  }

  if (!isPlainObject(value)) return value;

  const blockedKeys = new Set([
    "password",
    "contrasena",
    "contraseña",
    "token",
    "authorization",
    "accessToken",
    "refreshToken",
    "jwt",
  ]);

  const next = {};

  for (const [key, val] of Object.entries(value)) {
    const normalizedKey = String(key).trim();

    if (blockedKeys.has(normalizedKey)) continue;
    if (blockedKeys.has(normalizedKey.toLowerCase())) continue;

    next[key] = scrubSensitiveDeep(val);
  }

  return next;
}

function normalizeSelectedProperty(raw) {
  if (!raw || typeof raw !== "object") return null;

  const unsafeKeys = ["password", "token", "authorization", "accessToken", "jwt"];
  const rawKeys = Object.keys(raw).map((k) => k.toLowerCase());

  if (unsafeKeys.some((k) => rawKeys.includes(k.toLowerCase()))) {
    console.warn(
      "[HL] selectedProperty ignorado porque contiene campos sensibles."
    );
    return null;
  }

  const cleaned = scrubSensitiveDeep(raw);

  const hasPropertyShape =
    cleaned?.id ||
    cleaned?._id ||
    cleaned?.propertyId ||
    cleaned?.titulo ||
    cleaned?.title ||
    cleaned?.nombre ||
    cleaned?.name ||
    cleaned?.precio ||
    cleaned?.price ||
    cleaned?.valor;

  if (!hasPropertyShape) return null;

  return cleaned;
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("No hay token de sesión.");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

async function fetchUserAppState() {
  return apiFetch("/user-app-state/me", {
    method: "GET",
  });
}

async function fetchLatestCaseActivation() {
  try {
    console.log("[HL_CASE] Consultando /casos-activacion/mine/latest...");

    const response = await apiFetch("/casos-activacion/mine/latest", {
      method: "GET",
    });

    console.log("[HL_CASE] Respuesta último caso:", response);

    if (response?.caso) {
      console.log("[HL_CASE] Caso encontrado:", {
        id: response.caso._id,
        statusGeneral: response.caso.statusGeneral,
        projectStatus: response.caso.projectStatus,
        bankStatus: response.caso.bankStatus,
        selectedProperty:
          response.caso.selectedProperty?.title ||
          response.caso.selectedProperty?.titulo ||
          null,
      });
    } else {
      console.log("[HL_CASE] No hay caso para este usuario.");
    }

    return response;
  } catch (err) {
    console.warn(
      "[HL_CASE] No se pudo rehidratar último caso:",
      err?.message || err
    );
    return null;
  }
}

function buildJourneyPatchFromLatestCase(latestCaseResponse) {
  const caso = latestCaseResponse?.caso || latestCaseResponse?.case || null;

  if (!caso || typeof caso !== "object") return {};

  return {
    activationRequestId: caso?._id || null,
    activationRequestedAt: caso?.requestedAt || caso?.createdAt || null,
    activationRequestStatus: caso?.statusGeneral || null,

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

    activationRequestLabel:
      caso?.statusGeneral === "pendiente_revision_habitalibre"
        ? "Caso recibido por HabitaLibre"
        : caso?.statusGeneral === "enviado"
        ? "Compartido por HabitaLibre"
        : null,
  };
}

export async function hydrateFullUserStateToLocalStorage(
  ownerEmailOverride = null
) {
  const token = getToken();

  if (!token) {
    return {
      hydrated: false,
      reason: "no_token",
    };
  }

  const ownerEmail = getOwnerEmail(ownerEmailOverride);

  if (!ownerEmail) {
    return {
      hydrated: false,
      reason: "no_owner_email",
    };
  }

  const response = await fetchUserAppState();
  const state = response?.state || {};

  const selectedProperty = normalizeSelectedProperty(state?.selectedProperty);
  const docsChecklist = isPlainObject(state?.docsChecklist)
    ? state.docsChecklist
    : {};
  const remoteJourney = isPlainObject(state?.journey) ? state.journey : {};
  const remoteMortgageRoute =
  remoteJourney?.mortgageRoute ||
  remoteJourney?.selectedMortgageRoute ||
  null;

  const latestCaseResponse = await fetchLatestCaseActivation();
  const caseJourneyPatch = buildJourneyPatchFromLatestCase(latestCaseResponse);

  const existingJourney = loadOwnedLS(LS_JOURNEY, ownerEmail) || {};

  const mergedJourney = {
    ...existingJourney,
    ...remoteJourney,
    ...caseJourneyPatch,
    hydratedFromUserAppStateAt: new Date().toISOString(),
  };

  if (selectedProperty) {
    saveOwnedLS(LS_SELECTED_PROPERTY, ownerEmail, selectedProperty);
    mergedJourney.propiedadElegida = true;
    mergedJourney.propiedadSeleccionada = selectedProperty;
    mergedJourney.selectedProperty = selectedProperty;
    mergedJourney.propiedadId =
      selectedProperty?.id ||
      selectedProperty?._id ||
      selectedProperty?.propertyId ||
      mergedJourney.propiedadId ||
      null;
    mergedJourney.selectedPropertyStatus =
      selectedProperty?.status ||
      selectedProperty?.selectedPropertyStatus ||
      mergedJourney.selectedPropertyStatus ||
      null;
  }

  if (hasKeys(docsChecklist)) {
    saveOwnedLS(LS_DOCS_CHECKLIST, ownerEmail, docsChecklist);
    mergedJourney.docsChecklist = docsChecklist;
  }

if (remoteMortgageRoute && typeof remoteMortgageRoute === "object") {
  saveOwnedLS(
    LS_SELECTED_MORTGAGE_ROUTE,
    ownerEmail,
    remoteMortgageRoute
  );

  mergedJourney.mortgageRouteConfirmed = true;
  mergedJourney.mortgageRoute = remoteMortgageRoute;
  mergedJourney.selectedMortgageRoute = remoteMortgageRoute;
}

  if (hasKeys(mergedJourney)) {
    saveOwnedLS(LS_JOURNEY, ownerEmail, mergedJourney);
  }

  try {
    window.dispatchEvent(
      new CustomEvent("hl:user-app-state-hydrated", {
        detail: {
          ownerEmail,
          hydratedAt: new Date().toISOString(),
        },
      })
    );
  } catch {}

  console.log("[HL] User app state rehidratado:", {
    hasSelectedProperty: Boolean(selectedProperty),
    docsCount: Object.values(docsChecklist).filter(Boolean).length,
    hasCase: Boolean(caseJourneyPatch?.activationRequestId),
  });

  return {
    hydrated: true,
    ownerEmail,
    state,
    selectedProperty,
    docsChecklist,
    journey: mergedJourney,
    latestCase: latestCaseResponse?.caso || null,
  };
}

export async function saveSelectedPropertyToBackend(selectedProperty) {
  const cleaned = normalizeSelectedProperty(selectedProperty);

  if (!cleaned) {
    throw new Error("Propiedad inválida para guardar.");
  }

  return apiFetch("/user-app-state/selected-property", {
    method: "PATCH",
    body: JSON.stringify({
      selectedProperty: cleaned,
    }),
  });
}

export async function saveDocsChecklistToBackend(docsChecklist) {
  return apiFetch("/user-app-state/docs-checklist", {
    method: "PATCH",
    body: JSON.stringify({
      docsChecklist: isPlainObject(docsChecklist) ? docsChecklist : {},
    }),
  });
}

export async function saveJourneyStateToBackend(journey) {
  return apiFetch("/user-app-state/journey", {
    method: "PATCH",
    body: JSON.stringify({
      journey: isPlainObject(journey) ? scrubSensitiveDeep(journey) : {},
    }),
  });
}

export async function saveUserAppStatePatchToBackend(patch = {}) {
  return apiFetch("/user-app-state", {
    method: "PATCH",
    body: JSON.stringify(scrubSensitiveDeep(patch)),
  });
}