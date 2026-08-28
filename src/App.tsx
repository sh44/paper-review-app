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

  const [loading, setLoading] =
    useState(true);

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
   * TAG NAMES
   * ============================================================
   *
   * Contiene l'elenco dei tag/categorie disponibili.
   *
   * ORDINE:
   *
   * 1. colonne già presenti nel CSV
   * 2. nuovi tag creati dall'app
   *
   * L'ordine viene salvato in localStorage.
   */
  const [tagNames, setTagNames] =
    useState<string[]>([]);

  /*
   * ============================================================
   * RESET
   * ============================================================
   *
   * Cancella decisioni, tag locali e ordine dei nuovi tag.
   *
   * Il CSV originale NON viene modificato.
   */
  const handleReset = useCallback(() => {
    const confirmed = window.confirm(
      "Vuoi cancellare tutte le decisioni e i tag salvati?"
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
   * 3. recupera l'ordine dei tag
   * 4. unisce CSV + modifiche locali
   * 5. trova il primo paper senza decisione
   */
  useEffect(() => {
    async function initialize() {
      try {
        const {
          papers: loadedPapers,
          csvTagNames,
        } = await loadPapers();

        const savedState =
          loadSavedState();

        /*
         * ========================================================
         * ORDINE DEI TAG
         * ========================================================
         *
         * Prima manteniamo l'ordine delle colonne
         * presenti nel CSV.
         *
         * Poi aggiungiamo eventuali tag creati
         * precedentemente nell'app.
         */
        const initialTagNames = [
          ...csvTagNames,
        ];

        for (
          const tag of savedState.tagNames
        ) {
          if (
            !initialTagNames.includes(tag)
          ) {
            initialTagNames.push(tag);
          }
        }

        /*
         * ========================================================
         * MERGE CSV + LOCALSTORAGE
         * ========================================================
         *
         * Regola:
         *
         * CSV
         *   ↓
         * tag iniziali
         *   ↓
         * localStorage sovrascrive
         *   ↓
         * stato finale dell'app
         *
         * Quindi se il CSV dice:
         *
         * AI = 1
         *
         * e localStorage dice:
         *
         * AI = false
         *
         * il risultato sarà false.
         */
        const papersWithDecisions =
          loadedPapers.map((paper) => {
            const localDecision =
              savedState.decisions[
              paper._index
              ];

            const csvTags =
              paper.tags ?? {};

            const localTags =
              savedState.tags[
              paper._index
              ] ?? {};

            const mergedTags:
              Record<string, boolean> = {
              ...csvTags,
              ...localTags,
            };

            return {
              ...paper,

              decision:
                localDecision ??
                paper.decision,

              tags: mergedTags,
            };
          });

        /*
         * ========================================================
         * DEBUG
         * ========================================================
         */
        console.log(
          "=== TAGS ==="
        );

        console.log(
          "CSV tags:",
          csvTagNames
        );

        console.log(
          "Saved tag names:",
          savedState.tagNames
        );

        console.log(
          "Final tag order:",
          initialTagNames
        );

        console.table(
          papersWithDecisions.map(
            (paper) => ({
              index:
                paper._index,

              title:
                paper.Title,

              decision:
                paper.decision,

              tags: Object.keys(
                paper.tags ?? {}
              )
                .filter(
                  (tag) =>
                    paper.tags?.[tag]
                )
                .join(", "),
            })
          )
        );

        /*
         * ========================================================
         * SALVA STATO
         * ========================================================
         *
         * Salviamo l'ordine finale dei tag.
         *
         * Questo è importante soprattutto per i nuovi tag
         * creati nell'app.
         */
        saveState({
          ...savedState,
          tagNames:
            initialTagNames,
        });

        setTagNames(
          initialTagNames
        );

        setPapers(
          papersWithDecisions
        );

        /*
         * ========================================================
         * TROVA PRIMO PAPER NON DECISO
         * ========================================================
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

  /*
   * ============================================================
   * CURRENT PAPER
   * ============================================================
   */
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
   */
  const decisionStats = useMemo(() => {
    const inutileCount =
      papers.filter(
        (paper) =>
          paper.decision === "inutile"
      ).length;

    const citeCount =
      papers.filter(
        (paper) =>
          paper.decision === "cite"
      ).length;

    const ideasCount =
      papers.filter(
        (paper) =>
          paper.decision === "ideas"
      ).length;

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
   * ADD TAG
   * ============================================================
   *
   * Crea un nuovo tag.
   *
   * Il confronto è case-sensitive:
   *
   * "HCI"
   * "hci"
   *
   * sono considerati due tag diversi.
   */
  const handleAddTag =
    useCallback(
      (tagName: string) => {
        const normalized =
          tagName.trim();

        if (!normalized) {
          return;
        }

        /*
         * Non creare duplicati.
         */
        if (
          tagNames.includes(
            normalized
          )
        ) {
          return;
        }

        /*
         * ========================================================
         * AGGIUNGE IL TAG ALL'ELENCO
         * ========================================================
         *
         * Il nuovo tag viene aggiunto IN FONDO.
         */
        const nextTagNames = [
          ...tagNames,
          normalized,
        ];

        setTagNames(
          nextTagNames
        );

        /*
         * ========================================================
         * AGGIUNGE IL TAG A TUTTI I PAPER
         * ========================================================
         *
         * Il valore iniziale è false.
         */
        setPapers(
          (previousPapers) =>
            previousPapers.map(
              (paper) => ({
                ...paper,

                tags: {
                  ...(paper.tags ??
                    {}),
                  [normalized]:
                    false,
                },
              })
            )
        );

        /*
         * ========================================================
         * PERSISTENZA
         * ========================================================
         */
        const savedState =
          loadSavedState();

        if (
          !savedState.tagNames.includes(
            normalized
          )
        ) {
          savedState.tagNames.push(
            normalized
          );
        }

        saveState(
          savedState
        );
      },
      [tagNames]
    );

  /*
   * ============================================================
   * TOGGLE TAG
   * ============================================================
   *
   * Cambia il valore del tag del paper corrente.
   *
   * false → true
   * true  → false
   */
  const handleToggleTag =
    useCallback(
      (tagName: string) => {
        const paper =
          papers[currentIndex];

        if (!paper) {
          return;
        }

        const currentValue =
          paper.tags?.[
          tagName
          ] ?? false;

        const nextValue =
          !currentValue;

        /*
         * ========================================================
         * AGGIORNA UI
         * ========================================================
         */
        setPapers(
          (previousPapers) =>
            previousPapers.map(
              (
                existingPaper,
                index
              ) =>
                index ===
                  currentIndex
                  ? {
                    ...existingPaper,

                    tags: {
                      ...(existingPaper.tags ??
                        {}),
                      [tagName]:
                        nextValue,
                    },
                  }
                  : existingPaper
            )
        );

        /*
         * ========================================================
         * AGGIORNA LOCALSTORAGE
         * ========================================================
         */
        const savedState =
          loadSavedState();

        if (
          !savedState.tags[
          paper._index
          ]
        ) {
          savedState.tags[
            paper._index
          ] = {};
        }

        savedState.tags[
          paper._index
        ][tagName] =
          nextValue;

        /*
         * Se per qualsiasi motivo il tag non è
         * ancora nell'elenco globale, aggiungilo.
         */
        if (
          !savedState.tagNames.includes(
            tagName
          )
        ) {
          savedState.tagNames.push(
            tagName
          );
        }

        saveState(
          savedState
        );

        /*
         * Mantiene sincronizzato anche lo stato React.
         */
        setTagNames(
          (previousTags) =>
            previousTags.includes(
              tagName
            )
              ? previousTags
              : [
                ...previousTags,
                tagName,
              ]
        );
      },
      [currentIndex, papers]
    );

  /*
   * ============================================================
   * RIPRENDI
   * ============================================================
   *
   * Cerca il primo paper senza decisione.
   *
   * I tag NON vengono considerati:
   * un paper può avere tag ma essere ancora
   * privo di una decisione.
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
   *
   * La decisione viene salvata insieme ai tag
   * correnti del paper.
   *
   * Questo è importante perché:
   *
   * 1. selezioni dei tag
   * 2. fai swipe
   * 3. decisione + tag vengono persistiti
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
         * ========================================================
         * AGGIORNA PAPER NELLO STATO REACT
         * ========================================================
         */
        setPapers(
          (previousPapers) =>
            previousPapers.map(
              (
                existingPaper,
                index
              ) =>
                index ===
                  currentIndex
                  ? {
                    ...existingPaper,

                    decision,
                  }
                  : existingPaper
            )
        );

        /*
         * ========================================================
         * CARICA STATO PERSISTENTE
         * ========================================================
         */
        const savedState =
          loadSavedState();

        /*
         * ========================================================
         * SALVA DECISIONE
         * ========================================================
         */
        savedState.decisions[
          paper._index
        ] = decision;

        /*
         * ========================================================
         * SALVA TAG DEL PAPER
         * ========================================================
         *
         * Copia completa dello stato dei tag
         * del paper al momento dello swipe.
         */
        savedState.tags[
          paper._index
        ] = {
          ...(paper.tags ??
            {}),
        };

        /*
         * ========================================================
         * HISTORY
         * ========================================================
         *
         * La history serve a ricordare quali paper
         * sono stati processati.
         *
         * Evitiamo duplicati.
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
         * ========================================================
         * SALVA
         * ========================================================
         */
        saveState(
          savedState
        );

        /*
         * ========================================================
         * FEEDBACK VISIVO
         * ========================================================
         */
        setLastDecision(
          decision
        );

        window.setTimeout(() => {
          setLastDecision(
            null
          );
        }, 450);

        /*
         * ========================================================
         * PASSA AL PAPER SUCCESSIVO
         * ========================================================
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
   * IMPORTANTISSIMO:
   *
   * Undo NON modifica localStorage.
   *
   * Quindi tornando indietro:
   *
   * - la decisione rimane
   * - i tag rimangono
   * - il paper mostra lo stato precedente
   * - le stats rimangono corrette
   *
   * Se poi fai di nuovo swipe sullo stesso paper,
   * la nuova decisione/tag state sovrascriverà
   * quella precedente.
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
   *
   * Passiamo:
   *
   * - papers
   * - decisioni locali
   * - tag locali
   * - ordine esplicito dei tag
   *
   * In questo modo l'export mantiene l'ordine desiderato
   * delle colonne.
   */
  const handleExport =
    useCallback(async () => {
      const savedState =
        loadSavedState();

      await exportPapersToCsv(
        papers,
        savedState.decisions,
        savedState.tags,
        tagNames
      );

      setMenuOpen(false);
    }, [
      papers,
      tagNames,
    ]);

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

  /*
   * ============================================================
   * FINISHED
   * ============================================================
   */
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
            aria-expanded={
              menuOpen
            }
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
                    {
                      decisionStats.total
                    }{" "}
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
                          {decisionStats.inutile.toFixed(
                            1
                          )}
                          %
                          {"|"}
                          {
                            decisionStats.inutileCount
                          }
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
                          {decisionStats.cite.toFixed(
                            1
                          )}
                          %
                          {"|"}
                          {
                            decisionStats.citeCount
                          }
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
                          {decisionStats.ideas.toFixed(
                            1
                          )}
                          %
                          {"|"}
                          {
                            decisionStats.ideasCount
                          }
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
                key={currentPaper._index}
                paper={currentPaper}
                onDecision={handleDecision}
                displayDecision={currentPaper.decision}
                tagNames={tagNames}
                onToggleTag={handleToggleTag}
                onAddTag={handleAddTag}
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