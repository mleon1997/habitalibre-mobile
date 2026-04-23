// src/components/BottomNav.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  House,
  Calculator,
  Building2,
  Map,
  User,
  Lock,
} from "lucide-react";
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
    { path: "/", label: "Home", icon: House },
    { path: "/journey", label: "Capacidad", icon: Calculator },
    { path: "/marketplace", label: "Match", icon: Building2 },
    { path: "/ruta", label: "Ruta", icon: Map },
    { path: "/perfil", label: "Perfil", icon: User, protected: true },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        padding: "0 10px calc(env(safe-area-inset-bottom) + 2px)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          maxWidth: 760,
          margin: "0 auto",
          height: 66,
          borderRadius: 20,
          background: "rgba(8, 15, 32, 0.88)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {tabs.map((tab) => {
          const active = isActivePath(location.pathname, tab.path);
          const locked = tab.protected && !isLoggedIn;
          const Icon = tab.icon;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => go(tab)}
              aria-label={tab.label}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "7px 2px 5px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 62,
                    minWidth: 0,
                    height: 52,
                    borderRadius: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    position: "relative",
                    transition:
                      "transform 160ms ease, background 160ms ease, border 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
                    background: active
                      ? "linear-gradient(180deg, rgba(37,211,166,0.16) 0%, rgba(37,211,166,0.08) 100%)"
                      : "transparent",
                    border: active
                      ? "1px solid rgba(37,211,166,0.20)"
                      : "1px solid transparent",
                    boxShadow: active
                      ? "0 8px 18px rgba(37,211,166,0.12)"
                      : "none",
                    opacity: locked ? 0.78 : 1,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: active
                        ? "#25d3a6"
                        : "rgba(255,255,255,0.76)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.4 : 2.1}
                      style={{
                        display: "block",
                        filter: active
                          ? "drop-shadow(0 0 8px rgba(37,211,166,0.16))"
                          : "none",
                      }}
                    />

                    {locked ? (
                      <span
                        style={{
                          position: "absolute",
                          right: -7,
                          bottom: -5,
                          width: 13,
                          height: 13,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.12)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Lock size={7} strokeWidth={2.6} color="#ffffff" />
                      </span>
                    ) : null}

                    {tab.path === "/perfil" && docsBadge > 0 ? (
                      <span
                        style={{
                          position: "absolute",
                          top: -7,
                          right: -11,
                          minWidth: 17,
                          height: 17,
                          padding: "0 5px",
                          borderRadius: 999,
                          background: "#25d3a6",
                          color: "#052019",
                          fontSize: 9,
                          fontWeight: 900,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(0,0,0,0.18)",
                          boxShadow: "0 5px 14px rgba(37,211,166,0.25)",
                        }}
                      >
                        {docsBadge > 9 ? "9+" : docsBadge}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 900 : 700,
                      color: active
                        ? "#25d3a6"
                        : "rgba(255,255,255,0.58)",
                      textAlign: "center",
                      lineHeight: 1,
                      letterSpacing: -0.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </div>

                  {active ? (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 2,
                        width: 22,
                        height: 4,
                        borderRadius: 999,
                        background: "#25d3a6",
                        boxShadow: "0 0 12px rgba(37,211,166,0.28)",
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}