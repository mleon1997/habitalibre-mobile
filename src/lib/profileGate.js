// src/lib/profileGate.js
export function hasMinimumProfile(journey) {
  // Ajusta estos campos a los que tú ya guardas en tu journey
  const p = journey?.perfil || journey?.profile || journey;

  const edad = p?.edad ?? p?.age;
  const ingreso = p?.ingresoMensual ?? p?.income;
  const estabilidad = p?.aniosEstabilidad ?? p?.stabilityYears;

  return Boolean(edad && ingreso && estabilidad);
}