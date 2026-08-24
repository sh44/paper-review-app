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
      const target =
        event.target as HTMLElement | null;

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
         * Destra = Ideas
         */
        case "arrowright":
        case "d":
          onDecision("ideas");
          break;

        /*
         * Giù = Cite
         */
        case "arrowdown":
        case "s":
          onDecision("cite");
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