import React from "react";

export default function Legal() {

  const links = [
    {
      title: "Política de privacidad",
      url: "https://www.habitalibre.com/#/privacidad"
    },
    {
      title: "Términos de uso",
      url: "https://www.habitalibre.com/#/terminos"
    },
    {
      title: "Política de cookies",
      url: "https://www.habitalibre.com/#/cookies"
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>Información legal</h2>

      <p style={{ marginTop: 10, opacity: 0.7 }}>
        Estos documentos regulan el uso de la plataforma HabitaLibre.
      </p>

      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#111827",
              color: "white",
              textDecoration: "none"
            }}
          >
            {link.title}
          </a>
        ))}
      </div>
    </div>
  );
}