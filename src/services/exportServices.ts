import Papa from "papaparse";

import type { Decision, Paper } from "../types/Paper";

export function exportPapersToCsv(
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

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "paper-review-results.csv";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}