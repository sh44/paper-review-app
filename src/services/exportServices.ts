import Papa from "papaparse";

import type {
  Decision,
  Paper,
} from "../types/Paper";

export async function exportPapersToCsv(
  papers: Paper[],
  decisions: Record<number, Decision>
) {
  const rows = papers.map((paper) => ({
    ...paper,
    decision:
      decisions[paper._index] ?? "",
  }));

  const csv = Papa.unparse(rows, {
    quotes: true,
    newline: "\r\n",
  });

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  /*
   * Nome del file esportato.
   */
  const filename =
    "paper-review-results.csv";

  /*
   * Su iOS / iPadOS proviamo prima
   * la condivisione nativa.
   *
   * navigator.canShare() verifica che
   * il browser supporti la condivisione
   * di questo tipo di file.
   */
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    const file = new File(
      [blob],
      filename,
      {
        type: "text/csv",
      }
    );

    const shareData = {
      files: [file],
      title: "Paper Review",
    };

    if (
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(
          shareData
        );

        /*
         * La condivisione è stata completata.
         */
        return;
      } catch (error) {
        /*
         * Se l'utente chiude il menu
         * di condivisione, non facciamo nulla.
         *
         * AbortError = l'utente ha semplicemente
         * annullato la condivisione.
         */
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Unable to share CSV:",
          error
        );

        /*
         * Se la condivisione fallisce per
         * qualche altro motivo, continuiamo
         * con il normale download.
         */
      }
    }
  }

  /*
   * Fallback:
   *
   * Browser desktop o browser che non
   * supportano la condivisione dei file.
   */
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  /*
   * Diamo al browser un momento prima
   * di revocare l'URL.
   */
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}