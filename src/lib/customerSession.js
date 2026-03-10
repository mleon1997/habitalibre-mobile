// src/lib/customerSession.js

const LS_CUSTOMER_TOKEN = "hl_customer_token";
const LS_CUSTOMER_DATA = "hl_customer_data";

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

export function setCustomerSession({ token, customer }) {
  try {
    if (token) localStorage.setItem(LS_CUSTOMER_TOKEN, String(token));
    if (customer) localStorage.setItem(LS_CUSTOMER_DATA, JSON.stringify(customer));
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