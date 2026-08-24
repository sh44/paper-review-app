import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { Decision, Paper } from "../types/Paper";

export function loadPapers(): Promise<Paper[]> {
  return new Promise((resolve, reject) => {
    const csvUrl = `${import.meta.env.BASE_URL}papers.csv`;

    console.log("Loading CSV from:", csvUrl);

    Papa.parse<Record<string, string>>(csvUrl, {
      header: true,
      skipEmptyLines: true,
      download: true,

      complete: (
        results: ParseResult<Record<string, string>>
      ) => {
        console.log("CSV loaded:", results.data.length, "rows");

        try {
          const papers: Paper[] = results.data.map(
            (row, index) => {
              const parsedIndex = Number(row._index);

              const paperIndex = Number.isFinite(parsedIndex)
                ? parsedIndex
                : index;

              const csvDecision = row.decision;

              const decision: Decision | undefined =
                csvDecision === "inutile" ||
                csvDecision === "cite" ||
                csvDecision === "ideas"
                  ? csvDecision
                  : undefined;

              return {
                ...row,
                _index: paperIndex,
                decision,
              } as Paper;
            }
          );

          resolve(papers);
        } catch (error) {
          reject(error);
        }
      },

      error: (error) => {
        console.error("CSV loading error:", error);
        console.error("CSV URL:", csvUrl);

        reject(
          new Error(
            `Impossibile caricare papers.csv da ${csvUrl}`
          )
        );
      },
    });
  });
}