import type { Decision } from "../types/Paper";

const STORAGE_KEY = "paper-review-decisions";

export interface SavedState {
  decisions: Record<
    number,
    Decision
  >;

  tags: Record<
    number,
    Record<string, boolean>
  >;

  /*
   * Ordine dei tag.
   *
   * I tag provenienti dal CSV vengono aggiunti
   * all'inizio.
   *
   * I nuovi tag creati nell'app vengono aggiunti
   * successivamente e questo ordine viene
   * mantenuto anche dopo un reload.
   */
  tagNames: string[];

  /*
   * Indici dei paper già valutati.
   */
  history: number[];
}

const emptyState: SavedState = {
  decisions: {},
  tags: {},
  tagNames: [],
  history: [],
};

export function loadSavedState(): SavedState {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return {
        decisions: {},
        tags: {},
        tagNames: [],
        history: [],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      decisions:
        parsed &&
        typeof parsed.decisions ===
          "object"
          ? parsed.decisions
          : {},

      tags:
        parsed &&
        typeof parsed.tags ===
          "object"
          ? parsed.tags
          : {},

      tagNames:
        Array.isArray(
          parsed?.tagNames
        )
          ? parsed.tagNames.filter(
              (tag: unknown) =>
                typeof tag ===
                "string"
            )
          : [],

      history:
        Array.isArray(
          parsed?.history
        )
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
      tags: {},
      tagNames: [],
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