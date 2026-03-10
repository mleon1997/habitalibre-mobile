// src/lib/profileSummary.js

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Normaliza distintas formas de respuesta:
 * - snapshot local (LS_SNAPSHOT): { input, output, ...flatKeys }
 * - futuros: { ultimoSnapshotHL: { input, output } }
 */
function pick(obj, paths) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;

    for (const k of parts) {
      if (cur == null) {
        cur = undefined;
        break;
      }
      cur = cur[k];
    }

    if (cur !== undefined && cur !== null) return cur;
  }
  return null;
}

function isMeaningfulNumber(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function summarizeProfile(raw) {
  const r = raw || {};

  // ✅ score (acepta variantes)
  const score = toNum(
    pick(r, [
      "scoreHL",
      "score",
      "output.scoreHL",
      "output.score",
      "resultado.scoreHL",
      "resultado.score",
      "snapshot.scoreHL",
      "snapshot.score",
      "ultimoSnapshotHL.output.scoreHL",
      "ultimoSnapshotHL.output.score",
    ])
  );

  // ✅ capacidad (acepta variantes)
  const capacidad = toNum(
    pick(r, [
      "capacidadPago",
      "capacidad",
      "output.capacidadPago",
      "output.capacidad",
      "resultado.capacidadPago",
      "resultado.capacidad",
      "snapshot.capacidadPago",
      "snapshot.capacidad",
      "ultimoSnapshotHL.output.capacidadPago",
      "ultimoSnapshotHL.output.capacidad",
    ])
  );

  // ✅ cuota / tasa / ruta
  const cuota = toNum(
    pick(r, [
      "cuotaEstimada",
      "output.cuotaEstimada",
      "resultado.cuotaEstimada",
      "snapshot.cuotaEstimada",
      "ultimoSnapshotHL.output.cuotaEstimada",
    ])
  );

  const tasaAnual = toNum(
    pick(r, [
      "tasaAnual",
      "output.tasaAnual",
      "resultado.tasaAnual",
      "snapshot.tasaAnual",
      "ultimoSnapshotHL.output.tasaAnual",
    ])
  );

  const bancoSugerido =
    pick(r, [
      "bancoSugerido",
      "output.bancoSugerido",
      "resultado.bancoSugerido",
      "ultimoSnapshotHL.output.bancoSugerido",
    ]) || null;

  const productoSugerido =
    pick(r, [
      "productoSugerido",
      "output.productoSugerido",
      "resultado.productoSugerido",
      "ultimoSnapshotHL.output.productoSugerido",
    ]) || null;

  const sinOferta = Boolean(
    pick(r, [
      "flags.sinOferta",
      "sinOferta",
      "output.sinOferta",
      "resultado.flags.sinOferta",
      "ultimoSnapshotHL.output.sinOferta",
    ])
  );

  // -------------------------
  // Progreso (UX)
  // -------------------------
  let progress = toNum(pick(r, ["progress", "porcentajePerfil"])) ?? null;

  if (progress == null) {
    const input = pick(r, ["input", "ultimoSnapshotHL.input"]) || {};
    const fields = [
      pick(r, ["ciudad"]) || input.ciudad,
      pick(r, ["ingresoNetoMensual"]) || input.ingresoNetoMensual,
      pick(r, ["valorVivienda"]) || input.valorVivienda,
      pick(r, ["edad"]) || input.edad,
      pick(r, ["afiliadoIess"]) || input.afiliadoIess,
    ];
    const filled = fields.filter((x) => x !== undefined && x !== null && x !== "").length;
    progress = Math.round((filled / fields.length) * 100);
  }

  progress = clamp(progress ?? 0, 0, 100);

  // -------------------------
  // ✅ NUEVA lógica de “desbloqueo”
  // -------------------------
  const hasVerified = isMeaningfulNumber(score) && isMeaningfulNumber(capacidad);

  // Si el backend no manda score pero sí manda cuota/tasa/capacidad/ruta, igual es “resultado”.
  const hasResult =
    isMeaningfulNumber(capacidad) ||
    isMeaningfulNumber(cuota) ||
    isMeaningfulNumber(tasaAnual) ||
    !!bancoSugerido ||
    !!productoSugerido;

  const stage = hasVerified ? "verified" : hasResult ? "result" : progress > 0 ? "estimated" : "empty";

  // ✅ unlocked si hay resultado real
  const unlocked = stage === "verified" || stage === "result";

  const probability =
    pick(r, ["probabilidadAprobacion", "resultado.probabilidadAprobacion"]) ||
    (sinOferta
      ? "Sin oferta hoy"
      : score == null
      ? null
      : score >= 760
      ? "Muy alta"
      : score >= 700
      ? "Alta"
      : score >= 640
      ? "Media"
      : "Baja");

  const label =
    stage === "verified"
      ? "Verificado ✅"
      : stage === "result"
      ? "Resultado listo ✅"
      : stage === "estimated"
      ? "Estimación preliminar"
      : "Completa tu perfil";

  return {
    score,
    capacidad,
    cuota,
    tasaAnual,
    bancoSugerido,
    productoSugerido,
    sinOferta,
    progress,
    unlocked,
    probability,
    stage,
    label,
  };
}