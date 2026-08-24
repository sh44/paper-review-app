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

import type {
  Decision,
  Paper,
} from "./types/Paper";

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

  /*
   * ============================================================
   * RESET
   * ============================================================
   *
   * Cancella solo le decisioni salvate in localStorage.
   *
   * Il CSV originale NON viene modificato.
   */
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
   * ============================================================
   * CARICAMENTO INIZIALE
   * ============================================================
   *
   * 1. carica il CSV
   * 2. carica localStorage
   * 3. unisce le decisioni
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
          loadedPapers.map((paper) => {
            const localDecision =
              savedState.decisions[
                paper._index
              ];

            return {
              ...paper,

              decision:
                localDecision ??
                paper.decision,

              // SOLO DEBUG
              _csvDecision: paper.decision,
              _localDecision: localDecision,
            };
          });

        console.table(
          papersWithDecisions.map((paper) => ({
            index: paper._index,
            title: paper.Title,
            csv: paper._csvDecision,
            local: paper._localDecision,
            final: paper.decision,
          }))
        );

        setPapers(
          papersWithDecisions
        );

        console.log("=== STATS DEBUG ===");

        console.log(
          "inutile:",
          papersWithDecisions.filter(
            (paper) => paper.decision === "inutile"
          ).length
        );

        console.log(
          "cite:",
          papersWithDecisions.filter(
            (paper) => paper.decision === "cite"
          ).length
        );

        console.log(
          "ideas:",
          papersWithDecisions.filter(
            (paper) => paper.decision === "ideas"
          ).length
        );

        console.log(
          "totale:",
          papersWithDecisions.filter(
            (paper) =>
              paper.decision === "inutile" ||
              paper.decision === "cite" ||
              paper.decision === "ideas"
          ).length
        );
        /*
         * Trova il primo paper senza decisione.
         */
        const firstUndecidedIndex =
          papersWithDecisions.findIndex(
            (paper) =>
              !paper.decision
          );

        if (
          firstUndecidedIndex === -1
        ) {
          /*
           * Tutti i paper sono classificati.
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
   * ============================================================
   * DECIDED COUNT
   * ============================================================
   */
  const decidedCount = useMemo(() => {
    return papers.filter(
      (paper) =>
        paper.decision !== undefined
    ).length;
  }, [papers]);

  /*
   * ============================================================
   * PROGRESS
   * ============================================================
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
   * ============================================================
   * DECISION STATS
   * ============================================================
   *
   * Le stats vengono calcolate sullo stato effettivo dell'app:
   *
   *   CSV
   *     ↓
   * decisione presente nel CSV
   *     ↓
   * localStorage sovrascrive eventualmente quella decisione
   *     ↓
   * stato finale visualizzato
   *
   * Quindi:
   *
   * CSV:
   *   18 inutile
   *   21 cite
   *   18 ideas
   *
   * + eventuali modifiche locali
   *
   * = stats attuali dell'app
  */
  const decisionStats = useMemo(() => {
    const inutileCount = papers.filter(
      (paper) => paper.decision === "inutile"
    ).length;

    const citeCount = papers.filter(
      (paper) => paper.decision === "cite"
    ).length;

    const ideasCount = papers.filter(
      (paper) => paper.decision === "ideas"
    ).length;

  /*
    * IMPORTANTISSIMO:
    *
    * Il totale è la somma delle tre decisioni valide.
    *
    * In questo modo eventuali valori vecchi
    * come "accept", "reject", "maybe" non
    * falsano il denominatore.
  */
    const total =
      inutileCount +
      citeCount +
      ideasCount;

    if (total === 0) {
      return {
        total: 0,

        inutileCount: 0,
        citeCount: 0,
        ideasCount: 0,

        inutile: 0,
        cite: 0,
        ideas: 0,
      };
    }

    return {
      total,

      inutileCount,
      citeCount,
      ideasCount,

      inutile:
        (inutileCount / total) * 100,

      cite:
        (citeCount / total) * 100,

      ideas:
        (ideasCount / total) * 100,
    };
  }, [papers]);

  /*
   * ============================================================
   * RIPRENDI
   * ============================================================
   *
   * Cerca SEMPRE il primo paper senza decisione.
   *
   * Esempio:
   *
   * 1-100  -> decisione
   * 101    -> vuoto
   *
   * "Riprendi" porta a 101.
   *
   * Questo funziona anche se l'utente è tornato indietro
   * con Undo.
   */
  const handleResume = useCallback(() => {
    const firstUndecidedIndex =
      papers.findIndex(
        (paper) =>
          !paper.decision
      );

    if (
      firstUndecidedIndex === -1
    ) {
      /*
       * Tutti i paper sono classificati.
       */
      setCurrentIndex(
        papers.length
      );
    } else {
      setCurrentIndex(
        firstUndecidedIndex
      );
    }

    setMenuOpen(false);
  }, [papers]);

  /*
   * ============================================================
   * CURRENT POSITION
   * ============================================================
   */
  const currentPosition =
    papers.length === 0
      ? 0
      : Math.min(
          currentIndex + 1,
          papers.length
        );

  /*
   * ============================================================
   * DECISION
   * ============================================================
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
         *
         * Questo aggiorna automaticamente:
         * - card
         * - counter
         * - progress
         * - stats
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
         * Stato persistente.
         */
        const savedState =
          loadSavedState();

        /*
         * Salva / sovrascrive
         * la decisione del paper.
         */
        savedState.decisions[
          paper._index
        ] = decision;

        /*
         * Aggiunge alla history
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
         * Passa alla card successiva.
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
   * ============================================================
   * UNDO
   * ============================================================
   *
   * L'undo NON cancella la decisione.
   *
   * Quindi:
   *
   * - la card precedente mostra ancora il colore
   * - le stats rimangono invariate
   * - il counter torna indietro
   *
   * Questo permette di rivedere una card senza
   * perdere la classificazione già effettuata.
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
   * ============================================================
   * EXPORT CSV
   * ============================================================
   */
  const handleExport =
    useCallback(async () => {
      const savedState =
        loadSavedState();

      await exportPapersToCsv(
        papers,
        savedState.decisions
      );

      setMenuOpen(false);
    }, [papers]);

  /*
   * ============================================================
   * KEYBOARD
   * ============================================================
   */
  useKeyboard({
    onDecision: handleDecision,
    onUndo: handleUndo,
  });

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (loading) {
    return (
      <main
        className="
          flex h-dvh
          items-center justify-center
          bg-[#202020]
          text-white
        "
      >
        Caricamento...
      </main>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */
  if (error) {
    return (
      <main
        className="
          flex h-dvh
          items-center justify-center
          bg-[#202020]
          p-6
          text-white
        "
      >
        <div
          className="
            border-2
            border-red-700
            bg-red-950
            p-6
          "
        >
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
    <main
      className="
        relative flex h-dvh
        flex-col
        overflow-hidden
        bg-[#202020]
      "
    >
      {/* ====================================================== */}
      {/* TOP CONTROLS */}
      {/* ====================================================== */}

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
          disabled={
            currentIndex === 0
          }
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
                w-64
                border-2 border-white/20
                bg-[#252525]
                shadow-[5px_5px_0_rgba(0,0,0,0.35)]
              "
            >
              {/* ================================================= */}
              {/* STATS */}
              {/* ================================================= */}

              <div
                className="
                  border-b border-white/10
                  px-4 py-4
                "
              >
                <div
                  className="
                    mb-3
                    flex items-center
                    justify-between
                  "
                >
                  <span
                    className="
                      font-mono text-xs
                      font-bold uppercase
                      tracking-wide
                      text-white/70
                    "
                  >
                    Stats
                  </span>

                  <span
                    className="
                      font-mono text-[10px]
                      text-white/35
                    "
                  >
                    {decisionStats.total}{" "}
                    valutati
                  </span>
                </div>

                {decisionStats.total >
                0 ? (
                  <>
                    {/* Barra 100% */}
                    <div
                      className="
                        flex h-4
                        w-full
                        overflow-hidden
                        border
                        border-white/10
                        bg-white/5
                      "
                    >
                      {/* Inutile */}
                      {decisionStats.inutile >
                        0 && (
                        <div
                          className="
                            h-full
                            bg-red-300
                            transition-all
                            duration-300
                          "
                          style={{
                            width: `${decisionStats.inutile}%`,
                          }}
                        />
                      )}

                      {/* Cite */}
                      {decisionStats.cite >
                        0 && (
                        <div
                          className="
                            h-full
                            bg-orange-300
                            transition-all
                            duration-300
                          "
                          style={{
                            width: `${decisionStats.cite}%`,
                          }}
                        />
                      )}

                      {/* Ideas */}
                      {decisionStats.ideas >
                        0 && (
                        <div
                          className="
                            h-full
                            bg-green-300
                            transition-all
                            duration-300
                          "
                          style={{
                            width: `${decisionStats.ideas}%`,
                          }}
                        />
                      )}
                    </div>

                    {/* Legenda */}
                    <div
                      className="
                        mt-3
                        grid grid-cols-3
                        gap-2
                      "
                    >
                      {/* Inutile */}
                      <div>
                        <div
                          className="
                            flex items-center
                            gap-1.5
                          "
                        >
                          <span
                            className="
                              h-2 w-2
                              shrink-0
                              bg-red-300
                            "
                          />

                          <span
                            className="
                              font-mono
                              text-[9px]
                              uppercase
                              text-white/45
                            "
                          >
                            Inutile
                          </span>
                        </div>

                        <div
                          className="
                            mt-1
                            font-mono
                            text-xs
                            font-bold
                            text-white/70
                          "
                        >
                          {decisionStats.inutile.toFixed(1)}%
                          {"|"}
                          {decisionStats.inutileCount}
                        </div>
                      </div>

                      {/* Cite */}
                      <div>
                        <div
                          className="
                            flex items-center
                            gap-1.5
                          "
                        >
                          <span
                            className="
                              h-2 w-2
                              shrink-0
                              bg-orange-300
                            "
                          />

                          <span
                            className="
                              font-mono
                              text-[9px]
                              uppercase
                              text-white/45
                            "
                          >
                            Cite
                          </span>
                        </div>

                        <div
                          className="
                            mt-1
                            font-mono
                            text-xs
                            font-bold
                            text-white/70
                          "
                        >
                          {decisionStats.cite.toFixed(1)}%
                          {"|"}
                          {decisionStats.citeCount}
                        </div>
                      </div>

                      {/* Ideas */}
                      <div>
                        <div
                          className="
                            flex items-center
                            gap-1.5
                          "
                        >
                          <span
                            className="
                              h-2 w-2
                              shrink-0
                              bg-green-300
                            "
                          />

                          <span
                            className="
                              font-mono
                              text-[9px]
                              uppercase
                              text-white/45
                            "
                          >
                            Ideas
                          </span>
                        </div>

                        <div
                          className="
                            mt-1
                            font-mono
                            text-xs
                            font-bold
                            text-white/70
                          "
                        >
                          {decisionStats.ideas.toFixed(1)}%
                          {"|"}
                          {decisionStats.ideasCount}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="
                      py-2
                      text-center
                      font-mono
                      text-[10px]
                      uppercase
                      tracking-wide
                      text-white/30
                    "
                  >
                    Nessun paper valutato
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* RIPRENDI */}
              {/* ================================================= */}

              <button
                type="button"
                onClick={
                  handleResume
                }
                className="
                  flex w-full
                  items-center
                  justify-between
                  border-b
                  border-white/10
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
                <div className="flex flex-col">
                  <span>
                    Riprendi
                  </span>

                  <span
                    className="
                      mt-0.5
                      text-[9px]
                      font-normal
                      normal-case
                      tracking-normal
                      text-white/35
                    "
                  >
                    Prima card non valutata
                  </span>
                </div>

                <span
                  className="
                    text-white/40
                  "
                >
                  →
                </span>
              </button>

              {/* ================================================= */}
              {/* EXPORT */}
              {/* ================================================= */}

              <button
                type="button"
                onClick={
                  handleExport
                }
                className="
                  flex w-full
                  items-center
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

                <span
                  className="
                    text-white/40
                  "
                >
                  ↓
                </span>
              </button>

              {/* ================================================= */}
              {/* RESET */}
              {/* ================================================= */}

              <button
                type="button"
                onClick={
                  handleReset
                }
                className="
                  flex w-full
                  items-center
                  justify-between
                  border-t
                  border-white/10
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
                <span>
                  Reset decisioni
                </span>

                <span
                  className="
                    text-red-300/50
                  "
                >
                  ↺
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================== */}
      {/* CARD */}
      {/* ====================================================== */}

      <section
        className="
          relative min-h-0 flex-1
          p-3 pt-20
          sm:p-5 sm:pt-20
        "
      >
        <div
          className="
            relative mx-auto
            h-full w-full
            max-w-4xl
          "
        >
          {!finished &&
            currentPaper && (
              <SwipeCard
                key={
                  currentPaper._index
                }
                paper={
                  currentPaper
                }
                onDecision={
                  handleDecision
                }
                displayDecision={
                  currentPaper.decision
                }
              />
            )}

          {finished && (
            <div
              className="
                flex h-full
                items-center
                justify-center
              "
            >
              <div
                className="
                  border-2
                  border-white/20
                  bg-black/20
                  px-8 py-6
                  text-center
                  text-white
                "
              >
                <div
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  Tutti i paper
                  classificati 🎉
                </div>

                <div
                  className="
                    mt-2
                    text-sm
                    text-white/50
                  "
                >
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
            decision={
              lastDecision
            }
          />
        </div>
      </section>

      {/* ====================================================== */}
      {/* CURRENT POSITION */}
      {/* ====================================================== */}

      <div
        className="
          shrink-0
          pb-2
          text-center
        "
      >
        <span
          className="
            font-mono
            text-xs
            text-white/45
          "
        >
          {currentPosition.toLocaleString(
            "it-IT"
          )}{" "}
          /{" "}
          {papers.length.toLocaleString(
            "it-IT"
          )}
        </span>
      </div>

      {/* ====================================================== */}
      {/* PROGRESS */}
      {/* ====================================================== */}

      <div
        className="
          h-1 shrink-0
          bg-white/10
        "
      >
        <div
          className="
            h-full
            bg-white/60
            transition-all
            duration-300
          "
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </main>
  );
}

export default App;