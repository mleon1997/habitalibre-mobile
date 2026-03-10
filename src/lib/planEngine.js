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

// heurística simple para “fintech-like” plan
export function buildPlan({ journey, snapshot }) {
  const j = journey || {};
  const s = snapshot || {};

  // inputs (del journey si existen)
  const ingreso = toNum(pick(j, ["form.ingresoNetoMensual"])) ?? toNum(pick(s, ["input.ingresoNetoMensual"])) ?? null;
  const ingresoPareja = toNum(pick(j, ["form.ingresoPareja"])) ?? toNum(pick(s, ["input.ingresoPareja"])) ?? 0;
  const deudas = toNum(pick(j, ["form.otrasDeudasMensuales"])) ?? toNum(pick(s, ["input.otrasDeudasMensuales"])) ?? 0;

  const valor = toNum(pick(j, ["form.valorVivienda"])) ?? toNum(pick(s, ["input.valorVivienda"])) ?? null;
  const entrada = toNum(pick(j, ["form.entradaDisponible"])) ?? toNum(pick(s, ["input.entradaDisponible"])) ?? 0;
  const iess = pick(j, ["form.afiliadoIess"]) ?? pick(s, ["input.afiliadoIess"]) ?? null;

  // outputs (del snapshot del backend)
  const score = toNum(pick(s, ["scoreHL", "output.scoreHL", "resultado.scoreHL"])) ?? null;
  const capacidadPago = toNum(pick(s, ["capacidadPago", "output.capacidadPago", "resultado.capacidadPago"])) ?? null;
  const cuotaEstimada = toNum(pick(s, ["cuotaEstimada", "output.cuotaEstimada", "resultado.cuotaEstimada"])) ?? null;
  const bancoSugerido = pick(s, ["bancoSugerido", "output.bancoSugerido", "resultado.bancoSugerido"]) ?? null;
  const productoSugerido = pick(s, ["productoSugerido", "output.productoSugerido", "resultado.productoSugerido"]) ?? null;
  const sinOferta = Boolean(pick(s, ["sinOferta", "output.sinOferta", "resultado.sinOferta", "flags.sinOferta", "resultado.flags.sinOferta"]));

  const ingresoTotal = (ingreso || 0) + (ingresoPareja || 0);

  // métricas para “acciones”
  const ltv = valor ? pct(valor - entrada, valor) : null;
  const dti = capacidadPago && ingresoTotal ? pct(capacidadPago + deudas, ingresoTotal) : null;

  // acciones tipo fintech top: pocas, claras, ordenadas
  const actions = [];

  // 1) completar journey si falta info crítica
  const missingCore = !ingreso || !valor;
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

  // 2) si no hay oferta, plan de mejora
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

  // 3) si ya hay oferta / resultado, siguiente paso
  if (!missingCore && !sinOferta && (score != null || capacidadPago != null)) {
    actions.push({
      id: "next_step",
      title: "Siguiente paso recomendado",
      subtitle: "Checklist + asesoría para convertir esto en crédito real.",
      cta: "Ver mi plan",
      to: "/journey",
      kind: "primary",
    });
  }

  // 4) insight cards (fintech feel)
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

  if (bancoSugerido || productoSugerido) {
    insights.push({
      id: "route",
      label: "Ruta sugerida",
      value: bancoSugerido ? bancoSugerido : "—",
      hint: productoSugerido ? productoSugerido : "Producto a definir",
    });
  }

  // 5) estado
  const status =
    missingCore ? "incomplete" : sinOferta ? "needs_improvement" : "ready";

  return {
    status,
    score,
    capacidadPago,
    cuotaEstimada,
    bancoSugerido,
    productoSugerido,
    sinOferta,
    ltv,
    dti,
    insights,
    actions,
    debug: { ingreso, ingresoPareja, deudas, valor, entrada, iess },
  };
}