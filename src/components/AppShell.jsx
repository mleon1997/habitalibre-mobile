// src/components/AppShell.jsx
import React from "react";

export default function AppShell({ children, hideNav = false }) {
  return (
    <div
      data-scroll-container
      style={{
        minHeight: "100dvh",
        width: "100%",
        background:
          "linear-gradient(180deg, #081120 0%, #0f172a 100%)",
        color: "white",
        overflowX: "hidden",
        boxSizing: "border-box",
        paddingBottom: hideNav
          ? "0px"
          : "calc(env(safe-area-inset-bottom, 0px) + 76px)",
      }}
    >
      {children}
    </div>
  );
}