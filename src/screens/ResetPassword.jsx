// src/screens/ResetPassword.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Screen, Card, PrimaryButton, SecondaryButton } from "../ui/kit.jsx";
import * as customerApi from "../lib/customerAuthApi.js";

const LS_SNAPSHOT = "hl_mobile_last_snapshot_v1";
const LS_JOURNEY = "hl_mobile_journey_v1";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function niceMsg(err) {
  return (
    err?.data?.error ||
    err?.data?.message ||
    err?.message ||
    "Ocurrió un error. Intenta de nuevo."
  );
}

function hasSavedProgress() {
  try {
    const snapshot = localStorage.getItem(LS_SNAPSHOT);
    const journey = localStorage.getItem(LS_JOURNEY);
    return !!snapshot || !!journey;
  } catch {
    return false;
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const q = useQuery();
  const token = q.get("token") || "";

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e?.preventDefault?.();
    setError("");

    if (!token) {
      setError("Este enlace ya no es válido. Pide uno nuevo.");
      return;
    }

    if (!p1 || p1.length < 6) {
      setError("Tu nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (p1 !== p2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      await customerApi.resetPassword({
        token,
        newPassword: p1,
      });
      setOk(true);
    } catch (e2) {
      setError(niceMsg(e2));
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    if (hasSavedProgress()) {
      navigate("/", { replace: true });
      return;
    }
    navigate("/journey", { replace: true });
  }

  return (
    <Screen>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <button
              onClick={() => navigate("/login")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                cursor: "pointer",
                fontSize: 18,
                display: "grid",
                placeItems: "center",
              }}
            >
              ←
            </button>

            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                padding: "8px 14px",
                borderRadius: 999,
                color: "rgba(226,232,240,0.95)",
              }}
            >
              🔒 Cambio seguro
            </div>
          </div>

          <img
            src="/LOGOHL.png"
            alt="HabitaLibre"
            style={{
              height: 50,
              marginBottom: 18,
              display: "block",
              filter: "drop-shadow(0 6px 16px rgba(45,212,191,0.22))",
            }}
          />

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.05,
              fontWeight: 950,
              color: "rgba(226,232,240,0.98)",
              letterSpacing: -0.6,
            }}
          >
            Crea tu nueva contraseña
          </h1>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.45,
              color: "rgba(148,163,184,0.95)",
              maxWidth: 360,
            }}
          >
            Elige una contraseña nueva para volver a entrar y seguir avanzando
            hacia tu casa.
          </div>
        </div>

        <Card soft style={{ padding: 18, borderRadius: 26 }}>
          {ok ? (
            <>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "rgba(226,232,240,0.98)",
                  marginBottom: 8,
                }}
              >
                Contraseña actualizada
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "rgba(148,163,184,0.95)",
                }}
              >
                Listo. Ya puedes volver a entrar y seguir con tu camino hacia tu
                casa.
              </div>

              <div style={{ marginTop: 16 }}>
                <PrimaryButton
                  onClick={handleContinue}
                  style={{ height: 52, borderRadius: 18 }}
                >
                  Continuar donde lo dejé
                </PrimaryButton>
              </div>

              <div style={{ marginTop: 12 }}>
                <SecondaryButton
                  onClick={() => navigate("/", { replace: true })}
                  style={{ height: 46, borderRadius: 16 }}
                >
                  Ir al inicio
                </SecondaryButton>
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    color: "rgba(226,232,240,0.95)",
                  }}
                >
                  Nueva contraseña
                </div>

                <input
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  type="password"
                  placeholder="mínimo 6 caracteres"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    height: 52,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    padding: "0 16px",
                    color: "white",
                    fontSize: 16,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    color: "rgba(226,232,240,0.95)",
                  }}
                >
                  Confirma tu contraseña
                </div>

                <input
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  type="password"
                  placeholder="repite tu nueva contraseña"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    height: 52,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    padding: "0 16px",
                    color: "white",
                    fontSize: 16,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error ? (
                <div
                  style={{
                    marginBottom: 14,
                    fontSize: 13,
                    color: "#fca5a5",
                  }}
                >
                  {error}
                </div>
              ) : null}

              <PrimaryButton
                onClick={onSubmit}
                disabled={loading}
                style={{ height: 52, borderRadius: 18 }}
              >
                {loading ? "Guardando..." : "Actualizar contraseña"}
              </PrimaryButton>

              <div style={{ marginTop: 12 }}>
                <SecondaryButton
                  onClick={() => navigate("/login")}
                  style={{ height: 46, borderRadius: 16 }}
                >
                  Volver a login
                </SecondaryButton>
              </div>
            </form>
          )}
        </Card>
      </div>
    </Screen>
  );
}