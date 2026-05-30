// src/utils/propertyMatch.js

export const PROPERTY_MATCH_STATUS = {
  APTO_HOY: "APTO_HOY",
  META_ALCANZABLE: "META_ALCANZABLE",
  FUERA_DE_RANGO: "FUERA_DE_RANGO",
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function getPropertyMatchStatus({
  propertyPrice,
  capacidadActual,
  capacidadObjetivo,
}) {
  const price = toNumber(propertyPrice);
  const currentCapacity = toNumber(capacidadActual);
  const targetCapacity = toNumber(capacidadObjetivo);

  const gapAgainstCurrent = Math.max(price - currentCapacity, 0);
  const gapAgainstTarget = Math.max(price - targetCapacity, 0);

  if (price <= currentCapacity) {
    return {
      status: PROPERTY_MATCH_STATUS.APTO_HOY,
      label: "Puedes aplicar hoy",
      shortLabel: "Aplica hoy",
      description: "Esta propiedad está dentro de tu capacidad estimada actual.",
      cta: "Comparar rutas hipotecarias",
      nextScreen: "Ruta",
      gap: 0,
      gapAgainstCurrent: 0,
      gapAgainstTarget: 0,
      isReadyNow: true,
      isReachableWithPlan: false,
      isOutOfRange: false,
    };
  }

  if (price > currentCapacity && price <= targetCapacity) {
    return {
      status: PROPERTY_MATCH_STATUS.META_ALCANZABLE,
      label: "Alcanzable con plan",
      shortLabel: "Con preparación",
      description:
        "Esta propiedad supera tu capacidad actual, pero puede ser alcanzable si sigues tu ruta de preparación.",
      cta: "Ver plan para esta propiedad",
      nextScreen: "Ruta",
      gap: gapAgainstCurrent,
      gapAgainstCurrent,
      gapAgainstTarget: 0,
      isReadyNow: false,
      isReachableWithPlan: true,
      isOutOfRange: false,
    };
  }

  return {
    status: PROPERTY_MATCH_STATUS.FUERA_DE_RANGO,
    label: "Fuera de rango actual",
    shortLabel: "Fuera de rango",
    description:
      "Esta propiedad está por encima de tu capacidad objetivo estimada. Te recomendamos revisar alternativas o ajustar tu plan.",
    cta: "Ver alternativas",
    nextScreen: "Marketplace",
    gap: gapAgainstCurrent,
    gapAgainstCurrent,
    gapAgainstTarget,
    isReadyNow: false,
    isReachableWithPlan: false,
    isOutOfRange: true,
  };
}

export function enrichPropertyWithMatch({
  property,
  capacidadActual,
  capacidadObjetivo,
}) {
  const price =
    property?.price ??
    property?.precio ??
    property?.valor ??
    property?.precioVenta ??
    0;

  const match = getPropertyMatchStatus({
    propertyPrice: price,
    capacidadActual,
    capacidadObjetivo,
  });

  return {
    ...property,
    matchStatus: match.status,
    matchLabel: match.label,
    matchShortLabel: match.shortLabel,
    matchDescription: match.description,
    matchCta: match.cta,
    matchNextScreen: match.nextScreen,
    matchGap: match.gap,
    matchGapAgainstCurrent: match.gapAgainstCurrent,
    matchGapAgainstTarget: match.gapAgainstTarget,
    isReadyNow: match.isReadyNow,
    isReachableWithPlan: match.isReachableWithPlan,
    isOutOfRange: match.isOutOfRange,
  };
}

export function buildSelectedPropertyPayload({
  property,
  capacidadActual,
  capacidadObjetivo,
}) {
  const price =
    property?.price ??
    property?.precio ??
    property?.valor ??
    property?.precioVenta ??
    0;

  const match = getPropertyMatchStatus({
    propertyPrice: price,
    capacidadActual,
    capacidadObjetivo,
  });

  return {
    id: property?.id ?? property?._id ?? null,
    nombre: property?.nombre ?? property?.title ?? property?.name ?? "Propiedad",
    proyecto: property?.proyecto ?? property?.projectName ?? null,
    precio: price,
    imagen: property?.imagen ?? property?.image ?? property?.coverImage ?? null,

    capacidadActual: toNumber(capacidadActual),
    capacidadObjetivo: toNumber(capacidadObjetivo),

    estadoMatch: match.status,
    matchLabel: match.label,
    matchDescription: match.description,
    matchCta: match.cta,

    brecha: match.gap,
    brechaContraCapacidadActual: match.gapAgainstCurrent,
    brechaContraCapacidadObjetivo: match.gapAgainstTarget,

    puedeAplicarHoy: match.isReadyNow,
    alcanzableConPlan: match.isReachableWithPlan,
    fueraDeRango: match.isOutOfRange,

    selectedAt: new Date().toISOString(),
  };
}