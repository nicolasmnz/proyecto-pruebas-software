import { useEffect, useId, useRef, useState } from "react";
import { Dices, RotateCcw } from "lucide-react";

import { pickSlice } from "../utils/roulette";
import type { RouletteSlice } from "../utils/roulette";

import "./RoulettePanel.css";

// Duración del giro; con reducción de movimiento el resultado es inmediato
const SPIN_MS = 2400;

// Colores de los sectores, distinguibles entre sí y con texto oscuro encima
const SLICE_COLORS = [
  "#85b8ff",
  "#7ee2b8",
  "#fbd779",
  "#f8a6a0",
  "#b8acf6",
  "#9dd9ee",
  "#fdb988",
  "#c1c7d0",
];

interface RoulettePanelProps {
  slices: RouletteSlice[];
  onAssign: (memberId: string) => Promise<void>;
  onCancel: () => void;
  // Para que los tests elijan al ganador
  random?: () => number;
}

function prefersReducedMotion() {
  // Sin matchMedia (p. ej. en tests) no se anima
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Punto del borde del círculo, con el ángulo medido desde arriba y en el
// sentido del reloj
function pointAt(degrees: number) {
  const radians = (degrees * Math.PI) / 180;

  return `${Math.sin(radians)} ${-Math.cos(radians)}`;
}

function slicePath(start: number, end: number) {
  const largeArc = end - start > 180 ? 1 : 0;

  return `M 0 0 L ${pointAt(start)} A 1 1 0 ${largeArc} 1 ${pointAt(end)} Z`;
}

function RoulettePanel({
  slices,
  onAssign,
  onCancel,
  random = Math.random,
}: RoulettePanelProps) {
  const titleId = useId();
  const [phase, setPhase] = useState<"ready" | "spinning" | "result">("ready");
  const [winner, setWinner] = useState<RouletteSlice | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [animate] = useState(() => !prefersReducedMotion());

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  // Ángulo de inicio de cada sector, en grados, desde arriba
  const starts: number[] = [];

  let accumulated = 0;

  for (const slice of slices) {
    starts.push(accumulated);
    accumulated += slice.probability * 360;
  }

  function spin() {
    const chosen = pickSlice(slices, random);
    const index = slices.indexOf(chosen);
    const center = starts[index] + (chosen.probability * 360) / 2;
    // La ruleta gira hasta dejar el centro del sector bajo el indicador
    const offset = (360 - center - (rotation % 360) + 720) % 360;

    setError(null);
    setWinner(chosen);
    setRotation(rotation + (animate ? 360 * 5 : 0) + offset);

    if (!animate) {
      setPhase("result");
      return;
    }

    setPhase("spinning");
    timeoutRef.current = window.setTimeout(() => setPhase("result"), SPIN_MS);
  }

  async function handleAssign() {
    if (!winner) {
      return;
    }

    try {
      setIsAssigning(true);
      setError(null);

      await onAssign(winner.member.id);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible asignar la tarea.",
      );
      setIsAssigning(false);
    }
  }

  return (
    <section className="roulette" aria-labelledby={titleId}>
      <h3 id={titleId} className="task-dialog-section">
        Ruleta de asignación
      </h3>
      <p className="roulette-hint">
        Quien tiene menos puntos pendientes tiene más probabilidad de salir.
      </p>

      <div className="roulette-body">
        <div className="roulette-wheel" aria-hidden="true">
          <span className="roulette-pointer" />
          <svg
            viewBox="-1 -1 2 2"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: animate
                ? `transform ${SPIN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
                : "none",
            }}
          >
            {slices.length === 1 ? (
              <circle r="1" fill={SLICE_COLORS[0]} />
            ) : (
              slices.map((slice, index) => (
                <path
                  key={slice.member.id}
                  d={slicePath(
                    starts[index],
                    starts[index] + slice.probability * 360,
                  )}
                  fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                  stroke="#fff"
                  strokeWidth="0.01"
                />
              ))
            )}
          </svg>
        </div>

        <ul
          className="roulette-legend"
          aria-label="Probabilidad de cada integrante"
        >
          {slices.map((slice, index) => (
            <li
              key={slice.member.id}
              className={
                phase === "result" && winner === slice ? "is-winner" : undefined
              }
            >
              <span
                className="roulette-swatch"
                style={{
                  background: SLICE_COLORS[index % SLICE_COLORS.length],
                }}
                aria-hidden="true"
              />
              <span className="roulette-name">{slice.member.name}</span>
              <span className="roulette-percentage">{slice.percentage} %</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="roulette-result" role="status">
        {phase === "spinning" && "Girando…"}
        {phase === "result" && winner && (
          <>
            La ruleta eligió a <strong>{winner.member.name}</strong>.
          </>
        )}
      </p>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <div className="actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={isAssigning}
        >
          Cancelar
        </button>

        {phase === "result" && winner ? (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={spin}
              disabled={isAssigning}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Volver a girar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAssign}
              disabled={isAssigning}
            >
              {isAssigning ? "Asignando..." : `Asignar a ${winner.member.name}`}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={spin}
            disabled={phase === "spinning"}
          >
            <Dices size={16} aria-hidden="true" />
            Girar
          </button>
        )}
      </div>
    </section>
  );
}

export default RoulettePanel;
