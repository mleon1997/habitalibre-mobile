import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Landmark,
  Calculator,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Screen,
  Card,
  Chip,
  PrimaryButton,
  SecondaryButton,
} from "../ui/kit.jsx";
import { moneyUSD } from "../lib/money";
import { getCustomer } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";
const LS_SELECTED_MORTGAGE_ROUTE = "hl_selected_mortgage_route_v1";

function safeParseLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[HL] No se pudo guardar ${key}:`, error?.message || error);
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

  saveJSON(key, {
    ownerEmail,
    data,
  });

  try {
    window.dispatchEvent(new Event("hl:user-app-state-hydrated"));
    window.dispatchEvent(new Event("hl:selected-mortgage-route-updated"));
  } catch {
    // no-op
  }
}

function moneyNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function getPropertyId(property = {}) {
  return (
    property?.id ||
    property?._id ||
    property?.propertyId ||
    property?.slug ||
    null
  );
}

function getPropertyTitle(property = {}, journey = {}) {
  return (
    property?.titulo ||
    property?.nombre ||
    property?.title ||
    property?.name ||
    property?.proyecto ||
    journey?.propiedadNombre ||
    journey?.selectedPropertyName ||
    "Propiedad elegida"
  );
}

function getPropertyPrice(property = {}, journey = {}) {
  return (
    moneyNumber(property?.precio) ??
    moneyNumber(property?.price) ??
    moneyNumber(property?.valor) ??
    moneyNumber(property?.listPrice) ??
    moneyNumber(property?.propertyPrice) ??
    moneyNumber(journey?.propiedadPrecio) ??
    moneyNumber(journey?.selectedPropertyPrice) ??
    null
  );
}

function getAvailableEntry({ snapshot, journey, property }) {
  return (
    moneyNumber(property?.entradaDisponible) ??
    moneyNumber(property?.availableEntry) ??
    moneyNumber(property?.entradaRegistrada) ??
    moneyNumber(property?.entrada) ??
    moneyNumber(property?.downPayment) ??
    moneyNumber(property?.downPaymentAmount) ??
    moneyNumber(property?.selectedMatchPayload?.entradaDisponible) ??
    moneyNumber(property?.match?.entradaDisponible) ??
    moneyNumber(journey?.entradaDisponible) ??
    moneyNumber(journey?.entrada) ??
    moneyNumber(journey?.ahorroDisponible) ??
    moneyNumber(journey?.ahorro) ??
    moneyNumber(journey?.montoEntrada) ??
    moneyNumber(journey?.input?.entradaDisponible) ??
    moneyNumber(journey?.input?.entrada) ??
    moneyNumber(journey?.input?.ahorroDisponible) ??
    moneyNumber(journey?.input?.ahorro) ??
    moneyNumber(journey?.input?.montoEntrada) ??
    moneyNumber(snapshot?.entradaDisponible) ??
    moneyNumber(snapshot?.entrada) ??
    moneyNumber(snapshot?.ahorroDisponible) ??
    moneyNumber(snapshot?.ahorro) ??
    moneyNumber(snapshot?.montoEntrada) ??
    moneyNumber(snapshot?.input?.entradaDisponible) ??
    moneyNumber(snapshot?.input?.entrada) ??
    moneyNumber(snapshot?.input?.ahorroDisponible) ??
    moneyNumber(snapshot?.input?.ahorro) ??
    moneyNumber(snapshot?.input?.montoEntrada) ??
    moneyNumber(snapshot?.perfilInput?.entradaDisponible) ??
    moneyNumber(snapshot?.perfilInput?.entrada) ??
    moneyNumber(snapshot?.perfilInput?.ahorroDisponible) ??
    moneyNumber(snapshot?.perfilInput?.ahorro) ??
    moneyNumber(snapshot?.perfilInput?.montoEntrada) ??
    moneyNumber(snapshot?.__entrada?.entradaDisponible) ??
    moneyNumber(snapshot?.__entrada?.entrada) ??
    moneyNumber(snapshot?.__entrada?.ahorroDisponible) ??
    moneyNumber(snapshot?.__entrada?.ahorro) ??
    moneyNumber(snapshot?.__entrada?.montoEntrada) ??
    moneyNumber(snapshot?.output?.entradaDisponible) ??
    moneyNumber(snapshot?.output?.entrada) ??
    moneyNumber(snapshot?.output?.ahorroDisponible) ??
    moneyNumber(snapshot?.output?.ahorro) ??
    moneyNumber(snapshot?.output?.montoEntrada) ??
    moneyNumber(snapshot?.output?.input?.entradaDisponible) ??
    moneyNumber(snapshot?.output?.input?.entrada) ??
    moneyNumber(snapshot?.output?.input?.ahorroDisponible) ??
    moneyNumber(snapshot?.output?.input?.ahorro) ??
    moneyNumber(snapshot?.output?.input?.montoEntrada) ??
    moneyNumber(snapshot?.output?.perfilInput?.entradaDisponible) ??
    moneyNumber(snapshot?.output?.perfilInput?.entrada) ??
    moneyNumber(snapshot?.output?.perfilInput?.ahorroDisponible) ??
    moneyNumber(snapshot?.output?.perfilInput?.ahorro) ??
    moneyNumber(snapshot?.output?.perfilInput?.montoEntrada) ??
    moneyNumber(snapshot?.inputNormalizado?.entradaDisponible) ??
    moneyNumber(snapshot?.inputNormalizado?.entrada) ??
    moneyNumber(snapshot?.inputNormalizado?.ahorroDisponible) ??
    moneyNumber(snapshot?.output?.inputNormalizado?.entradaDisponible) ??
    moneyNumber(snapshot?.output?.inputNormalizado?.entrada) ??
    moneyNumber(snapshot?.output?.inputNormalizado?.ahorroDisponible) ??
    null
  );
}

function getRequiredEntry(propertyPrice, property = {}) {
  return (
    moneyNumber(property?.entradaRequerida) ??
    moneyNumber(property?.requiredEntry) ??
    moneyNumber(property?.entradaTotal) ??
    moneyNumber(property?.evaluacionEntrada?.entradaRequerida) ??
    (propertyPrice ? Math.round(propertyPrice * 0.1) : null)
  );
}

function collectDeepNumbersByKey(obj, keyMatchers = [], maxDepth = 7) {
  const out = [];

  function walk(value, depth, key = "") {
    if (depth > maxDepth || value == null) return;

    if (typeof value === "number" || typeof value === "string") {
      const n = moneyNumber(value);
      const keyLower = String(key || "").toLowerCase();

      const matchesKey = keyMatchers.some((matcher) => matcher.test(keyLower));

      if (matchesKey && n != null) {
        out.push(n);
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, depth + 1, key));
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => {
        walk(childValue, depth + 1, childKey);
      });
    }
  }

  walk(obj, 0);

  return out;
}

function getRouteObjective({ snapshot, property, fallback, propertyPrice }) {
  const directCandidates = [
    property?.rutaObjetivo,
    property?.capacidadObjetivo,
    property?.capacidadObjetivoCompra,
    property?.selectedMatchPayload?.capacidadObjetivo,
    property?.match?.capacidadObjetivo,

    snapshot?.financialCapacity?.debtReduction?.estimatedMaxPropertyValue,
    snapshot?.output?.financialCapacity?.debtReduction?.estimatedMaxPropertyValue,
    snapshot?.financialCapacity?.debtReduction?.targetPropertyValue,
    snapshot?.output?.financialCapacity?.debtReduction?.targetPropertyValue,

    snapshot?.financialCapacity?.plannedEntry?.estimatedMaxPropertyValue,
    snapshot?.output?.financialCapacity?.plannedEntry?.estimatedMaxPropertyValue,

    snapshot?.homeRecommendation?.safeNumbers?.debtReductionTargetPrice,
    snapshot?.output?.homeRecommendation?.safeNumbers?.debtReductionTargetPrice,
    snapshot?.homeRecommendation?.safeNumbers?.targetPropertyValue,
    snapshot?.output?.homeRecommendation?.safeNumbers?.targetPropertyValue,

    snapshot?.financialCapacity?.estimatedMaxPropertyValueWithDebtReduction,
    snapshot?.output?.financialCapacity?.estimatedMaxPropertyValueWithDebtReduction,

    snapshot?.financialCapacity?.estimatedMaxPropertyValue,
    snapshot?.output?.financialCapacity?.estimatedMaxPropertyValue,

    snapshot?.precioMaxVivienda,
    snapshot?.output?.precioMaxVivienda,
    fallback,
  ]
    .map(moneyNumber)
    .filter((v) => v != null && v > 0);

  const deepCandidates = collectDeepNumbersByKey(snapshot, [
    /debt.*target/,
    /deuda.*objetivo/,
    /target.*property/,
    /objetivo/,
    /preparaci[oó]n/,
    /preparacion/,
    /prepared/,
    /future.*range/,
    /future.*property/,
    /rango.*futuro/,
    /ruta.*prepar/,
    /capacidad.*objetivo/,
    /max.*prepar/,
  ]);

  const allCandidates = [...directCandidates, ...deepCandidates]
    .map(moneyNumber)
    .filter((v) => v != null && v > 0);

  if (!allCandidates.length) return null;

  const upperBound = propertyPrice ? propertyPrice * 1.35 : Infinity;

  const reasonableCandidates = allCandidates.filter((value) => {
    if (!propertyPrice) return true;
    return value <= upperBound;
  });

  if (reasonableCandidates.length) {
    return Math.max(...reasonableCandidates);
  }

  return Math.max(...allCandidates);
}

function rateNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1 ? n : n * 100;
}

function formatRate(value) {
  const rate = rateNumber(value);
  if (rate == null) return "—";
  return `${rate.toFixed(rate % 1 === 0 ? 0 : 2)}%`;
}

function formatTerm(value) {
  const months = Number(value);
  if (!Number.isFinite(months) || months <= 0) return "—";
  if (months >= 24) return `${Math.round(months / 12)} años`;
  return `${months} meses`;
}

function pmtMonthly({ loanAmount, annualRate, termMonths }) {
  const principal = Number(loanAmount);
  const rate = rateNumber(annualRate);
  const months = Number(termMonths);

  if (!Number.isFinite(principal) || principal <= 0) return null;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (!Number.isFinite(months) || months <= 0) return null;

  const monthlyRate = rate / 100 / 12;

  if (monthlyRate <= 0) return Math.round(principal / months);

  const payment =
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  return Number.isFinite(payment) && payment > 0 ? Math.round(payment) : null;
}

function humanProvider(value) {
  const key = String(value || "").trim().toUpperCase();

  const map = {
    PRIVATE_BANK: "Banca privada",
    PRIVATE: "Banca privada",
    BANCA_PRIVADA: "Banca privada",
    BIESS: "BIESS",
  };

  return map[key] || String(value || "").replaceAll("_", " ");
}

function humanProduct(route = {}) {
  const raw =
    firstValue(
      route?.productLabel,
      route?.tipoProducto,
      route?.label,
      route?.name,
      route?.nombre,
      route?.producto,
      route?.productName,
      route?.mortgageId,
      route?.id,
      route?.segment,
      route?.tipo,
      route?.product?.name,
      route?.mortgage?.name
    ) || "Ruta referencial";

  const text = String(raw).toLowerCase();

  if (text.includes("credicasa")) return "BIESS Credicasa";
  if (text.includes("biess")) return "BIESS";
  if (text.includes("vivienda de interés social")) return "VIS";
  if (text.includes("vivienda de interes social")) return "VIS";
  if (text.includes("vivienda de interés público")) return "VIP";
  if (text.includes("vivienda de interes publico")) return "VIP";
  if (text === "vis" || text.includes("_vis")) return "VIS";
  if (text === "vip" || text.includes("_vip")) return "VIP";
  if (
    text.includes("private") ||
    text.includes("privada") ||
    text.includes("banca")
  ) {
    return "Banca privada";
  }

  return String(raw).replaceAll("_", " ");
}

function mortgageSubtitle(route = {}) {
  if (route.producto === "VIS" || route.producto === "VIP") {
    return route.provider ? `Vía ${route.provider}` : "Vía banca privada";
  }

  if (route.producto === "Banca privada") {
    return "Crédito hipotecario tradicional";
  }

  if (route.producto === "BIESS" || route.producto === "BIESS Credicasa") {
    return "Vía BIESS";
  }

  return route.provider || "Ruta referencial";
}

const PROGRAM_PRICE_RANGES_2026 = {
  VIS: {
    min: 0,
    max: 85796,
    label: "Vivienda de Interés Social",
  },
  VIP: {
    min: 85800.82,
    max: 110378,
    label: "Vivienda de Interés Público",
  },
};

function normalizeProductId(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (!text) return null;

  if (
    text === "VIS" ||
    text.includes("VIVIENDA_DE_INTERES_SOCIAL") ||
    text.includes("VIVIENDA_DE_INTERÉS_SOCIAL")
  ) {
    return "VIS";
  }

  if (
    text === "VIP" ||
    text.includes("VIVIENDA_DE_INTERES_PUBLICO") ||
    text.includes("VIVIENDA_DE_INTERÉS_PÚBLICO")
  ) {
    return "VIP";
  }

  if (
    text.includes("BIESS") ||
    text.includes("CREDICASA")
  ) {
    return "BIESS";
  }

  if (
    text.includes("PRIVATE") ||
    text.includes("PRIVADA") ||
    text.includes("BANCA")
  ) {
    return "PRIVATE";
  }

  return null;
}

function getRouteProductId(route = {}) {
  const mortgage = route?.mortgage || route?.product || route;

  return normalizeProductId(
    firstValue(
      route?.productId,
      route?.mortgageId,
      route?.id,
      route?.segment,
      route?.tipo,
      route?.producto,
      route?.productLabel,
      route?.tipoProducto,
      route?.label,
      route?.name,
      route?.productName,
      route?.product?.id,
      route?.product?.name,
      route?.mortgage?.id,
      route?.mortgage?.mortgageId,
      route?.mortgage?.name,
      mortgage?.productId,
      mortgage?.mortgageId,
      mortgage?.id,
      mortgage?.segment,
      mortgage?.name
    )
  );
}

function getPropertyAllowedProductIds(property = {}) {
  const profile = property?.mortgageProfile || {};

  const ids = Array.isArray(profile?.productIds)
    ? profile.productIds
    : Array.isArray(property?.productIds)
    ? property.productIds
    : [];

  const normalized = ids.map(normalizeProductId).filter(Boolean);

  return new Set(normalized);
}

function propertyAllowsProduct(property = {}, productId) {
  if (!productId) return true;

  const profile = property?.mortgageProfile || {};
  const allowed = getPropertyAllowedProductIds(property);

  if (allowed.size > 0) {
    if (!allowed.has(productId)) return false;
  }

  if (productId === "BIESS" && profile?.acceptsBIESS === false) {
    return false;
  }

  if (productId === "PRIVATE" && profile?.acceptsPrivateBank === false) {
    return false;
  }

  return true;
}

function propertyPriceFitsProduct(propertyPrice, productId) {
  const price = moneyNumber(propertyPrice);

  if (!price || !productId) return true;

  const range = PROGRAM_PRICE_RANGES_2026[productId];

  if (!range) return true;

  return price >= range.min && price <= range.max;
}

function boolFromAny(value, fallback = null) {
  if (value === true) return true;
  if (value === false) return false;

  if (value === 1) return true;
  if (value === 0) return false;

  const text = String(value ?? "").trim().toLowerCase();

  if (["true", "si", "sí", "s", "yes", "y", "1"].includes(text)) {
    return true;
  }

  if (["false", "no", "n", "0"].includes(text)) {
    return false;
  }

  return fallback;
}

function getUserFirstHomeStatus({ snapshot = {}, journey = {} }) {
  const directCandidates = [
    journey?.primeraVivienda,
    journey?.esPrimeraVivienda,
    journey?.firstHome,
    journey?.isFirstHome,
    journey?.form?.primeraVivienda,
    journey?.form?.esPrimeraVivienda,
    journey?.form?.firstHome,
    journey?.form?.isFirstHome,
    journey?.input?.primeraVivienda,
    journey?.input?.esPrimeraVivienda,
    journey?.input?.firstHome,
    journey?.input?.isFirstHome,

    snapshot?.primeraVivienda,
    snapshot?.esPrimeraVivienda,
    snapshot?.firstHome,
    snapshot?.isFirstHome,
    snapshot?.input?.primeraVivienda,
    snapshot?.input?.esPrimeraVivienda,
    snapshot?.input?.firstHome,
    snapshot?.input?.isFirstHome,
    snapshot?.perfilInput?.primeraVivienda,
    snapshot?.perfilInput?.esPrimeraVivienda,
    snapshot?.perfilInput?.firstHome,
    snapshot?.perfilInput?.isFirstHome,
    snapshot?.inputNormalizado?.primeraVivienda,
    snapshot?.inputNormalizado?.esPrimeraVivienda,
    snapshot?.inputNormalizado?.firstHome,
    snapshot?.inputNormalizado?.isFirstHome,

    snapshot?.output?.primeraVivienda,
    snapshot?.output?.esPrimeraVivienda,
    snapshot?.output?.firstHome,
    snapshot?.output?.isFirstHome,
    snapshot?.output?.input?.primeraVivienda,
    snapshot?.output?.input?.esPrimeraVivienda,
    snapshot?.output?.input?.firstHome,
    snapshot?.output?.input?.isFirstHome,
    snapshot?.output?.perfilInput?.primeraVivienda,
    snapshot?.output?.perfilInput?.esPrimeraVivienda,
    snapshot?.output?.perfilInput?.firstHome,
    snapshot?.output?.perfilInput?.isFirstHome,
    snapshot?.output?.inputNormalizado?.primeraVivienda,
    snapshot?.output?.inputNormalizado?.esPrimeraVivienda,
    snapshot?.output?.inputNormalizado?.firstHome,
    snapshot?.output?.inputNormalizado?.isFirstHome,
  ];

  for (const value of directCandidates) {
    const parsed = boolFromAny(value, null);
    if (parsed !== null) return parsed;
  }

  const ownershipCandidates = [
    journey?.tieneVivienda,
    journey?.tieneCasa,
    journey?.ownsHome,
    journey?.hasHome,
    journey?.form?.tieneVivienda,
    journey?.form?.tieneCasa,
    journey?.form?.ownsHome,
    journey?.form?.hasHome,
    journey?.input?.tieneVivienda,
    journey?.input?.tieneCasa,
    journey?.input?.ownsHome,
    journey?.input?.hasHome,

    snapshot?.tieneVivienda,
    snapshot?.tieneCasa,
    snapshot?.ownsHome,
    snapshot?.hasHome,
    snapshot?.input?.tieneVivienda,
    snapshot?.input?.tieneCasa,
    snapshot?.input?.ownsHome,
    snapshot?.input?.hasHome,
    snapshot?.perfilInput?.tieneVivienda,
    snapshot?.perfilInput?.tieneCasa,
    snapshot?.perfilInput?.ownsHome,
    snapshot?.perfilInput?.hasHome,
    snapshot?.inputNormalizado?.tieneVivienda,
    snapshot?.inputNormalizado?.tieneCasa,
    snapshot?.inputNormalizado?.ownsHome,
    snapshot?.inputNormalizado?.hasHome,

    snapshot?.output?.tieneVivienda,
    snapshot?.output?.tieneCasa,
    snapshot?.output?.ownsHome,
    snapshot?.output?.hasHome,
    snapshot?.output?.input?.tieneVivienda,
    snapshot?.output?.input?.tieneCasa,
    snapshot?.output?.input?.ownsHome,
    snapshot?.output?.input?.hasHome,
    snapshot?.output?.perfilInput?.tieneVivienda,
    snapshot?.output?.perfilInput?.tieneCasa,
    snapshot?.output?.perfilInput?.ownsHome,
    snapshot?.output?.perfilInput?.hasHome,
    snapshot?.output?.inputNormalizado?.tieneVivienda,
    snapshot?.output?.inputNormalizado?.tieneCasa,
    snapshot?.output?.inputNormalizado?.ownsHome,
    snapshot?.output?.inputNormalizado?.hasHome,
  ];

  for (const value of ownershipCandidates) {
    const parsed = boolFromAny(value, null);
    if (parsed !== null) return !parsed;
  }

  return null;
}

function productRequiresFirstHome(productId) {
  return productId === "VIS" || productId === "VIP";
}

function userFitsProduct({ productId, snapshot, journey }) {
  if (!productId) return true;

  const isFirstHome = getUserFirstHomeStatus({ snapshot, journey });

  if (productRequiresFirstHome(productId) && isFirstHome === false) {
    return false;
  }

  return true;
}

function routeIsBlockedByBackendPolicy(route = {}) {
  const reasons = [
    ...(Array.isArray(route?.reasons) ? route.reasons : []),
    ...(Array.isArray(route?.raw?.reasons) ? route.raw.reasons : []),
  ];

  const reasonText = reasons.join(" ").toLowerCase();

  if (
    reasonText.includes("firsthomeok") ||
    reasonText.includes("first home") ||
    reasonText.includes("primera vivienda")
  ) {
    return true;
  }

  return false;
}

function routeFitsSelectedProperty({
  route,
  property,
  propertyPrice,
  snapshot,
  journey,
}) {
  const productId = route?.productId || normalizeProductId(route?.producto);

  if (routeIsBlockedByBackendPolicy(route)) return false;

  if (!userFitsProduct({ productId, snapshot, journey })) return false;

  if (!propertyAllowsProduct(property, productId)) return false;

  if (!propertyPriceFitsProduct(propertyPrice, productId)) return false;

  return true;
}

function normalizeMortgageRoute(route = {}, loanAmount) {
  if (!route || typeof route !== "object") return null;

  const mortgage = route?.mortgage || route?.product || route;

  const tasaAnual =
    rateNumber(route?.annualRate) ??
    rateNumber(route?.tasaAnual) ??
    rateNumber(route?.rate) ??
    rateNumber(route?.interestRate) ??
    rateNumber(mortgage?.annualRate) ??
    rateNumber(mortgage?.tasaAnual) ??
    rateNumber(mortgage?.rate) ??
    rateNumber(mortgage?.interestRate) ??
    null;

  const plazoMeses =
    moneyNumber(route?.plazoMeses) ??
    moneyNumber(route?.termMonths) ??
    moneyNumber(route?.term) ??
    moneyNumber(mortgage?.plazoMeses) ??
    moneyNumber(mortgage?.termMonths) ??
    moneyNumber(mortgage?.term) ??
    null;

  const producto = humanProduct(route);

const productId = getRouteProductId(route) || normalizeProductId(producto);

  const providerRaw = firstValue(
    route?.providerLabel,
    route?.provider,
    route?.bankName,
    route?.bank,
    route?.banco,
    route?.entidad,
    route?.nombreBanco,
    route?.channel,
    mortgage?.provider,
    mortgage?.channel
  );

  const provider = providerRaw ? humanProvider(providerRaw) : null;

  const cuota = pmtMonthly({
    loanAmount,
    annualRate: tasaAnual,
    termMonths: plazoMeses,
  });

  const score =
    moneyNumber(route?.score) ??
    moneyNumber(route?.compatibilityScore) ??
    moneyNumber(route?.probabilidadScore) ??
    null;

  if (!producto || producto === "Ruta referencial") return null;

return {
    productId,
    producto,
    provider,
    tasaAnual,
    plazoMeses,
    loanAmount,
    cuota,
    score,

    viable: route?.viable,
    targetViable: route?.targetViable,
    profileEligible: route?.profileEligible,
    reasons: Array.isArray(route?.reasons) ? route.reasons : [],
    flags: route?.flags || route?.debugFlags || null,

    raw: route,
  };
}

function collectMortgageRoutes({
  snapshot,
  journey,
  selectedMortgageRoute,
  property,
  propertyPrice,
  loanAmount,
}) {
  const candidates = [];

  const pushOne = (item) => {
    if (item && typeof item === "object") candidates.push(item);
  };

  const pushArray = (arr) => {
    if (Array.isArray(arr)) arr.forEach(pushOne);
  };

  pushOne(selectedMortgageRoute);

  pushOne(property?.evaluacionHipotecaFutura?.mortgageSelected);
  pushOne(property?.evaluacionHipotecaHoy?.mortgageSelected);
  pushOne(property?.evaluacionHipoteca?.mortgageSelected);

  pushOne(snapshot?.bestMortgage);
  pushOne(snapshot?.output?.bestMortgage);
  pushOne(snapshot?.rawMatcherResult?.bestMortgage);

  pushArray(snapshot?.rankedMortgages);
  pushArray(snapshot?.output?.rankedMortgages);
  pushArray(snapshot?.rawMatcherResult?.rankedMortgages);

  pushArray(snapshot?.bancosTop3);
  pushArray(snapshot?.output?.bancosTop3);
  pushArray(snapshot?.rawMatcherResult?.bancosTop3);

  const normalized = candidates
    .map((route) => normalizeMortgageRoute(route, loanAmount))
    .filter(Boolean)
    .filter((route) => route.tasaAnual != null && route.plazoMeses != null)
    .filter((route) =>
      routeFitsSelectedProperty({
        route,
        property,
        propertyPrice,
        snapshot,
        journey,
      })
    );

  const seen = new Set();

  return normalized
    .filter((route) => {
      const key = [
        route.productId || "",
        route.producto,
        route.provider || "",
        route.tasaAnual,
        route.plazoMeses,
      ].join("|");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rateA = Number(a.tasaAnual ?? Infinity);
      const rateB = Number(b.tasaAnual ?? Infinity);
      if (rateA !== rateB) return rateA - rateB;

      const cuotaA = Number(a.cuota ?? Infinity);
      const cuotaB = Number(b.cuota ?? Infinity);
      if (cuotaA !== cuotaB) return cuotaA - cuotaB;

      const termA = Number(a.plazoMeses ?? 0);
      const termB = Number(b.plazoMeses ?? 0);
      return termB - termA;
    })
    .slice(0, 3);
}

function routeKey(route, index = 0) {
  return [
    route?.producto || "producto",
    route?.provider || "provider",
    route?.tasaAnual || "rate",
    route?.plazoMeses || "term",
    index,
  ].join("|");
}

function StatBox({ label, value, accent = false }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: accent ? "rgba(37,211,166,0.10)" : "rgba(15,23,42,0.48)",
        border: accent
          ? "1px solid rgba(37,211,166,0.22)"
          : "1px solid rgba(148,163,184,0.16)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "rgba(148,163,184,0.95)",
          fontWeight: 900,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 20,
          color: "rgba(226,232,240,0.98)",
          fontWeight: 980,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FinancialDisclaimer() {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 14px",
        borderRadius: 16,
        border: "1px solid rgba(245,158,11,0.22)",
        background: "rgba(245,158,11,0.08)",
        color: "rgba(254,243,199,0.96)",
        fontSize: 11.5,
        lineHeight: 1.42,
      }}
    >
      <strong>Estimación referencial.</strong> HabitaLibre no otorga ni aprueba
      créditos. La aprobación, tasa, plazo, cuota y condiciones finales dependen
      exclusivamente de cada entidad financiera.
    </div>
  );
}

function RouteOptionCard({
  route,
  index,
  selected,
  onSelect,
  totalRoutes = 0,
}) {
  const headingLabel =
    totalRoutes <= 1
      ? "Ruta referencial disponible"
      : index === 0
      ? "Menor tasa referencial"
      : `Alternativa ${index + 1}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 15,
        borderRadius: 20,
        background: selected
          ? "rgba(37,211,166,0.12)"
          : index === 0
          ? "rgba(37,211,166,0.08)"
          : "rgba(255,255,255,0.045)",
        border: selected
          ? "1px solid rgba(37,211,166,0.42)"
          : index === 0
          ? "1px solid rgba(37,211,166,0.24)"
          : "1px solid rgba(148,163,184,0.15)",
        color: "white",
        cursor: "pointer",
        boxShadow: selected ? "0 14px 30px rgba(37,211,166,0.08)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              color: "rgba(148,163,184,0.94)",
              fontWeight: 900,
            }}
          >
{headingLabel}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              lineHeight: 1.14,
              color: "rgba(226,232,240,0.98)",
              fontWeight: 980,
            }}
          >
            {route.producto}
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: "rgba(148,163,184,0.9)",
            }}
          >
            {mortgageSubtitle(route)}
          </div>
        </div>

        <Chip tone={selected ? "good" : index === 0 ? "good" : "neutral"}>
          {selected ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={13} />
              Elegida
            </span>
          ) : index === 0 ? (
            "Top 1"
          ) : (
            "Ref."
          )}
        </Chip>
      </div>

      <div
        style={{
          marginTop: 13,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <StatBox label="Tasa ref." value={formatRate(route.tasaAnual)} />
        <StatBox label="Plazo" value={formatTerm(route.plazoMeses)} />
        <StatBox
          label="Cuota ref."
          value={route.cuota ? `${moneyUSD(route.cuota)}/mes` : "Por definir"}
          accent={selected}
        />
        <StatBox
          label="Monto financiado"
          value={route.loanAmount ? moneyUSD(route.loanAmount) : "—"}
        />
      </div>
    </button>
  );
}

export default function FinanciamientoPropiedad() {
  const nav = useNavigate();

  const snapshot = useMemo(() => loadOwnedData(LS_SNAPSHOT) || {}, []);
  const journey = useMemo(() => loadOwnedData(LS_JOURNEY) || {}, []);
  const selectedProperty = useMemo(
    () => loadOwnedData(LS_SELECTED_PROPERTY) || {},
    []
  );
  const storedSelectedMortgageRoute = useMemo(
    () => loadOwnedData(LS_SELECTED_MORTGAGE_ROUTE) || null,
    []
  );

  const propertyId = getPropertyId(selectedProperty);
  const propertyName = getPropertyTitle(selectedProperty, journey);
  const propertyPrice = getPropertyPrice(selectedProperty, journey);

  const entryAvailable = getAvailableEntry({
    snapshot,
    journey,
    property: selectedProperty,
  });

  const entryRequired = getRequiredEntry(propertyPrice, selectedProperty);

  const loanAmount =
    propertyPrice != null && entryAvailable != null
      ? Math.max(0, propertyPrice - entryAvailable)
      : null;

  const routeObjective = getRouteObjective({
    snapshot,
    property: selectedProperty,
    fallback: null,
    propertyPrice,
  });

  const routeGap =
    propertyPrice != null && routeObjective != null
      ? Math.max(0, propertyPrice - routeObjective)
      : null;

const isCloseToRoute =
  routeGap != null &&
  routeObjective != null &&
  routeGap > 0 &&
  (routeGap <= 5000 || routeGap / routeObjective <= 0.12);


  const routes = collectMortgageRoutes({
    snapshot,
    journey,
    selectedMortgageRoute: storedSelectedMortgageRoute,
    property: selectedProperty,
    propertyPrice,
    loanAmount,
  });

  const initialSelectedKey = useMemo(() => {
    if (!routes.length) return null;

    const storedProducto = storedSelectedMortgageRoute?.producto;
    const storedRate = storedSelectedMortgageRoute?.tasaAnual;
    const storedTerm = storedSelectedMortgageRoute?.plazoMeses;

    const foundIndex = routes.findIndex((route) => {
      return (
        route.producto === storedProducto &&
        Number(route.tasaAnual) === Number(storedRate) &&
        Number(route.plazoMeses) === Number(storedTerm)
      );
    });

    if (foundIndex >= 0) {
      return routeKey(routes[foundIndex], foundIndex);
    }

    return routeKey(routes[0], 0);
  }, [routes, storedSelectedMortgageRoute]);

  const [selectedRouteKey, setSelectedRouteKey] = useState(initialSelectedKey);
const [saved, setSaved] = useState(() => {
  if (storedSelectedMortgageRoute?.status !== "selected") return false;

  const storedPropertyId = storedSelectedMortgageRoute?.propertyId;
  const sameProperty =
    !storedPropertyId || !propertyId
      ? false
      : String(storedPropertyId) === String(propertyId);

  return sameProperty;
});

  const selectedRoute =
    routes.find((route, index) => routeKey(route, index) === selectedRouteKey) ||
    routes[0] ||
    null;

  const hasSelectedProperty = Boolean(propertyId || propertyPrice || propertyName);

  function handleSaveSelectedRoute() {
    if (!selectedRoute) return;

    const payload = {
      status: "selected",
      source: "financiamiento_propiedad",
      selectedAt: new Date().toISOString(),

      propertyId,
      propertyName,
      propertyPrice,
      entryAvailable,
      entryRequired,
      loanAmount,
      routeObjective,
      routeGap,

      producto: selectedRoute.producto,
      provider: selectedRoute.provider,
      subtitle: mortgageSubtitle(selectedRoute),
      tasaAnual: selectedRoute.tasaAnual,
      plazoMeses: selectedRoute.plazoMeses,
      cuota: selectedRoute.cuota,
      montoPrestamo: selectedRoute.loanAmount,
      score: selectedRoute.score ?? null,

      raw: selectedRoute.raw,
    };

    saveOwnedData(LS_SELECTED_MORTGAGE_ROUTE, payload);
    setSaved(true);
  }

  if (!hasSelectedProperty) {
    return (
      <Screen>
        <div style={{ padding: "24px 18px 150px" }}>
          <button
            type="button"
            onClick={() => nav(-1)}
            style={{
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(15,23,42,0.72)",
              color: "white",
              borderRadius: 999,
              width: 46,
              height: 46,
              display: "grid",
              placeItems: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <Card style={{ marginTop: 18, padding: 18 }}>
            <Chip tone="neutral">Pendiente</Chip>
            <h1
              style={{
                margin: "14px 0 0",
                fontSize: 30,
                lineHeight: 1.05,
                fontWeight: 980,
              }}
            >
              Elige una propiedad primero
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                color: "rgba(203,213,225,0.92)",
                fontSize: 15,
                lineHeight: 1.45,
              }}
            >
              El financiamiento depende de tu perfil y del inmueble específico
              que quieras evaluar.
            </p>

            <div style={{ marginTop: 18 }}>
              <PrimaryButton onClick={() => nav("/marketplace")}>
                Explorar propiedades
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ padding: "24px 18px 170px" }}>
        <button
          type="button"
          onClick={() => nav(-1)}
          style={{
            border: "1px solid rgba(148,163,184,0.18)",
            background: "rgba(15,23,42,0.72)",
            color: "white",
            borderRadius: 999,
            width: 46,
            height: 46,
            display: "grid",
            placeItems: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: "rgba(148,163,184,0.95)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Landmark size={15} />
            Financiamiento
          </div>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: 34,
              lineHeight: 1.02,
              letterSpacing: -1,
              fontWeight: 980,
              color: "rgba(226,232,240,0.98)",
            }}
          >
            Financiamiento de esta propiedad
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 16,
              lineHeight: 1.42,
              color: "rgba(203,213,225,0.92)",
            }}
          >
            Esta lectura combina tu perfil declarado, tu entrada disponible y
            la propiedad que elegiste.
          </p>
        </div>

        <Card
          style={{
            marginTop: 20,
            padding: 18,
            background:
              "linear-gradient(180deg, rgba(37,211,166,0.10), rgba(255,255,255,0.045))",
            border: "1px solid rgba(37,211,166,0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(148,163,184,0.95)",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Building2 size={14} />
                Propiedad elegida
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 23,
                  lineHeight: 1.12,
                  color: "rgba(226,232,240,0.98)",
                  fontWeight: 980,
                }}
              >
                {propertyName}
              </div>
            </div>

            <Chip tone={routeGap > 0 ? "neutral" : "good"}>
              {routeGap > 0 ? "Requiere preparación" : "Alineada"}
            </Chip>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <StatBox
              label="Precio propiedad"
              value={propertyPrice ? moneyUSD(propertyPrice) : "—"}
            />
            <StatBox
              label="Entrada disponible"
              value={entryAvailable ? moneyUSD(entryAvailable) : "Por revisar"}
              accent={Boolean(entryAvailable)}
            />
            <StatBox
              label="Entrada requerida"
              value={entryRequired ? moneyUSD(entryRequired) : "—"}
            />
            <StatBox
              label="Monto a financiar"
              value={loanAmount ? moneyUSD(loanAmount) : "Por calcular"}
              accent={Boolean(loanAmount)}
            />
          </div>

          {routeObjective ? (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 18,
 background:
  routeGap > 0
    ? isCloseToRoute
      ? "rgba(245,158,11,0.08)"
      : "rgba(248,113,113,0.08)"
    : "rgba(34,197,94,0.08)",
border:
  routeGap > 0
    ? isCloseToRoute
      ? "1px solid rgba(245,158,11,0.22)"
      : "1px solid rgba(248,113,113,0.22)"
    : "1px solid rgba(34,197,94,0.20)",
                color: "rgba(226,232,240,0.96)",
                fontSize: 13.5,
                lineHeight: 1.42,
              }}
            >
        {routeGap > 0 ? (
  <>
    Tu ruta objetivo aproximada es{" "}
    <strong>{moneyUSD(routeObjective)}</strong>.{" "}
    {isCloseToRoute ? (
      <>
        Esta propiedad está cerca, pero todavía queda una diferencia
        referencial de <strong>{moneyUSD(routeGap)}</strong>.
      </>
    ) : (
      <>
        Esta propiedad está por encima de tu ruta objetivo. La diferencia
        referencial es de <strong>{moneyUSD(routeGap)}</strong>. Para
        acercarte, podrías necesitar mayor entrada, reducir deudas o comparar
        una propiedad de menor precio.
      </>
    )}
  </>
) : (
  <>
    Esta propiedad se ve alineada de forma referencial con tu ruta
    objetivo de <strong>{moneyUSD(routeObjective)}</strong>.
  </>
)}
            </div>
          ) : null}

          <FinancialDisclaimer />
        </Card>

        <Card style={{ marginTop: 18, padding: 18 }}>
          <div
            style={{
              fontSize: 13,
              color: "rgba(148,163,184,0.95)",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calculator size={15} />
            Rutas referenciales
          </div>

          <h2
            style={{
              margin: "8px 0 0",
              fontSize: 22,
              lineHeight: 1.14,
              fontWeight: 980,
            }}
          >
            Elige una ruta para continuar
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13.5,
              lineHeight: 1.42,
              color: "rgba(203,213,225,0.9)",
            }}
          >
            Comparamos rutas usando el monto que necesitarías financiar para
            esta propiedad. La selección sirve como referencia para tu camino.
          </p>

          {!loanAmount ? (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 18,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.22)",
                color: "rgba(254,243,199,0.96)",
                fontSize: 13,
                lineHeight: 1.42,
                display: "flex",
                gap: 10,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                No pudimos detectar tu entrada disponible. Actualiza tu
                información para calcular el monto a financiar y la cuota
                referencial de esta propiedad.
              </div>
            </div>
          ) : routes.length ? (
            <>
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {routes.map((route, index) => {
                  const key = routeKey(route, index);
                  const selected = key === selectedRouteKey;

                  return (
                    <RouteOptionCard
  key={key}
  route={route}
  index={index}
  totalRoutes={routes.length}
  selected={selected}
  onSelect={() => {
    setSelectedRouteKey(key);
    setSaved(false);
  }}
/>
                  );
                })}
              </div>

            <div
  style={{
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    background: "rgba(15,23,42,0.42)",
    border: "1px solid rgba(148,163,184,0.14)",
    color: "rgba(203,213,225,0.92)",
    fontSize: 12.5,
    lineHeight: 1.4,
  }}
>
  {routes.some((route) => route.producto === "VIS" || route.producto === "VIP") ? (
    <>
      VIS y VIP son rutas preferenciales que normalmente se canalizan a través
      de entidades financieras participantes. La categoría aplicable depende del
      valor de la vivienda, si es primera vivienda y de las condiciones vigentes.
    </>
  ) : (
    <>
      Según la información declarada, esta propiedad se muestra con una ruta
      hipotecaria tradicional. Las condiciones finales dependen de cada entidad
      financiera.
    </>
  )}
</div>

              <div style={{ marginTop: 14 }}>
                <PrimaryButton onClick={handleSaveSelectedRoute}>
                  {saved
                    ? "Ruta referencial guardada"
                    : "Guardar esta ruta referencial"}
                </PrimaryButton>
              </div>
            </>
          ) : (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 18,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.22)",
                color: "rgba(254,243,199,0.96)",
                fontSize: 13,
                lineHeight: 1.42,
              }}
            >
              Todavía no tenemos suficientes rutas hipotecarias referenciales
              para esta propiedad. Puedes comparar otra unidad o actualizar tu
              información.
            </div>
          )}

          <FinancialDisclaimer />
        </Card>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <PrimaryButton
            onClick={() =>
              nav(propertyId ? `/property/${propertyId}` : "/marketplace")
            }
          >
            Ver detalle de la propiedad
          </PrimaryButton>

          <SecondaryButton onClick={() => nav("/marketplace")}>
            Comparar otras propiedades
          </SecondaryButton>

          <SecondaryButton onClick={() => nav("/ruta")}>
            Ver mi camino completo
          </SecondaryButton>
        </div>
      </div>
    </Screen>
  );
}