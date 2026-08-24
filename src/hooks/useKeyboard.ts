import { useEffect } from "react";

import type { Decision } from "../types/Paper";

interface UseKeyboardProps {
  onDecision: (decision: Decision) => void;
  onUndo: () => void;
}

export function useKeyboard({
  onDecision,
  onUndo,
}: UseKeyboardProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      /*
       * Evita di intercettare i tasti mentre
       * l'utente sta scrivendo in un input.
       */
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        /*
         * Sinistra = Inutile
         */
        case "arrowleft":
        case "a":
          onDecision("inutile");
          break;

        /*
         * Destra = Cite
         */
        case "arrowright":
        case "d":
          onDecision("cite");
          break;

        /*
         * Giù = Ideas
         */
        case "arrowdown":
        case "s":
          onDecision("ideas");
          break;

        /*
         * Undo
         */
        case "z":
        case "backspace":
          onUndo();
          break;

        default:
          break;
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onDecision, onUndo]);
}