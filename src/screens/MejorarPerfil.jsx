// src/screens/MejorarPerfil.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost, API_BASE } from "../lib/api.js";
import { moneyUSD } from "../lib/money.js";
import { getCustomerToken } from "../lib/customerSession.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

/* ---------------- storage ---------------- */
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

/* ---------------- ui primitives ---------------- */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function Pill({ children }) {
  // ✅ evita crash si children es objeto (Score/Prob)
  const safe =
    typeof children === "object" && children !== null ? JSON.stringify(children) : children;

  return (
    <span
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
        whiteSpace: "nowrap",
      }}
    >
      {safe}
    </span>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 22,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      {children}
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        border: active
          ? "1px solid rgba(37,211,166,0.35)"
          : "1px solid rgba(255,255,255,0.14)",
        background: active ? "rgba(37,211,166,0.14)" : "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function fmtUSD(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `$${Math.round(x).toLocaleString("es-EC")}`;
}

/* ---------------- helpers (data) ---------------- */
function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// soporta snapshot plano o nested (output)
function pick(snapshot, keys) {
  if (!snapshot) return null;
  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }
  return null;
}

function safeMoney(n) {
  const x = toNum(n);
  return x == null ? "—" : moneyUSD(x);
}

/**
 * ✅ Normaliza "probability" venga como:
 * - number (0.64 o 64)
 * - string ("64%" o "0.64")
 * - object ({ total, bandas } u otros)
 * - array (tomamos el primer valor útil)
 */
function normalizeProbability(prob) {
  const clampPct = (p) => {
    if (!Number.isFinite(p)) return null;
    return Math.max(0, Math.min(100, p));
  };

  const parseAnyToPct = (x, depth = 0) => {
    if (x == null) return null;

    if (typeof x === "number") return clampPct(x <= 1 ? x * 100 : x);

    if (typeof x === "string") {
      const s = x.trim();
      const m = s.match(/(\d+(\.\d+)?)/);
      if (!m) return null;
      const n = Number(m[1]);
      if (!Number.isFinite(n)) return null;
      const p = s.includes("%") ? n : n <= 1 ? n * 100 : n;
      return clampPct(p);
    }

    if (Array.isArray(x)) {
      for (const item of x) {
        const p = parseAnyToPct(item, depth + 1);
        if (p != null) return p;
      }
      return null;
    }

    if (typeof x === "object") {
      const direct =
        parseAnyToPct(x.pct, depth + 1) ??
        parseAnyToPct(x.value, depth + 1) ??
        parseAnyToPct(x.total, depth + 1) ?? // ✅ tu caso { total, bandas }
        parseAnyToPct(x.prob, depth + 1) ??
        parseAnyToPct(x.probabilidad, depth + 1) ??
        parseAnyToPct(x.aprobacion, depth + 1) ??
        parseAnyToPct(x.probAprobacion, depth + 1) ??
        parseAnyToPct(x.aprobacionProb, depth + 1);

      if (direct != null) return direct;

      if (depth >= 3) return null;
      for (const v of Object.values(x)) {
        const p = parseAnyToPct(v, depth + 1);
        if (p != null) return p;
      }
      return null;
    }

    return null;
  };

  const pctValue = parseAnyToPct(prob);

  return pctValue == null
    ? { label: "—", pct: null }
    : { label: `${Math.round(pctValue)}%`, pct: pctValue };
}

function ProbabilityBar({ valuePct, hint }) {
  const v = valuePct == null ? null : Math.max(0, Math.min(100, Number(valuePct)));
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
          Probabilidad de aprobación
        </div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 900 }}>
          {v == null ? "—" : `${Math.round(v)}%`}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 10,
          width: "100%",
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: v == null ? "0%" : `${v}%`,
            borderRadius: 999,
            background: "#25d3a6",
            transition: "width 250ms ease",
          }}
        />
      </div>

      {hint ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.25 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Slider fintech “usable”:
 * - rango default configurable
 * - step dinámico para apuntar exacto en rangos bajos
 */
function SliderMoney({
  label,
  helper,
  value,
  onChange,
  min = 0,
  max = 15000,
  fineUntil = 6000,
  stepFine = 25,
  stepCoarse = 100,
}) {
  const v = Number(toNum(value) ?? 0);
  const step = v <= fineUntil ? stepFine : stepCoarse;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 900 }}>{label}</div>
      {helper ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, lineHeight: 1.3 }}>
          {helper}
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{fmtUSD(v)}</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          {fmtUSD(min)} – {fmtUSD(max)}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(v, min, max)}
        onChange={(e) => onChange(String(e.target.value))}
        style={{ width: "100%", marginTop: 10, accentColor: "#25d3a6" }}
        aria-label={label}
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => onChange(String(clamp(v - stepFine * 4, min, max)))}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontWeight: 900,
          }}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(String(clamp(v + stepFine * 4, min, max)))}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontWeight: 900,
          }}
        >
          +
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
        Tip: cerca de valores bajos el slider usa pasos finos para apuntar exacto.
      </div>
    </div>
  );
}

/* ---------------- screen ---------------- */
export default function MejorarPerfil() {
  const nav = useNavigate();

  const token = getCustomerToken();
  const isLoggedIn = !!token;

  const [tab, setTab] = useState("palancas"); // "palancas" | "falta"

  const [journey, setJourney] = useState(() => loadJSON(LS_JOURNEY));
  const [snapshot, setSnapshot] = useState(() => loadJSON(LS_SNAPSHOT));

  // ✅ sliders (default: lo que haya en journey o valores razonables)
  const [ingreso, setIngreso] = useState(() => {
    const j = loadJSON(LS_JOURNEY);
    const f = j?.form || {};
    return String(
      f?.ingreso ??
        f?.ingresoNetoMensual ??
        f?.ingresoMensual ??
        pick(loadJSON(LS_SNAPSHOT), ["ingresoNetoMensual", "ingresoTotal"]) ??
        1200
    );
  });

  const [deudas, setDeudas] = useState(() => {
    const j = loadJSON(LS_JOURNEY);
    const f = j?.form || {};
    return String(
      f?.deudas ??
        f?.otrasDeudasMensuales ??
        f?.deudasMensuales ??
        pick(loadJSON(LS_SNAPSHOT), ["otrasDeudasMensuales"]) ??
        200
    );
  });

  const [entrada, setEntrada] = useState(() => {
    const j = loadJSON(LS_JOURNEY);
    const f = j?.form || {};
    return String(
      f?.entrada ??
        f?.entradaDisponible ??
        f?.ahorro ??
        pick(loadJSON(LS_SNAPSHOT), ["entradaDisponible"]) ??
        8000
    );
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  // ✅ salida resumida para mostrar impacto
  const cuotaEstimada = pick(snapshot, ["cuotaEstimada"]);
  const precioMaxVivienda = pick(snapshot, ["precioMaxVivienda", "precioMax", "valorMaxVivienda"]);
  const dti = pick(snapshot, ["dtiConHipoteca", "dti"]);
  const scoreRaw = pick(snapshot, ["score", "hlScore", "scoreHL"]);

  // ✅ score seguro (evita [object Object])
  const score = useMemo(() => {
    if (scoreRaw == null) return null;
    if (typeof scoreRaw === "number" || typeof scoreRaw === "string") return scoreRaw;
    if (typeof scoreRaw === "object") return scoreRaw?.total ?? scoreRaw?.value ?? null;
    return null;
  }, [scoreRaw]);

  // ✅ label DTI (arreglo el bug de "dtiLabel is not defined")
  const dtiLabel = useMemo(() => {
    const x = Number(dti);
    if (!Number.isFinite(x)) return "—";
    if (x <= 0.35) return "Saludable";
    if (x <= 0.45) return "Ajustado";
    return "Riesgoso";
  }, [dti]);

  // ✅ probabilidad (puede venir objeto/array/string/number)
  const probabilityRaw =
    pick(snapshot, [
      "probability",
      "probabilidad",
      "probabilidadAprobacion",
      "probAprobacion",
      "aprobacionProb",
      "prob",
      "probNormalized",
      "prob_normalized",
      "probabilityNormalized",
    ]) ?? null;

  const prob = useMemo(() => {
    const p = normalizeProbability(probabilityRaw);
    if (p.pct != null) return p;

    // fallback: usar score.total si existe y parece porcentaje
    const scoreObj = pick(snapshot, ["score", "hlScore", "scoreHL"]);
    const maybe = scoreObj && typeof scoreObj === "object" ? scoreObj?.total : null;
    if (typeof maybe === "number" && Number.isFinite(maybe)) {
      const pct = Math.max(0, Math.min(100, maybe));
      return { label: `${Math.round(pct)}%`, pct };
    }

    return { label: "—", pct: null };
  }, [probabilityRaw, snapshot]);

  // payload builder: usa journey.form si existe y pisa solo 3 cosas
  function buildEntradaPayload() {
    const f = journey?.form || {};
    const base = {
      nacionalidad: f?.nacionalidad ?? "ecuatoriana",
      estadoCivil: f?.estadoCivil ?? "soltero",
      edad: Number(toNum(f?.edad ?? 30) ?? 30),

      tipoIngreso: f?.tipoIngreso ?? "Dependiente",
      aniosEstabilidad: Number(toNum(f?.aniosEstabilidad ?? 2) ?? 2),

      tieneVivienda: String(f?.tieneVivienda ?? "no") === "sí",
      primeraVivienda: String(f?.primeraVivienda ?? "sí") === "sí",
      tipoVivienda: f?.tipoVivienda ?? "por_estrenar",

      afiliadoIess: String(f?.afiliadoIESS ?? f?.afiliadoIess ?? "no") === "sí",
      iessAportesTotales: Number(toNum(f?.aportesTotales ?? f?.iessAportesTotales ?? 0) ?? 0),
      iessAportesConsecutivos: Number(
        toNum(f?.aportesConsecutivos ?? f?.iessAportesConsecutivos ?? 0) ?? 0
      ),

      valorVivienda: Number(toNum(f?.valor ?? f?.valorVivienda ?? 90000) ?? 90000),
      tiempoCompra: f?.horizonteCompra ?? f?.tiempoCompra ?? "3-12",

      origen: "mobile_mejorar_perfil",
    };

    return {
      ...base,
      ingresoNetoMensual: Number(toNum(ingreso) ?? 0),
      otrasDeudasMensuales: Number(toNum(deudas) ?? 0),
      entradaDisponible: Number(toNum(entrada) ?? 0),
    };
  }

  // ✅ Debounce recalculo (no spamear backend mientras arrastras)
  const debounceRef = useRef(null);

  async function recalcular() {
    setErr("");
    setBusy(true);

    try {
      const payload = buildEntradaPayload();
      const res = await apiPost("/api/precalificar", payload);
      console.log("RESPUESTA BACKEND:", res);

      const snap = res && typeof res === "object" ? res : { output: res };

      setSnapshot(snap);
      saveJSON(LS_SNAPSHOT, snap);

      const nextJourney = {
        ...(journey || {}),
        form: {
          ...(journey?.form || {}),
          ingreso: String(Number(toNum(ingreso) ?? 0)),
          deudas: String(Number(toNum(deudas) ?? 0)),
          entrada: String(Number(toNum(entrada) ?? 0)),
          ingresoNetoMensual: String(Number(toNum(ingreso) ?? 0)),
          otrasDeudasMensuales: String(Number(toNum(deudas) ?? 0)),
          entradaDisponible: String(Number(toNum(entrada) ?? 0)),
        },
      };

      setJourney(nextJourney);
      saveJSON(LS_JOURNEY, nextJourney);

      setLastUpdatedAt(new Date().toLocaleString("es-EC"));
    } catch (e) {
      console.warn("[HL] MejorarPerfil recalcular error:", e?.message || e);
      setErr(e?.message || "No se pudo recalcular ahora. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      recalcular();
    }, 550);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingreso, deudas, entrada]);

  const unlocked = isLoggedIn;

  // ✅ "Qué me falta" — brecha vs vivienda objetivo
  const valorViviendaObjetivo = useMemo(() => {
    const f = journey?.form || {};
    return (
      toNum(f?.valorVivienda) ??
      toNum(f?.valor) ??
      toNum(f?.precioVivienda) ??
      toNum(f?.precioObjetivo) ??
      null
    );
  }, [journey]);

  const falta = useMemo(() => {
    const maxV = toNum(precioMaxVivienda);
    const obj = toNum(valorViviendaObjetivo);

    if (maxV == null || obj == null) return null;

    const gap = Math.max(0, obj - maxV);
    const ok = gap <= 0;

    const monthlySave = 300; // default; luego lo hacemos editable
    const months = monthlySave > 0 ? Math.ceil(gap / monthlySave) : null;

    return {
      maxV,
      obj,
      gap,
      ok,
      monthlySave,
      months,
    };
  }, [precioMaxVivienda, valorViviendaObjetivo]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 30% 0%, #123a7a 0%, #071024 45%, #0b1a35 100%)",
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      {/* top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <button
          onClick={() => nav("/", { replace: true })}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: 18,
            cursor: "pointer",
          }}
          aria-label="Volver"
        >
          ←
        </button>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Pill>{unlocked ? "Perfil activo ✅" : "Explorar"}</Pill>
          {valorViviendaObjetivo != null ? <Pill>Vivienda: {fmtUSD(valorViviendaObjetivo)}</Pill> : null}
        </div>
      </div>

      {/* title */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 2, fontWeight: 900 }}>
          HABITALIBRE
        </div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>
          Mejorar mi perfil
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
          Ajusta tus palancas y mira el impacto. (API: {API_BASE})
        </div>
      </div>

      {/* tabs */}
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <TabButton active={tab === "palancas"} onClick={() => setTab("palancas")}>
          Palancas
        </TabButton>
        <TabButton active={tab === "falta"} onClick={() => setTab("falta")}>
          Qué me falta
        </TabButton>
      </div>

      {/* RESUMEN (siempre visible) */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Tu resultado</div>
          <Pill>{busy ? "Recalculando…" : lastUpdatedAt ? `Actualizado: ${lastUpdatedAt}` : "Listo"}</Pill>
        </div>

        <ProbabilityBar
          valuePct={prob?.pct}
          hint="Este % viene del motor. Tu meta: subirlo bajando DTI o aumentando entrada."
        />

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Precio máx recomendado</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {unlocked ? safeMoney(precioMaxVivienda) : "—"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65, lineHeight: 1.25 }}>
              Es el número más importante.
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Cuota estimada</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {unlocked ? safeMoney(cuotaEstimada) : "—"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              DTI: {unlocked ? dtiLabel : "—"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Pill>Score: {unlocked ? (score ?? "—") : "—"}</Pill>
          <Pill>Prob: {prob?.label ?? "—"}</Pill>
          <Pill>Entrada: {fmtUSD(Number(toNum(entrada) ?? 0))}</Pill>
          <Pill>Ingresos: {fmtUSD(Number(toNum(ingreso) ?? 0))}</Pill>
          <Pill>Deudas: {fmtUSD(Number(toNum(deudas) ?? 0))}</Pill>
        </div>

        {!unlocked ? (
          <button
            onClick={() => nav("/login?next=/mejorar", { replace: true })}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "none",
              background: "#25d3a6",
              fontWeight: 900,
              color: "#052019",
            }}
          >
            Entrar para ver tu resultado real
          </button>
        ) : null}
      </Card>

      {/* TAB: PALANCAS */}
      {tab === "palancas" ? (
        <Card>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Ajusta tus palancas</div>
          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13, lineHeight: 1.35 }}>
            Esto recalcula automáticamente mientras ajustas.
          </div>

          <SliderMoney
            label="Ingreso neto mensual"
            helper="Subir ingresos demostrables suele mejorar aprobación y tasa."
            value={ingreso}
            onChange={setIngreso}
            max={20000}
            fineUntil={6000}
            stepFine={25}
            stepCoarse={100}
          />

          <SliderMoney
            label="Deudas mensuales (tarjetas, préstamos, etc.)"
            helper="Bajar esto mejora tu DTI (la palanca #1)."
            value={deudas}
            onChange={setDeudas}
            max={15000}
            fineUntil={3000}
            stepFine={25}
            stepCoarse={100}
          />

          <SliderMoney
            label="Entrada disponible"
            helper="Incluye ahorros, cesantía y fondos de reserva."
            value={entrada}
            onChange={setEntrada}
            max={
              valorViviendaObjetivo != null
                ? Math.max(15000, Math.round(valorViviendaObjetivo * 0.6))
                : 15000
            }
            fineUntil={15000}
            stepFine={50}
            stepCoarse={200}
          />

          {!!err && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 16,
                background: "rgba(244,63,94,0.10)",
                border: "1px solid rgba(244,63,94,0.25)",
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              {err}
            </div>
          )}

          <button
            onClick={recalcular}
            disabled={busy}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "none",
              background: busy ? "rgba(37,211,166,0.35)" : "#25d3a6",
              fontWeight: 900,
              color: "#052019",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Recalculando…" : "Recalcular ahora"}
          </button>

          <button
            onClick={() => nav("/", { replace: true })}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
            }}
          >
            Volver al Home
          </button>
        </Card>
      ) : null}

      {/* TAB: QUÉ ME FALTA */}
      {tab === "falta" ? (
        <Card>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Qué me falta</div>
          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13, lineHeight: 1.35 }}>
            Te mostramos la brecha entre tu vivienda objetivo y tu capacidad actual.
          </div>

          {falta ? (
            <>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Tu objetivo</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{moneyUSD(falta.obj)}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
                    Valor de la vivienda que quieres.
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Tu capacidad hoy</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{moneyUSD(falta.maxV)}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
                    Precio máx recomendado por el motor.
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: falta.ok ? "rgba(37,211,166,0.10)" : "rgba(255,193,7,0.10)",
                  border: falta.ok ? "1px solid rgba(37,211,166,0.25)" : "1px solid rgba(255,193,7,0.25)",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  {falta.ok ? "✅ Ya te alcanza (según tu perfil)" : "📉 Te falta cerrar una brecha"}
                </div>
                <div style={{ marginTop: 6, opacity: 0.9, lineHeight: 1.35, fontSize: 13 }}>
                  {falta.ok
                    ? "Siguiente paso: prepara documentos y elige producto/banco."
                    : `Brecha estimada: ${moneyUSD(falta.gap)}.`}
                </div>

                {!falta.ok ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Si ahorras {moneyUSD(falta.monthlySave)} / mes, te tomaría aprox.{" "}
                    <b>{falta.months ?? "—"} meses</b> (estimación simple).
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>1) Palanca #1: baja deudas</div>
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    Bajar deudas mejora DTI y sube probabilidad rápido.
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>2) Palanca #2: aumenta entrada</div>
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    Más entrada mejora LTV y abre mejores tasas.
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>3) Palanca #3: sube ingreso demostrable</div>
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    Mejor ingreso mejora capacidad y estabilidad.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTab("palancas")}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "none",
                  background: "#25d3a6",
                  fontWeight: 900,
                  color: "#052019",
                }}
              >
                Ajustar mis palancas
              </button>
            </>
          ) : (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                fontSize: 13,
                lineHeight: 1.35,
                opacity: 0.9,
              }}
            >
              Para mostrar esta sección necesito que tengamos un <b>valor de vivienda objetivo</b> guardado en tu
              journey (ej: valorVivienda). Por ahora puedes ir a <b>Simular</b> y definirlo.
            </div>
          )}
        </Card>
      ) : null}

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
        Nota: esto es una estimación. La aprobación real depende de documentos, políticas del banco y verificación.
      </div>
    </div>
  );
}