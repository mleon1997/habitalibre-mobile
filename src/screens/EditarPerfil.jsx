// src/screens/EditarPerfil.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Screen,
  Card,
  PrimaryButton,
  SecondaryButton,
  UI,
} from "../ui/kit.jsx";
import { getCustomer } from "../lib/customerSession.js";

const LS_JOURNEY = "hl_mobile_journey_v1";

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function Field({
  label,
  value,
  onChange,
  placeholder = "Escribe aquí",
  type = "text",
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 800,
          color: UI.text,
        }}
      >
        {label}
      </div>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
  );
}

export default function EditarPerfil() {
  const navigate = useNavigate();
  const customer = getCustomer();

  const rawJourney = readJSON(LS_JOURNEY, {}) || {};
  const initialForm = rawJourney?.form || rawJourney || {};

  const [form, setForm] = useState({
    nombre:
      initialForm.nombre ||
      customer?.nombre ||
      customer?.name ||
      customer?.fullName ||
      "",
    email:
      customer?.email ||
      initialForm.email ||
      "",
    telefono:
      initialForm.telefono ||
      customer?.telefono ||
      customer?.phone ||
      "",
    edad: initialForm.edad || "",
    estadoCivil: initialForm.estadoCivil || "",
  });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const next = {
      ...rawJourney,
      form: {
        ...(rawJourney?.form || {}),
        ...form,
      },
      updatedAt: new Date().toISOString(),
    };

    saveJSON(LS_JOURNEY, next);
    navigate("/perfil", { replace: true });
  }

  return (
    <Screen style={{ paddingBottom: 36 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 12,
          }}
        >
          <button
            onClick={() => navigate("/perfil")}
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
              flexShrink: 0,
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
            ✏️ Editando perfil
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              color: UI.subtext,
              marginBottom: 8,
              fontWeight: 800,
            }}
          >
            Tu cuenta
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.02,
              fontWeight: 950,
              letterSpacing: -0.8,
              color: UI.text,
            }}
          >
            Editar datos personales
          </h1>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.45,
              color: UI.subtext,
              maxWidth: 420,
            }}
          >
            Actualiza tu información personal para que tu perfil esté más completo.
          </div>
        </div>

        <Card style={{ padding: 18 }}>
          <Field
            label="Nombre"
            value={form.nombre}
            onChange={(v) => updateField("nombre", v)}
            placeholder="Tu nombre"
          />

          <Field
            label="Email"
            value={form.email}
            onChange={(v) => updateField("email", v)}
            placeholder="tu@email.com"
            type="email"
          />

          <Field
            label="Teléfono"
            value={form.telefono}
            onChange={(v) => updateField("telefono", v)}
            placeholder="Tu número"
          />

          <Field
            label="Edad"
            value={form.edad}
            onChange={(v) => updateField("edad", v)}
            placeholder="Tu edad"
            type="number"
          />

          <Field
            label="Estado civil"
            value={form.estadoCivil}
            onChange={(v) => updateField("estadoCivil", v)}
            placeholder="Ej: soltero, casado"
          />

          <div style={{ marginTop: 8 }}>
            <PrimaryButton
              onClick={handleSave}
              style={{ height: 52, borderRadius: 18 }}
            >
              Guardar cambios
            </PrimaryButton>
          </div>

          <div style={{ marginTop: 12 }}>
            <SecondaryButton
              onClick={() => navigate("/perfil")}
              style={{ height: 46, borderRadius: 16 }}
            >
              Cancelar
            </SecondaryButton>
          </div>
        </Card>
      </div>
    </Screen>
  );
}