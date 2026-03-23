import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Screen, Card, PrimaryButton, SecondaryButton } from "../ui/kit.jsx";
import * as customerApi from "../lib/customerAuthApi.js";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);

      await customerApi.forgotPassword({ email });

      setMsg(
        "Revisa tu correo. Si tu email está registrado te enviamos un enlace para cambiar tu contraseña."
      );
    } catch {
      setMsg("No pudimos procesar tu solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>

        <img
          src="/LOGOHL.png"
          alt="HabitaLibre"
          style={{
            height: 50,
            marginBottom: 20,
            display: "block"
          }}
        />

        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 6
          }}
        >
          Recupera tu acceso
        </h1>

        <p
          style={{
            marginBottom: 24,
            color: "rgba(148,163,184,0.9)",
            fontSize: 14
          }}
        >
          Escribe tu email y te ayudamos a volver a entrar a tu cuenta.
        </p>

        <Card style={{ padding: 20 }}>

          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: 16 }}>
              <input
                type="email"
                placeholder="tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "0 14px",
                  color: "white"
                }}
              />
            </div>

            <PrimaryButton
              disabled={loading}
              style={{ height: 50 }}
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </PrimaryButton>

          </form>

          {msg && (
            <div
              style={{
                marginTop: 16,
                fontSize: 13,
                color: "rgba(148,163,184,0.9)"
              }}
            >
              {msg}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <SecondaryButton
              onClick={() => navigate("/login")}
            >
              Volver a iniciar sesión
            </SecondaryButton>
          </div>

        </Card>

      </div>
    </Screen>
  );
}