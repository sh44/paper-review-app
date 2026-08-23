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
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          onDecision("reject");
          break;

        case "ArrowRight":
          event.preventDefault();
          onDecision("accept");
          break;

        case "ArrowUp":
        case "ArrowDown":
          event.preventDefault();
          onDecision("maybe");
          break;

        case "Backspace":
          event.preventDefault();
          onUndo();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDecision, onUndo]);
}