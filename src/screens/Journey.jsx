// src/screens/Journey.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { getCustomerToken } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

const TOTAL_STEPS = 4;

const HORIZONTE_OPCIONES = [
  { value: "0-3", label: "En los próximos 0–3 meses" },
  { value: "3-12", label: "En 3–12 meses" },
  { value: "12-24", label: "En 12–24 meses" },
  { value: "explorando", label: "Solo estoy explorando" },
];

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `$${Math.round(x).toLocaleString("en-US")}`;
}

/* ===========================================================
   Helpers de compatibilidad snapshot
=========================================================== */
function buildLegacyOutputFromMatcher(resultado = {}) {
  const bestMortgage = resultado?.bestMortgage || null;
  const bestOption = resultado?.bestOption || null;
  const bestMortgageFull = bestOption?.mortgage || null;
  const bancosTop3 = Array.isArray(resultado?.bancosTop3) ? resultado.bancosTop3 : [];
  const eligibilityProducts = resultado?.eligibilityProducts || {};
  const propertyRecommendationPolicy = resultado?.propertyRecommendationPolicy || {};

  const bestSegment =
    bestMortgageFull?.segment ||
    bestOption?.mortgage?.segment ||
    null;

  const bestRate =
    bestMortgage?.annualRate ??
    bestMortgageFull?.annualRate ??
    null;

  const bestCuota =
    bestMortgage?.cuota ??
    bestMortgageFull?.cuota ??
    null;

  const bestMonto =
    bestMortgage?.montoPrestamo ??
    bestMortgageFull?.montoPrestamo ??
    null;

  const bestPlazo =
    bestMortgageFull?.termMonths ??
    null;

  const bestPrecioMax =
    bestMortgage?.precioMaxVivienda ??
    bestMortgageFull?.precioMaxVivienda ??
    null;

  const bestProb =
    bestMortgage?.probabilidad ||
    bestOption?.probabilidad ||
    null;

  const escenariosHL = {
    vis: null,
    vip: null,
    biess: null,
    biess_pref: null,
    biess_std: null,
    comercial: null,
  };

  const scenarios = Array.isArray(resultado?.scenarios) ? resultado.scenarios : [];

  for (const s of scenarios) {
    const mortgage = s?.mortgage;
    if (!mortgage) continue;

    if (mortgage.id === "VIS") {
      escenariosHL.vis = {
        viable: !!s.viable,
        tasaAnual: mortgage.annualRate ?? null,
        cuota: mortgage.cuota ?? null,
        montoPrestamo: mortgage.montoPrestamo ?? null,
        plazoMeses: mortgage.termMonths ?? null,
        precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
      };
    }

    if (mortgage.id === "VIP") {
      escenariosHL.vip = {
        viable: !!s.viable,
        tasaAnual: mortgage.annualRate ?? null,
        cuota: mortgage.cuota ?? null,
        montoPrestamo: mortgage.montoPrestamo ?? null,
        plazoMeses: mortgage.termMonths ?? null,
        precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
      };
    }

    if (
      mortgage.segment === "BIESS" &&
      (mortgage.id === "BIESS_CREDICASA" ||
        mortgage.id === "BIESS_VIS_VIP" ||
        mortgage.id === "BIESS_MEDIA" ||
        mortgage.id === "BIESS_ALTA" ||
        mortgage.id === "BIESS_LUJO")
    ) {
      if (!escenariosHL.biess || s.viable) {
        escenariosHL.biess = {
          viable: !!s.viable,
          tasaAnual: mortgage.annualRate ?? null,
          cuota: mortgage.cuota ?? null,
          montoPrestamo: mortgage.montoPrestamo ?? null,
          plazoMeses: mortgage.termMonths ?? null,
          precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
        };
      }

      if (mortgage.id === "BIESS_CREDICASA") {
        escenariosHL.biess_pref = {
          viable: !!s.viable,
          tasaAnual: mortgage.annualRate ?? null,
          cuota: mortgage.cuota ?? null,
          montoPrestamo: mortgage.montoPrestamo ?? null,
          plazoMeses: mortgage.termMonths ?? null,
          precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
        };
      } else {
        escenariosHL.biess_std = {
          viable: !!s.viable,
          tasaAnual: mortgage.annualRate ?? null,
          cuota: mortgage.cuota ?? null,
          montoPrestamo: mortgage.montoPrestamo ?? null,
          plazoMeses: mortgage.termMonths ?? null,
          precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
        };
      }
    }

    if (mortgage.id === "PRIVATE" || mortgage.segment === "PRIVATE") {
      escenariosHL.comercial = {
        viable: !!s.viable,
        tasaAnual: mortgage.annualRate ?? null,
        cuota: mortgage.cuota ?? null,
        montoPrestamo: mortgage.montoPrestamo ?? null,
        plazoMeses: mortgage.termMonths ?? null,
        precioMaxVivienda: mortgage.precioMaxVivienda ?? null,
      };
    }
  }

  const rutasViables = scenarios
    .filter((s) => s?.viable)
    .map((s) => ({
      tipo:
        s?.mortgage?.segment === "PRIVATE"
          ? "Privada"
          : s?.mortgage?.segment || s?.mortgage?.id || s?.label || null,
      tasa: s?.annualRate ?? null,
      plazo: s?.mortgage?.termMonths ?? null,
      cuota: s?.cuota ?? null,
      viable: !!s?.viable,
    }));

  const rutaRecomendada = bestMortgage
    ? {
        tipo:
          bestSegment === "PRIVATE"
            ? "Privada"
            : bestSegment || bestMortgage?.label || null,
        tasa: bestRate,
        plazo: bestPlazo,
        cuota: bestCuota,
        viable: !!bestOption?.viable,
      }
    : null;

  return {
    ok: true,

    productoElegido:
      bestSegment === "PRIVATE"
        ? "Banca privada"
        : bestSegment || null,

    productoSugerido:
      bestSegment === "PRIVATE"
        ? "Banca privada"
        : bestSegment || null,

    bancoSugerido: bancosTop3?.[0]?.banco || null,
    mejorBanco: bancosTop3?.[0] || null,
    bancosTop3,
    bancosProbabilidad: bancosTop3,

    tasaAnual: bestRate,
    plazoMeses: bestPlazo,
    cuotaEstimada: bestCuota,
    montoMaximo: bestMonto,
    precioMaxVivienda: bestPrecioMax,

    probabilidad: bestProb,
    bestMortgage,
    bestOption,
    rankedMortgages: resultado?.rankedMortgages || [],
    recommendationExplanation: resultado?.recommendationExplanation || null,
    eligibilityProducts,
    propertyRecommendationPolicy,

    escenariosHL,
    rutasViables,
    rutaRecomendada,

    flags: {
      sinOferta: !bestMortgage,
    },
  };
}

/* ===========================================================
   SliderField
=========================================================== */
function SliderField({
  label,
  helper,
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (v) => v,
}) {
  const num = Number(value) || 0;

  const handleRange = (e) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    onChange(String(v));
  };

  const handleText = (e) => {
    let raw = String(e.target.value ?? "").replace(/[^\d]/g, "");
    if (!raw) raw = "0";
    let n = Number(raw);
    if (!Number.isFinite(n)) n = 0;
    n = clamp(n, min, max);
    onChange(String(n));
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label ? (
        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 8 }}>
          {label}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.75, marginBottom: 8 }}>
        <span style={{ fontWeight: 800, opacity: 0.95 }}>{format(num)}</span>
        <span style={{ opacity: 0.8 }}>
          {format(min)} – {format(max)}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={handleRange}
          aria-label={label || "slider"}
          style={{
            flex: 1,
            height: 10,
            borderRadius: 999,
            cursor: "pointer",
            touchAction: "pan-y",
          }}
        />

        <input
          type="text"
          value={format(num)}
          onChange={handleText}
          inputMode="numeric"
          pattern="[0-9]*"
          style={{
            width: 110,
            height: 44,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            padding: "0 12px",
            textAlign: "right",
            outline: "none",
            fontWeight: 900,
          }}
        />
      </div>

      {helper ? (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options, helper }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 8 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 46,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          padding: "0 12px",
          outline: "none",
          fontWeight: 800,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#0b1020" }}>
            {o.label}
          </option>
        ))}
      </select>
      {helper ? (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>{helper}</div>
      ) : null}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {children}
    </span>
  );
}

async function apiPost(path, body) {
  const token = getCustomerToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function Journey() {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

  const existing = loadJSON(LS_JOURNEY);

  const [step, setStep] = useState(existing?.step ? Number(existing.step) : 1);

  const [nacionalidad, setNacionalidad] = useState(existing?.form?.nacionalidad || "ecuatoriana");
  const [estadoCivil, setEstadoCivil] = useState(existing?.form?.estadoCivil || "soltero");
  const [edad, setEdad] = useState(existing?.form?.edad || "30");
  const [tipoIngreso, setTipoIngreso] = useState(existing?.form?.tipoIngreso || "Dependiente");
  const [aniosEstabilidad, setAniosEstabilidad] = useState(existing?.form?.aniosEstabilidad || "2");
  const [sustentoIndependiente, setSustentoIndependiente] = useState(existing?.form?.sustentoIndependiente || "declaracion");

  const [ingreso, setIngreso] = useState(existing?.form?.ingreso || "1200");
  const [ingresoPareja, setIngresoPareja] = useState(existing?.form?.ingresoPareja || "0");
  const [deudas, setDeudas] = useState(existing?.form?.deudas || "300");

  const [afiliadoIESS, setAfiliadoIESS] = useState(existing?.form?.afiliadoIESS || "no");
  const [aportesTotales, setAportesTotales] = useState(existing?.form?.aportesTotales || "0");
  const [aportesConsecutivos, setAportesConsecutivos] = useState(existing?.form?.aportesConsecutivos || "0");

  const [valorVivienda, setValorVivienda] = useState(existing?.form?.valorVivienda || "90000");
  const [entrada, setEntrada] = useState(existing?.form?.entrada || "15000");
  const [tieneVivienda, setTieneVivienda] = useState(existing?.form?.tieneVivienda || "no");
  const [primeraVivienda, setPrimeraVivienda] = useState(existing?.form?.primeraVivienda || "sí");
  const [tipoVivienda, setTipoVivienda] = useState(existing?.form?.tipoVivienda || "por_estrenar");
  const [horizonteCompra, setHorizonteCompra] = useState(existing?.form?.horizonteCompra || "");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const afiliadoBool = afiliadoIESS === "sí";
  const esParejaFormal = estadoCivil === "casado" || estadoCivil === "union_de_hecho";

  const toNum = (v) => {
    const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const ingresoUsado = toNum(ingreso) + (esParejaFormal ? toNum(ingresoPareja) : 0);

  const entradaPct = useMemo(() => {
    const v = toNum(valorVivienda);
    const e = toNum(entrada);
    if (!v) return 0;
    return Math.round((e / v) * 100);
  }, [valorVivienda, entrada]);

  useEffect(() => {
    const payload = {
      step,
      updatedAt: new Date().toISOString(),
      form: {
        nacionalidad,
        estadoCivil,
        edad,
        tipoIngreso,
        aniosEstabilidad,
        sustentoIndependiente,
        ingreso,
        ingresoPareja,
        deudas,
        afiliadoIESS,
        aportesTotales,
        aportesConsecutivos,
        valorVivienda,
        entrada,
        tieneVivienda,
        primeraVivienda,
        tipoVivienda,
        horizonteCompra,
      },
    };
    saveJSON(LS_JOURNEY, payload);
  }, [
    step,
    nacionalidad, estadoCivil, edad, tipoIngreso, aniosEstabilidad, sustentoIndependiente,
    ingreso, ingresoPareja, deudas, afiliadoIESS, aportesTotales, aportesConsecutivos,
    valorVivienda, entrada, tieneVivienda, primeraVivienda, tipoVivienda, horizonteCompra,
  ]);

  function validate(s) {
    if (s === 1) {
      if ((tipoIngreso === "Dependiente" || tipoIngreso === "Mixto") && toNum(aniosEstabilidad) < 1) {
        return "Mínimo 1 año en tu empleo actual o actividad principal.";
      }
      const e = toNum(edad);
      if (e < 21 || e > 75) return "La edad debe estar entre 21 y 75.";
    }

    if (s === 2) {
      if (ingresoUsado < 450) return "El ingreso considerado debe ser al menos $450.";
      if (toNum(deudas) < 0) return "Las deudas no pueden ser negativas.";
      if (afiliadoBool) {
        if (toNum(aportesTotales) < 0 || toNum(aportesConsecutivos) < 0) return "Revisa tus aportes IESS.";
      }
    }

    if (s === 3) {
      if (toNum(valorVivienda) < 30000) return "El valor mínimo de vivienda que analizamos es $30.000.";
      if (!horizonteCompra) return "Elige en qué plazo te gustaría adquirir tu vivienda.";
      if (toNum(entrada) > toNum(valorVivienda)) return "Tu entrada no puede ser mayor al valor de la vivienda.";
    }

    return null;
  }

  const next = () => {
    const e = validate(step);
    if (e) return setErr(e);
    setErr("");
    setStep((x) => Math.min(TOTAL_STEPS, x + 1));
  };

  const back = () => {
    setErr("");
    setStep((x) => Math.max(1, x - 1));
  };

  function buildEntradaPayload() {
    return {
      nacionalidad,
      estadoCivil,
      edad: toNum(edad),

      tipoIngreso,
      aniosEstabilidad: toNum(aniosEstabilidad),
      sustentoIndependiente,

      ingresoNetoMensual: toNum(ingreso),
      ingresoPareja: esParejaFormal ? toNum(ingresoPareja) : 0,
      otrasDeudasMensuales: toNum(deudas),

      afiliadoIess: afiliadoBool,
      iessAportesTotales: toNum(aportesTotales),
      iessAportesConsecutivos: toNum(aportesConsecutivos),

      valorVivienda: toNum(valorVivienda),
      entradaDisponible: toNum(entrada),

      tieneVivienda: tieneVivienda === "sí",
      primeraVivienda: primeraVivienda === "sí",
      viviendaEstrenar: tipoVivienda === "por_estrenar",
      tipoVivienda,

      tiempoCompra: horizonteCompra || null,
      origen: "journey_mobile",
    };
  }

  async function handleCalcular() {
    if (loading) return;

    const token = getCustomerToken();

    if (!token) {
      navigate("/login?next=/journey", { replace: true });
      return;
    }

    const e = validate(3);
    if (e) return setErr(e);

    setLoading(true);
    setErr("");

    try {
      const entradaPayload = buildEntradaPayload();
      const resultado = await apiPost("/api/mortgage/match", entradaPayload);
      const legacyOutput = buildLegacyOutputFromMatcher(resultado);

     const snapshot = {
  ok: true,
  ...legacyOutput,
  input: entradaPayload,
  output: legacyOutput,
  perfilInput: entradaPayload,
  __entrada: entradaPayload,
  ts: Date.now(),
};

      saveJSON(LS_SNAPSHOT, snapshot);

      saveJSON(LS_JOURNEY, {
        step: 4,
        updatedAt: new Date().toISOString(),
        form: loadJSON(LS_JOURNEY)?.form || {},
        resultado: snapshot,
      });

      navigate("/", { replace: true });
    } catch (ex) {
      console.error(ex);
      setErr(ex?.message || "No se pudo calcular tu resultado ahora.");
    } finally {
      setLoading(false);
    }
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div
      ref={scrollerRef}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #071024 0%, #0b1a35 100%)",
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Precalificador HabitaLibre</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>Completa tu perfil</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, lineHeight: 1.35 }}>
            Te toma menos de 2 minutos. Te damos cuota, ruta sugerida y checklist.
          </div>
        </div>

        <Pill>
          Paso {step}/{TOTAL_STEPS}
        </Pill>
      </div>

      <div style={{ marginTop: 14, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, background: "#25d3a6", transition: "width 200ms ease" }} />
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 18,
          borderRadius: 22,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        {step === 1 && (
          <>
            <SelectField
              label="Nacionalidad"
              value={nacionalidad}
              onChange={setNacionalidad}
              options={[
                { value: "ecuatoriana", label: "Ecuatoriana 🇪🇨" },
                { value: "otra", label: "Otra nacionalidad 🌍" },
              ]}
            />

            <SelectField
              label="Estado civil"
              helper="Si estás casad@ o en unión de hecho, podremos considerar el ingreso de tu pareja."
              value={estadoCivil}
              onChange={setEstadoCivil}
              options={[
                { value: "soltero", label: "Soltero/a" },
                { value: "casado", label: "Casado/a" },
                { value: "union_de_hecho", label: "Unión de hecho" },
                { value: "divorciado", label: "Divorciado/a" },
                { value: "viudo", label: "Viudo/a" },
              ]}
            />

            <SliderField
              label="Edad"
              min={21}
              max={75}
              step={1}
              value={edad}
              onChange={setEdad}
              format={(v) => `${v} años`}
            />

            <SelectField
              label="Tipo de ingreso"
              value={tipoIngreso}
              onChange={setTipoIngreso}
              options={[
                { value: "Dependiente", label: "Relación de dependencia" },
                { value: "Independiente", label: "Independiente / RUC" },
                { value: "Mixto", label: "Mixto" },
              ]}
            />

            {(tipoIngreso === "Dependiente" || tipoIngreso === "Mixto") && (
              <SliderField
                label="Años de estabilidad laboral"
                helper="Mínimo 1 año en tu empleo actual o actividad principal."
                min={1}
                max={40}
                step={1}
                value={aniosEstabilidad}
                onChange={setAniosEstabilidad}
                format={(v) => `${v} años`}
              />
            )}

            {(tipoIngreso === "Independiente" || tipoIngreso === "Mixto") && (
              <SelectField
                label="¿Cómo sustentas tus ingresos?"
                helper="Esto ayuda a recomendarte la ruta correcta."
                value={sustentoIndependiente}
                onChange={setSustentoIndependiente}
                options={[
                  { value: "declaracion", label: "Declaración de Impuesto a la Renta" },
                  { value: "movimientos", label: "Movimientos bancarios (6 meses)" },
                  { value: "ambos", label: "Ambos" },
                  { value: "informal", label: "Ninguno (ingreso informal)" },
                ]}
              />
            )}
          </>
        )}

        {step === 2 && (
          <>
            <SliderField
              label="Tu ingreso neto mensual"
              min={450}
              max={15000}
              step={50}
              value={ingreso}
              onChange={setIngreso}
              format={(v) => money(v)}
            />

            {esParejaFormal && (
              <SliderField
                label="Ingreso neto mensual de tu pareja (opcional)"
                min={0}
                max={15000}
                step={50}
                value={ingresoPareja}
                onChange={setIngresoPareja}
                format={(v) => money(v)}
              />
            )}

            <SliderField
              label="Otras deudas mensuales (tarjetas, préstamos, etc.)"
              min={0}
              max={5000}
              step={50}
              value={deudas}
              onChange={setDeudas}
              format={(v) => money(v)}
            />

            <SelectField
              label="¿Estás afiliado al IESS?"
              value={afiliadoIESS}
              onChange={setAfiliadoIESS}
              options={[
                { value: "no", label: "No" },
                { value: "sí", label: "Sí" },
              ]}
            />

            {afiliadoBool && (
              <>
                <SliderField
                  label="Aportes IESS totales (meses)"
                  helper="Para BIESS suelen requerirse al menos 36 aportes totales."
                  min={0}
                  max={600}
                  step={1}
                  value={aportesTotales}
                  onChange={setAportesTotales}
                  format={(v) => `${v} meses`}
                />

                <SliderField
                  label="Aportes IESS consecutivos (meses)"
                  helper="Suelen pedir mínimo 13 aportes consecutivos."
                  min={0}
                  max={600}
                  step={1}
                  value={aportesConsecutivos}
                  onChange={setAportesConsecutivos}
                  format={(v) => `${v} meses`}
                />
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ borderRadius: 18, padding: 12, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Valor objetivo</div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 900 }}>{money(valorVivienda)}</div>
              </div>
              <div style={{ borderRadius: 18, padding: 12, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Entrada aprox.</div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 900 }}>
                  {money(entrada)}{" "}
                  <span style={{ fontSize: 12, opacity: 0.8, color: "#25d3a6" }}>({entradaPct}%)</span>
                </div>
              </div>
            </div>

            <SliderField
              label="Valor aproximado de la vivienda (USD)"
              min={30000}
              max={500000}
              step={1000}
              value={valorVivienda}
              onChange={setValorVivienda}
              format={(v) => money(v)}
            />

            <SliderField
              label="Entrada disponible (USD)"
              helper="Incluye ahorros, cesantía, fondos de reserva u otros."
              min={0}
              max={500000}
              step={500}
              value={entrada}
              onChange={setEntrada}
              format={(v) => money(v)}
            />

            <SelectField
              label="¿Tienes actualmente una vivienda?"
              value={tieneVivienda}
              onChange={setTieneVivienda}
              options={[
                { value: "no", label: "No" },
                { value: "sí", label: "Sí" },
              ]}
            />

            <SelectField
              label="¿Es tu primera vivienda?"
              value={primeraVivienda}
              onChange={setPrimeraVivienda}
              options={[
                { value: "sí", label: "Sí" },
                { value: "no", label: "No" },
              ]}
            />

            <SelectField
              label="Estado de la vivienda"
              value={tipoVivienda}
              onChange={setTipoVivienda}
              options={[
                { value: "por_estrenar", label: "Por estrenar / proyecto nuevo" },
                { value: "usada", label: "Usada / segunda mano" },
              ]}
            />

            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.9, marginBottom: 10 }}>
              ¿En qué plazo te gustaría adquirir tu vivienda?
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {HORIZONTE_OPCIONES.map((opt) => {
                const selected = horizonteCompra === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHorizonteCompra(opt.value)}
                    style={{
                      borderRadius: 18,
                      padding: 12,
                      textAlign: "left",
                      border: selected ? "1px solid rgba(37,211,166,0.65)" : "1px solid rgba(255,255,255,0.12)",
                      background: selected ? "rgba(37,211,166,0.12)" : "rgba(255,255,255,0.06)",
                      color: "white",
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, lineHeight: 1.25, opacity: 0.95 }}>{opt.label}</span>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        border: selected ? "1px solid rgba(0,0,0,0.5)" : "1px solid rgba(255,255,255,0.25)",
                        background: selected ? "#052019" : "transparent",
                        color: selected ? "#25d3a6" : "rgba(255,255,255,0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>✅ Listo para ver tu resultado</div>
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
              Revisaremos tu capacidad de pago y la ruta sugerida (VIS/VIP/BIESS/privado).
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
              Monto referencial a analizar:{" "}
              <span style={{ fontWeight: 900, color: "white" }}>{money(toNum(valorVivienda) - toNum(entrada))}</span>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
              ⚖️ Las precalificaciones son estimaciones referenciales. No constituyen aprobación ni oferta formal.
            </div>
          </>
        )}

        {err ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 16,
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.30)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          {step > 1 ? (
            <button
              onClick={back}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 900,
              }}
            >
              Atrás
            </button>
          ) : null}

          {step < 4 ? (
            <button
              onClick={next}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                border: "none",
                background: "#25d3a6",
                color: "#052019",
                fontWeight: 900,
              }}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleCalcular}
              disabled={loading}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                border: "none",
                background: "#25d3a6",
                color: "#052019",
                fontWeight: 900,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Analizando…"
                : getCustomerToken()
                  ? "Ver resultados"
                  : "Entrar para ver resultados"}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, opacity: 0.55, lineHeight: 1.35 }}>
        {getCustomerToken()
          ? "Sesión activa: tu resultado se guardará en tu cuenta."
          : "Tip: crea una cuenta para guardar tu progreso y retomar tu camino."}
      </div>
    </div>
  );
}