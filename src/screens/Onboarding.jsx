import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSeenOnboarding } from "../lib/appOnboarding.js";

const slides = [
  {
    id: 1,
    accent: "Tu punto de partida",
    title: "Empieza entendiendo tu capacidad",
    body: "Revisa tu perfil financiero, tu capacidad estimada y tu punto de partida.",
    cards: [
      { label: "Preparación", value: "Más claridad" },
      { label: "Enfoque", value: "Primer paso correcto" },
    ],
  },
  {
    id: 2,
    accent: "Claridad antes de decidir",
    title: "Revisa si hoy ya estás listo",
    body: "La app analiza tu perfil y te muestra si ya tienes una ruta posible o qué te falta para avanzar.",
    cards: [
      { label: "Estado actual", value: "Listo hoy o cerca" },
      { label: "Diagnóstico", value: "Qué te falta" },
    ],
  },
  {
    id: 3,
    accent: "Datos que sí te sirven",
    title: "Ve tu capacidad estimada",
    body: "Revisa un rango estimado, una cuota de referencia y una meta posible según tu perfil.",
    cards: [
      { label: "Capacidad real", value: "Cuota y rango" },
      { label: "Meta", value: "Objetivo viable" },
    ],
  },
  {
    id: 4,
    accent: "Tu camino, paso a paso",
    title: "Sigue una ruta personalizada",
    body: "Guarda tu progreso y revisa los siguientes pasos según tu perfil y tu avance.",
    cards: [
      { label: "Progreso", value: "Guardado" },
      { label: "Próximo paso", value: "Ruta personalizada" },
    ],
  },
];

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#081120",
    backgroundImage:
      "radial-gradient(circle at top, rgba(17,58,130,0.22) 0%, rgba(8,17,32,1) 36%, rgba(3,9,22,1) 100%)",
    color: "#FFFFFF",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "10px 20px 30px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: "max(18px, env(safe-area-inset-top))",
    gap: 16,
  },
  brandWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  },
  logoFrame: {
    width: 64,
    height: 64,
    borderRadius: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  brandText: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fallbackWordmark: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    lineHeight: 1,
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.35,
    maxWidth: 210,
  },
  skipBtn: {
    marginTop: 6,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    padding: "6px 4px",
    flexShrink: 0,
  },
centerWrap: {
  flex: 1,
  display: "flex",
  alignItems: "center",
  paddingTop: 4,
  paddingBottom: 8,
},
  centerInner: {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
  },
  card: {
    width: "100%",
    minHeight: 355,
    borderRadius: 28,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 22px 60px rgba(0,0,0,0.24)",
    padding: 28,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backdropFilter: "blur(10px)",
  },
  accentPill: {
    display: "inline-flex",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(143,227,212,0.14)",
    color: "#8FE3D4",
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.08,
    fontWeight: 900,
    letterSpacing: "-0.035em",
  },
  body: {
    marginTop: 18,
    marginBottom: 0,
    fontSize: 16,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.78)",
  },
  cardsGrid: {
    marginTop: 24,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  statCard: {
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 16,
    minHeight: 108,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
  },
  statValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.25,
  },
  footer: {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 22,
  },
  dot: {
    height: 8,
    borderRadius: 999,
    transition: "all 0.25s ease",
  },
  primaryBtn: {
    width: "100%",
    height: 58,
    border: "none",
    borderRadius: 20,
    background: "#8FE3D4",
    color: "#081120",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 32px rgba(143,227,212,0.20)",
  },
  secondaryBtn: {
    width: "100%",
    marginTop: 12,
    height: 54,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },
};

function HeaderBrand() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div style={styles.brandWrap}>
      {!logoFailed ? (
        <div style={styles.logoFrame}>
          <img
            src="/LOGOHL.png"
            alt="HabitaLibre"
            style={styles.logo}
            onError={() => setLogoFailed(true)}
          />
        </div>
      ) : (
        <div style={styles.brandText}>
          <div style={styles.fallbackWordmark}>HabitaLibre</div>
        </div>
      )}

      <div style={styles.brandText}>
        {!logoFailed && <div style={styles.fallbackWordmark}>HabitaLibre</div>}
      <div style={styles.tagline}>Tu camino a tu primera vivienda</div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = useMemo(() => slides[currentIndex], [currentIndex]);
  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      setSeenOnboarding();
      navigate("/register");
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSkip = () => {
    setSeenOnboarding();
    navigate("/login");
  };

  const handleAlreadyHaveAccount = () => {
    setSeenOnboarding();
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <HeaderBrand />

        {!isLast && (
          <button onClick={handleSkip} style={styles.skipBtn}>
            Saltar
          </button>
        )}
      </div>

      <div style={styles.centerWrap}>
        <div style={styles.centerInner}>
          <div style={styles.card}>
            <div>
              <div style={styles.accentPill}>{currentSlide.accent}</div>

              <h1 style={styles.title}>{currentSlide.title}</h1>

              <p style={styles.body}>{currentSlide.body}</p>
            </div>

            <div style={styles.cardsGrid}>
              {currentSlide.cards.map((item) => (
                <div key={item.label} style={styles.statCard}>
                  <div style={styles.statLabel}>{item.label}</div>
                  <div style={styles.statValue}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.dots}>
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              style={{
                ...styles.dot,
                width: idx === currentIndex ? 28 : 8,
                background:
                  idx === currentIndex
                    ? "#8FE3D4"
                    : "rgba(255,255,255,0.20)",
              }}
            />
          ))}
        </div>

        <button onClick={handleNext} style={styles.primaryBtn}>
          {isLast ? "Empezar" : "Continuar"}
        </button>

        <button
          onClick={handleAlreadyHaveAccount}
          style={styles.secondaryBtn}
        >
          Ya tengo cuenta
        </button>
      </div>
    </div>
  );
}