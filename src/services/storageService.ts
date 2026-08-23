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
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return emptyState;
    }

    const parsed = JSON.parse(raw);

    return {
      decisions: parsed.decisions ?? {},
      history: parsed.history ?? [],
    };
  } catch (error) {
    console.error("Unable to load saved state:", error);
    return emptyState;
  }
}

export function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Unable to save state:", error);
  }
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}