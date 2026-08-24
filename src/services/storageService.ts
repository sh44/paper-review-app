import type { Decision } from "../types/Paper";

const STORAGE_KEY = "paper-review-decisions";

export interface SavedState {
  decisions: Record<number, Decision>;
  history: number[];
}

const emptyState: SavedState = {
  decisions: {},
  history: [],
};

export function loadSavedState(): SavedState {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        decisions: {},
        history: [],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      decisions:
        parsed &&
        typeof parsed.decisions === "object"
          ? parsed.decisions
          : {},

      history:
        Array.isArray(parsed?.history)
          ? parsed.history
          : [],
    };
  } catch (error) {
    console.error(
      "Unable to load saved state:",
      error
    );

    return {
      ...emptyState,
      decisions: {},
      history: [],
    };
  }
}

export function saveState(
  state: SavedState
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error(
      "Unable to save state:",
      error
    );
  }
}

export function clearSavedState() {
  try {
    localStorage.removeItem(
      STORAGE_KEY
    );
  } catch (error) {
    console.error(
      "Unable to clear saved state:",
      error
    );
  }
}