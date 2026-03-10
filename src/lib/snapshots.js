// src/lib/snapshots.js
import { apiGet, apiPost } from "./api.js";
import { getCustomerToken } from "./customerSession.js";

/**
 * Devuelve Authorization Bearer token (customer)
 */
function getToken() {
  return getCustomerToken() || "";
}

/**
 * GET /api/snapshots/latest
 * -> requiere authCustomerRequired (Bearer token)
 */
export async function fetchLatestSnapshot() {
  const token = getToken();
  return apiGet("/api/snapshots/latest", token);
}

/**
 * GET /api/snapshots/history?limit=10
 */
export async function fetchSnapshotHistory(limit = 10) {
  const token = getToken();
  const q = `?limit=${encodeURIComponent(String(limit))}`;
  return apiGet(`/api/snapshots/history${q}`, token);
}

/**
 * POST /api/snapshots
 * body: { input, output }
 *
 * input: payload original del journey (lo que mandas a /api/precalificar)
 * output: snapshot/result (lo que te devuelve /api/precalificar o tu buildSnapshot)
 */
export async function saveSnapshot({ input, output }) {
  const token = getToken();
  return apiPost("/api/snapshots", { input, output }, token);
}