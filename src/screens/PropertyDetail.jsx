// src/screens/PropertyDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { moneyUSD } from "../lib/money";
import { API_BASE } from "../lib/api";
import { getCustomer } from "../lib/customerSession.js";
import {
  saveSelectedPropertyToBackend,
  saveJourneyStateToBackend,
} from "../lib/userAppState.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";
const LS_SELECTED_PROPERTY = "hl_selected_property_v1";

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
  const envelope = loadJSON(key);

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
  saveJSON(key, { ownerEmail, data });
}

/* ---------------- helpers ---------------- */

function pick(snapshot, keys) {
  if (!snapshot) return null;

  for (const k of keys) {
    if (snapshot?.[k] != null) return snapshot[k];
    if (snapshot?.output?.[k] != null) return snapshot.output[k];
  }

  return null;
}

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function maybeNum(v) {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function getPropertyId(property) {
  return (
    property?.id ||
    property?._id ||
    property?._normalizedId ||
    property?.propertyId ||
    null
  );
}

function firstValue(obj, keys, fallback = null) {
  if (!obj) return fallback;

  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function formatMoney(v) {
  const x = Number(v);
  return Number.isFinite(x) ? moneyUSD(x) : "—";
}

function formatPct(v, digits = 1) {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return "Por confirmar";
  return `${x.toFixed(digits)}%`;
}

function formatMonthly(v) {
  const x = Number(v);
  return Number.isFinite(x) ? `${moneyUSD(x)}/mes` : "Por confirmar";
}

function formatMonths(v) {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return "Por confirmar";
  return x === 1 ? "1 mes" : `${x} meses`;
}

function formatMatchReason(reason) {
  const map = {
    precio: "Precio",
    entrada: "Entrada",
    precio_entrada: "Precio + entrada",
    cuota: "Cuota referencial",
    programa: "Categoría",
  };

  return map[reason] || reason || "";
}

function formatEstadoCompra(estado) {
  const map = {
    top_match: "Top match",
    entrada_viable_hipoteca_futura_viable: "Ruta futura con entrada",
    entrada_viable_hipoteca_futura_debil: "Cerca de tu ruta objetivo",
    ruta_preparacion: "Ruta con preparación",
    ruta_cercana: "Cerca de tu ruta objetivo",
    fuera_de_rango: "Por encima de tu ruta",
    entrada_no_viable: "Entrada por fortalecer",
    fuera_de_reglas: "Por revisar",
  };

  return map[estado] || "Pendiente de análisis";
}

function normalizeArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getGalleryImages(property) {
  const candidates = [
    ...normalizeArray(property?.galeria),
    ...normalizeArray(property?.gallery),
    ...normalizeArray(property?.imagenes),
    ...normalizeArray(property?.images),
    ...normalizeArray(property?.fotos),
    property?.imagen,
    property?.image,
    property?.imageUrl,
    property?.foto,
    property?.cover,
  ];

  const unique = [];

  for (const img of candidates) {
    const src =
      typeof img === "string"
        ? img
        : img?.url || img?.src || img?.image || img?.secure_url || null;

    if (src && !unique.includes(src)) {
      unique.push(src);
    }
  }

  return unique;
}

function getFloorPlan(property) {
  return (
    property?.plano ||
    property?.planoUrl ||
    property?.floorPlan ||
    property?.floorPlanUrl ||
    property?.distribucion ||
    null
  );
}

function getNearbyItems(property) {
  return [
    ...normalizeArray(property?.nearby),
    ...normalizeArray(property?.cercaDe),
    ...normalizeArray(property?.entorno),
    ...normalizeArray(property?.puntosCercanos),
  ].slice(0, 8);
}

function getPropertyMapUrl(property = {}) {
  return (
    property?.googleMapsUrl ||
    property?.googleMapUrl ||
    property?.mapsUrl ||
    property?.mapUrl ||
    property?.ubicacionGoogleMaps ||
    property?.urlGoogleMaps ||
    property?.linkMaps ||
    property?.linkGoogleMaps ||
    property?.linkUbicacion ||
    property?.urlUbicacion ||
    property?.ubicacionUrl ||
    property?.urlMapa ||
    property?.mapaUrl ||
    property?.maps ||
    property?.googleMaps ||
    property?.locationUrl ||
    property?.raw?.googleMapsUrl ||
    property?.raw?.googleMapUrl ||
    property?.raw?.mapsUrl ||
    property?.raw?.mapUrl ||
    property?.raw?.ubicacionGoogleMaps ||
    property?.raw?.urlGoogleMaps ||
    property?.raw?.linkMaps ||
    property?.raw?.linkGoogleMaps ||
    property?.raw?.linkUbicacion ||
    property?.raw?.urlUbicacion ||
    property?.raw?.ubicacionUrl ||
    property?.raw?.urlMapa ||
    property?.raw?.mapaUrl ||
    ""
  );
}

function getPropertyAddress(property = {}) {
  return (
    property?.direccion ||
    property?.direccionReferencial ||
    property?.address ||
    property?.ubicacionTexto ||
    property?.locationText ||
    property?.mapAddress ||
    property?.referenciaUbicacion ||
    property?.raw?.direccion ||
    property?.raw?.direccionReferencial ||
    property?.raw?.address ||
    property?.raw?.ubicacionTexto ||
    property?.raw?.locationText ||
    property?.raw?.mapAddress ||
    ""
  );
}

function normalizeCoordinate(value, type = "lat") {
  const x = Number(value);

  if (!Number.isFinite(x)) return null;

  const max = type === "lat" ? 90 : 180;

  if (Math.abs(x) <= max) return x;

  const dividedBy1000 = x / 1000;
  if (Math.abs(dividedBy1000) <= max) return dividedBy1000;

  const dividedBy10000 = x / 10000;
  if (Math.abs(dividedBy10000) <= max) return dividedBy10000;

  const dividedBy100000 = x / 100000;
  if (Math.abs(dividedBy100000) <= max) return dividedBy100000;

  return null;
}

function getLatLng(property) {
  const rawLat =
    property?.lat ??
    property?.latitude ??
    property?.ubicacion?.lat ??
    property?.location?.lat ??
    property?.geo?.lat ??
    property?.raw?.lat ??
    property?.raw?.latitude ??
    property?.raw?.ubicacion?.lat ??
    property?.raw?.location?.lat ??
    null;

  const rawLng =
    property?.lng ??
    property?.lon ??
    property?.longitude ??
    property?.ubicacion?.lng ??
    property?.ubicacion?.lon ??
    property?.location?.lng ??
    property?.location?.lon ??
    property?.geo?.lng ??
    property?.raw?.lng ??
    property?.raw?.lon ??
    property?.raw?.longitude ??
    property?.raw?.ubicacion?.lng ??
    property?.raw?.location?.lng ??
    null;

  const lat = normalizeCoordinate(rawLat, "lat");
  const lng = normalizeCoordinate(rawLng, "lng");

  if (lat == null || lng == null) return null;

  return { lat, lng };
}

function extractCoordsFromGoogleMapsUrl(url = "") {
  const text = String(url || "");

  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return {
      lat: normalizeCoordinate(atMatch[1], "lat"),
      lng: normalizeCoordinate(atMatch[2], "lng"),
    };
  }

  const bangMatch = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bangMatch) {
    return {
      lat: normalizeCoordinate(bangMatch[1], "lat"),
      lng: normalizeCoordinate(bangMatch[2], "lng"),
    };
  }

  const queryMatch = text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (queryMatch) {
    return {
      lat: normalizeCoordinate(queryMatch[1], "lat"),
      lng: normalizeCoordinate(queryMatch[2], "lng"),
    };
  }

  return null;
}

function getMapEmbedSrc(property) {
  const mapUrl = getPropertyMapUrl(property);
  const coordsFromUrl = extractCoordsFromGoogleMapsUrl(mapUrl);
  const coords =
    getLatLng(property) ||
    (coordsFromUrl?.lat != null && coordsFromUrl?.lng != null
      ? coordsFromUrl
      : null);
  const address = getPropertyAddress(property);

  if (mapUrl && String(mapUrl).includes("/maps/embed")) {
    return mapUrl;
  }

  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;
  }

  if (address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      address
    )}&z=15&output=embed`;
  }

  return "";
}

function normalizeComparable(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/* ---------------- UI ---------------- */

const UI = {
  bg: "linear-gradient(180deg, #071024 0%, #0b1a35 100%)",
  card: "rgba(255,255,255,0.06)",
  cardSoft: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.08)",
  textDim: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.58)",
  green: "#25d3a6",
  greenBg: "rgba(37,211,166,0.10)",
  greenBorder: "rgba(37,211,166,0.26)",
  amberBg: "rgba(251,191,36,0.10)",
  amberBorder: "rgba(251,191,36,0.26)",
  redBg: "rgba(239,68,68,0.10)",
  redBorder: "rgba(239,68,68,0.24)",
  shadow: "0 10px 30px rgba(0,0,0,0.22)",
  shadowSoft: "0 10px 24px rgba(0,0,0,0.18)",
};

function autoGrid(min = 145) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 10,
  };
}

function Pill({ children, tone = "neutral" }) {
  let bg = "rgba(255,255,255,0.08)";
  let br = "rgba(255,255,255,0.10)";

  if (tone === "green") {
    bg = "rgba(37,211,166,0.14)";
    br = "rgba(37,211,166,0.28)";
  }

  if (tone === "amber") {
    bg = "rgba(251,191,36,0.14)";
    br = "rgba(251,191,36,0.28)";
  }

  if (tone === "red") {
    bg = "rgba(239,68,68,0.14)";
    br = "rgba(239,68,68,0.28)";
  }

  return (
    <span
      style={{
        fontSize: 12,
        padding: "7px 11px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${br}`,
        fontWeight: 900,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, style, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 16,
        border: "none",
        background: disabled ? "rgba(37,211,166,0.55)" : UI.green,
        color: "#052019",
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.85 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 16,
        border: `1px solid rgba(255,255,255,0.16)`,
        background: "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: accent ? UI.greenBg : UI.cardSoft,
        border: accent
          ? `1px solid ${UI.greenBorder}`
          : `1px solid ${UI.borderSoft}`,
        minHeight: 76,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.72,
          fontWeight: 800,
          lineHeight: 1.25,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: "clamp(16px, 4.8vw, 22px)",
          fontWeight: 950,
          lineHeight: 1.12,
          letterSpacing: -0.4,
          wordBreak: "normal",
          overflowWrap: "normal",
          whiteSpace: "normal",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoCard({ title, subtitle, children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 18,
        borderRadius: 22,
        background: UI.card,
        border: `1px solid ${UI.border}`,
        boxShadow: UI.shadowSoft,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.15 }}>
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            lineHeight: 1.4,
            color: UI.textDim,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function ToneBox({ tone = "neutral", children }) {
  let background = UI.cardSoft;
  let border = UI.borderSoft;

  if (tone === "green") {
    background = UI.greenBg;
    border = UI.greenBorder;
  } else if (tone === "amber") {
    background = UI.amberBg;
    border = UI.amberBorder;
  } else if (tone === "red") {
    background = UI.redBg;
    border = UI.redBorder;
  }

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background,
        border: `1px solid ${border}`,
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

function FinancialDisclaimer({ compact = false }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: 16,
        border: "1px solid rgba(245,158,11,0.22)",
        background: "rgba(245,158,11,0.08)",
        color: "rgba(254,243,199,0.96)",
        fontSize: 11,
        lineHeight: 1.42,
      }}
    >
      <strong>Estimación referencial.</strong>{" "}
      {compact
        ? "HabitaLibre no otorga ni aprueba créditos. Las condiciones finales dependen de cada entidad financiera."
        : "HabitaLibre no es banco, cooperativa, prestamista ni entidad financiera. No otorgamos, aprobamos, financiamos, intermediamos ni cobramos créditos. Las cifras mostradas son estimaciones referenciales para orientación hipotecaria. La aprobación final, tasa, plazo, cuota, fechas de pago y condiciones dependen exclusivamente de la entidad financiera regulada."}
    </div>
  );
}

function NearbyChip({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 11px",
        borderRadius: 16,
        background: UI.cardSoft,
        border: `1px solid ${UI.borderSoft}`,
        minHeight: 46,
        minWidth: 0,
      }}
    >
      <CheckCircle2 size={16} color={UI.green} style={{ flexShrink: 0 }} />
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 850,
          lineHeight: 1.2,
          color: "rgba(255,255,255,0.88)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function MapPreview({ embedSrc, locationText }) {
  if (embedSrc) {
    return (
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          border: `1px solid ${UI.borderSoft}`,
          background: UI.cardSoft,
        }}
      >
        <iframe
          title={`Mapa de ${locationText || "propiedad"}`}
          src={embedSrc}
          width="100%"
          height="260"
          style={{
            border: 0,
            display: "block",
            filter: "grayscale(0.04) contrast(0.96)",
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: 160,
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid ${UI.borderSoft}`,
        background:
          "linear-gradient(135deg, rgba(37,211,166,0.16), rgba(255,255,255,0.05))",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.45,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 28,
          left: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 999,
          background: "rgba(7,16,36,0.82)",
          border: `1px solid ${UI.borderSoft}`,
          fontWeight: 900,
        }}
      >
        <MapPin size={18} color={UI.green} />
        Zona referencial
      </div>

      <div
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: 24,
          padding: "16px 18px",
          borderRadius: 20,
          background: "rgba(7,16,36,0.86)",
          border: `1px solid ${UI.borderSoft}`,
          fontSize: 18,
          fontWeight: 950,
          lineHeight: 1.2,
        }}
      >
        {locationText}
      </div>
    </div>
  );
}

function NotFound({ onBack }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          marginTop: 60,
          padding: 20,
          borderRadius: 24,
          background: UI.card,
          border: `1px solid ${UI.border}`,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8 }}>Propiedad</div>
        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>
          No encontramos esta propiedad
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            opacity: 0.78,
            lineHeight: 1.45,
          }}
        >
          Puede que el id no exista o que todavía no esté cargada en tu
          inventario.
        </div>
        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={onBack}>Volver a propiedades</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function PropertyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [savingSelection, setSavingSelection] = useState(false);
  const [backendProperty, setBackendProperty] = useState(null);
  const [loadingBackendProperty, setLoadingBackendProperty] = useState(true);

  const snapshot = useMemo(() => loadOwnedData(LS_SNAPSHOT), []);
  const journey = useMemo(() => loadOwnedData(LS_JOURNEY), []);

  useEffect(() => {
    let isMounted = true;

    function getToken() {
      try {
        return localStorage.getItem("hl_customer_token") || "";
      } catch {
        return "";
      }
    }

    async function fetchJson(url) {
      const token = getToken();

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || `Endpoint respondió ${res.status}`);
      }

      return data;
    }

    function extractProperties(data) {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.properties)) return data.properties;
      if (Array.isArray(data?.data?.properties)) return data.data.properties;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data?.data?.items)) return data.data.items;
      if (Array.isArray(data?.results)) return data.results;
      if (Array.isArray(data?.data?.results)) return data.data.results;

      return [];
    }

    function findPropertyInList(properties, currentId) {
      const target = String(currentId || "").trim();
      const targetNormalized = normalizeComparable(target);

      if (!Array.isArray(properties) || !target) return null;

      return (
        properties.find((p) => {
          const candidates = [
            p?.id,
            p?._id,
            p?.propertyId,
            p?._normalizedId,
            p?.slug,
            p?.titulo,
            p?.nombre,
            p?.title,
            p?.name,
          ];

          return candidates.some((candidate) => {
            const raw = String(candidate || "").trim();
            if (!raw) return false;

            return raw === target || normalizeComparable(raw) === targetNormalized;
          });
        }) || null
      );
    }

    async function loadPropertyFromBackend() {
      try {
        setLoadingBackendProperty(true);

        const encodedId = encodeURIComponent(id);

        const detailPaths = [
          `/api/properties/${encodedId}`,
          `/properties/${encodedId}`,
          `/api/propiedades/${encodedId}`,
          `/propiedades/${encodedId}`,
        ];

        for (const path of detailPaths) {
          try {
            const url = `${API_BASE}${path}`;
            const data = await fetchJson(url);

            const property =
              data?.property ||
              data?.data?.property ||
              data?.item ||
              data?.result ||
              null;

            if (property) {
              if (!isMounted) return;
              setBackendProperty(property);
              return;
            }
          } catch (error) {
            console.warn("[PropertyDetail] Falló endpoint detalle:", {
              path,
              routeId: id,
              error: error?.message || error,
            });
          }
        }

        const listPaths = [
          "/api/properties",
          "/properties",
          "/api/propiedades",
          "/propiedades",
          "/api/inventory/properties",
          "/api/marketplace/properties",
        ];

        for (const path of listPaths) {
          try {
            const url = `${API_BASE}${path}`;
            const data = await fetchJson(url);
            const properties = extractProperties(data);
            const found = findPropertyInList(properties, id);

            if (found) {
              if (!isMounted) return;
              setBackendProperty(found);
              return;
            }
          } catch (error) {
            console.warn("[PropertyDetail] Falló endpoint listado:", {
              path,
              routeId: id,
              error: error?.message || error,
            });
          }
        }
      } catch (error) {
        console.warn(
          "[PropertyDetail] Error cargando propiedad real:",
          error?.message || error
        );

        if (!isMounted) return;
        setBackendProperty(null);
      } finally {
        if (!isMounted) return;
        setLoadingBackendProperty(false);
      }
    }

    if (id) {
      loadPropertyFromBackend();
    } else {
      setLoadingBackendProperty(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const matchedProperties =
    pick(snapshot, ["matchedProperties"]) ||
    snapshot?.plan?.routeSignals?.matchedProperties ||
    snapshot?.routeSignals?.matchedProperties ||
    snapshot?.output?.routeSignals?.matchedProperties ||
    journey?.match?.propiedades ||
    journey?.match?.items ||
    pick(snapshot, ["propiedades"]) ||
    [];

  const propertyFromSnapshot = useMemo(() => {
    if (!Array.isArray(matchedProperties)) return null;

    return (
      matchedProperties.find((p) => String(getPropertyId(p)) === String(id)) ||
      null
    );
  }, [matchedProperties, id]);

  const property = useMemo(() => {
    if (backendProperty && propertyFromSnapshot) {
      return {
        ...backendProperty,
        ...propertyFromSnapshot,

        googleMapsUrl:
          propertyFromSnapshot.googleMapsUrl ||
          propertyFromSnapshot.mapUrl ||
          backendProperty.googleMapsUrl ||
          backendProperty.mapUrl ||
          "",

        lat:
          propertyFromSnapshot.lat ??
          propertyFromSnapshot.latitude ??
          backendProperty.lat ??
          backendProperty.latitude ??
          null,

        lng:
          propertyFromSnapshot.lng ??
          propertyFromSnapshot.lon ??
          propertyFromSnapshot.longitude ??
          backendProperty.lng ??
          backendProperty.lon ??
          backendProperty.longitude ??
          null,

        direccionReferencial:
          propertyFromSnapshot.direccionReferencial ||
          backendProperty.direccionReferencial ||
          backendProperty.direccion ||
          "",
      };
    }

    return propertyFromSnapshot || backendProperty;
  }, [backendProperty, propertyFromSnapshot]);

  if (!property && loadingBackendProperty) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: UI.bg,
          color: "white",
          padding: 22,
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            marginTop: 80,
            padding: 20,
            borderRadius: 24,
            background: UI.card,
            border: `1px solid ${UI.border}`,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.8 }}>Propiedad</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>
            Cargando propiedad...
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              opacity: 0.78,
              lineHeight: 1.45,
            }}
          >
            Estamos consultando el inventario real de HabitaLibre.
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return <NotFound onBack={() => navigate("/marketplace")} />;
  }

  const precio =
    maybeNum(
      firstValue(property, ["precio", "price", "valor", "listPrice"], null)
    ) ?? 0;

  const area =
    maybeNum(
      firstValue(
        property,
        ["m2", "area", "metros", "metros2", "m2Construccion"],
        null
      )
    ) ?? null;

  const dormitorios =
    maybeNum(
      firstValue(property, ["dormitorios", "bedrooms", "habitaciones"], null)
    ) ?? null;

  const banos =
    maybeNum(
      firstValue(property, ["banos", "baños", "bathrooms", "baths"], null)
    ) ?? null;

  const parqueaderos =
    maybeNum(
      firstValue(property, ["parqueaderos", "parking", "garajes"], null)
    ) ?? null;

  const entradaDisponibleRaw =
    pick(snapshot, ["entradaDisponible"]) ??
    snapshot?.plan?.currentEntry ??
    snapshot?.financialCapacity?.plannedEntry?.currentEntry ??
    journey?.form?.entradaDisponible ??
    journey?.form?.entrada ??
    journey?.entrada ??
    property?.evaluacionEntrada?.entradaDisponibleHoy ??
    null;

  const entradaDisponible = maybeNum(entradaDisponibleRaw);

  const precioMaxViviendaRaw =
    pick(snapshot, ["precioMaxVivienda"]) ??
    pick(snapshot, ["precioMaxPerfil"]) ??
    pick(snapshot, ["precioMax"]) ??
    snapshot?.financialCapacity?.estimatedMaxPropertyValue ??
    snapshot?.homeRecommendation
      ?.profileProgramsThatCouldWorkIfRangeAdjusted?.[0]?.priceMax ??
    property?.evaluacionHipotecaHoy?.precioMaxVivienda ??
    property?.evaluacionHipotecaFutura?.precioMaxVivienda ??
    null;

  const precioMaxVivienda = maybeNum(precioMaxViviendaRaw);

  const bancosTop3 =
    pick(snapshot, ["bancosTop3"]) ||
    pick(snapshot, ["bancosProbabilidad"]) ||
    snapshot?.rankedMortgages ||
    [];

  const bankSuggested =
    Array.isArray(bancosTop3) && bancosTop3.length ? bancosTop3[0] : null;

  const evaluacionEntrada = property?.evaluacionEntrada || null;
  const evaluacionHipotecaHoy =
    property?.evaluacionHipotecaHoy || property?.evaluacionHipoteca || null;
  const evaluacionHipotecaFutura = property?.evaluacionHipotecaFutura || null;
  const estadoCompra = property?.estadoCompra || null;

  const hasPrecioMax = precioMaxVivienda != null && precioMaxVivienda > 0;
  const hasEntradaDisponible = entradaDisponible != null;
  const hasEvaluacionEntrada = !!evaluacionEntrada;
  const hasHipotecaData =
    !!evaluacionHipotecaHoy || !!evaluacionHipotecaFutura || !!bankSuggested;

  const detailHomeRecommendation =
    snapshot?.homeRecommendation ?? snapshot?.output?.homeRecommendation ?? null;

  const detailFinancialCapacity =
    snapshot?.financialCapacity ?? snapshot?.output?.financialCapacity ?? null;

  const detailAlternatives = Array.isArray(detailHomeRecommendation?.alternatives)
    ? detailHomeRecommendation.alternatives
    : [];

  const detailEntryAlternative =
    detailAlternatives.find((a) => a?.kind === "entry_installments") || null;

  const detailDebtAlternative =
    detailAlternatives.find((a) => a?.kind === "debt_reduction_route") || null;

  const detailPlannedEntry = detailFinancialCapacity?.plannedEntry || null;

  const capacidadHoyDetalle =
    maybeNum(detailFinancialCapacity?.estimatedMaxPropertyValue) ??
    precioMaxVivienda ??
    null;

  const entradaFuturaDetalle =
    maybeNum(detailPlannedEntry?.estimatedMaxPropertyValue) ??
    maybeNum(detailEntryAlternative?.alternativePrice) ??
    null;

  const rutaPreparacionDetalle =
    maybeNum(property?.routeFit?.targetPrice) ??
    maybeNum(property?.routeFit?.preparationRange) ??
    maybeNum(detailDebtAlternative?.alternativePrice) ??
    null;

  const nearRutaPreparacionDetalle =
    rutaPreparacionDetalle != null && rutaPreparacionDetalle > 0
      ? rutaPreparacionDetalle * 1.1
      : null;

  const diferenciaVsRutaDetalle =
    maybeNum(property?.routeDifferenceVsRoute) ??
    maybeNum(property?.routeFit?.differenceVsRoute) ??
    (rutaPreparacionDetalle != null && precio != null
      ? Math.max(0, precio - rutaPreparacionDetalle)
      : null);

  const hasRutaPreparacionDetalle =
    rutaPreparacionDetalle != null && rutaPreparacionDetalle > 0;

  const propertyRouteKind =
    precio != null &&
    capacidadHoyDetalle != null &&
    precio <= capacidadHoyDetalle
      ? "compatible_today"
      : precio != null &&
        entradaFuturaDetalle != null &&
        entradaFuturaDetalle > 0 &&
        precio <= entradaFuturaDetalle
      ? "entry_route"
      : precio != null &&
        rutaPreparacionDetalle != null &&
        rutaPreparacionDetalle > 0 &&
        precio <= rutaPreparacionDetalle
      ? "preparation_route"
      : precio != null &&
        nearRutaPreparacionDetalle != null &&
        precio <= nearRutaPreparacionDetalle
      ? "near_route"
      : "above_route";

  const hasAnalisisCompletoMinimo =
    hasPrecioMax &&
    hasEntradaDisponible &&
    (hasEvaluacionEntrada || hasHipotecaData);

  let toneEstado = "amber";

  if (hasAnalisisCompletoMinimo) {
    toneEstado =
      estadoCompra === "top_match" ||
      estadoCompra === "entrada_viable_hipoteca_futura_viable"
        ? "green"
        : estadoCompra === "entrada_viable_hipoteca_futura_debil" ||
          estadoCompra === "ruta_cercana"
        ? "amber"
        : "red";
  }

  const isPositiveMatch =
    estadoCompra === "top_match" ||
    propertyRouteKind === "compatible_today" ||
    propertyRouteKind === "entry_route" ||
    propertyRouteKind === "preparation_route";

  const routeAwareEstadoLabel =
    property?.matchBadgeCalculado ||
    property?.routeFit?.badge ||
    (isPositiveMatch && estadoCompra === "top_match"
      ? "Top match"
      : propertyRouteKind === "compatible_today"
      ? "Compatible hoy"
      : propertyRouteKind === "entry_route"
      ? "Ruta futura con entrada"
      : propertyRouteKind === "preparation_route"
      ? "Ruta con preparación"
      : propertyRouteKind === "near_route"
      ? "Cerca de tu ruta objetivo"
      : "Por encima de tu ruta");

  const routeAwareTone = isPositiveMatch ? "green" : "amber";

  const routeAwareMainMessage =
    property?.matchReasonCalculado ||
    property?.routeFit?.reason ||
    (estadoCompra === "top_match"
      ? "Proyecto compatible con tu perfil y tu ruta estimada."
      : propertyRouteKind === "compatible_today"
      ? "Esta propiedad entra dentro de tu capacidad prudente actual."
      : propertyRouteKind === "entry_route"
      ? "Podría acercarse si completas tu entrada durante el plazo proyectado."
      : propertyRouteKind === "preparation_route"
      ? "No calza como compra inmediata, pero sí entra dentro de tu ruta con preparación."
      : propertyRouteKind === "near_route"
      ? "Está ligeramente por encima de tu ruta estimada. Podría acercarse si aumentas entrada, reduces deuda o eliges una unidad de menor precio."
      : "Está por encima de tu ruta estimada actual. Podrías necesitar más entrada, menor deuda o mayor ingreso.");

  const entradaRequerida =
    maybeNum(evaluacionEntrada?.entradaRequerida) ??
    maybeNum(property?.entradaMinima) ??
    maybeNum(property?.entradaRequerida) ??
    (precio > 0 ? precio * 0.1 : null);

  const faltanteEntrada =
    maybeNum(evaluacionEntrada?.faltanteEntrada) ??
    (entradaRequerida != null && entradaDisponible != null
      ? Math.max(0, entradaRequerida - entradaDisponible)
      : null);

  const cuotaEntradaMensual =
    maybeNum(evaluacionEntrada?.cuotaEntradaMensual) ?? null;

  const mesesConstruccion =
    maybeNum(evaluacionEntrada?.mesesConstruccionRestantes) ??
    maybeNum(property?.mesesConstruccion) ??
    maybeNum(property?.mesesEntrega) ??
    null;

  const cuotaReferencial =
    maybeNum(property?.cuotaEstimada) ??
    maybeNum(property?.cuota) ??
    maybeNum(property?.evaluacionHipotecaFutura?.cuotaReferencia) ??
    maybeNum(property?.evaluacionHipotecaHoy?.cuotaReferencia) ??
    maybeNum(snapshot?.cuotaEstimada) ??
    maybeNum(snapshot?.cuotaMensual) ??
    maybeNum(snapshot?.bestMortgage?.cuota) ??
    null;

  const tasaReferencia =
    maybeNum(property?.tasaReferencial) ??
    maybeNum(property?.tasa) ??
    maybeNum(property?.evaluacionHipotecaFutura?.tasa) ??
    maybeNum(property?.evaluacionHipotecaHoy?.tasa) ??
    maybeNum(snapshot?.tasa) ??
    maybeNum(snapshot?.bestMortgage?.tasa) ??
    null;

  const plazoReferencia =
    maybeNum(property?.plazo) ??
    maybeNum(property?.plazoAnios) ??
    maybeNum(property?.plazoAños) ??
    maybeNum(property?.evaluacionHipotecaFutura?.plazo) ??
    maybeNum(property?.evaluacionHipotecaHoy?.plazo) ??
    maybeNum(snapshot?.plazo) ??
    maybeNum(snapshot?.bestMortgage?.plazo) ??
    null;

  const saldoAFinanciar =
    precio > 0 && entradaRequerida != null
      ? Math.max(0, precio - entradaRequerida)
      : null;

  const heroTitle =
    property.titulo ||
    property.nombre ||
    property.title ||
    property.name ||
    property.proyecto ||
    "Propiedad";

  const heroLocation =
    property.sector ||
    property.zona ||
    property.ciudadZona ||
    property.ciudad ||
    "";

  const projectName =
    property.proyecto || property.nombreProyecto || property.projectName || "";

  const projectStatus =
    property.estadoProyecto ||
    property.estado ||
    property.statusProyecto ||
    (property.proyectoNuevo === true
      ? "Proyecto nuevo"
      : property.proyectoNuevo === false
      ? "Entrega inmediata"
      : "");

  const deliveryDate =
    property.fechaEntrega ||
    property.entrega ||
    property.deliveryDate ||
    property.fechaEstimadaEntrega ||
    null;

  const developerName =
    property.promotor ||
    property.constructora ||
    property.desarrollador ||
    property.developer ||
    "";

  const propertyType =
    property.tipo || property.tipoPropiedad || property.propertyType || "";

  const amenities = normalizeArray(property?.amenities).length
    ? normalizeArray(property?.amenities)
    : normalizeArray(property?.amenidades);

  const descripcionReal =
    property.descripcion ||
    property.description ||
    property.descripcionComercial ||
    property.resumen ||
    "";

  const mainBadgeLabel = hasAnalisisCompletoMinimo
    ? property?.matchBadgeCalculado ||
      property?.matchBadge ||
      formatEstadoCompra(estadoCompra)
    : property?.matchBadgeCalculado || property?.matchBadge || "Top match";

  const estadoLabel = hasAnalisisCompletoMinimo
    ? formatEstadoCompra(estadoCompra)
    : "Análisis parcial";

  const galleryImages = getGalleryImages(property);
  const floorPlan = getFloorPlan(property);
  const nearbyItems = getNearbyItems(property);
  const latLng = getLatLng(property);
  const mapUrl = getPropertyMapUrl(property);
  const mapEmbedSrc = getMapEmbedSrc(property);
  const propertyAddress = getPropertyAddress(property);
  const mapLocationText = propertyAddress || heroLocation || projectName || heroTitle;

  const planCards = [
    {
      label: "Precio",
      value: formatMoney(precio),
      show: precio > 0,
    },
    {
      label: "Entrada estimada",
      value: formatMoney(entradaRequerida),
      show: entradaRequerida != null,
    },
    {
      label: "Saldo a financiar",
      value: formatMoney(saldoAFinanciar),
      show: saldoAFinanciar != null,
    },
    {
      label: "Cuota referencial",
      value:
        cuotaReferencial != null ? formatMonthly(cuotaReferencial) : "Por confirmar",
      show: true,
    },
    {
      label: "Tasa referencial",
      value: formatPct(tasaReferencia),
      show: tasaReferencia != null && tasaReferencia > 0,
    },
    {
      label: "Plazo",
      value:
        plazoReferencia != null && plazoReferencia > 0
          ? plazoReferencia === 1
            ? "1 año"
            : `${plazoReferencia} años`
          : "Por confirmar",
      show: plazoReferencia != null && plazoReferencia > 0,
    },
  ].filter((item) => item.show);

  const projectInfoItems = [
    projectName ? { label: "Proyecto", value: projectName } : null,
    propertyType ? { label: "Tipo", value: propertyType } : null,
    projectStatus ? { label: "Estado", value: projectStatus } : null,
    developerName ? { label: "Promotor", value: developerName } : null,
  ].filter(Boolean);

  function openMap() {
    if (mapUrl) {
      window.open(mapUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const query = latLng
      ? `${latLng.lat},${latLng.lng}`
      : mapLocationText || heroTitle;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSelectProperty() {
    if (savingSelection) return;

    const propertyId =
      property?.id || property?._id || property?.propertyId || id || null;

    const propertyTitle =
      property?.titulo ||
      property?.nombre ||
      property?.title ||
      property?.name ||
      property?.proyecto ||
      "Propiedad elegida";

    const propertyCity =
      property?.ciudad ||
      property?.zona ||
      property?.ciudadZona ||
      property?.sector ||
      journey?.form?.ciudadCompra ||
      journey?.ciudadCompra ||
      "Ubicación pendiente";

    const propertyPriceRaw =
      property?.precio ??
      property?.price ??
      property?.valor ??
      property?.listPrice ??
      null;

    const propertyPrice = Number.isFinite(Number(propertyPriceRaw))
      ? Number(propertyPriceRaw)
      : null;

    const propertyImage =
      property?.imagen ||
      property?.image ||
      property?.imageUrl ||
      property?.foto ||
      property?.cover ||
      null;

    const selectedPropertyStatus =
      property?.estadoCompra ||
      property?.status ||
      property?.selectedPropertyStatus ||
      null;

    const normalizedProperty = {
      id: propertyId,
      _id: propertyId,
      propertyId,

      titulo: propertyTitle,
      nombre: propertyTitle,
      proyecto: property?.proyecto || "",
      title: propertyTitle,
      name: propertyTitle,

      ciudad: propertyCity,
      zona: propertyCity,
      sector: property?.sector || propertyCity,
      ciudadZona: property?.ciudadZona || propertyCity,

      precio: propertyPrice,
      price: propertyPrice,

      imagen: propertyImage,
      image: propertyImage,

      googleMapsUrl: mapUrl || "",
      direccionReferencial: propertyAddress || "",
      lat: latLng?.lat ?? null,
      lng: latLng?.lng ?? null,

      status: selectedPropertyStatus,
      selectedPropertyStatus,

      estadoCompra: property?.estadoCompra || null,
      matchBadge: property?.matchBadge || null,
      matchBadgeCalculado: property?.matchBadgeCalculado || null,
      matchReason: property?.matchReason || null,
      matchReasonCalculado: property?.matchReasonCalculado || null,

      evaluacionEntrada: property?.evaluacionEntrada || null,
      evaluacionHipotecaHoy:
        property?.evaluacionHipotecaHoy ||
        property?.evaluacionHipoteca ||
        null,
      evaluacionHipotecaFutura: property?.evaluacionHipotecaFutura || null,
      evaluacionReglasPropiedad: property?.evaluacionReglasPropiedad || null,

      cuotaEstimada:
        property?.cuotaEstimada ||
        property?.cuota ||
        property?.evaluacionHipotecaFutura?.cuotaReferencia ||
        property?.evaluacionHipotecaHoy?.cuotaReferencia ||
        snapshot?.cuotaEstimada ||
        snapshot?.cuotaMensual ||
        snapshot?.bestMortgage?.cuota ||
        null,

      entradaMinima:
        property?.entradaMinima ??
        property?.entradaRequerida ??
        property?.evaluacionEntrada?.entradaRequerida ??
        null,

      descripcion: descripcionReal || "",

      source: "property_detail",
      selectedAt: new Date().toISOString(),

      raw: property,
    };

    const nextJourney = {
      ...(journey || {}),
      propiedadElegida: true,
      propiedadId: propertyId,
      propiedadSeleccionada: normalizedProperty,
      selectedProperty: normalizedProperty,
      selectedPropertyStatus,
      updatedAt: new Date().toISOString(),
    };

    saveOwnedData(LS_SELECTED_PROPERTY, normalizedProperty);
    saveOwnedData(LS_JOURNEY, nextJourney);

    try {
      setSavingSelection(true);

      await saveSelectedPropertyToBackend(normalizedProperty);
      await saveJourneyStateToBackend(nextJourney);

      console.log("[HL] Propiedad seleccionada guardada en backend", {
        propertyId,
        selectedPropertyStatus,
      });
    } catch (err) {
      console.warn(
        "[HL] No se pudo guardar propiedad seleccionada en backend:",
        err?.message || err
      );
    } finally {
      setSavingSelection(false);
      navigate("/ruta");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: "white",
        fontFamily: "system-ui",
        paddingBottom: "calc(150px + env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          height: 300,
          width: "100%",
          background: property.imagen
            ? `linear-gradient(rgba(0,0,0,0.16), rgba(7,16,36,0.52)), url(${property.imagen}) center/cover`
            : "linear-gradient(135deg, rgba(37,211,166,0.18), rgba(255,255,255,0.06))",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/marketplace");
            }
          }}
          aria-label="Volver"
          style={{
            position: "absolute",
            top: "calc(env(safe-area-inset-top, 0px) + 18px)",
            left: 16,
            width: 56,
            height: 56,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(9, 18, 38, 0.88)",
            color: "white",
            borderRadius: 999,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ marginTop: -36, padding: "0 22px" }}>
        <div
          style={{
            padding: 20,
            borderRadius: 26,
            background: "rgba(7,16,36,0.88)",
            border: `1px solid ${UI.border}`,
            boxShadow: UI.shadow,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill tone={toneEstado}>{mainBadgeLabel}</Pill>

            {projectStatus ? <Pill>{projectStatus}</Pill> : null}

            {property.matchReason ? (
              <Pill>{formatMatchReason(property.matchReason)}</Pill>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: "clamp(28px, 8.5vw, 42px)",
              fontWeight: 980,
              lineHeight: 1.02,
              letterSpacing: -1.2,
            }}
          >
            {heroTitle}
          </div>

          {heroLocation ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 15,
                color: "rgba(255,255,255,0.78)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MapPin size={14} />
              {heroLocation}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: UI.textDim, fontWeight: 800 }}>
                Precio de referencia
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: "clamp(36px, 12vw, 48px)",
                  fontWeight: 980,
                  lineHeight: 1,
                  letterSpacing: -1.4,
                }}
              >
                {moneyUSD(precio)}
              </div>
            </div>

            <Pill tone={routeAwareTone || toneEstado}>
              {routeAwareEstadoLabel || estadoLabel}
            </Pill>
          </div>

          <FinancialDisclaimer compact />

          <div
            style={{
              marginTop: 16,
              ...autoGrid(135),
            }}
          >
            <StatCard label="Área" value={area != null ? `${area} m²` : "—"} />
            <StatCard
              label="Dormitorios"
              value={dormitorios != null ? String(dormitorios) : "—"}
            />
            <StatCard
              label="Baños"
              value={banos != null ? String(banos) : "—"}
            />
            <StatCard
              label="Parqueaderos"
              value={parqueaderos != null ? String(parqueaderos) : "—"}
            />
          </div>
        </div>

        <InfoCard
          title="Tu lectura HabitaLibre"
          subtitle="Una lectura simple para saber si esta propiedad calza con tu camino de compra."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <ToneBox tone={routeAwareTone}>
              <strong>{routeAwareEstadoLabel}</strong>
              <div style={{ marginTop: 6 }}>{routeAwareMainMessage}</div>
            </ToneBox>

            <ToneBox>
              Esta propiedad cuesta <strong>{formatMoney(precio)}</strong>.
              {hasRutaPreparacionDetalle ? (
                <>
                  {" "}
                  Tu ruta con preparación llega aproximadamente a{" "}
                  <strong>{formatMoney(rutaPreparacionDetalle)}</strong>.
                </>
              ) : capacidadHoyDetalle != null ? (
                <>
                  {" "}
                  Tu capacidad prudente hoy es{" "}
                  <strong>{formatMoney(capacidadHoyDetalle)}</strong>.
                </>
              ) : null}
              {!isPositiveMatch &&
              diferenciaVsRutaDetalle != null &&
              diferenciaVsRutaDetalle > 0 ? (
                <>
                  {" "}
                  Diferencia estimada vs tu ruta:{" "}
                  <strong>{formatMoney(diferenciaVsRutaDetalle)}</strong>.
                </>
              ) : null}
            </ToneBox>

            <ToneBox tone={isPositiveMatch ? "green" : "amber"}>
              <strong>
                {isPositiveMatch ? "Siguiente paso sugerido:" : "Qué podrías hacer:"}
              </strong>{" "}
              {isPositiveMatch
                ? "puedes usar esta propiedad como referencia para revisar tu ruta, comparar opciones hipotecarias y avanzar con mayor claridad."
                : "aumentar entrada disponible, reducir un poco más tus deudas mensuales o comparar una unidad de menor precio."}
            </ToneBox>

            <PrimaryButton
              onClick={handleSelectProperty}
              disabled={savingSelection}
              style={{ marginTop: 2 }}
            >
              {savingSelection
                ? "Guardando propiedad..."
                : "Evaluar mi ruta con esta propiedad"}
            </PrimaryButton>
          </div>
        </InfoCard>

        <InfoCard
          title="Plan referencial"
          subtitle="Un resumen simple para entender precio, entrada, saldo y posible esfuerzo mensual."
        >
          <div style={autoGrid(135)}>
            {planCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                accent={card.label === "Cuota referencial"}
              />
            ))}
          </div>

          {(deliveryDate || mesesConstruccion != null || projectStatus) && (
            <div style={{ marginTop: 10 }}>
              <ToneBox>
                <strong>Entrega / estado:</strong>{" "}
                {deliveryDate || projectStatus || "Por confirmar"}.
                {mesesConstruccion != null && mesesConstruccion > 0 ? (
                  <>
                    {" "}
                    Plazo de construcción estimado:{" "}
                    <strong>{formatMonths(mesesConstruccion)}</strong>.
                  </>
                ) : null}
              </ToneBox>
            </div>
          )}

          <FinancialDisclaimer compact />
        </InfoCard>

        <InfoCard
          title="Entrada al proyecto"
          subtitle="Te mostramos si tu entrada disponible cubre lo que pide este proyecto."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={autoGrid(135)}>
              <StatCard
                label="Entrada requerida"
                value={formatMoney(entradaRequerida)}
              />

              <StatCard
                label="Faltante de entrada"
                value={
                  faltanteEntrada == null
                    ? "—"
                    : faltanteEntrada === 0
                    ? "$0 completo"
                    : formatMoney(faltanteEntrada)
                }
                accent={faltanteEntrada === 0}
              />

              <StatCard
                label="Cuota mensual de entrada"
                value={
                  cuotaEntradaMensual == null
                    ? "No requerida"
                    : cuotaEntradaMensual === 0
                    ? "No requerida"
                    : formatMonthly(cuotaEntradaMensual)
                }
              />

              <StatCard
                label="Meses de construcción"
                value={formatMonths(mesesConstruccion)}
              />
            </div>

            {hasEvaluacionEntrada ? (
              <ToneBox tone={evaluacionEntrada?.viableEntrada ? "green" : "red"}>
                <strong>
                  {evaluacionEntrada?.viableEntrada
                    ? faltanteEntrada === 0
                      ? "Ya cubres la entrada requerida para este proyecto."
                      : "La entrada se ve alcanzable según tu información actual."
                    : "La entrada todavía necesita fortalecerse."}
                </strong>
                <div style={{ marginTop: 6 }}>
                  {evaluacionEntrada?.viableEntrada
                    ? faltanteEntrada === 0
                      ? "No necesitas completar una cuota mensual de entrada en esta etapa."
                      : evaluacionEntrada?.razon ||
                        "La entrada podría completarse dentro del plazo estimado."
                    : evaluacionEntrada?.razon ||
                      "No tenemos todavía el análisis de entrada."}
                </div>
              </ToneBox>
            ) : (
              <ToneBox tone="amber">
                <strong>Entrada estimada</strong>
                <div style={{ marginTop: 6 }}>
                  Esta lectura usa una referencia inicial. La entrada final puede
                  cambiar según el proyecto, el promotor y la entidad financiera.
                </div>
              </ToneBox>
            )}
          </div>
        </InfoCard>

        {mapEmbedSrc || mapUrl || latLng || propertyAddress ? (
          <InfoCard
            title="Ubicación en mapa"
            subtitle="Referencia cargada para ubicar mejor la propiedad."
          >
            <div style={{ display: "grid", gap: 12 }}>
              <MapPreview embedSrc={mapEmbedSrc} locationText={mapLocationText} />

              {propertyAddress ? (
                <ToneBox>
                  <strong>Dirección / referencia:</strong> {propertyAddress}
                </ToneBox>
              ) : null}

              <SecondaryButton onClick={openMap}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Navigation size={16} />
                  Abrir en Google Maps
                </span>
              </SecondaryButton>
            </div>
          </InfoCard>
        ) : null}

        {nearbyItems.length ? (
          <InfoCard
            title="Entorno cercano"
            subtitle="Puntos de referencia cargados para entender la vida diaria alrededor del proyecto."
          >
            <div style={autoGrid(145)}>
              {nearbyItems.map((item) => (
                <NearbyChip key={item}>{item}</NearbyChip>
              ))}
            </div>
          </InfoCard>
        ) : null}

        <InfoCard
          title="Galería y distribución"
          subtitle="Fotos, renders y plano para entender mejor cómo se vive el espacio."
        >
          {galleryImages.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <img
                src={galleryImages[0]}
                alt={heroTitle}
                style={{
                  width: "100%",
                  height: 170,
                  objectFit: "cover",
                  borderRadius: 18,
                  border: `1px solid ${UI.borderSoft}`,
                }}
              />

              {galleryImages.length > 1 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {galleryImages.slice(1, 4).map((image, index) => (
                    <img
                      key={image}
                      src={image}
                      alt={`${heroTitle} ${index + 2}`}
                      style={{
                        width: "100%",
                        height: 78,
                        objectFit: "cover",
                        borderRadius: 14,
                        border: `1px solid ${UI.borderSoft}`,
                      }}
                    />
                  ))}
                </div>
              )}

              {floorPlan ? (
                <div style={{ marginTop: 4 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: UI.textDim,
                      marginBottom: 8,
                    }}
                  >
                    Plano referencial
                  </div>
                  <img
                    src={floorPlan}
                    alt="Plano de la propiedad"
                    style={{
                      width: "100%",
                      borderRadius: 18,
                      border: `1px solid ${UI.borderSoft}`,
                      background: "rgba(255,255,255,0.05)",
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <ToneBox>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <ImageIcon size={18} color={UI.green} />
                <div>
                  <strong>Galería pendiente</strong>
                  <div style={{ marginTop: 4, color: UI.textDim }}>
                    Aún no hay imágenes adicionales o plano cargado para esta
                    unidad.
                  </div>
                </div>
              </div>
            </ToneBox>
          )}
        </InfoCard>

        {projectInfoItems.length || amenities.length ? (
          <InfoCard
            title="Sobre el proyecto"
            subtitle="Información cargada para ayudarte a decidir si vale la pena avanzar con esta unidad."
          >
            {projectInfoItems.length ? (
              <div style={autoGrid(145)}>
                {projectInfoItems.map((item) => (
                  <StatCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </div>
            ) : null}

            {amenities.length ? (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: UI.textDim,
                    marginBottom: 8,
                  }}
                >
                  Amenidades
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {amenities.slice(0, 8).map((amenity) => (
                    <Pill key={amenity}>{amenity}</Pill>
                  ))}
                </div>
              </div>
            ) : null}
          </InfoCard>
        ) : null}

        {descripcionReal ? (
          <InfoCard title="Descripción" subtitle="Resumen cargado de la propiedad.">
            <div style={{ fontSize: 14, color: UI.textDim, lineHeight: 1.5 }}>
              {descripcionReal}
            </div>
          </InfoCard>
        ) : null}

        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <PrimaryButton
            onClick={handleSelectProperty}
            disabled={savingSelection}
          >
            {savingSelection
              ? "Guardando propiedad..."
              : "Guardar esta propiedad y continuar"}
          </PrimaryButton>

          <SecondaryButton onClick={() => navigate("/marketplace")}>
            Ver más propiedades
          </SecondaryButton>
        </div>

        <div style={{ height: 140 }} />
      </div>
    </div>
  );
}