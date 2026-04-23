const LS_CUSTOMER_TOKEN = "hl_customer_token";
const LS_CUSTOMER_DATA = "hl_customer_data";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getCustomerToken() {
  try {
    return localStorage.getItem(LS_CUSTOMER_TOKEN) || "";
  } catch {
    return "";
  }
}

export function getCustomer() {
  try {
    const raw = localStorage.getItem(LS_CUSTOMER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCustomerEmail() {
  const customer = getCustomer();
  return (
    normalizeEmail(customer?.email) ||
    normalizeEmail(customer?.correo) ||
    normalizeEmail(customer?.mail) ||
    ""
  );
}

export function setCustomerSession({ token, customer, email }) {
  try {
    if (token) {
      localStorage.setItem(LS_CUSTOMER_TOKEN, String(token));
    }

    const existing = getCustomer() || {};

    const normalizedEmail =
      normalizeEmail(customer?.email) ||
      normalizeEmail(customer?.correo) ||
      normalizeEmail(customer?.mail) ||
      normalizeEmail(email) ||
      normalizeEmail(existing?.email) ||
      "";

    const safeCustomer = {
      ...existing,
      ...(customer || {}),
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
    };

    if (Object.keys(safeCustomer).length > 0) {
      localStorage.setItem(LS_CUSTOMER_DATA, JSON.stringify(safeCustomer));
    }
  } catch {}
}

export function clearCustomerSession() {
  try {
    localStorage.removeItem(LS_CUSTOMER_TOKEN);
    localStorage.removeItem(LS_CUSTOMER_DATA);
  } catch {}
}

export function isCustomerLoggedIn() {
  return !!getCustomerToken();
}

export function hasUsableCustomerSession() {
  return !!getCustomerToken() && !!getCustomerEmail();
}