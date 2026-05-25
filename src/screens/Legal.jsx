import React from "react";

export default function Legal() {
  const links = [
    {
      title: "Política de privacidad",
      url: "https://www.habitalibre.com/#/privacidad",
    },
    {
      title: "Términos de uso",
      url: "https://www.habitalibre.com/#/terminos",
    },
    {
      title: "Política de cookies",
      url: "https://www.habitalibre.com/#/cookies",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        padding: 24,
        paddingTop: 80,
        background:
          "linear-gradient(180deg, #081120 0%, #0f172a 100%)",
        color: "white",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 850,
            color: "rgba(148,163,184,0.95)",
            marginBottom: 8,
          }}
        >
          HabitaLibre
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 30,
            lineHeight: 1.05,
            fontWeight: 950,
            letterSpacing: -0.8,
          }}
        >
          Información legal
        </h2>

        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            color: "rgba(148,163,184,0.95)",
            lineHeight: 1.5,
            fontSize: 15,
          }}
        >
          Estos documentos regulan el uso de la plataforma HabitaLibre y explican
          cómo protegemos tus datos.
        </p>

        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            borderRadius: 18,
            border: "1px solid rgba(245,158,11,0.22)",
            background: "rgba(245,158,11,0.08)",
            color: "rgba(254,243,199,0.96)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <strong>Orientación referencial.</strong> HabitaLibre no es banco,
          cooperativa, prestamista ni entidad financiera. No otorgamos,
          aprobamos, financiamos, intermediamos ni cobramos créditos. La app
          ofrece orientación educativa y referencial para ayudar a los usuarios a
          entender mejor su camino hacia vivienda propia.
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "16px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "white",
                textDecoration: "none",
                fontWeight: 850,
                boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
              }}
            >
              {link.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}