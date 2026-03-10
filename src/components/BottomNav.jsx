// src/components/BottomNav.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCustomerToken } from "../lib/customerSession.js";

function isActivePath(currentPath, tabPath) {
  if (tabPath === "/") return currentPath === "/";
  return currentPath === tabPath || currentPath.startsWith(tabPath + "/");
}

export default function BottomNav({ docsBadge = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();

  const token = getCustomerToken();
  const isLoggedIn = !!token;

  function go(tab) {
    if (tab.protected && !isLoggedIn) {
      navigate(`/login?next=${encodeURIComponent(tab.path)}`);
      return;
    }
    navigate(tab.path);
  }

  const tabs = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/journey", label: "Simular", icon: "🧮" },
    { path: "/marketplace", label: "Match", icon: "🏘️" },
    // ✅ Ruta canónica
    { path: "/ruta", label: "Ruta", icon: "🧭", badge: docsBadge, protected: true },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 10px)",
        background: "rgba(8, 20, 42, 0.72)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          height: 62,
          borderRadius: 18,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          alignItems: "center",
          boxShadow: "0 12px 34px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {tabs.map((tab) => {
          const active = isActivePath(location.pathname, tab.path);
          const locked = tab.protected && !isLoggedIn;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => go(tab)}
              style={{
                appearance: "none",
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                height: "100%",
                width: "100%",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 10px",
                    borderRadius: 14,
                    transition: "all 160ms ease",
                    background: active ? "rgba(37,211,166,0.14)" : "transparent",
                    border: active ? "1px solid rgba(37,211,166,0.28)" : "1px solid transparent",
                    boxShadow: active ? "0 8px 18px rgba(37,211,166,0.14)" : "none",
                    transform: active ? "translateY(-1px)" : "translateY(0px)",
                    minWidth: 72,
                    position: "relative",
                    opacity: locked ? 0.85 : 1,
                  }}
                >
                  <div style={{ fontSize: 20, lineHeight: 1, position: "relative" }}>
                    {tab.icon}
                    {locked ? (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -10,
                          fontSize: 12,
                          opacity: 0.9,
                        }}
                      >
                        🔒
                      </span>
                    ) : null}

                    {!!tab.badge && tab.badge > 0 ? (
                      <span
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -10,
                          minWidth: 18,
                          height: 18,
                          padding: "0 5px",
                          borderRadius: 999,
                          background: "#25d3a6",
                          color: "#052019",
                          fontSize: 11,
                          fontWeight: 900,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(0,0,0,0.25)",
                        }}
                      >
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: active ? 900 : 700,
                      color: active ? "#25d3a6" : "rgba(255,255,255,0.62)",
                      letterSpacing: -0.2,
                    }}
                  >
                    {tab.label}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}