import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSeenOnboarding } from "../lib/appOnboarding.js";

const onboarding1 = "/onboarding/onboarding-1.jpg";
const onboarding2 = "/onboarding/onboarding-2.jpg";
const onboarding3 = "/onboarding/onboarding-3.jpg";
const onboarding4 = "/onboarding/onboarding-4.jpg";

const slides = [
  {
    id: 1,
    accent: "Tu punto de partida",
    title: "Entiende tu rango estimado de compra",
    body: "Conoce una estimación inicial y entiende desde dónde empieza tu camino hacia vivienda propia.",
    image: onboarding1,
    imagePosition: "center 67%",
  },
  {
    id: 2,
    accent: "Claridad antes de decidir",
    title: "Compara rutas de compra referenciales",
    body: "Explora escenarios como VIS, VIP, BIESS o banca privada de forma educativa, según tus datos declarados.",
    image: onboarding2,
    imagePosition: "center 58%",
  },
  {
    id: 3,
    accent: "Opciones más alineadas",
    title: "Explora propiedades según tu escenario",
    body: "Mira viviendas que podrían alinearse con tu rango estimado, tu entrada disponible y tu camino de preparación.",
    image: onboarding3,
    imagePosition: "center 58%",
  },
  {
    id: 4,
    accent: "Tu camino, paso a paso",
    title: "Avanza con más orden y claridad",
    body: "Guarda tu progreso y sigue próximos pasos referenciales para prepararte mejor antes de conversar con actores externos.",
    image: onboarding4,
    imagePosition: "center 58%",
  },
];

const styles = {
page: {
  minHeight: "100dvh",
  width: "100%",
  backgroundColor: "#081120",
  backgroundImage:
    "radial-gradient(900px 620px at 50% 18%, rgba(45,212,191,0.12), transparent 56%), radial-gradient(circle at top, rgba(17,58,130,0.20) 0%, rgba(8,17,32,1) 36%, rgba(3,9,22,1) 100%)",
  color: "#FFFFFF",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) 20px calc(env(safe-area-inset-bottom, 0px) + 24px)",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
},

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexShrink: 0,
  },

  brandWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  },

  logoFrame: {
    width: 52,
    height: 52,
    borderRadius: 21,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(255,255,255,0.10)",
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
    fontSize: 23,
    fontWeight: 950,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    color: "#FFFFFF",
  },

  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.35,
    maxWidth: 250,
  },

  skipBtn: {
    marginTop: 8,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    fontWeight: 850,
    cursor: "pointer",
    padding: "8px 4px 8px 10px",
    flexShrink: 0,
  },

  centerWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 0,
  },

  centerInner: {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
  },

  slideContent: {
    animation: "hlOnboardingSlideIn 260ms ease both",
  },

  heroFrame: {
    width: "100%",
    height: "min(29vh, 250px)",
    minHeight: 220,
    borderRadius: 34,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(3,9,22,0.30))",
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 28px 70px rgba(0,0,0,0.34)",
    position: "relative",
  },

  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  textBlock: {
    marginTop: 14,
  },

  accentPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(143,227,212,0.14)",
    border: "1px solid rgba(143,227,212,0.18)",
    color: "#8FE3D4",
    fontWeight: 900,
    fontSize: 13,
    marginBottom: 12,
  },

  title: {
    margin: 0,
    fontSize: 27,
    lineHeight: 1.04,
    fontWeight: 980,
    letterSpacing: "-0.045em",
    maxWidth: 430,
  },

  body: {
    marginTop: 11,
    marginBottom: 0,
    fontSize: 14.5,
    lineHeight: 1.42,
    color: "rgba(255,255,255,0.76)",
    maxWidth: 420,
  },

  footer: {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    flexShrink: 0,
      paddingBottom: "max(18px, env(safe-area-inset-bottom, 0px))",
  },

  disclaimer: {
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(245,158,11,0.22)",
    background: "rgba(245,158,11,0.08)",
    color: "rgba(254,243,199,0.96)",
    fontSize: 11,
    lineHeight: 1.42,
  },

  dots: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  dotButton: {
    height: 8,
    borderRadius: 999,
    border: "none",
    transition: "all 0.25s ease",
    padding: 0,
    cursor: "pointer",
  },

  primaryBtn: {
    width: "100%",
    height: 60,
    border: "none",
    borderRadius: 22,
    background:
      "linear-gradient(135deg, rgba(143,227,212,1), rgba(45,212,191,1))",
    color: "#081120",
    fontSize: 18,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 14px 34px rgba(45,212,191,0.22)",
  },

  secondaryBtn: {
    width: "100%",
    marginTop: 11,
    height: 56,
    borderRadius: 21,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.035)",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 850,
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
      ) : null}

      <div style={styles.brandText}>
        <div style={styles.fallbackWordmark}>HabitaLibre</div>
        <div style={styles.tagline}>
          Orientación para tu primera vivienda
        </div>
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
          <div key={currentSlide.id} style={styles.slideContent}>
            <div style={styles.heroFrame}>
              <img
                src={currentSlide.image}
                alt=""
                draggable={false}
                style={{
                  ...styles.heroImage,
                  objectPosition: currentSlide.imagePosition || "center 58%",
                }}
              />
            </div>

            <div style={styles.textBlock}>
              <div style={styles.accentPill}>{currentSlide.accent}</div>

              <h1 style={styles.title}>{currentSlide.title}</h1>

              <p style={styles.body}>{currentSlide.body}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.dots}>
          {slides.map((slide, idx) => {
            const active = idx === currentIndex;

            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Ir al slide ${idx + 1}`}
                style={{
                  ...styles.dotButton,
                  width: active ? 30 : 8,
                  background: active
                    ? "#8FE3D4"
                    : "rgba(255,255,255,0.22)",
                }}
              />
            );
          })}
        </div>

        <div style={styles.disclaimer}>
          <strong>Orientación referencial.</strong> HabitaLibre no otorga ni aprueba créditos.
        </div>

        <button onClick={handleNext} style={styles.primaryBtn}>
          {isLast ? "Empezar" : "Continuar"}
        </button>

        <button onClick={handleAlreadyHaveAccount} style={styles.secondaryBtn}>
          Ya tengo cuenta
        </button>
      </div>

      <style>
        {`
          @keyframes hlOnboardingSlideIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.985);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}