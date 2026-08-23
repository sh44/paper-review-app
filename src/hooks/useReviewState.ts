import { useEffect, useMemo, useState } from "react";
import type { Decision, Paper } from "../types/Paper";
import { exportPapersToCsv } from "../services/exportServices";

const STORAGE_KEY = "paper-review-decisions";

interface ReviewStorage {
  decisions: Record<number, Decision>;
}

export function useReviewState(papers: Paper[]) {
  const [decisions, setDecisions] = useState<
    Record<number, Decision>
  >({});

  const [currentIndex, setCurrentIndex] = useState(0);

  const [displayDecision, setDisplayDecision] =
    useState<Decision | null>(null);

  const [ready, setReady] = useState(false);

  /*
   * Carica decisioni dal browser
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: ReviewStorage = JSON.parse(stored);

        if (parsed.decisions) {
          setDecisions(parsed.decisions);
        }
      }
    } catch (error) {
      console.error(
        "Errore caricamento stato review:",
        error
      );
    } finally {
      setReady(true);
    }
  }, []);

  /*
   * Salva automaticamente
   */
  useEffect(() => {
    if (!ready) return;

    try {
      const storage: ReviewStorage = {
        decisions,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(storage)
      );
    } catch (error) {
      console.error(
        "Errore salvataggio stato review:",
        error
      );
    }
  }, [decisions, ready]);

  /*
   * Trova il primo paper non classificato
   */
  useEffect(() => {
    if (!ready || !papers.length) return;

    const firstUnreviewed = papers.findIndex(
      (_, index) => !decisions[index]
    );

    if (firstUnreviewed === -1) {
      setCurrentIndex(papers.length);
    } else {
      setCurrentIndex(firstUnreviewed);
    }
  }, [papers, decisions, ready]);

  const currentPaper = papers[currentIndex];

  const completedCount = useMemo(
    () => Object.keys(decisions).length,
    [decisions]
  );

  const progress = useMemo(() => {
    if (!papers.length) return 0;

    return (completedCount / papers.length) * 100;
  }, [completedCount, papers.length]);

  const currentDecision =
    currentPaper && decisions[currentIndex]
      ? decisions[currentIndex]
      : null;

  const visibleDecision =
    displayDecision ?? currentDecision;

  /*
   * Decisione
   */
  const decide = (decision: Decision) => {
    if (!currentPaper) return;

    const index = currentIndex;

    setDecisions((previous) => ({
      ...previous,
      [index]: decision,
    }));

    setDisplayDecision(null);

    /*
     * Vai semplicemente alla card successiva
     * rispetto a quella attuale.
     */
    setCurrentIndex(
      Math.min(index + 1, papers.length)
    );
  };

  /*
   * Undo
   */
  const undo = () => {
    if (currentIndex <= 0) return;

    const previousIndex = currentIndex - 1;

    const previousDecision =
      decisions[previousIndex] ?? null;

    setCurrentIndex(previousIndex);

    /*
     * Manteniamo il colore della decisione precedente.
     */
    setDisplayDecision(previousDecision);
  };

  /*
   * Export CSV
   */
  const exportData = () => {
    exportPapersToCsv(papers, decisions);
  };

  return {
    currentPaper,
    currentIndex,

    completedCount,
    progress,

    currentDecision,
    displayDecision,
    visibleDecision,

    decisions,

    decide,
    undo,

    exportData,

    ready,
  };
}