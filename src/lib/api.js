// src/lib/api.js
import { getCustomerToken } from "./customerSession.js";

// ✅ Base URL del backend
// - Prioridad 1: VITE_API_BASE (env)
// - Prioridad 2: window.__HL_API_BASE (runtime)
// - Default: Render
function normalizePath(path) {
  const p = String(path || "").trim();
  if (!p) return "/";
  return p.startsWith("/") ? p : `/${p}`;
}

export const API_BASE = "http://127.0.0.1:4000";
console.log("🚨 API FILE NUEVO CARGADO");
console.log("🚨 API_BASE NUEVO =", API_BASE);

// --------------------
// Helpers
// --------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isProbablyJson(res) {
  const ct = String(res?.headers?.get?.("content-type") || "").toLowerCase();
  return ct.includes("application/json") || ct.includes("+json");
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function buildErrorMessage({ path, status, data, rawText }) {
  const msg =
    data?.error ||
    data?.message ||
    (typeof data === "string" ? data : null) ||
    (rawText && rawText.length < 200 ? rawText : null) ||
    `HTTP ${status} en ${path}`;

  return String(msg);
}

function isRetryableError(e) {
  const msg = String(e?.message || "").toLowerCase();
  const name = String(e?.name || "").toLowerCase();

  // AbortController timeout -> reintentar
  if (name.includes("abort")) return true;

  // Android WebView / red
  if (
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed")
  ) {
    return true;
  }

  return false;
}

function isRetryableStatus(status) {
  // 408/429 y 5xx suelen ser temporales
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

// --------------------
// fetch con timeout
// --------------------
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// --------------------
// Request central
// --------------------
async function request(
  path,
  { method = "GET", body, headers = {}, token = "" } = {}
) {
  const url = `${API_BASE}${normalizePath(path)}`;

  // ✅ AUTO-TOKEN: si no pasas token manual, usamos el de customerSession (hl_customer_token)
  const autoToken = token || getCustomerToken() || "";

  const finalHeaders = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(autoToken ? { Authorization: `Bearer ${autoToken}` } : {}),
    ...headers,
  };

  const opts = {
    method,
    headers: finalHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  // ✅ Retries más “móviles”:
  // - 3 intentos, timeout 15s por intento
  // - Backoff ligero (0ms, 1200ms, 2500ms)
  const delays = [0, 1200, 2500];
  const timeoutPerAttempt = 15000;

  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);

    try {
      const res = await fetchWithTimeout(url, opts, timeoutPerAttempt);

      const rawText = await safeReadText(res);
      let data = null;

      if (rawText) {
        if (isProbablyJson(res)) {
          try {
            data = JSON.parse(rawText);
          } catch {
            data = { ok: false, raw: rawText };
          }
        } else {
          // a veces Render/Cloudflare devuelven HTML o texto
          try {
            data = JSON.parse(rawText);
          } catch {
            data = { ok: false, raw: rawText };
          }
        }
      }

      if (!res.ok) {
        const msg = buildErrorMessage({
          path,
          status: res.status,
          data,
          rawText,
        });

        const err = new Error(msg);
        err.status = res.status;
        err.data = data;

        // 🔁 Reintentar si status es temporal
        if (isRetryableStatus(res.status) && i < delays.length - 1) {
          lastErr = err;
          continue;
        }

        throw err;
      }

      return data ?? null;
    } catch (e) {
      lastErr = e;

      // 🔁 Reintentar solo si parece fallo temporal de red/timeout
      if (isRetryableError(e) && i < delays.length - 1) continue;

      break;
    }
  }

  // Mensaje final más útil
  const msg = String(lastErr?.message || "");

  if (
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("load failed") ||
    msg.toLowerCase().includes("network")
  ) {
    throw new Error(
      "No se pudo conectar al backend (Failed to fetch). En móvil suele ser red/SSL/CORS o backend dormido. Prueba de nuevo; si persiste, revisamos CORS del backend y que API_BASE sea https."
    );
  }

  if (String(lastErr?.name || "").toLowerCase().includes("abort")) {
    throw new Error(
      "El backend tardó demasiado en responder (timeout). Si Render está dormido, reintenta; si es constante, subimos el timeout o optimizamos el endpoint."
    );
  }

  throw lastErr || new Error("Error de red");
}

// --------------------
// API pública
// --------------------
export async function apiGet(path, token = "", headers = {}) {
  return request(path, { method: "GET", token, headers });
}

export async function apiPost(path, body, token = "", headers = {}) {
  return request(path, { method: "POST", body, token, headers });
}

export async function apiPut(path, body, token = "", headers = {}) {
  return request(path, { method: "PUT", body, token, headers });
}

export async function apiPatch(path, body, token = "", headers = {}) {
  return request(path, { method: "PATCH", body, token, headers });
}

export async function apiDelete(path, token = "", headers = {}) {
  return request(path, { method: "DELETE", token, headers });
}