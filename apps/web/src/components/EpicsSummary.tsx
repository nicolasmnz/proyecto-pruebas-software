import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { getBoard } from "../api/board";
import type { Board } from "../api/board";
import { getEpics } from "../api/epics";
import type { Epic } from "../api/epics";
import { describeProgress, getEpicItems, getProgress } from "../utils/progress";

import "./BoardProgress.css";
import "./EpicsSummary.css";

interface EpicsSummaryProps {
  projectId: string;
  // En un proyecto archivado no se ofrece crear épicas
  readOnly: boolean;
  maxItems?: number;
}

type State =
  | { status: "success"; board: Board; epics: Epic[] }
  | { status: "error"; message: string };

function EpicsSummary({
  projectId,
  readOnly,
  maxItems = 3,
}: EpicsSummaryProps) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: State } | null>(
    null,
  );

  // Mientras no llegue el resultado de esta carga, el resumen está cargando
  const requestKey = `${projectId}:${attempt}`;
  const state = result?.key === requestKey ? result.state : null;

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getBoard(projectId, controller.signal),
      getEpics(projectId, controller.signal),
    ])
      .then(([board, epics]) =>
        setResult({
          key: requestKey,
          state: { status: "success", board, epics },
        }),
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            state: {
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "No fue posible cargar las épicas",
            },
          });
        }
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  const epicsPath = `/projects/${projectId}/epics`;

  return (
    <section aria-labelledby="epics-summary-title" className="panel">
      <div className="epics-summary-header">
        <h2 id="epics-summary-title">Épicas</h2>
        {!readOnly && (
          <Link to={`${epicsPath}?nueva`} className="epics-summary-new">
            <Plus size={14} aria-hidden="true" />
            Nueva épica
          </Link>
        )}
      </div>

      {!state && (
        <p className="epics-summary-status" role="status">
          Cargando épicas…
        </p>
      )}

      {state?.status === "error" && (
        <div role="alert" className="epics-summary-status">
          <p>{state.message}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      )}

      {state?.status === "success" &&
        (state.epics.length === 0 ? (
          <p className="epics-summary-status">
            Este proyecto aún no tiene épicas.
          </p>
        ) : (
          <>
            <ul className="epics-summary-list">
              {state.epics.slice(0, maxItems).map((epic) => {
                const progress = getProgress(
                  getEpicItems(state.board, epic.id),
                );

                return (
                  <li key={epic.id}>
                    <div className="epics-summary-item">
                      <span className="epics-summary-title">{epic.title}</span>
                      <span className="epics-summary-percentage">
                        {progress.percentage} %
                      </span>
                    </div>
                    <div
                      className="board-progress-track"
                      role="progressbar"
                      aria-label={`Avance de ${epic.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress.percentage}
                      aria-valuetext={
                        progress.total === 0
                          ? "Aún no tiene tareas"
                          : describeProgress(progress)
                      }
                    >
                      <div
                        className="board-progress-fill"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <Link to={epicsPath} className="epics-summary-all">
              {state.epics.length > maxItems
                ? `Ver las ${state.epics.length} épicas`
                : "Ver todas las épicas"}
            </Link>
          </>
        ))}
    </section>
  );
}

export default EpicsSummary;
