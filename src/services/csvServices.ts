import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { Paper } from "../types/Paper";

export function loadPapers(): Promise<Paper[]> {
  return new Promise((resolve, reject) => {
    const csvUrl = `${import.meta.env.BASE_URL}papers.csv`;

    Papa.parse<Record<string, string>>(csvUrl, {
      header: true,
      skipEmptyLines: true,
      download: true,

      complete: (
        results: ParseResult<Record<string, string>>
      ) => {
        try {
          const papers: Paper[] = results.data.map(
            (row, index) => ({
              ...row,
              _index: index,
            } as Paper)
          );

          resolve(papers);
        } catch (error) {
          reject(error);
        }
      },

      error: (error) => {
        reject(error);
      },
    });
  });
}
