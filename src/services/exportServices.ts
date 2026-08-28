import Papa from "papaparse";

import type {
  Decision,
  Paper,
} from "../types/Paper";

export function exportPapersToCsv(
  papers: Paper[],
  decisions: Record<
    number,
    Decision
  >,
  tags: Record<
    number,
    Record<string, boolean>
  >,
  tagNames: string[]
) {
  const rows = papers.map(
    (paper) => {
      const paperTags =
        tags[paper._index] ??
        paper.tags ??
        {};

      /*
       * Parte dai dati originali
       * del paper.
       */
      const row: Record<
        string,
        unknown
      > = {
        ...paper,
      };

      /*
       * Decisione finale.
       *
       * Priorità:
       *
       * 1. localStorage
       * 2. decisione presente nel paper
       * 3. stringa vuota
       */
      row.decision =
        decisions[
          paper._index
        ] ??
        paper.decision ??
        "";

      /*
       * Ogni tag diventa una colonna.
       *
       * true  -> "1"
       * false -> ""
       */
      for (
        const tag of tagNames
      ) {
        row[tag] =
          paperTags[tag]
            ? "1"
            : "";
      }

      /*
       * "tags" è una struttura
       * interna all'app e non deve
       * comparire nel CSV.
       */
      delete row.tags;

      return row;
    }
  );

  const csv =
    Papa.unparse(rows, {
      quotes: true,
      newline: "\r\n",
    });

  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    "paper-review-results.csv";

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );
}