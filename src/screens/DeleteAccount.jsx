import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDelete } from "../lib/api.js";
import { clearCustomerSession } from "../lib/customerSession.js";
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
  UI,
} from "../ui/kit.jsx";

const LS_KEYS_TO_CLEAR = [
  "hl_mobile_journey_v1",
  "hl_mobile_last_snapshot_v1",
  "hl_mobile_customer_v1",
  "hl_mobile_auth_v1",
  "hl_mobile_progress_v1",
];

function clearLocalHabitaLibreData() {
  try {
    LS_KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function ConfirmModal({ open, busy, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.64)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        <Card
          style={{
            padding: 18,
            borderRadius: UI.radiusCard,
            background: UI.cardBg,
            border: UI.border,
            boxShadow: UI.shadow,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 950,
              marginBottom: 10,
              color: UI.text,
              letterSpacing: -0.2,
              lineHeight: 1.2,
            }}
          >
            ¿Eliminar tu cuenta?
          </div>

          <div
            style={{
              fontSize: 14,
              color: UI.subtext,
              lineHeight: 1.5,
              marginBottom: 18,
            }}
          >
            Esta acción eliminará tu cuenta y toda la información asociada a
            HabitaLibre. No se puede deshacer.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <SecondaryButton
              onClick={onCancel}
              disabled={busy}
              style={{
                height: 48,
                borderRadius: UI.radiusBtn,
              }}
            >
              Cancelar
            </SecondaryButton>

            <PrimaryButton
              onClick={onConfirm}
              disabled={busy}
              style={{
                height: 48,
                borderRadius: UI.radiusBtn,
                background: busy
                  ? "rgba(239,68,68,0.28)"
                  : "linear-gradient(180deg, rgba(239,68,68,0.98), rgba(239,68,68,0.86))",
                color: "white",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: busy ? "none" : "0 14px 30px rgba(239,68,68,0.18)",
              }}
            >
              {busy ? "Eliminando..." : "Sí, eliminar"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function runDelete() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await apiDelete("/api/customer-auth/delete-account");

      clearLocalHabitaLibreData();
      clearCustomerSession();

      try {
        sessionStorage.setItem("hl_account_deleted", "1");
      } catch {}

      navigate("/login?deleted=1", { replace: true });
    } catch (e) {
      console.error("[DeleteAccount] delete failed:", e);
      setError(
        e?.message ||
          "No pudimos eliminar tu cuenta. Intenta nuevamente o escribe a soporte@habitalibre.com."
      );
    } finally {
      setBusy(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        busy={busy}
        onCancel={() => setShowConfirm(false)}
        onConfirm={runDelete}
      />

      <Screen>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              marginBottom: 18,
              background: "transparent",
              border: "none",
              color: UI.subtext,
              fontWeight: 800,
              cursor: "pointer",
              padding: 0,
              fontSize: 14,
            }}
          >
            ← Volver
          </button>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 950,
              margin: 0,
              marginBottom: 16,
              color: UI.text,
              letterSpacing: -0.6,
              lineHeight: 1.05,
            }}
          >
            Eliminar cuenta
          </h1>

          <Card
            style={{
              borderRadius: UI.radiusCard,
              background: UI.cardBg,
              border: UI.border,
              boxShadow: UI.shadowSoft,
            }}
          >
            <div
              style={{
                color: UI.subtext,
                marginBottom: 10,
                fontSize: 15,
                lineHeight: 1.4,
              }}
            >
              Si eliminas tu cuenta:
            </div>

            <ul
              style={{
                marginTop: 0,
                marginBottom: 12,
                color: UI.text,
                lineHeight: 1.8,
                paddingLeft: 22,
              }}
            >
              <li>Se eliminará tu perfil</li>
              <li>Se eliminará tu score HabitaLibre</li>
              <li>Se borrará tu historial de simulaciones</li>
            </ul>

            <div
              style={{
                fontSize: 12,
                color: UI.subtext,
                lineHeight: 1.45,
              }}
            >
              Esta acción es permanente.
            </div>

            {error ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: UI.radiusInner,
                  background: "rgba(244,63,94,0.14)",
                  border: "1px solid rgba(244,63,94,0.18)",
                  color: "rgba(255,235,238,0.96)",
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ marginTop: 18 }}>
              <PrimaryButton
                onClick={() => setShowConfirm(true)}
                disabled={busy}
                style={{
                  height: 50,
                  borderRadius: UI.radiusBtn,
                  background: busy
                    ? "rgba(239,68,68,0.28)"
                    : "linear-gradient(180deg, rgba(239,68,68,0.98), rgba(239,68,68,0.86))",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: busy ? "none" : "0 14px 30px rgba(239,68,68,0.18)",
                }}
              >
                {busy ? "Eliminando..." : "Eliminar mi cuenta"}
              </PrimaryButton>
            </div>

            <div style={{ marginTop: 10 }}>
              <SecondaryButton
                onClick={() => navigate(-1)}
                disabled={busy}
                style={{
                  height: 46,
                  borderRadius: UI.radiusBtn,
                }}
              >
                Cancelar
              </SecondaryButton>
            </div>
          </Card>
        </div>
      </Screen>
    </>
  );
}