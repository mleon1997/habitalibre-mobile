import { getCustomer } from "./customerSession";

export const LS_SAVED_PROPERTIES = "hl_saved_properties_v1";
export const LS_SELECTED_PROPERTY = "hl_selected_property_v1";
export const LS_ACTIVE_APPLICATION = "hl_active_application_v1";

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getOwnerEmail() {
  try {
    return String(getCustomer()?.email || "").trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export function loadOwnedEnvelope(key) {
  const ownerEmail = getOwnerEmail();
  const envelope = safeParse(localStorage.getItem(key));

  if (!ownerEmail || !envelope?.ownerEmail || envelope.ownerEmail !== ownerEmail) {
    return null;
  }

  return envelope;
}

export function loadOwnedData(key, fallback = null) {
  const envelope = loadOwnedEnvelope(key);
  return envelope?.data ?? fallback;
}

export function saveOwnedData(key, data) {
  const ownerEmail = getOwnerEmail();
  if (!ownerEmail) return false;

  localStorage.setItem(
    key,
    JSON.stringify({
      ownerEmail,
      data,
    })
  );

  return true;
}

export function getSavedProperties() {
  return loadOwnedData(LS_SAVED_PROPERTIES, []);
}

export function getSelectedPropertyRef() {
  return loadOwnedData(LS_SELECTED_PROPERTY, null);
}

export function getActiveApplication() {
  return loadOwnedData(LS_ACTIVE_APPLICATION, null);
}

export function isPropertySaved(propertyId) {
  const saved = getSavedProperties();
  return saved.some((item) => String(item.id) === String(propertyId));
}

export function isPropertySelected(propertyId) {
  const selected = getSelectedPropertyRef();
  return String(selected?.id || "") === String(propertyId);
}

export function toggleSavedProperty(property) {
  const saved = getSavedProperties();
  const exists = saved.some((item) => String(item.id) === String(property.id));

  const next = exists
    ? saved.filter((item) => String(item.id) !== String(property.id))
    : [
        ...saved,
        {
          id: property.id,
          savedAt: new Date().toISOString(),
        },
      ];

  saveOwnedData(LS_SAVED_PROPERTIES, next);
  return next;
}

export function selectProperty(property) {
  const ref = {
    id: property.id,
    selectedAt: new Date().toISOString(),
  };

  saveOwnedData(LS_SELECTED_PROPERTY, ref);
  return ref;
}

export function clearSelectedProperty() {
  const ownerEmail = getOwnerEmail();
  if (!ownerEmail) return;

  localStorage.setItem(
    LS_SELECTED_PROPERTY,
    JSON.stringify({
      ownerEmail,
      data: null,
    })
  );
}

export function startApplication(propertyId) {
  const data = {
    propertyId,
    startedAt: new Date().toISOString(),
    status: "draft",
  };

  saveOwnedData(LS_ACTIVE_APPLICATION, data);
  return data;
}

export function clearActiveApplication() {
  const ownerEmail = getOwnerEmail();
  if (!ownerEmail) return;

  localStorage.setItem(
    LS_ACTIVE_APPLICATION,
    JSON.stringify({
      ownerEmail,
      data: null,
    })
  );
}