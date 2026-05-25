import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { moneyUSD } from "../lib/money";

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return 0.0499;
  return n > 1 ? n / 100 : n;
}

function monthlyPayment({ principal, annualRate, years }) {
  const p = asNumber(principal, 0);
  const r = normalizeRate(annualRate) / 12;
  const n = years * 12;

  if (!p || !r || !n) return 0;

  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function buildScheduleSnapshot({ principal, annualRate, years, month }) {
  const p = asNumber(principal, 0);
  const r = normalizeRate(annualRate) / 12;
  const payment = monthlyPayment({ principal: p, annualRate, years });

  let balance = p;
  let interest = 0;
  let capital = 0;

  for (let i = 1; i <= month; i += 1) {
    interest = balance * r;
    capital = payment - interest;
    balance = Math.max(0, balance - capital);
  }

  return {
    month,
    payment,
    interest,
    capital,
    balance,
  };
}

function simulateExtraPayment({ principal, annualRate, years, extraMonthly }) {
  const p = asNumber(principal, 0);
  const r = normalizeRate(annualRate) / 12;
  const basePayment = monthlyPayment({ principal: p, annualRate, years });
  const targetPayment = basePayment + asNumber(extraMonthly, 0);

  const baseTotal = basePayment * years * 12;
  const baseInterest = baseTotal - p;

  let balance = p;
  let months = 0;
  let totalPaid = 0;

  while (balance > 0.5 && months < 600) {
    const interest = balance * r;
    const capital = Math.min(balance, targetPayment - interest);

    if (capital <= 0) break;

    balance -= capital;
    totalPaid += interest + capital;
    months += 1;
  }

  const interestPaid = totalPaid - p;
  const savedInterest = Math.max(0, baseInterest - interestPaid);
  const savedMonths = Math.max(0, years * 12 - months);

  return {
    months,
    years: months / 12,
    interestPaid,
    savedInterest,
    savedMonths,
  };
}

function formatYearsMonths(months) {
  const total = Math.max(0, Math.round(months));
  const y = Math.floor(total / 12);
  const m = total % 12;

  if (y <= 0) return `${m} meses`;
  if (m === 0) return `${y} años`;
  return `${y} años y ${m} meses`;
}

function getRouteValue(route, keys, fallback = null) {
  for (const key of keys) {
    if (route?.[key] != null) return route[key];
  }

  return fallback;
}

function uniqueSortedYears(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => Math.round(asNumber(value, 0)))
        .filter((value) => value > 0)
    )
  ).sort((a, b) => a - b);
}

function resolveRouteYears(route) {
  const directYears = asNumber(
    getRouteValue(
      route,
      ["termYears", "defaultTermYears", "plazoAnios", "years"],
      0
    ),
    0
  );

  if (directYears > 0) return Math.round(directYears);

  const directMonths = asNumber(
    getRouteValue(
      route,
      ["termMonths", "defaultTermMonths", "plazoMeses", "months"],
      0
    ),
    0
  );

  if (directMonths > 0) return Math.round(directMonths / 12);

  const productDefaultYears = asNumber(route?.product?.term?.defaultYears, 0);

  if (productDefaultYears > 0) return Math.round(productDefaultYears);

  const productMaxYears = asNumber(route?.product?.term?.maxYears, 0);

  if (productMaxYears > 0) return Math.round(productMaxYears);

  return 25;
}

function resolveTermOptionsYears(route, routeYears) {
  const directOptionsYears = Array.isArray(route?.termOptionsYears)
    ? route.termOptionsYears
    : [];

  const directOptionsMonths = Array.isArray(route?.termOptionsMonths)
    ? route.termOptionsMonths.map((m) => asNumber(m, 0) / 12)
    : [];

  const productOptionsYears = Array.isArray(route?.product?.term?.optionsYears)
    ? route.product.term.optionsYears
    : [];

  const options = uniqueSortedYears([
    ...directOptionsYears,
    ...directOptionsMonths,
    ...productOptionsYears,
  ]);

  if (options.length) return options;

  return uniqueSortedYears([routeYears]);
}

function getProductLabel(route) {
  const raw =
    route?.productLabel ||
    route?.tipoProducto ||
    route?.producto ||
    route?.mortgageId ||
    route?.id ||
    "Ruta hipotecaria referencial";

  const key = String(raw).toUpperCase();

  const map = {
    VIS: "Vivienda de Interés Social",
    VIP: "Vivienda de Interés Público",
    PRIVATE: "Ruta hipotecaria privada",
    PRIVATE_BANK: "Banca privada",
    BIESS: "BIESS",
    BIESS_CREDICASA: "BIESS Vivienda Premier 2.99%",
    BIESS_MEDIA: "BIESS Vivienda Media",
    BIESS_VIS_VIP: "BIESS Vivienda VIS / VIP",
    BIESS_ALTA: "BIESS Vivienda Alta",
    BIESS_LUJO: "BIESS Vivienda de Lujo",
  };

  return map[key] || raw;
}

function getProviderLabel(route) {
  const raw =
    route?.providerLabel ||
    route?.banco ||
    route?.provider ||
    route?.channel ||
    route?.product?.channel ||
    "Entidad financiera";

  const key = String(raw).toUpperCase();

  const map = {
    PRIVATE_BANK: "Banca privada",
    PRIVATE: "Banca privada",
    BANCA_PRIVADA: "Banca privada",
    BIESS: "BIESS",
  };

  return map[key] || raw;
}

function Bar({ left, right, leftLabel, rightLabel }) {
  const total = Math.max(1, left + right);
  const leftPct = Math.max(8, Math.min(92, (left / total) * 100));
  const rightPct = 100 - leftPct;

  return (
    <div>
      <div
        style={{
          height: 16,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          display: "flex",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: `${leftPct}%`,
            background:
              "linear-gradient(90deg, rgba(45,212,191,1), rgba(143,227,212,1))",
          }}
        />
        <div
          style={{
            width: `${rightPct}%`,
            background: "rgba(96,165,250,0.75)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: "rgba(226,232,240,0.72)",
          lineHeight: 1.3,
        }}
      >
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 850,
          color: "rgba(203,213,225,0.72)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 20,
          fontWeight: 950,
          color: "rgba(248,250,252,0.98)",
          letterSpacing: -0.4,
        }}
      >
        {value}
      </div>

      {hint ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            lineHeight: 1.35,
            color: "rgba(203,213,225,0.62)",
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 24,
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div
        style={{
          fontSize: 19,
          fontWeight: 950,
          color: "rgba(248,250,252,0.98)",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 14,
            lineHeight: 1.42,
            color: "rgba(203,213,225,0.72)",
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

function FinancialDisclaimer({ compact = false }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: 16,
        border: "1px solid rgba(245,158,11,0.22)",
        background: "rgba(245,158,11,0.08)",
        color: "rgba(254,243,199,0.96)",
        fontSize: 11,
        lineHeight: 1.42,
      }}
    >
      <strong>Estimación referencial.</strong>{" "}
      {compact
        ? "HabitaLibre no otorga ni aprueba créditos. Las condiciones finales dependen de cada entidad financiera."
        : "HabitaLibre no es banco, cooperativa, prestamista ni entidad financiera. No otorgamos, aprobamos, financiamos, intermediamos ni cobramos créditos. Las cifras mostradas son simulaciones referenciales para orientación hipotecaria. La aprobación final, tasa, plazo, cuota, fechas de pago y condiciones dependen exclusivamente de la entidad financiera regulada."}
    </div>
  );
}

export default function HipotecaVisualDetail({
  open,
  onClose,
  route,
  homeValue,
  userAge = 29,
  onConfirmRoute,
}) {
  const routeYears = useMemo(() => resolveRouteYears(route), [route]);

  const termOptionsYears = useMemo(
    () => resolveTermOptionsYears(route, routeYears),
    [route, routeYears]
  );

  const [selectedYears, setSelectedYears] = useState(routeYears);
  const [extraMonthly, setExtraMonthly] = useState(0);

  useEffect(() => {
    if (!open) return;

    const nextYears = termOptionsYears.includes(routeYears)
      ? routeYears
      : termOptionsYears[0] || routeYears;

    setSelectedYears(nextYears);
    setExtraMonthly(0);
  }, [open, routeYears, termOptionsYears]);

  const data = useMemo(() => {
    const loanAmount = asNumber(
      getRouteValue(route, ["montoPrestamo", "loanAmount", "monto", "amount"], 0)
    );

    const annualRate = normalizeRate(
      getRouteValue(route, ["annualRate", "tasaAnual", "rate"], 0.0499)
    );

    const estimatedHomeValue = asNumber(
      homeValue ||
        getRouteValue(route, [
          "valorViviendaEstimado",
          "precioMaxVivienda",
          "priceMax",
          "homeValue",
          "propertyValue",
        ]),
      loanAmount
    );

    const downPayment = Math.max(0, estimatedHomeValue - loanAmount);

    const options = termOptionsYears.map((years) => {
      const payment = monthlyPayment({
        principal: loanAmount,
        annualRate,
        years,
      });

      const totalPaid = payment * years * 12;
      const totalInterest = Math.max(0, totalPaid - loanAmount);

      return {
        years,
        payment,
        totalPaid,
        totalInterest,
        finishAge: userAge + years,
        isRouteTerm: years === routeYears,
      };
    });

    const selected =
      options.find((option) => option.years === selectedYears) ||
      options.find((option) => option.years === routeYears) ||
      options[0] || {
        years: routeYears,
        payment: 0,
        totalPaid: 0,
        totalInterest: 0,
        finishAge: userAge + routeYears,
        isRouteTerm: true,
      };

    const safeSelectedYears = selected?.years || routeYears;

    const month1 = buildScheduleSnapshot({
      principal: loanAmount,
      annualRate,
      years: safeSelectedYears,
      month: 1,
    });

    const year5 = buildScheduleSnapshot({
      principal: loanAmount,
      annualRate,
      years: safeSelectedYears,
      month: Math.min(60, safeSelectedYears * 12),
    });

    const year10 = buildScheduleSnapshot({
      principal: loanAmount,
      annualRate,
      years: safeSelectedYears,
      month: Math.min(120, safeSelectedYears * 12),
    });

    const extra = simulateExtraPayment({
      principal: loanAmount,
      annualRate,
      years: safeSelectedYears,
      extraMonthly,
    });

    const policyLabel =
      route?.termPolicyLabel ||
      route?.product?.term?.policyLabel ||
      null;

    const termNotes =
      route?.termNotes ||
      route?.product?.term?.notes ||
      null;

    const allowsUserTermPreference =
      route?.allowsUserTermPreference ??
      route?.product?.term?.allowsUserPreference ??
      false;

    return {
      loanAmount,
      annualRate,
      estimatedHomeValue,
      downPayment,
      options,
      selected,
      routeYears,
      policyLabel,
      termNotes,
      allowsUserTermPreference,
      month1,
      year5,
      year10,
      extra,
    };
  }, [
    route,
    homeValue,
    userAge,
    routeYears,
    termOptionsYears,
    selectedYears,
    extraMonthly,
  ]);

  if (!open) return null;

  const providerLabel = getProviderLabel(route);
  const productLabel = getProductLabel(route);
  const optionCount = Math.max(1, data.options.length);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(2,6,23,0.72)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "92dvh",
          overflowY: "auto",
          background:
            "radial-gradient(700px 360px at 50% 0%, rgba(45,212,191,0.16), transparent 58%), linear-gradient(180deg, #101a2d 0%, #081120 100%)",
          borderTopLeftRadius: 34,
          borderTopRightRadius: 34,
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.45)",
          padding:
            "18px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)",
          color: "white",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 48,
            height: 5,
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            margin: "0 auto 14px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#8FE3D4",
              }}
            >
              Comparador educativo
            </div>

            <h2
              style={{
                margin: "6px 0 0",
                fontSize: 28,
                lineHeight: 1.05,
                fontWeight: 980,
                letterSpacing: -0.8,
              }}
            >
              Entiende tu ruta referencial
            </h2>

            <div
              style={{
                marginTop: 8,
                color: "rgba(203,213,225,0.74)",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              Esta ruta fue calculada con un plazo referencial de{" "}
              <strong style={{ color: "rgba(248,250,252,0.96)" }}>
                {data.routeYears} años
              </strong>
              . Mira cómo cambiarían la cuota estimada, el tiempo y el costo
              financiero dentro de escenarios disponibles o referenciales.
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.055)",
              color: "white",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <FinancialDisclaimer />

        <Section
          title={`${providerLabel}`}
          subtitle={`${productLabel}. ${
            data.policyLabel ? `${data.policyLabel}. ` : ""
          }Valores referenciales según tus datos declarados.`}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <MetricCard
              label="Valor vivienda ref."
              value={moneyUSD(data.estimatedHomeValue)}
            />
            <MetricCard
              label="Monto estimado a financiar"
              value={moneyUSD(data.loanAmount)}
            />
            <MetricCard
              label="Entrada estimada"
              value={moneyUSD(data.downPayment)}
            />
            <MetricCard
              label="Tasa ref. anual"
              value={`${(data.annualRate * 100).toFixed(2)}%`}
            />
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              background: "rgba(143,227,212,0.09)",
              border: "1px solid rgba(143,227,212,0.13)",
              fontSize: 13,
              lineHeight: 1.42,
              color: "rgba(226,232,240,0.82)",
            }}
          >
            Plazo usado en esta ruta referencial:{" "}
            <strong style={{ color: "#8FE3D4" }}>{data.routeYears} años</strong>
            {data.policyLabel ? ` · ${data.policyLabel}` : ""}.
          </div>
        </Section>

        <Section
          title="Cómo cambia según el plazo"
          subtitle={
            data.options.length > 1
              ? "Estos son plazos disponibles o referenciales para comparar escenarios. Las condiciones finales dependen exclusivamente de la entidad financiera."
              : "Esta ruta tiene un plazo referencial principal. La entidad financiera define las condiciones finales."
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(optionCount, 3)}, 1fr)`,
              gap: 8,
            }}
          >
            {data.options.map((option) => {
              const active = option.years === selectedYears;

              return (
                <button
                  key={option.years}
                  onClick={() => setSelectedYears(option.years)}
                  style={{
                    border: active
                      ? "1px solid rgba(45,212,191,0.75)"
                      : "1px solid rgba(255,255,255,0.09)",
                    background: active
                      ? "rgba(45,212,191,0.15)"
                      : "rgba(255,255,255,0.045)",
                    color: "white",
                    borderRadius: 18,
                    padding: "12px 8px",
                    textAlign: "left",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  {option.isRouteTerm ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        padding: "4px 7px",
                        borderRadius: 999,
                        background: "rgba(143,227,212,0.14)",
                        border: "1px solid rgba(143,227,212,0.22)",
                        color: "#8FE3D4",
                        fontSize: 10,
                        fontWeight: 950,
                      }}
                    >
                      Tu ruta
                    </div>
                  ) : null}

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 950,
                      lineHeight: 1,
                      paddingRight: option.isRouteTerm ? 52 : 0,
                    }}
                  >
                    {option.years}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      color: "rgba(203,213,225,0.68)",
                    }}
                  >
                    años
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 15,
                      fontWeight: 950,
                      color: active ? "#8FE3D4" : "white",
                    }}
                  >
                    {moneyUSD(option.payment)}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "rgba(203,213,225,0.62)",
                    }}
                  >
                    cuota ref.
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title={`Escenario referencial a ${data.selected.years} años`}
          subtitle={
            data.selected.isRouteTerm
              ? "Este es el plazo usado para calcular tu ruta principal referencial."
              : "Este escenario es una comparación educativa para entender cómo cambiaría la cuota si la entidad y el producto permitieran otro plazo."
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <MetricCard
              label="Cuota mensual ref."
              value={moneyUSD(data.selected.payment)}
              hint="Referencia mensual estimada"
            />
            <MetricCard
              label="Terminarías aprox."
              value={`${data.selected.finishAge} años`}
              hint={`Edad actual usada: ${userAge}`}
            />
            <MetricCard
              label="Total estimado"
              value={moneyUSD(data.selected.totalPaid)}
              hint="Cuotas acumuladas estimadas"
            />
            <MetricCard
              label="Costo financiero estimado"
              value={moneyUSD(data.selected.totalInterest)}
              hint="Intereses estimados"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <Bar
              left={data.loanAmount}
              right={data.selected.totalInterest}
              leftLabel={`Capital ${moneyUSD(data.loanAmount)}`}
              rightLabel={`Intereses ${moneyUSD(data.selected.totalInterest)}`}
            />
          </div>
        </Section>

        <Section
          title="Tu vida dentro de esta ruta"
          subtitle="Una ruta hipotecaria no solo es una cuota. También es tiempo."
        >
          <div
            style={{
              position: "relative",
              padding: "16px 6px 6px",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                top: 31,
                height: 4,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(45,212,191,1), rgba(96,165,250,0.65))",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${data.options.length + 1}, 1fr)`,
                gap: 6,
                position: "relative",
                zIndex: 1,
              }}
            >
              {[0, ...data.options.map((option) => option.years)].map((years) => {
                const label = years === 0 ? "Hoy" : `${years} años`;
                const age = userAge + years;
                const active = years === selectedYears || years === 0;
                const routeTerm = years === data.routeYears;

                return (
                  <div
                    key={years}
                    style={{
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: active ? 26 : 18,
                        height: active ? 26 : 18,
                        borderRadius: 999,
                        margin: "0 auto",
                        background: active
                          ? "rgba(45,212,191,1)"
                          : "rgba(148,163,184,1)",
                        border: "3px solid #101a2d",
                      }}
                    />

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 900,
                        color: active ? "#8FE3D4" : "rgba(203,213,225,0.72)",
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color: "rgba(203,213,225,0.58)",
                      }}
                    >
                      {years === 0 ? `${userAge} años` : `${age} años`}
                    </div>

                    {routeTerm ? (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 900,
                          color: "#8FE3D4",
                        }}
                      >
                        Tu ruta
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          title="¿A dónde se iría tu cuota referencial?"
          subtitle="Al inicio, una parte importante de la cuota suele ir a intereses. Con el tiempo, más parte va a capital."
        >
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { label: "Mes 1", item: data.month1 },
              { label: "Año 5", item: data.year5 },
              { label: "Año 10", item: data.year10 },
            ].map(({ label, item }) => (
              <div key={label}>
                <div
                  style={{
                    marginBottom: 7,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  <span>{label}</span>
                  <span>{moneyUSD(item.payment)}</span>
                </div>

                <Bar
                  left={item.capital}
                  right={item.interest}
                  leftLabel={`Capital ${moneyUSD(item.capital)}`}
                  rightLabel={`Interés ${moneyUSD(item.interest)}`}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="¿Qué pasaría si abonas más?"
          subtitle="Si la entidad permite abonos a capital, podrías reducir tiempo e intereses. Esto es solo una simulación referencial."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {[0, 50, 100, 150].map((amount) => {
              const active = amount === extraMonthly;

              return (
                <button
                  key={amount}
                  onClick={() => setExtraMonthly(amount)}
                  style={{
                    border: active
                      ? "1px solid rgba(45,212,191,0.75)"
                      : "1px solid rgba(255,255,255,0.09)",
                    background: active
                      ? "rgba(45,212,191,0.15)"
                      : "rgba(255,255,255,0.045)",
                    color: active ? "#8FE3D4" : "white",
                    borderRadius: 16,
                    padding: "12px 6px",
                    fontSize: 14,
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  +{moneyUSD(amount)}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <MetricCard
              label="Terminarías en"
              value={formatYearsMonths(data.extra.months)}
              hint={
                extraMonthly > 0
                  ? `Ahorras ${formatYearsMonths(data.extra.savedMonths)}`
                  : "Sin abono extra"
              }
            />
            <MetricCard
              label="Interés que podrías ahorrar"
              value={moneyUSD(data.extra.savedInterest)}
              hint={
                extraMonthly > 0
                  ? `Pagando ${moneyUSD(extraMonthly)} extra al mes`
                  : "Elige un abono extra"
              }
            />
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              lineHeight: 1.4,
              color: "rgba(203,213,225,0.55)",
            }}
          >
            Esta simulación asume que la entidad permite abonos directos a
            capital sin penalidad. Las condiciones finales dependen de cada
            entidad financiera.
          </div>
        </Section>

        <Section title="Lectura rápida">
          <div
            style={{
              display: "grid",
              gap: 10,
              fontSize: 14,
              lineHeight: 1.45,
              color: "rgba(226,232,240,0.84)",
            }}
          >
            <div>
              ✓ Tu ruta principal fue estimada a {data.routeYears} años.
            </div>
            <div>
              ✓ Un plazo más largo suele bajar la cuota referencial, pero aumenta
              el tiempo de pago.
            </div>
            <div>
              ✓ Un plazo más corto suele subir la cuota referencial, pero puede
              reducir intereses.
            </div>
            <div>
              ✓ Los plazos finales, tasas, cuotas, fechas de pago y condiciones
              dependen exclusivamente de la entidad financiera.
            </div>
          </div>
        </Section>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 10,
          }}
        >
          {onConfirmRoute ? (
            <button
              onClick={() =>
                onConfirmRoute({
                  route,
                  routeYears: data.routeYears,
                  viewedYears: data.selected.years,
                })
              }
              style={{
                width: "100%",
                height: 58,
                borderRadius: 20,
                border: "none",
                background:
                  "linear-gradient(135deg, rgba(143,227,212,1), rgba(45,212,191,1))",
                color: "#081120",
                fontSize: 16,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Guardar esta ruta referencial
            </button>
          ) : null}

          <button
            onClick={onClose}
            style={{
              width: "100%",
              height: 56,
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.045)",
              color: "white",
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Volver a comparar
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            lineHeight: 1.4,
            color: "rgba(203,213,225,0.50)",
            textAlign: "center",
          }}
        >
          HabitaLibre no otorga, aprueba, financia ni cobra créditos. Esta es
          una simulación referencial y educativa; no representa aprobación, oferta
          ni promesa de financiamiento de ninguna entidad financiera.
        </div>
      </div>
    </div>
  );
}