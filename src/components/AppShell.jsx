// src/components/AppShell.jsx
import React from "react";

export default function AppShell({ children, hideNav = false }) {
  console.log("✅ AppShell SI se está renderizando", { hideNav });

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "red",
      }}
    >
      {children}
    </div>
  );
}