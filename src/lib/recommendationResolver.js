// src/lib/recommendationResolver.js

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isPositive(v) {
  const n = toNum(v);
  return Number.isFinite(n) && n > 0;
}

function isNonNegative(v) {
  const n = toNum(v);
  return Number.isFinite(n) && n >= 0;
}

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function text(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function get(obj, path, fallback = null) {
  try {
    const parts = String(path).split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return fallback;
      cur = cur[p];
    }
    return cur ?? fallback;
  } catch {
    return fallback;
  }
}

function pick(obj, paths, fallback = null) {
  for (const p of paths) {
    const v = get(obj, p, undefined);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function normalizeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getMatchedProperties(snapshot) {
  const arr = normalizeArray(
    firstDefined(
      snapshot?.matchedProperties,
      snapshot?.output?.matchedProperties,
      snapshot?.propertyMatches,
      snapshot?.output?.propertyMatches,
      []
    )
  );

  return arr.filter(Boolean);
}

function getHousingAlternatives(snapshot) {
  const housingAlternatives =
    snapshot?.housingAlternatives ||
    snapshot?.output?.housingAlternatives ||
    {};

  const primaryHousingAlternative =
    snapshot?.primaryHousingAlternative ||
    snapshot?.output?.primaryHousingAlternative ||
    housingAlternatives?.primaryHousingAlternative ||
    null;

  const secondaryHousingAlternative =
    snapshot?.secondaryHousingAlternative ||
    snapshot?.output?.secondaryHousingAlternative ||
    housingAlternatives?.secondaryHousingAlternative ||
    null;

  return {
    housingAlternatives,
    primaryHousingAlternative,
    secondaryHousingAlternative,
  };
}

function getBestMortgage(snapshot) {
  return (
    snapshot?.bestMortgage ||
    snapshot?.output?.bestMortgage ||
    snapshot?.bestOption ||
    snapshot?.output?.bestOption ||
    null
  );
}

function getTopBanks(snapshot) {
  return normalizeArray(
    firstDefined(
      snapshot?.bancosTop3,
      snapshot?.output?.bancosTop3,
      snapshot?.topBanks,
      snapshot?.output?.topBanks,
      []
    )
  );
}

function getSelectedProperty(snapshot) {
  return (
    snapshot?.selectedProperty ||
    snapshot?.output?.selectedProperty ||
    null
  );
}

function getUserGoalValue(snapshot) {
  return firstDefined(
    toNum(snapshot?.valorObjetivo),
    toNum(snapshot?.goalValue),
    toNum(snapshot?.metaHabitacional),
    toNum(snapshot?.desiredPropertyValue),
    toNum(snapshot?.payload?.valorObjetivo),
    toNum(snapshot?.input?.valorObjetivo),
    toNum(snapshot?.form?.valorObjetivo),
    toNum(snapshot?.journey?.valorObjetivo),
    toNum(snapshot?.selectedProperty?.price),
    toNum(snapshot?.selectedProperty?.valor),
    toNum(snapshot?.selectedProperty?.precio),
    null
  );
}

function getCity(snapshot) {
  return firstDefined(
    snapshot?.ciudad,
    snapshot?.payload?.ciudad,
    snapshot?.input?.ciudad,
    snapshot?.form?.ciudad,
    snapshot?.journey?.ciudad,
    ""
  );
}

function getImmediateCapacity(bestMortgage) {
  if (!bestMortgage) return null;

  const priceMax = firstDefined(
    toNum(bestMortgage?.maxPropertyValue),
    toNum(bestMortgage?.propertyValueMax),
    toNum(bestMortgage?.precioMaximoVivienda),
    toNum(bestMortgage?.maxHomePrice),
    toNum(bestMortgage?.precioMaximo),
    null
  );

  const loanAmount = firstDefined(
    toNum(bestMortgage?.loanAmount),
    toNum(bestMortgage?.montoPrestamo),
    toNum(bestMortgage?.maxLoanAmount),
    toNum(bestMortgage?.creditoMaximo),
    null
  );

  const monthlyPayment = firstDefined(
    toNum(bestMortgage?.monthlyPayment),
    toNum(bestMortgage?.estimatedMonthlyPayment),
    toNum(bestMortgage?.cuotaMensual),
    toNum(bestMortgage?.payment),
    null
  );

  const bankName = firstDefined(
    bestMortgage?.bankName,
    bestMortgage?.bank,
    bestMortgage?.entidad,
    bestMortgage?.nombreBanco,
    ""
  );

  const productName = firstDefined(
    bestMortgage?.productName,
    bestMortgage?.product,
    bestMortgage?.producto,
    bestMortgage?.mortgageName,
    ""
  );

  const termMonths = firstDefined(
    toNum(bestMortgage?.termMonths),
    toNum(bestMortgage?.plazoMeses),
    toNum(bestMortgage?.term),
    null
  );

  const rate = firstDefined(
    toNum(bestMortgage?.rate),
    toNum(bestMortgage?.interestRate),
    toNum(bestMortgage?.tasa),
    null
  );

  const valid =
    isPositive(priceMax) &&
    isPositive(loanAmount) &&
    isPositive(monthlyPayment);

  if (!valid) return null;

  return {
    valid: true,
    priceMax,
    loanAmount,
    monthlyPayment,
    bankName,
    productName,
    termMonths,
    rate,
    raw: bestMortgage,
  };
}

function normalizeAlternative(alt, fallbackLabel = "") {
  if (!alt || typeof alt !== "object") return null;

  const type = firstDefined(alt?.type, alt?.kind, "");
  const label = firstDefined(alt?.label, alt?.title, fallbackLabel);

  const projectedTargetValue = firstDefined(
    toNum(alt?.projectedTargetValue),
    toNum(alt?.targetValue),
    toNum(alt?.goalValue),
    toNum(alt?.projectedPropertyValue),
    toNum(alt?.propertyValue),
    toNum(alt?.alternativePrice),
    null
  );

  const projectedMonthlyPayment = firstDefined(
    toNum(alt?.projectedMonthlyPayment),
    toNum(alt?.monthlyPayment),
    toNum(alt?.payment),
    toNum(alt?.cuotaMensual),
    toNum(alt?.cuota),
    null
  );

  const monthsToGoal = firstDefined(
    toNum(alt?.monthsToGoal),
    toNum(alt?.months),
    toNum(alt?.plazoMeses),
    toNum(alt?.timeToGoalMonths),
    toNum(alt?.monthsToViable),
    null
  );

  const bankName = firstDefined(
    alt?.bankName,
    alt?.bank,
    alt?.entidad,
    alt?.provider,
    ""
  );

  const productName = firstDefined(
    alt?.productName,
    alt?.product,
    alt?.producto,
    alt?.label,
    ""
  );

  const reason = firstDefined(
    alt?.reason,
    alt?.message,
    alt?.description,
    alt?.subtitle,
    ""
  );

  const property =
    alt?.property ||
    alt?.matchedProperty ||
    alt?.inventoryProperty ||
    null;

  return {
    type,
    label,
    projectedTargetValue,
    projectedMonthlyPayment,
    monthsToGoal,
    bankName,
    productName,
    reason,
    property,
    raw: alt,
  };
}

function getFutureRoute(snapshot) {
  const { primaryHousingAlternative, secondaryHousingAlternative } =
    getHousingAlternatives(snapshot);

  const primary = normalizeAlternative(
    primaryHousingAlternative,
    "Alternativa principal"
  );
  const secondary = normalizeAlternative(
    secondaryHousingAlternative,
    "Alternativa secundaria"
  );

  const candidates = [primary, secondary].filter(Boolean);

  const routeCandidates = candidates.filter((alt) => {
    const type = String(alt?.type || "").toLowerCase();

    const hasConcreteInventoryProperty =
      type === "inventory_property" && !!alt?.property;

    // Si es inventory_property pero no trae propiedad concreta,
    // no debería ganarle a una ruta goal_preserving.
    if (type === "inventory_property" && !hasConcreteInventoryProperty) {
      return false;
    }

    const hasValidMonths = isPositive(alt?.monthsToGoal);
    const hasValidPayment = isPositive(alt?.projectedMonthlyPayment);
    const hasValidProjectedValue = isPositive(alt?.projectedTargetValue);
    const viableFuture = alt?.raw?.viableFuture === true;

    return viableFuture || hasValidMonths || (hasValidPayment && hasValidProjectedValue);
  });

  if (!routeCandidates.length) return null;

  routeCandidates.sort((a, b) => {
    const aType = String(a?.type || "").toLowerCase();
    const bType = String(b?.type || "").toLowerCase();

    // goal_preserving debe ganarle a inventory_property
    if (aType === "goal_preserving" && bType !== "goal_preserving") return -1;
    if (bType === "goal_preserving" && aType !== "goal_preserving") return 1;

    const aViable = a?.raw?.viableFuture === true ? 1 : 0;
    const bViable = b?.raw?.viableFuture === true ? 1 : 0;
    if (bViable !== aViable) return bViable - aViable;

    const aMonths = toNum(a?.monthsToGoal) ?? 999999;
    const bMonths = toNum(b?.monthsToGoal) ?? 999999;
    if (aMonths !== bMonths) return aMonths - bMonths;

    const aValue = toNum(a?.projectedTargetValue) ?? 0;
    const bValue = toNum(b?.projectedTargetValue) ?? 0;
    return bValue - aValue;
  });

  return routeCandidates[0];
}

function normalizeProperty(p) {
  if (!p || typeof p !== "object") return null;

  const price = firstDefined(
    toNum(p?.price),
    toNum(p?.valor),
    toNum(p?.precio),
    toNum(p?.salePrice),
    null
  );

  const city = firstDefined(p?.city, p?.ciudad, "");
  const sector = firstDefined(p?.sector, p?.location, p?.zona, "");
  const projectName = firstDefined(
    p?.projectName,
    p?.proyecto,
    p?.name,
    p?.title,
    ""
  );
  const id = firstDefined(p?._id, p?.id, null);

  return {
    ...p,
    _normalizedPrice: price,
    _normalizedCity: city,
    _normalizedSector: sector,
    _normalizedProjectName: projectName,
    _normalizedId: id,
  };
}

function distanceRatio(price, goalValue) {
  const p = toNum(price);
  const g = toNum(goalValue);

  if (!isPositive(p) || !isPositive(g)) return 999;
  return Math.abs(p - g) / g;
}

function getInventoryFallback(snapshot) {
  const matchedProperties = getMatchedProperties(snapshot).map(normalizeProperty);
  const { primaryHousingAlternative, secondaryHousingAlternative } =
    getHousingAlternatives(snapshot);

  const goalValue = getUserGoalValue(snapshot);

  const altProps = [
    primaryHousingAlternative?.property,
    secondaryHousingAlternative?.property,
  ]
    .filter(Boolean)
    .map(normalizeProperty);

  const inventoryFromAlt = [primaryHousingAlternative, secondaryHousingAlternative]
    .filter(Boolean)
    .find((alt) => String(alt?.type || "").toLowerCase() === "inventory_property");

  const merged = [...altProps, ...matchedProperties].filter(Boolean);

  if (!merged.length && inventoryFromAlt?.property) {
    return {
      property: normalizeProperty(inventoryFromAlt.property),
      source: "inventory_alternative",
      closeness: null,
      alt: inventoryFromAlt,
    };
  }

  if (!merged.length) return null;

  merged.sort((a, b) => {
    const da = distanceRatio(a?._normalizedPrice, goalValue);
    const db = distanceRatio(b?._normalizedPrice, goalValue);
    return da - db;
  });

  const best = merged[0];
  const closeness = distanceRatio(best?._normalizedPrice, goalValue);

  return {
    property: best,
    source: "matched_properties",
    closeness,
    alt:
      inventoryFromAlt && inventoryFromAlt.property
        ? inventoryFromAlt
        : null,
  };
}

function buildHeadline(type, data) {
  if (type === "immediate") {
    return "Sí tienes una ruta de compra viable hoy";
  }
  if (type === "future_route") {
    return "Tu meta sí podría ser viable con una ruta futura";
  }
  if (type === "inventory_fallback") {
    return "Hoy no vemos una hipoteca ideal, pero sí una alternativa cercana";
  }
  return "Hoy todavía no vemos una ruta clara de compra";
}

function buildSubheadline(type, data) {
  if (type === "immediate") {
    const bank = text(data?.immediate?.bankName);
    const product = text(data?.immediate?.productName);
    return [bank, product].filter(Boolean).join(" · ");
  }

  if (type === "future_route") {
    const months = toNum(data?.futureRoute?.monthsToGoal);
    const pieces = [];

    if (isPositive(months)) {
      pieces.push(`${months} meses`);
    }

    const bank = text(data?.futureRoute?.bankName);
    const product = text(data?.futureRoute?.productName);

    if (bank) pieces.push(bank);
    if (product) pieces.push(product);

    return pieces.join(" · ");
  }

  if (type === "inventory_fallback") {
    const property = data?.inventoryFallback?.property;
    const city = text(property?._normalizedCity);
    const sector = text(property?._normalizedSector);
    return [city, sector].filter(Boolean).join(" · ");
  }

  return "Aún no hay números suficientemente sólidos para recomendar una compra hoy";
}

function computeFitScore({ type, goalValue, immediate, futureRoute, inventoryFallback }) {
  if (type === "immediate") {
    const priceMax = toNum(immediate?.priceMax);
    if (!isPositive(priceMax) || !isPositive(goalValue)) return 82;

    const ratio = Math.abs(priceMax - goalValue) / goalValue;
    const closenessScore = clamp(Math.round(100 - ratio * 120), 78, 99);
    return closenessScore;
  }

  if (type === "future_route") {
    const projected = toNum(futureRoute?.projectedTargetValue);
    const months = toNum(futureRoute?.monthsToGoal);

    let score = 72;

    if (isPositive(goalValue) && isPositive(projected)) {
      const ratio = Math.abs(projected - goalValue) / goalValue;
      score += clamp(Math.round(20 - ratio * 35), 0, 20);
    }

    if (isPositive(months)) {
      score += clamp(Math.round(10 - months / 6), 0, 8);
    }

    return clamp(score, 60, 89);
  }

  if (type === "inventory_fallback") {
    const closeness = toNum(inventoryFallback?.closeness);
    if (!Number.isFinite(closeness)) return 58;

    const score = Math.round(78 - closeness * 55);
    return clamp(score, 45, 79);
  }

  return 35;
}

export function resolveHousingRecommendation(snapshot) {
  const bestMortgage = getBestMortgage(snapshot);
  const immediate = getImmediateCapacity(bestMortgage);
  const futureRoute = getFutureRoute(snapshot);
  const inventoryFallback = getInventoryFallback(snapshot);
  const topBanks = getTopBanks(snapshot);
  const goalValue = getUserGoalValue(snapshot);
  const city = getCity(snapshot);
  const selectedProperty = getSelectedProperty(snapshot);

  let type = "no_clear_route";

  if (immediate) {
    type = "immediate";
  } else if (futureRoute) {
    type = "future_route";
  } else if (inventoryFallback?.property) {
    type = "inventory_fallback";
  }

  const fitScore = computeFitScore({
    type,
    goalValue,
    immediate,
    futureRoute,
    inventoryFallback,
  });

  const headline = buildHeadline(type, {
    immediate,
    futureRoute,
    inventoryFallback,
  });

  const subheadline = buildSubheadline(type, {
    immediate,
    futureRoute,
    inventoryFallback,
  });

  const shouldShowFutureRouteCard =
    type === "future_route" &&
    (
      isPositive(futureRoute?.monthsToGoal) ||
      (
        isPositive(futureRoute?.projectedTargetValue) &&
        isPositive(futureRoute?.projectedMonthlyPayment)
      )
    );

  const shouldShowImmediateCard = type === "immediate";

  const shouldShowInventoryFallbackCard =
    type === "inventory_fallback" && !!inventoryFallback?.property;

  const shouldShowGoalContext =
    type === "future_route" ||
    (type === "inventory_fallback" && isPositive(goalValue));

  const targetDisplayValue =
    type === "immediate"
      ? immediate?.priceMax
      : type === "future_route"
      ? firstDefined(futureRoute?.projectedTargetValue, goalValue)
      : goalValue;

  const selectedPropertyPrice = firstDefined(
    toNum(selectedProperty?.price),
    toNum(selectedProperty?.valor),
    toNum(selectedProperty?.precio),
    null
  );

  const immediatePriceMax = immediate?.priceMax ?? null;
  const futureMonthlyPayment = shouldShowFutureRouteCard
    ? firstDefined(futureRoute?.projectedMonthlyPayment, null)
    : null;
  const futureMonths = shouldShowFutureRouteCard
    ? firstDefined(futureRoute?.monthsToGoal, null)
    : null;
  const futureProjectedValue = shouldShowFutureRouteCard
    ? firstDefined(futureRoute?.projectedTargetValue, null)
    : null;

  return {
    type, // immediate | future_route | inventory_fallback | no_clear_route
    headline,
    subheadline,

    city,
    goalValue,
    targetDisplayValue,
    fitScore,

    bestMortgage,
    topBanks,
    selectedProperty,

    immediate,
    futureRoute,
    inventoryFallback,

    shouldShowImmediateCard,
    shouldShowFutureRouteCard,
    shouldShowInventoryFallbackCard,
    shouldShowGoalContext,

    safeNumbers: {
      selectedPropertyPrice,
      immediatePriceMax,
      futureMonthlyPayment,
      futureMonths,
      futureProjectedValue,
    },

    flags: {
      hasImmediateMortgage: !!immediate,
      hasFutureRoute: !!futureRoute,
      hasInventoryFallback: !!inventoryFallback?.property,
      hasMatchedProperties: getMatchedProperties(snapshot).length > 0,
      hasHousingAlternatives: !!(
        getHousingAlternatives(snapshot).primaryHousingAlternative ||
        getHousingAlternatives(snapshot).secondaryHousingAlternative
      ),
      shouldAvoidZeroFutureUI:
        !shouldShowFutureRouteCard ||
        !isPositive(futureMonthlyPayment) ||
        !isPositive(futureProjectedValue) ||
        !isPositive(futureMonths),
    },
  };
}

export function readSnapshotFromStorage() {
  try {
    const raw = localStorage.getItem("hl_mobile_last_snapshot_v1");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readJourneyFromStorage() {
  try {
    const raw = localStorage.getItem("hl_mobile_journey_v1");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readSelectedPropertyFromStorage() {
  try {
    const raw = localStorage.getItem("hl_selected_property_v1");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}