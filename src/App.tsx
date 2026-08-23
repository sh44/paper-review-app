import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loadPapers } from "./services/csvServices";

import {
  loadSavedState,
  saveState,
  clearSavedState,
} from "./services/storageService";

import { exportPapersToCsv } from "./services/exportServices";

import type { Decision, Paper } from "./types/Paper";

import SwipeCard from "./components/SwipeCard";
import DecisionFlash from "./components/DecisionFlash";
import { useKeyboard } from "./hooks/useKeyboard";

function App() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [lastDecision, setLastDecision] =
    useState<Decision | null>(null);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const handleReset = useCallback(() => {
    const confirmed = window.confirm(
      "Vuoi cancellare tutte le decisioni salvate?"
    );

    if (!confirmed) {
      return;
    }

    clearSavedState();

    window.location.reload();
  }, []);


  /*
   * Caricamento iniziale:
   *
   * 1. carica il CSV
   * 2. carica le decisioni salvate
   * 3. associa ogni decisione al relativo paper
   * 4. trova il primo paper non ancora classificato
   */
  useEffect(() => {
    async function initialize() {
      try {
        const loadedPapers =
          await loadPapers();

        const savedState =
          loadSavedState();

        const papersWithDecisions =
          loadedPapers.map((paper) => ({
            ...paper,
            decision:
              savedState.decisions[
                paper._index
              ],
          }));

        setPapers(
          papersWithDecisions
        );

        /*
         * Trova il primo paper senza decisione.
         */
        const firstUndecidedIndex =
          papersWithDecisions.findIndex(
            (paper) => !paper.decision
          );

        if (
          firstUndecidedIndex === -1
        ) {
          /*
           * Tutti i paper sono stati classificati.
           */
          setCurrentIndex(
            papersWithDecisions.length
          );
        } else {
          setCurrentIndex(
            firstUndecidedIndex
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Errore sconosciuto"
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  const currentPaper =
    papers[currentIndex];

  /*
   * Numero effettivo di paper classificati.
   *
   * Questo viene usato per la progress bar.
   */
  const decidedCount = useMemo(() => {
    return papers.filter(
      (paper) =>
        paper.decision !== undefined
    ).length;
  }, [papers]);

  /*
   * Percentuale di completamento.
   */
  const progress = useMemo(() => {
    if (!papers.length) {
      return 0;
    }

    return (
      (decidedCount / papers.length) *
      100
    );
  }, [
    decidedCount,
    papers.length,
  ]);

  /*
   * Numero della card visualizzata.
   *
   * IMPORTANTE:
   *
   * Questo NON usa decidedCount.
   *
   * Se siamo alla card 4:
   *   4 / 100
   *
   * Se facciamo undo:
   *   3 / 100
   *
   * anche se la decisione della card 4
   * rimane salvata.
   */
  const currentPosition =
    papers.length === 0
      ? 0
      : Math.min(
          currentIndex + 1,
          papers.length
        );

  /*
   * Decisione:
   *
   * - salva la decisione nel paper
   * - salva la decisione in localStorage
   * - registra il paper nella history
   * - mostra il flash
   * - passa al paper successivo
   */
  const handleDecision =
    useCallback(
      (decision: Decision) => {
        const paper =
          papers[currentIndex];

        if (!paper) {
          return;
        }

        /*
         * Aggiorna la lista dei paper.
         */
        setPapers(
          (previousPapers) =>
            previousPapers.map(
              (
                existingPaper,
                index
              ) =>
                index === currentIndex
                  ? {
                      ...existingPaper,
                      decision,
                    }
                  : existingPaper
            )
        );

        /*
         * Carica lo stato attualmente salvato.
         */
        const savedState =
          loadSavedState();

        /*
         * Salva / sovrascrive la decisione.
         */
        savedState.decisions[
          paper._index
        ] = decision;

        /*
         * Aggiunge il paper alla history
         * evitando duplicati.
         */
        if (
          !savedState.history.includes(
            paper._index
          )
        ) {
          savedState.history.push(
            paper._index
          );
        }

        /*
         * Salvataggio immediato.
         */
        saveState(savedState);

        /*
         * Feedback visivo.
         */
        setLastDecision(decision);

        window.setTimeout(() => {
          setLastDecision(null);
        }, 450);

        /*
         * Vai al paper successivo.
         */
        setCurrentIndex(
          (index) =>
            Math.min(
              index + 1,
              papers.length
            )
        );
      },
      [currentIndex, papers]
    );

  /*
   * Undo.
   *
   * NON cancelliamo la decisione.
   *
   * Quindi tornando indietro la card
   * mantiene il colore della decisione precedente.
   *
   * Il currentIndex invece diminuisce,
   * quindi anche il counter torna indietro.
   */
  const handleUndo =
    useCallback(() => {
      if (currentIndex <= 0) {
        return;
      }

      setCurrentIndex(
        (index) => index - 1
      );
    }, [currentIndex]);

  /*
   * Export CSV.
   */
  const handleExport = useCallback(async () => {
    const savedState = loadSavedState();

    await exportPapersToCsv(
      papers,
      savedState.decisions
    );

    setMenuOpen(false);
  }, [papers]);

  useKeyboard({
    onDecision: handleDecision,
    onUndo: handleUndo,
  });

  /*
   * Loading
   */
  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#202020] text-white">
        Caricamento...
      </main>
    );
  }

  /*
   * Error
   */
  if (error) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#202020] p-6 text-white">
        <div className="border-2 border-red-700 bg-red-950 p-6">
          <h1 className="mb-2 text-xl font-bold">
            Errore
          </h1>

          <p>{error}</p>
        </div>
      </main>
    );
  }

  const finished =
    currentIndex >= papers.length;

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-[#202020]">
      {/* Top controls */}
      <div
        className="
          absolute right-4 top-5 z-30
          flex items-center gap-2
        "
      >
        {/* Undo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={currentIndex === 0}
          className="
            border border-white/20
            bg-black/20
            px-3 py-2
            text-lg text-white/70
            backdrop-blur
            transition
            hover:bg-white/10
            disabled:cursor-not-allowed
            disabled:opacity-20
          "
          aria-label="Undo"
        >
          ↶
        </button>

        {/* Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (open) => !open
              )
            }
            className="
              border border-white/20
              bg-black/20
              px-3 py-2
              text-lg text-white/70
              backdrop-blur
              transition
              hover:bg-white/10
            "
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>

          {menuOpen && (
            <div
              className="
                absolute right-0 top-full mt-2
                w-48
                border-2 border-white/20
                bg-[#252525]
                shadow-[5px_5px_0_rgba(0,0,0,0.35)]
              "
            >
              <button
                type="button"
                onClick={
                  handleExport
                }
                className="
                  flex w-full items-center
                  justify-between
                  px-4 py-3
                  text-left
                  font-mono text-xs
                  font-bold uppercase
                  tracking-wide
                  text-white/80
                  transition
                  hover:bg-white/10
                "
              >
                <span>
                  Esporta CSV
                </span>

                <span className="text-white/40">
                  ↓
                </span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="
                  flex w-full items-center
                  justify-between
                  border-t border-white/10
                  px-4 py-3
                  text-left
                  font-mono text-xs
                  font-bold uppercase
                  tracking-wide
                  text-red-300
                  transition
                  hover:bg-red-500/10
                "
              >
                <span>Reset decisioni</span>

                <span className="text-red-300/50">
                  ↺
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card */}
      <section className="relative min-h-0 flex-1 p-3 pt-20 sm:p-5 sm:pt-20">
        <div className="relative mx-auto h-full w-full max-w-4xl">
          {!finished &&
            currentPaper && (
              <SwipeCard
                /*
                 * Ogni paper ha una nuova istanza
                 * di SwipeCard.
                 */
                key={
                  currentPaper._index
                }
                paper={currentPaper}
                onDecision={
                  handleDecision
                }
              />
            )}

          {finished && (
            <div className="flex h-full items-center justify-center">
              <div
                className="
                  border-2 border-white/20
                  bg-black/20
                  px-8 py-6
                  text-center text-white
                "
              >
                <div className="text-2xl font-bold">
                  Tutti i paper classificati 🎉
                </div>

                <div className="mt-2 text-sm text-white/50">
                  {decidedCount.toLocaleString(
                    "it-IT"
                  )}{" "}
                  /{" "}
                  {papers.length.toLocaleString(
                    "it-IT"
                  )}
                </div>
              </div>
            </div>
          )}

          <DecisionFlash
            decision={lastDecision}
          />
        </div>
      </section>

      {/* Current position */}
      <div className="shrink-0 pb-2 text-center">
        <span className="font-mono text-xs text-white/45">
          {currentPosition.toLocaleString(
            "it-IT"
          )}{" "}
          /{" "}
          {papers.length.toLocaleString(
            "it-IT"
          )}
        </span>
      </div>

      {/* Progress */}
      <div className="h-1 shrink-0 bg-white/10">
        <div
          className="h-full bg-white/60 transition-all duration-300"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </main>
  );
}

export default App;