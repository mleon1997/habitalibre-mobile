// src/lib/planEngine.js

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pick(obj, paths) {
  const r = obj || {};
  for (const p of paths) {
    const parts = p.split(".");
    let cur = r;
    let ok = true;
    for (const k of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, k)) cur = cur[k];
      else {
        ok = false;
        break;
      }
    }
    if (ok && cur != null) return cur;
  }
  return null;
}

function pct(a, b) {
  const A = Number(a || 0);
  const B = Number(b || 0);
  if (!Number.isFinite(A) || !Number.isFinite(B) || B <= 0) return null;
  return Math.round((A / B) * 100);
}

function pmt(rate, nper, pv) {
  const r = Number(rate || 0);
  const N = Number(nper || 0);
  const PV = Number(pv || 0);

  if (!Number.isFinite(r) || !Number.isFinite(N) || !Number.isFinite(PV) || N <= 0) {
    return null;
  }
  if (r === 0) return PV / N;
  return (PV * r) / (1 - Math.pow(1 + r, -N));
}

function normalizeJourneyInputs(journey = {}, snapshot = {}) {
  return {
    ingreso:
      toNum(
        pick(journey, [
          "form.ingreso",
          "form.ingresoNetoMensual",
        ])
      ) ??
      toNum(
        pick(snapshot, [
          "input.ingresoNetoMensual",
          "__entrada.ingresoNetoMensual",
          "output._echo.ingresoNetoMensual",
        ])
      ) ??
      0,

    ingresoPareja:
      toNum(
        pick(journey, [
          "form.ingresoPareja",
        ])
      ) ??
      toNum(
        pick(snapshot, [
          "input.ingresoPareja",
          "__entrada.ingresoPareja",
        ])
      ) ??
      0,

    deudas:
      toNum(
        pick(journey, [
          "form.deudas",
          "form.otrasDeudasMensuales",
        ])
      ) ??
      toNum(
        pick(snapshot, [
          "input.otrasDeudasMensuales",
          "__entrada.otrasDeudasMensuales",
        ])
      ) ??
      0,

    valor:
      toNum(
        pick(journey, [
          "form.valorVivienda",
        ])
      ) ??
      toNum(
        pick(snapshot, [
          "input.valorVivienda",
          "__entrada.valorVivienda",
          "output._echo.valorVivienda",
        ])
      ) ??
      null,

    entrada:
      toNum(
        pick(journey, [
          "form.entrada",
          "form.entradaDisponible",
        ])
      ) ??
      toNum(
        pick(snapshot, [
          "input.entradaDisponible",
          "__entrada.entradaDisponible",
          "output._echo.entradaDisponible",
        ])
      ) ??
      0,

    capacidadEntradaMensual:
      toNum(
        pick(journey, [
          "form.capacidadEntradaMensual",
        ])
      ) ??
      toNum(
        pick(snapshot, [
          "input.capacidadEntradaMensual",
          "__entrada.capacidadEntradaMensual",
          "output._echo.capacidadEntradaMensual",
        ])
      ) ??
      0,

    afiliadoIESS:
      pick(journey, [
        "form.afiliadoIESS",
        "form.afiliadoIess",
      ]) ??
      pick(snapshot, [
        "input.afiliadoIess",
        "__entrada.afiliadoIess",
      ]) ??
      null,
  };
}

function normalizeMatchedProperties(snapshot = {}) {
  const direct =
    snapshot?.matchedProperties ??
    snapshot?.output?.matchedProperties ??
    snapshot?.marketplace?.items ??
    snapshot?.output?.marketplace?.items ??
    snapshot?.propiedades ??
    snapshot?.output?.propiedades ??
    [];

  return Array.isArray(direct) ? direct : [];
}

function getBestMortgage(snapshot = {}) {
  return (
    snapshot?.bestMortgage ||
    snapshot?.output?.bestMortgage ||
    snapshot?.rawMatcherResult?.bestMortgage ||
    null
  );
}

function getPrivateMortgage(snapshot = {}) {
  const ranked =
    snapshot?.rankedMortgages ||
    snapshot?.output?.rankedMortgages ||
    snapshot?.rawMatcherResult?.rankedMortgages ||
    [];

  if (!Array.isArray(ranked)) return null;
  return ranked.find((r) => r?.mortgageId === "PRIVATE") || null;
}

function getMortgageForProperty(property = {}, snapshot = {}) {
  const matched = Array.isArray(property?.matchedProducts) ? property.matchedProducts : [];

  if (matched.includes("PRIVATE")) {
    return getPrivateMortgage(snapshot);
  }

  const best = getBestMortgage(snapshot);
  if (best && matched.includes(best?.mortgageId)) return best;

  const ranked =
    snapshot?.rankedMortgages ||
    snapshot?.output?.rankedMortgages ||
    snapshot?.rawMatcherResult?.rankedMortgages ||
    [];

  if (!Array.isArray(ranked)) return null;

  return ranked.find((r) => matched.includes(r?.mortgageId)) || best || null;
}

function toneFromEstado(estado) {
  if (
    estado === "top_match" ||
    estado === "entrada_viable_hipoteca_futura_viable"
  ) {
    return "ok";
  }

  if (
    estado === "entrada_viable_hipoteca_futura_debil" ||
    estado === "ruta_cercana"
  ) {
    return "neutral";
  }

  if (
    estado === "entrada_no_viable" ||
    estado === "fuera_de_reglas"
  ) {
    return "warning";
  }

  return "neutral";
}

function buildStepsFromEvaluations({
  estadoCompra,
  evaluacionEntrada,
  evaluacionHipotecaHoy,
  evaluacionHipotecaFutura,
  routeLabel,
  summaryText,
}) {
  const entradaViable = !!evaluacionEntrada?.viableEntrada;
  const modalidadEntrada = evaluacionEntrada?.modalidadEntrada || null;
  const faltanteEntrada = toNum(evaluacionEntrada?.faltanteEntrada);
  const entradaRequerida = toNum(evaluacionEntrada?.entradaRequerida);
  const mesesConstruccionRestantes = toNum(evaluacionEntrada?.mesesConstruccionRestantes) ?? 0;
  const mesesNecesarios = toNum(evaluacionEntrada?.mesesNecesarios);

  const hipotecaHoyViable = !!evaluacionHipotecaHoy?.viable;
  const hipotecaFuturaViable = !!evaluacionHipotecaFutura?.viable;

  const hipotecaProducto =
    evaluacionHipotecaFutura?.productoSugerido ||
    evaluacionHipotecaHoy?.productoSugerido ||
    "Hipoteca por definir";

  let step1 = "Revisa cuánto necesitas para separar y completar tu entrada.";
  let step2 = "Todavía no hay una ruta hipotecaria sólida.";
  let step3 = summaryText || routeLabel || "Ruta por definir.";

  if (!entradaViable) {
    if (faltanteEntrada != null && faltanteEntrada > 0) {
      step1 = `Te faltan $${Math.round(faltanteEntrada).toLocaleString("en-US")} para completar la entrada.`;
    } else {
      step1 = "Necesitas más entrada disponible para arrancar.";
    }
  } else if (entradaRequerida != null) {
    if (modalidadEntrada === "construccion") {
      if (mesesNecesarios != null && mesesNecesarios > 0) {
        step1 = `Puedes completar la entrada durante la obra en aproximadamente ${mesesNecesarios} meses.`;
      } else if (mesesConstruccionRestantes > 0) {
        step1 = `Puedes completar la entrada durante la obra en aproximadamente ${mesesConstruccionRestantes} meses.`;
      } else {
        step1 = "Ya cuentas con la entrada mínima estimada para esta propiedad.";
      }
    } else {
      step1 = "Ya cuentas con la entrada mínima estimada para esta propiedad.";
    }
  }

  if (hipotecaFuturaViable) {
    step2 = `Tu mejor ruta proyectada sería con ${hipotecaProducto}.`;
  } else if (hipotecaHoyViable) {
    step2 = `Tu mejor ruta hoy sería con ${hipotecaProducto}.`;
  }

  if (estadoCompra === "top_match") {
    step3 = "Esta propiedad sí podría encajar con tu perfil actual.";
  } else if (estadoCompra === "entrada_viable_hipoteca_futura_viable") {
    step3 = "Puedes completar la entrada y luego aplicar a hipoteca.";
  } else if (estadoCompra === "entrada_viable_hipoteca_futura_debil") {
    step3 = "La entrada se ve alcanzable, pero la hipoteca requiere fortalecerse.";
  } else if (estadoCompra === "entrada_no_viable") {
    step3 = "La entrada todavía no calza con tu capacidad actual.";
  } else if (estadoCompra === "fuera_de_reglas") {
    step3 = "Esta propiedad no encaja con las reglas del programa para tu perfil.";
  }

  return [
    {
      id: 1,
      title: "Reserva / entrada",
      subtitle: step1,
      tone: entradaViable ? "ok" : "warning",
    },
    {
      id: 2,
      title: "Hipoteca",
      subtitle: step2,
      tone: hipotecaFuturaViable || hipotecaHoyViable ? "ok" : "neutral",
    },
    {
      id: 3,
      title: "Resultado",
      subtitle: step3,
      tone: toneFromEstado(estadoCompra),
    },
  ];
}

/* =========================
   NUEVO SCORE VIVIENDA
========================= */

function calcularScoreVivienda({
  hasCurrentViableRoute = false,
  hasFutureViableRoute = false,
  hasNearRoute = false,
  puedeCubrirCuota = false,
  entradaDisponible = 0,
  entradaMinimaRequerida = 0,
  ingresoMensual = 0,
  deudasMensuales = 0,
}) {
  if (hasCurrentViableRoute) return 100;

  let score = 40;

  if (puedeCubrirCuota) score += 18;

  const ingreso = Number(ingresoMensual || 0);
  const deudas = Number(deudasMensuales || 0);
  const dti = ingreso > 0 ? deudas / ingreso : null;

  if (dti != null) {
    if (dti <= 0.2) score += 12;
    else if (dti <= 0.3) score += 9;
    else if (dti <= 0.4) score += 5;
  }

  const entrada = Number(entradaDisponible || 0);
  const entradaReq = Number(entradaMinimaRequerida || 0);
  const ratioEntrada =
    entradaReq > 0 ? entrada / entradaReq : 0;

  if (ratioEntrada >= 1) score += 20;
  else if (ratioEntrada >= 0.75) score += 16;
  else if (ratioEntrada >= 0.5) score += 12;
  else if (ratioEntrada >= 0.25) score += 8;
  else if (ratioEntrada > 0) score += 4;

  if (hasFutureViableRoute) {
    score += 14;
    score = Math.min(score, 89);
  } else if (hasNearRoute) {
    score += 8;
    score = Math.min(score, 79);
  } else {
    score = Math.min(score, 59);
  }

  return Math.max(0, Math.round(score));
}

function getRouteSignals(snapshot = {}, inputs = {}) {
  const matchedProperties = normalizeMatchedProperties(snapshot);

  const currentViableProperty = matchedProperties.find(
    (p) => String(p?.estadoCompra || "") === "top_match"
  ) || null;

  const futureViableProperty = matchedProperties.find(
    (p) =>
      String(p?.estadoCompra || "") === "entrada_viable_hipoteca_futura_viable" ||
      p?.evaluacionHipotecaFutura?.viable === true
  ) || null;

  const nearRouteProperty = matchedProperties.find((p) => {
    const estado = String(p?.estadoCompra || "");
    return (
      estado === "entrada_viable_hipoteca_futura_viable" ||
      estado === "entrada_viable_hipoteca_futura_debil" ||
      estado === "ruta_cercana"
    );
  }) || null;

  const referenceProperty =
    currentViableProperty || futureViableProperty || nearRouteProperty || null;

  const entradaMinimaRequerida =
    toNum(referenceProperty?.evaluacionEntrada?.entradaRequerida) ??
    (toNum(referenceProperty?.precio ?? referenceProperty?.price) != null
      ? Number(referenceProperty?.precio ?? referenceProperty?.price) * 0.1
      : 0);

  const puedeCubrirCuota =
    referenceProperty?.evaluacionEntrada?.puedeCubrirCuota ??
    referenceProperty?.evaluacionEntrada?.puedeCompletarEntradaDuranteObra ??
    false;

  return {
    matchedProperties,
    currentViableProperty,
    futureViableProperty,
    nearRouteProperty,
    hasCurrentViableRoute: !!currentViableProperty,
    hasFutureViableRoute: !!futureViableProperty,
    hasNearRoute: !!nearRouteProperty,
    referenceProperty,
    entradaMinimaRequerida,
    puedeCubrirCuota,
    ingresoTotal: (inputs.ingreso || 0) + (inputs.ingresoPareja || 0),
  };
}

/* =========================
   NUEVA CAPA: TRAYECTORIA DE ENTRADA
========================= */

function buildEntryTrajectory({
  inputs,
  estimatedMaxPropertyValue,
  realityCheck,
  goalSummary,
  homeRecommendation,
}) {
  const entradaActual = Number(inputs?.entrada || 0);
  const capacidadMensual = Number(inputs?.capacidadEntradaMensual || 0);
  const metaUsuario =
    Number(goalSummary?.targetPropertyValue || 0) ||
    Number(inputs?.valor || 0);

  const rangoActualMin =
    Number(realityCheck?.recommendedSearchMin || 0) || null;

  const rangoActualMax =
    Number(realityCheck?.recommendedSearchMax || 0) ||
    Number(estimatedMaxPropertyValue || 0) ||
    null;

  if (!Number.isFinite(capacidadMensual) || capacidadMensual <= 0) {
    return null;
  }

  const baseActual = rangoActualMax || rangoActualMin || null;
  if (!baseActual || !Number.isFinite(baseActual) || baseActual <= 0) {
    return null;
  }

  const escenarios = [
    { producto: "VIS", pctEntrada: 0.05 },
    { producto: "BIESS / mixto", pctEntrada: 0.1 },
    { producto: "Banca privada", pctEntrada: 0.2 },
  ];

  const rutas = escenarios.map((esc) => {
    const entradaObjetivoActual = baseActual * esc.pctEntrada;
    const faltanteActual = Math.max(0, entradaObjetivoActual - entradaActual);
    const mesesActual =
      capacidadMensual > 0 ? Math.ceil(faltanteActual / capacidadMensual) : null;

    const entradaObjetivoMeta =
      metaUsuario > 0 ? metaUsuario * esc.pctEntrada : null;

    const faltanteMeta =
      entradaObjetivoMeta != null
        ? Math.max(0, entradaObjetivoMeta - entradaActual)
        : null;

    const mesesMeta =
      capacidadMensual > 0 && faltanteMeta != null
        ? Math.ceil(faltanteMeta / capacidadMensual)
        : null;

    return {
      producto: esc.producto,
      pctEntrada: esc.pctEntrada,
      entradaObjetivoActual,
      faltanteActual,
      mesesActual,
      entradaObjetivoMeta,
      faltanteMeta,
      mesesMeta,
    };
  });

  const mejorRutaActual =
    rutas
      .filter((r) => r.mesesActual != null)
      .sort((a, b) => a.mesesActual - b.mesesActual)[0] || null;

  const mejorRutaMeta =
    rutas
      .filter((r) => r.mesesMeta != null)
      .sort((a, b) => a.mesesMeta - b.mesesMeta)[0] || null;

  const progressToCurrentRange =
    mejorRutaActual?.entradaObjetivoActual > 0
      ? Math.min(
          100,
          Math.round((entradaActual / mejorRutaActual.entradaObjetivoActual) * 100)
        )
      : null;

  const progressToGoalRange =
    mejorRutaMeta?.entradaObjetivoMeta > 0
      ? Math.min(
          100,
          Math.round((entradaActual / mejorRutaMeta.entradaObjetivoMeta) * 100)
        )
      : null;

  return {
    sourceType: homeRecommendation?.type || null,
    entradaActual,
    capacidadMensual,
    metaUsuario: metaUsuario > 0 ? metaUsuario : null,
    rangoActualMin,
    rangoActualMax,
    mejorRutaActual,
    mejorRutaMeta,
    progressToCurrentRange,
    progressToGoalRange,
    rutas,
  };
}

// plan general
export function buildPlan({ journey, snapshot }) {
  const j = journey || {};
  const s = snapshot || {};

  const inputs = normalizeJourneyInputs(j, s);
  const routeSignals = getRouteSignals(s, inputs);

  const rawScore = toNum(
    pick(s, ["score", "output.score", "resultado.score"])
  );

  const capacidadPago = toNum(
    pick(s, ["capacidadPago", "output.capacidadPago", "resultado.capacidadPago"])
  );

  const cuotaEstimada = toNum(
    pick(s, ["cuotaEstimada", "output.cuotaEstimada", "resultado.cuotaEstimada"])
  );

  const bancoSugerido =
    pick(s, ["bancoSugerido", "output.bancoSugerido", "resultado.bancoSugerido"]) ??
    null;

  const productoSugerido =
    pick(s, ["productoSugerido", "output.productoSugerido", "resultado.productoSugerido"]) ??
    null;

  const rawSinOferta = Boolean(
    pick(s, [
      "sinOferta",
      "output.sinOferta",
      "resultado.sinOferta",
      "flags.sinOferta",
      "resultado.flags.sinOferta",
    ])
  );

  const ingresoTotal = routeSignals.ingresoTotal;

  const ltv = inputs.valor ? pct(inputs.valor - inputs.entrada, inputs.valor) : null;
  const dti = capacidadPago && ingresoTotal ? pct(capacidadPago + inputs.deudas, ingresoTotal) : null;

  const hasStrongOfferSignals =
    !!bancoSugerido ||
    !!productoSugerido ||
    toNum(
      pick(s, [
        "precioMaxVivienda",
        "output.precioMaxVivienda",
        "propertyPrice",
        "output.propertyPrice",
        "montoMaximo",
        "output.montoMaximo",
        "loanAmount",
        "output.loanAmount",
      ])
    ) > 0 ||
    routeSignals.hasCurrentViableRoute ||
    routeSignals.hasFutureViableRoute;

  const sinOferta =
    rawSinOferta && !routeSignals.hasFutureViableRoute && !routeSignals.hasNearRoute
      ? true
      : !hasStrongOfferSignals && !routeSignals.hasNearRoute;

  const scoreCalculado = calcularScoreVivienda({
    hasCurrentViableRoute: routeSignals.hasCurrentViableRoute,
    hasFutureViableRoute: routeSignals.hasFutureViableRoute,
    hasNearRoute: routeSignals.hasNearRoute,
    puedeCubrirCuota: routeSignals.puedeCubrirCuota,
    entradaDisponible: inputs.entrada || 0,
    entradaMinimaRequerida: routeSignals.entradaMinimaRequerida || 0,
    ingresoMensual: ingresoTotal || 0,
    deudasMensuales: inputs.deudas || 0,
  });

  const score =
    scoreCalculado != null
      ? scoreCalculado
      : rawScore;

  const homeRecommendation =
    s?.homeRecommendation ||
    s?.output?.homeRecommendation ||
    null;

  const realityCheck =
    homeRecommendation?.realityCheck || null;

  const goalSummary =
    homeRecommendation?.goalSummary || null;

  const estimatedMaxPropertyValue =
    toNum(
      pick(s, [
        "financialCapacity.estimatedMaxPropertyValue",
        "output.financialCapacity.estimatedMaxPropertyValue",
        "bestMortgage.precioMaxVivienda",
        "output.bestMortgage.precioMaxVivienda",
        "precioMaxVivienda",
        "output.precioMaxVivienda",
      ])
    ) ?? null;

  const entryTrajectory = buildEntryTrajectory({
    inputs,
    estimatedMaxPropertyValue,
    realityCheck,
    goalSummary,
    homeRecommendation,
  });

  const actions = [];
  const missingCore = !inputs.ingreso || !inputs.valor;

  if (missingCore) {
    actions.push({
      id: "complete_profile",
      title: "Completa tu perfil",
      subtitle: "Te toma menos de 2 minutos y desbloquea tu resultado real.",
      cta: "Continuar",
      to: "/journey",
      kind: "primary",
    });
  }

  if (!missingCore && !routeSignals.hasCurrentViableRoute && routeSignals.hasFutureViableRoute) {
    actions.push({
      id: "future_route",
      title: "Ya tienes una ruta futura viable",
      subtitle: "Completa la entrada durante la construcción y luego aplica a hipoteca.",
      cta: "Ver mi match",
      to: "/marketplace",
      kind: "primary",
    });
  }

  if (!missingCore && sinOferta) {
    actions.push({
      id: "improve",
      title: "Mejora tu elegibilidad",
      subtitle: "Ajusta entrada, precio o plazo para desbloquear una ruta.",
      cta: "Optimizar escenario",
      to: "/journey?afinando=1",
      kind: "primary",
    });
  }

  if (!missingCore && !sinOferta && routeSignals.hasCurrentViableRoute) {
    actions.push({
      id: "next_step",
      title: "Siguiente paso recomendado",
      subtitle: "Checklist + asesoría para convertir esto en crédito real.",
      cta: "Ver mi plan",
      to: "/journey",
      kind: "primary",
    });
  }

  const insights = [];

  if (ltv != null) {
    insights.push({
      id: "ltv",
      label: "Financiamiento vs. valor",
      value: `${ltv}%`,
      hint: ltv <= 80 ? "Buena entrada" : ltv <= 90 ? "Entrada justa" : "Entrada baja (alto LTV)",
    });
  }

  if (dti != null) {
    insights.push({
      id: "dti",
      label: "Carga mensual estimada",
      value: `${dti}%`,
      hint: dti <= 35 ? "Saludable" : dti <= 45 ? "Ajustada" : "Alta (riesgo)",
    });
  }

  if (routeSignals.hasCurrentViableRoute) {
    insights.push({
      id: "route",
      label: "Ruta sugerida",
      value: bancoSugerido || "Compra inmediata viable",
      hint: productoSugerido || "Ruta actual",
    });
  } else if (routeSignals.hasFutureViableRoute) {
    insights.push({
      id: "route_future",
      label: "Ruta sugerida",
      value: "Ruta futura viable",
      hint:
        routeSignals.futureViableProperty?.evaluacionHipotecaFutura?.productoSugerido ||
        "Completa la entrada y luego aplica a hipoteca",
    });
  } else if (routeSignals.hasNearRoute) {
    insights.push({
      id: "route_near",
      label: "Ruta sugerida",
      value: "Ruta cercana",
      hint: "Todavía no es compra inmediata, pero ya hay un camino posible.",
    });
  }

  let status = "incomplete";
  if (!missingCore) {
    if (routeSignals.hasCurrentViableRoute) status = "ready";
    else if (routeSignals.hasFutureViableRoute) status = "future_ready";
    else if (routeSignals.hasNearRoute) status = "near_ready";
    else status = "needs_improvement";
  }

  return {
    status,
    score,
    rawScore,
    capacidadPago,
    cuotaEstimada,
    bancoSugerido,
    productoSugerido,
    sinOferta,
    ltv,
    dti,
    insights,
    actions,
    routeSignals,
    entryTrajectory,
    debug: {
      ...inputs,
      scoreCalculado,
      hasCurrentViableRoute: routeSignals.hasCurrentViableRoute,
      hasFutureViableRoute: routeSignals.hasFutureViableRoute,
      hasNearRoute: routeSignals.hasNearRoute,
      referenceProperty:
        routeSignals.referenceProperty?.nombre ||
        routeSignals.referenceProperty?.titulo ||
        routeSignals.referenceProperty?.title ||
        null,
      estimatedMaxPropertyValue,
      homeRecommendationType: homeRecommendation?.type || null,
    },
  };
}

// plan por propiedad
export function buildPropertyPlan({ property, journey, snapshot }) {
  const p = property || {};
  const s = snapshot || {};
  const inputs = normalizeJourneyInputs(journey || {}, s);

  const precioPropiedad =
    toNum(p?.precio) ??
    toNum(p?.price) ??
    null;

  if (!precioPropiedad) {
    return {
      status: "undefined",
      routeLabel: "Ruta por definir",
      entradaTotal: null,
      teFaltaHoy: null,
      cuotaEntrada: null,
      hipotecaEstimada: null,
      cuotaHipotecaEstimada: null,
      steps: [
        {
          id: 1,
          title: "Reserva / entrada",
          subtitle: "No pudimos calcular el precio de esta propiedad.",
          tone: "warning",
        },
      ],
    };
  }

  const estadoCompra = p?.estadoCompra || null;
  const evaluacionEntrada = p?.evaluacionEntrada || null;
  const evaluacionHipotecaHoy =
    p?.evaluacionHipotecaHoy || p?.evaluacionHipoteca || null;
  const evaluacionHipotecaFutura = p?.evaluacionHipotecaFutura || null;

  const routeLabelCalculado =
    p?.routeLabelCalculado ||
    p?.matchReasonCalculado ||
    null;

  const entradaTotalCalculada =
    toNum(evaluacionEntrada?.entradaRequerida) ?? null;

  const teFaltaHoyCalculado =
    toNum(evaluacionEntrada?.faltanteEntrada) ?? null;

  const cuotaEntradaCalculada =
    toNum(evaluacionEntrada?.cuotaEntradaMensual);

  const hipotecaLabelCalculada =
    evaluacionHipotecaFutura?.productoSugerido ||
    evaluacionHipotecaHoy?.productoSugerido ||
    null;

  const cuotaHipotecaCalculada =
    toNum(evaluacionHipotecaFutura?.cuotaReferencia) ??
    toNum(evaluacionHipotecaHoy?.cuotaReferencia) ??
    null;

  const tasaAnualCalculada =
    toNum(
      evaluacionHipotecaFutura?.mortgageSelected?.annualRate ??
      evaluacionHipotecaFutura?.mortgageSelected?.tasaAnual ??
      evaluacionHipotecaFutura?.annualRate ??
      evaluacionHipotecaHoy?.mortgageSelected?.annualRate ??
      evaluacionHipotecaHoy?.mortgageSelected?.tasaAnual ??
      evaluacionHipotecaHoy?.annualRate
    ) ?? null;

  const plazoMesesCalculado =
    toNum(
      evaluacionHipotecaFutura?.mortgageSelected?.plazoMeses ??
      evaluacionHipotecaFutura?.mortgageSelected?.termMonths ??
      evaluacionHipotecaFutura?.termMonths ??
      evaluacionHipotecaHoy?.mortgageSelected?.plazoMeses ??
      evaluacionHipotecaHoy?.mortgageSelected?.termMonths ??
      evaluacionHipotecaHoy?.termMonths
    ) ?? null;

  const montoHipotecaCalculado =
    toNum(evaluacionHipotecaFutura?.montoHipotecaProyectado) ??
    toNum(evaluacionHipotecaFutura?.montoPrestamo) ??
    toNum(evaluacionHipotecaHoy?.montoPrestamo) ??
    null;

  const tieneEvaluacionReal =
    !!estadoCompra ||
    !!evaluacionEntrada ||
    !!evaluacionHipotecaHoy ||
    !!evaluacionHipotecaFutura;

  if (tieneEvaluacionReal) {
    let status = "undefined";

    if (estadoCompra === "top_match") status = "viable_today";
    else if (estadoCompra === "entrada_viable_hipoteca_futura_viable") status = "viable_future";
    else if (estadoCompra === "entrada_viable_hipoteca_futura_debil") status = "needs_mortgage_strength";
    else if (estadoCompra === "entrada_no_viable") status = "needs_down_payment";
    else if (estadoCompra === "fuera_de_reglas") status = "not_eligible";
    else if (toNum(evaluacionEntrada?.faltanteEntrada) > 0) status = "needs_down_payment";

    const finalRouteLabel =
      routeLabelCalculado ||
      (estadoCompra === "top_match"
        ? "Ruta posible con este proyecto"
        : estadoCompra === "entrada_viable_hipoteca_futura_viable"
        ? "Ruta posible con este proyecto"
        : estadoCompra === "entrada_viable_hipoteca_futura_debil"
        ? "Ruta posible con ajustes"
        : estadoCompra === "entrada_no_viable"
        ? "Entrada no viable"
        : estadoCompra === "ruta_cercana"
        ? "Ruta cercana"
        : estadoCompra === "fuera_de_reglas"
        ? "Fuera de reglas"
        : "Ruta por definir");

    const summaryText =
      estadoCompra === "top_match"
        ? "Tu perfil sí podría sostener esta compra hoy."
        : estadoCompra === "entrada_viable_hipoteca_futura_viable"
        ? "Puedes completar la entrada y luego aplicar a hipoteca."
        : estadoCompra === "entrada_viable_hipoteca_futura_debil"
        ? "La entrada se ve alcanzable, pero la hipoteca requiere fortalecerse."
        : estadoCompra === "entrada_no_viable"
        ? "La entrada todavía no calza con tu capacidad actual."
        : estadoCompra === "fuera_de_reglas"
        ? "Esta propiedad no encaja con las reglas del programa para tu perfil."
        : routeLabelCalculado || "Ruta por definir.";

    return {
      status,
      routeLabel: finalRouteLabel,
      entradaTotal: entradaTotalCalculada,
      teFaltaHoy: teFaltaHoyCalculado,
      cuotaEntrada: cuotaEntradaCalculada,
      hipotecaEstimada: hipotecaLabelCalculada,
      cuotaHipotecaEstimada: cuotaHipotecaCalculada,
      montoHipotecaEstimado: montoHipotecaCalculado,
      tasaAnual: tasaAnualCalculada,
      plazoMeses: plazoMesesCalculado,
      mortgageId:
        p?.mortgageSelected?.mortgageId ||
        p?.evaluacionHipotecaFutura?.mortgageSelected?.mortgageId ||
        p?.evaluacionHipotecaHoy?.mortgageSelected?.mortgageId ||
        null,
      steps: buildStepsFromEvaluations({
        estadoCompra,
        evaluacionEntrada,
        evaluacionHipotecaHoy,
        evaluacionHipotecaFutura,
        routeLabel: finalRouteLabel,
        summaryText,
      }),
      debug: {
        source: "property_evaluations",
        precioPropiedad,
        entradaUsuario: inputs.entrada,
        evaluacionEntrada,
        evaluacionHipotecaHoy,
        evaluacionHipotecaFutura,
        estadoCompra,
      },
    };
  }

  const mortgage = getMortgageForProperty(p, s);
  const ltvMax =
    toNum(mortgage?.ltvMax) ??
    (mortgage?.mortgageId === "PRIVATE" ? 0.8 : null);

  if (!ltvMax) {
    return {
      status: "undefined",
      routeLabel: "Ruta por definir",
      entradaTotal: null,
      teFaltaHoy: null,
      cuotaEntrada: null,
      hipotecaEstimada: null,
      cuotaHipotecaEstimada: null,
      steps: [
        {
          id: 1,
          title: "Reserva / entrada",
          subtitle: "Necesitas más entrada disponible para arrancar.",
          tone: "warning",
        },
        {
          id: 2,
          title: "Hipoteca",
          subtitle: "Todavía no hay una ruta hipotecaria sólida.",
          tone: "warning",
        },
      ],
      debug: {
        source: "fallback_no_ltv",
        precioPropiedad,
        mortgage,
      },
    };
  }

  const entradaMinima = Math.max(0, precioPropiedad * (1 - ltvMax));
  const teFaltaHoy = Math.max(0, entradaMinima - (inputs.entrada || 0));
  const hipotecaEstimadaMonto = Math.max(0, precioPropiedad - entradaMinima);

  const tasaAnual =
    toNum(mortgage?.annualRate) ??
    toNum(s?.tasaAnual) ??
    0.075;

  const plazoMeses =
    toNum(mortgage?.termMonths) ??
    toNum(s?.plazoMeses) ??
    300;

  const cuotaHipotecaEstimada =
    hipotecaEstimadaMonto > 0 ? pmt(tasaAnual / 12, plazoMeses, hipotecaEstimadaMonto) : null;

  const cuotaEntrada =
    teFaltaHoy > 0 && (inputs.capacidadEntradaMensual || 0) > 0
      ? inputs.capacidadEntradaMensual
      : teFaltaHoy > 0
      ? null
      : 0;

  const routeLabel =
    teFaltaHoy <= 0
      ? "Ruta posible con este proyecto"
      : "Ruta cercana con este proyecto";

  const mortgageLabel =
    mortgage?.label ||
    mortgage?.displayName ||
    "Hipoteca por definir";

  const steps = teFaltaHoy <= 0
    ? [
        {
          id: 1,
          title: "Reserva / entrada",
          subtitle: "Ya cuentas con la entrada mínima estimada para esta propiedad.",
          tone: "ok",
        },
        {
          id: 2,
          title: "Hipoteca",
          subtitle: `Tu mejor ruta proyectada sería con ${mortgageLabel}.`,
          tone: "ok",
        },
        {
          id: 3,
          title: "Resultado",
          subtitle: "Esta propiedad sí podría encajar con tu perfil actual.",
          tone: "ok",
        },
      ]
    : [
        {
          id: 1,
          title: "Reserva / entrada",
          subtitle: `Te faltan $${Math.round(teFaltaHoy).toLocaleString("en-US")} para completar la entrada.`,
          tone: "warning",
        },
        {
          id: 2,
          title: "Hipoteca",
          subtitle: `Tu mejor ruta proyectada sería con ${mortgageLabel}.`,
          tone: "neutral",
        },
        {
          id: 3,
          title: "Resultado",
          subtitle: inputs.capacidadEntradaMensual > 0
            ? "Podrías completar la entrada y luego aplicar a hipoteca."
            : "Necesitas fortalecer la entrada para avanzar con esta propiedad.",
          tone: "neutral",
        },
      ];

  return {
    status: teFaltaHoy <= 0 ? "viable_today" : "needs_down_payment",
    routeLabel,
    entradaTotal: entradaMinima,
    teFaltaHoy,
    cuotaEntrada,
    hipotecaEstimada: mortgageLabel,
    cuotaHipotecaEstimada,
    montoHipotecaEstimado: hipotecaEstimadaMonto,
    tasaAnual,
    plazoMeses,
    mortgageId: mortgage?.mortgageId || null,
    steps,
    debug: {
      source: "fallback_ltv",
      precioPropiedad,
      entradaUsuario: inputs.entrada,
      entradaMinima,
      ltvMax,
      mortgage,
    },
  };
}

export default buildPlan;