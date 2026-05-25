// src/lib/snapshots.js
import { apiGet, apiPost } from "./api.js";
import { getCustomerToken, getCustomer } from "./customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

/**
 * Devuelve Authorization Bearer token (customer)
 */
function getToken() {
  return getCustomerToken() || "";
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

function loadOwnedLS(key, ownerEmail) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw);

    if (envelope?.ownerEmail && "data" in envelope) {
      if (
        ownerEmail &&
        String(envelope.ownerEmail).trim().toLowerCase() === ownerEmail
      ) {
        return envelope.data ?? null;
      }

      return null;
    }

    return envelope;
  } catch {
    return null;
  }
}

function clearHydratedState() {
  try {
    localStorage.removeItem(LS_SNAPSHOT);
    localStorage.removeItem(LS_SELECTED_PROPERTY);
  } catch {}
}

function firstObject(...items) {
  return (
    items.find(
      (item) => item && typeof item === "object" && !Array.isArray(item)
    ) || null
  );
}

function firstArray(...items) {
  return items.find((item) => Array.isArray(item)) || [];
}

function firstNumber(...items) {
  for (const item of items) {
    const n = Number(item);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function firstValue(...items) {
  for (const item of items) {
    if (item !== null && item !== undefined && item !== "") return item;
  }

  return null;
}

function extractSnapshotRecord(response) {
  return firstObject(
    response?.snapshot,
    response?.latest,
    response?.data?.snapshot,
    response?.data?.latest,
    response?.data,
    response
  );
}

function extractHistoryRecords(response) {
  const candidates = [
    response?.snapshots,
    response?.history,
    response?.items,
    response?.data?.snapshots,
    response?.data?.history,
    response?.data?.items,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function extractSnapshotOutput(record) {
  return firstObject(
    record?.output,
    record?.resultado,
    record?.snapshot?.output,
    record?.data?.output,
    record?.rawMatcherResult,
    record
  );
}

function extractSnapshotInput(record, output) {
  return firstObject(
    record?.input,
    record?.snapshot?.input,
    record?.data?.input,
    output?.input,
    output?.perfilInput,
    output?.__entrada,
    output?.rawMatcherResult?.input,
    output?.rawMatcherResult?.perfilInput,
    output?.rawMatcherResult?.__entrada
  );
}

function toStringValue(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function boolToSiNo(value, fallback = "no") {
  if (value === true) return "sí";
  if (value === false) return "no";
  if (value === "sí" || value === "si") return "sí";
  if (value === "no") return "no";
  return fallback;
}

function normalizeInputForForm(input = {}) {
  const afiliadoIess =
    typeof input?.afiliadoIess === "boolean"
      ? input.afiliadoIess
      : input?.afiliadoIESS === "sí" ||
        input?.afiliadoIESS === "si" ||
        input?.afiliadoIess === "sí" ||
        input?.afiliadoIess === "si";

  const primeraVivienda =
    typeof input?.primeraVivienda === "boolean"
      ? input.primeraVivienda
      : input?.primeraVivienda === "sí" ||
        input?.primeraVivienda === "si" ||
        input?.primeraVivienda === true;

  const tieneVivienda =
    typeof input?.tieneVivienda === "boolean"
      ? input.tieneVivienda
      : input?.tieneVivienda === "sí" ||
        input?.tieneVivienda === "si" ||
        input?.tieneVivienda === true;

  const tipoVivienda =
    input?.tipoVivienda ||
    (input?.viviendaEstrenar === true
      ? "por_estrenar"
      : input?.viviendaEstrenar === false
      ? "usada"
      : "por_estrenar");

  return {
    nacionalidad: input?.nacionalidad || "ecuatoriana",
    estadoCivil: input?.estadoCivil || "soltero",
    edad: Number(input?.edad) || 30,

    tipoIngreso: input?.tipoIngreso || "Dependiente",
    tipoContrato: input?.tipoContrato || "indefinido",
    aniosEstabilidad: Number(input?.aniosEstabilidad) || 0,
    mesesActividad: Number(input?.mesesActividad) || 0,
    sustentoIndependiente: input?.sustentoIndependiente || "facturacion_ruc",

    ingresoNetoMensual:
      Number(input?.ingresoNetoMensual ?? input?.ingreso) || 0,
    ingresoPareja: Number(input?.ingresoPareja) || 0,
    otrasDeudasMensuales:
      Number(input?.otrasDeudasMensuales ?? input?.deudas) || 0,

    afiliadoIess,
    iessAportesTotales:
      Number(input?.iessAportesTotales ?? input?.aportesTotales) || 0,
    iessAportesConsecutivos:
      Number(input?.iessAportesConsecutivos ?? input?.aportesConsecutivos) ||
      0,

    ciudadCompra: input?.ciudadCompra || "",
    objetivoViviendaModo: input?.objetivoViviendaModo || "aun_no",
    valorVivienda:
      input?.valorVivienda === null || input?.valorVivienda === undefined
        ? null
        : Number(input?.valorVivienda) || null,
    entradaDisponible:
      Number(input?.entradaDisponible ?? input?.entrada) || 0,
    capacidadEntradaMensual: Number(input?.capacidadEntradaMensual) || 0,

    tieneVivienda,
    primeraVivienda,
    viviendaEstrenar:
      typeof input?.viviendaEstrenar === "boolean"
        ? input.viviendaEstrenar
        : tipoVivienda === "por_estrenar",
    tipoVivienda,

    tiempoCompra: input?.tiempoCompra || input?.horizonteCompra || null,
    horizonteCompra: input?.horizonteCompra || input?.tiempoCompra || null,
    preferenciaPagoHipoteca:
      input?.preferenciaPagoHipoteca || "no_estoy_seguro",

    creditHistoryStatus: input?.creditHistoryStatus || "unknown",
    hasActiveDelinquency: input?.hasActiveDelinquency || "unknown",
    delinquencyRange: input?.delinquencyRange || "none",
    recentCreditDenied: input?.recentCreditDenied || "unknown",
    declaredCreditScore:
      input?.declaredCreditScore === null ||
      input?.declaredCreditScore === undefined ||
      input?.declaredCreditScore === ""
        ? null
        : Number(input?.declaredCreditScore) || null,

    origen: input?.origen || "journey_mobile_hydrated",
  };
}

function buildJourneyFormFromInput(input = {}) {
  const normalized = normalizeInputForForm(input);

  return {
    nacionalidad: normalized.nacionalidad,
    estadoCivil: normalized.estadoCivil,
    edad: toStringValue(normalized.edad, "30"),

    tipoIngreso: normalized.tipoIngreso,
    tipoContrato: normalized.tipoContrato,
    aniosEstabilidad: toStringValue(normalized.aniosEstabilidad, "2"),
    mesesActividad: toStringValue(normalized.mesesActividad, "24"),
    sustentoIndependiente: normalized.sustentoIndependiente,

    ingreso: toStringValue(normalized.ingresoNetoMensual, "1200"),
    ingresoPareja: toStringValue(normalized.ingresoPareja, "0"),
    deudas: toStringValue(normalized.otrasDeudasMensuales, "300"),

    afiliadoIESS: boolToSiNo(normalized.afiliadoIess, "no"),
    aportesTotales: toStringValue(normalized.iessAportesTotales, "0"),
    aportesConsecutivos: toStringValue(
      normalized.iessAportesConsecutivos,
      "0"
    ),

    ciudadCompra: normalized.ciudadCompra,
    objetivoViviendaModo: normalized.objetivoViviendaModo,
    valorVivienda: toStringValue(normalized.valorVivienda, ""),
    entrada: toStringValue(normalized.entradaDisponible, "15000"),
    capacidadEntradaMensual: toStringValue(
      normalized.capacidadEntradaMensual,
      "300"
    ),

    tieneVivienda: boolToSiNo(normalized.tieneVivienda, "no"),
    primeraVivienda: boolToSiNo(normalized.primeraVivienda, "sí"),
    tipoVivienda: normalized.tipoVivienda,

    horizonteCompra: normalized.horizonteCompra || "",
    preferenciaPagoHipoteca: normalized.preferenciaPagoHipoteca,

    creditHistoryStatus: normalized.creditHistoryStatus,
    hasActiveDelinquency: normalized.hasActiveDelinquency,
    delinquencyRange: normalized.delinquencyRange,
    recentCreditDenied: normalized.recentCreditDenied,
    declaredCreditScore: toStringValue(normalized.declaredCreditScore, ""),
  };
}

function buildCompatibleSnapshot(output = {}, input = {}) {
  const now = new Date().toISOString();

  const nested = output?.output || {};
  const legacy = output?.legacy || {};
  const raw = output?.rawMatcherResult || nested?.rawMatcherResult || {};

  const rankedMortgages = firstArray(
    output?.rankedMortgages,
    nested?.rankedMortgages,
    legacy?.rankedMortgages,
    raw?.rankedMortgages
  );

  const fallbackMortgage = rankedMortgages?.[0] || null;

  const bestOption = firstObject(
    output?.bestOption,
    nested?.bestOption,
    legacy?.bestOption,
    raw?.bestOption
  );

  const bestMortgage = firstObject(
    output?.bestMortgage,
    nested?.bestMortgage,
    legacy?.bestMortgage,
    raw?.bestMortgage,
    bestOption?.mortgage,
    fallbackMortgage
  );

  const bancosTop3 = firstArray(
    output?.bancosTop3,
    nested?.bancosTop3,
    legacy?.bancosTop3,
    raw?.bancosTop3
  );

  const matchedProperties = firstArray(
    output?.matchedProperties,
    nested?.matchedProperties,
    legacy?.matchedProperties,
    raw?.matchedProperties
  );

  const scenarios = firstArray(
    output?.scenarios,
    nested?.scenarios,
    legacy?.scenarios,
    raw?.scenarios
  );

  const housingAlternatives = firstObject(
    output?.housingAlternatives,
    nested?.housingAlternatives,
    legacy?.housingAlternatives,
    raw?.housingAlternatives
  );

  const primaryHousingAlternative = firstObject(
    output?.primaryHousingAlternative,
    nested?.primaryHousingAlternative,
    legacy?.primaryHousingAlternative,
    raw?.primaryHousingAlternative,
    housingAlternatives?.primaryHousingAlternative
  );

  const secondaryHousingAlternative = firstObject(
    output?.secondaryHousingAlternative,
    nested?.secondaryHousingAlternative,
    legacy?.secondaryHousingAlternative,
    raw?.secondaryHousingAlternative,
    housingAlternatives?.secondaryHousingAlternative
  );

  const cuota = firstNumber(
    output?.cuotaEstimada,
    output?.cuotaMensual,
    output?.estimatedQuota,
    nested?.cuotaEstimada,
    nested?.cuotaMensual,
    legacy?.cuotaEstimada,
    legacy?.cuotaMensual,
    raw?.cuotaEstimada,
    raw?.cuotaMensual,
    bestMortgage?.cuota,
    bestOption?.cuota,
    bestOption?.mortgage?.cuota
  );

  const precioMaxVivienda = firstNumber(
    output?.precioMaxVivienda,
    output?.maxCompra,
    output?.montoMaximo,
    output?.estimatedMaxPurchase,
    nested?.precioMaxVivienda,
    nested?.maxCompra,
    nested?.montoMaximo,
    legacy?.precioMaxVivienda,
    legacy?.maxCompra,
    legacy?.montoMaximo,
    raw?.precioMaxVivienda,
    raw?.maxCompra,
    raw?.montoMaximo,
    bestMortgage?.precioMaxVivienda,
    bestOption?.mortgage?.precioMaxVivienda,
    primaryHousingAlternative?.precioMaxVivienda,
    primaryHousingAlternative?.maxCompra
  );

  const montoPrestamo = firstNumber(
    output?.montoPrestamo,
    output?.montoMaximoCredito,
    nested?.montoPrestamo,
    legacy?.montoPrestamo,
    raw?.montoPrestamo,
    bestMortgage?.montoPrestamo,
    bestOption?.mortgage?.montoPrestamo
  );

  const tasaAnual = firstNumber(
    output?.tasaAnual,
    output?.annualRate,
    nested?.tasaAnual,
    nested?.annualRate,
    legacy?.tasaAnual,
    raw?.tasaAnual,
    raw?.annualRate,
    bestMortgage?.annualRate,
    bestOption?.mortgage?.annualRate
  );

  const plazoMeses = firstNumber(
    output?.plazoMeses,
    output?.termMonths,
    nested?.plazoMeses,
    nested?.termMonths,
    legacy?.plazoMeses,
    raw?.plazoMeses,
    raw?.termMonths,
    bestMortgage?.termMonths,
    bestOption?.mortgage?.termMonths
  );

  const score = firstNumber(
    output?.score,
    output?.scoreHL,
    output?.puntajeHabitaLibre,
    nested?.score,
    nested?.scoreHL,
    legacy?.score,
    raw?.score,
    raw?.scoreHL,
    bestMortgage?.score,
    bestOption?.score
  );

  const probabilidad = firstValue(
    output?.probabilidad,
    output?.probabilityLabel,
    output?.approvalProbabilityLabel,
    nested?.probabilidad,
    nested?.probabilityLabel,
    legacy?.probabilidad,
    raw?.probabilidad,
    raw?.probabilityLabel,
    bestMortgage?.probabilidad,
    bestOption?.probabilidad
  );

  const productoSugerido = firstValue(
    output?.productoSugerido,
    output?.productoElegido,
    nested?.productoSugerido,
    legacy?.productoSugerido,
    raw?.productoSugerido,
    bestMortgage?.segment,
    bestMortgage?.id
  );

  const bancoSugerido = firstValue(
    output?.bancoSugerido,
    nested?.bancoSugerido,
    legacy?.bancoSugerido,
    raw?.bancoSugerido,
    bancosTop3?.[0]?.banco,
    bestMortgage?.label
  );

  const canonicalAliases = {
    ok: true,
    unlocked: true,
    completed: true,
    hasResultado: true,
    hasResult: true,

    engine: output?.engine || nested?.engine || "mortgage_matcher_app",
    snapshotVersion:
      output?.snapshotVersion || nested?.snapshotVersion || "app_v2",
    source: output?.source || "backend_snapshot_hydration",
    hydratedFromBackendAt: now,

    score,
    scoreHL: score,
    puntajeHabitaLibre: score,

    probabilidad,
    probabilityLabel: probabilidad,

    capacidad: cuota
      ? cuota * 3
      : output?.capacidad || legacy?.capacidad || null,
    capacidadPago: cuota
      ? cuota * 3
      : output?.capacidadPago || legacy?.capacidadPago || null,

    cuotaEstimada: cuota,
    cuotaMensual: cuota,
    estimatedQuota: cuota,

    tasaAnual,
    annualRate: tasaAnual,

    plazoMeses,
    termMonths: plazoMeses,

    montoPrestamo,
    montoMaximo: precioMaxVivienda,
    maxCompra: precioMaxVivienda,
    precioMaxVivienda,
    estimatedMaxPurchase: precioMaxVivienda,

    productoSugerido,
    productoElegido: productoSugerido,
    bancoSugerido,

    bancosTop3,
    bancosProbabilidad: bancosTop3,
    mejorBanco: bancosTop3?.[0] || null,

    bestMortgage,
    bestOption,
    fallbackRecommendation: fallbackMortgage,
    tieneAlternativa: Boolean(bestMortgage || fallbackMortgage),
    rankedMortgages,

    scenarios,
    matchedProperties,
    housingAlternatives,
    primaryHousingAlternative,
    secondaryHousingAlternative,

    eligibilityProducts:
      output?.eligibilityProducts ||
      nested?.eligibilityProducts ||
      legacy?.eligibilityProducts ||
      raw?.eligibilityProducts ||
      {},

    propertyRecommendationPolicy:
      output?.propertyRecommendationPolicy ||
      nested?.propertyRecommendationPolicy ||
      legacy?.propertyRecommendationPolicy ||
      raw?.propertyRecommendationPolicy ||
      {},

    recommendationExplanation:
      output?.recommendationExplanation ||
      nested?.recommendationExplanation ||
      legacy?.recommendationExplanation ||
      raw?.recommendationExplanation ||
      null,

    flags: output?.flags || legacy?.flags || raw?.flags || {},

    input: output?.input || input || null,
    perfilInput: output?.perfilInput || input || null,
    __entrada: output?.__entrada || input || null,

    rawMatcherResult: raw && Object.keys(raw).length ? raw : output,
    ts: output?.ts || Date.now(),
  };

  const nestedOutput = {
    ...(nested || {}),
    ...canonicalAliases,
  };

  const legacyOutput = {
    ...(legacy || {}),
    ...canonicalAliases,
  };

  return {
    ...(output || {}),
    ...canonicalAliases,
    output: nestedOutput,
    legacy: legacyOutput,
  };
}

function hasValidInput(input = {}) {
  const normalized = normalizeInputForForm(input);

  const hasIncome = Number(normalized.ingresoNetoMensual) > 0;
  const hasAge = Number(normalized.edad) >= 21;
  const hasCity = Boolean(String(normalized.ciudadCompra || "").trim());

  return hasIncome && hasAge && hasCity;
}

function hasValidOutput(snapshot = {}) {
  const hasResultFlags =
    snapshot?.hasResultado === true ||
    snapshot?.unlocked === true ||
    snapshot?.completed === true ||
    snapshot?.ok === true;

  const hasAnyUsefulFinancialValue =
    Number(snapshot?.precioMaxVivienda) > 0 ||
    Number(snapshot?.maxCompra) > 0 ||
    Number(snapshot?.montoMaximo) > 0 ||
    Number(snapshot?.cuotaEstimada) > 0 ||
    Number(snapshot?.cuotaMensual) > 0 ||
    Number(snapshot?.estimatedQuota) > 0 ||
    Boolean(snapshot?.bestMortgage) ||
    Boolean(snapshot?.bestOption) ||
    Boolean(snapshot?.rankedMortgages?.length) ||
    Boolean(snapshot?.scenarios?.length);

  return hasResultFlags && hasAnyUsefulFinancialValue;
}

function buildCandidateFromRecord(record) {
  const output = extractSnapshotOutput(record);
  const input = extractSnapshotInput(record, output);

  if (!output || typeof output !== "object") return null;
  if (!input || typeof input !== "object") return null;

  const snapshot = buildCompatibleSnapshot(output, input);

  return {
    record,
    input,
    snapshot,
    validInput: hasValidInput(input),
    validOutput: hasValidOutput(snapshot),
  };
}

function pickBestValidSnapshot(records = []) {
  for (const record of records) {
    const candidate = buildCandidateFromRecord(record);

    if (!candidate) continue;
    if (!candidate.validInput) continue;
    if (!candidate.validOutput) continue;

    return candidate;
  }

  return null;
}

function maybeHydrateSelectedProperty(ownerEmail, snapshot) {
  const selected =
    snapshot?.selectedProperty ||
    snapshot?.propiedadSeleccionada ||
    snapshot?.property ||
    snapshot?.propiedad ||
    null;

  if (!selected || typeof selected !== "object") return;

  saveOwnedLS(LS_SELECTED_PROPERTY, ownerEmail, {
    ...selected,
    hydratedFromBackendAt: new Date().toISOString(),
  });
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
 */
export async function saveSnapshot({ input, output }) {
  const token = getToken();
  return apiPost("/api/snapshots", { input, output }, token);
}

/**
 * Rehidrata el último snapshot válido del backend hacia localStorage.
 *
 * Regla importante:
 * - No recalcula.
 * - No inventa valores.
 * - No guarda snapshots reparados.
 * - Si el último snapshot está corrupto, busca uno anterior válido.
 * - Si no encuentra ninguno válido, no crea estado híbrido.
 */
export async function hydrateLatestSnapshotToLocalStorage(
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

  let records = [];

  try {
    const historyResponse = await fetchSnapshotHistory(20);
    records = extractHistoryRecords(historyResponse);
  } catch (historyErr) {
    console.warn(
      "[HL] No se pudo leer historial de snapshots:",
      historyErr?.message || historyErr
    );
  }

  if (!records.length) {
    try {
      const latestResponse = await fetchLatestSnapshot();
      const latestRecord = extractSnapshotRecord(latestResponse);

      if (latestRecord) records = [latestRecord];
    } catch (latestErr) {
      console.warn(
        "[HL] No se pudo leer latest snapshot:",
        latestErr?.message || latestErr
      );
    }
  }

  const best = pickBestValidSnapshot(records);

  if (!best) {
    clearHydratedState();

    const existingJourney = loadOwnedLS(LS_JOURNEY, ownerEmail) || {};

    const safeJourney = {
      ...existingJourney,
      updatedAt: new Date().toISOString(),
      hydratedFromBackendAt: new Date().toISOString(),
      completed: false,
      hasResultado: false,
      unlocked: false,
      hydrationNeedsRecalculate: true,
    };

    saveOwnedLS(LS_JOURNEY, ownerEmail, safeJourney);

    console.warn("[HL] No se encontró snapshot válido para rehidratar.");

    return {
      hydrated: false,
      reason: "no_valid_snapshot_found",
      needsRecalculate: true,
      journey: safeJourney,
    };
  }

  const hydratedSnapshot = best.snapshot;
  const form = buildJourneyFormFromInput(best.input);
  const existingJourney = loadOwnedLS(LS_JOURNEY, ownerEmail) || {};

  const hydratedJourney = {
    ...existingJourney,
    step: 4,
    updatedAt: new Date().toISOString(),
    hydratedFromBackendAt: new Date().toISOString(),
    completed: true,
    hasResultado: true,
    unlocked: true,
    hydrationNeedsRecalculate: false,
    form,
    resultado: hydratedSnapshot,
  };

  saveOwnedLS(LS_SNAPSHOT, ownerEmail, hydratedSnapshot);
  saveOwnedLS(LS_JOURNEY, ownerEmail, hydratedJourney);
  maybeHydrateSelectedProperty(ownerEmail, hydratedSnapshot);

  try {
    window.dispatchEvent(
      new CustomEvent("hl:snapshot-hydrated", {
        detail: {
          ownerEmail,
          hydratedAt: new Date().toISOString(),
        },
      })
    );
  } catch {}

  console.log("[HL] Snapshot válido rehidratado:", {
    precioMaxVivienda: hydratedSnapshot?.precioMaxVivienda,
    maxCompra: hydratedSnapshot?.maxCompra,
    montoMaximo: hydratedSnapshot?.montoMaximo,
    cuotaEstimada: hydratedSnapshot?.cuotaEstimada,
    cuotaMensual: hydratedSnapshot?.cuotaMensual,
    bestMortgage: hydratedSnapshot?.bestMortgage?.id || null,
    rankedMortgages: hydratedSnapshot?.rankedMortgages?.length || 0,
    scenarios: hydratedSnapshot?.scenarios?.length || 0,
    matchedProperties: hydratedSnapshot?.matchedProperties?.length || 0,
  });

  return {
    hydrated: true,
    ownerEmail,
    snapshot: hydratedSnapshot,
    journey: hydratedJourney,
  };
}