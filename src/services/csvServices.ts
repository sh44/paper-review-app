import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type {
  Decision,
  Paper,
} from "../types/Paper";

/*
 * Colonne che NON devono essere considerate tag.
 *
 * Tutte le altre colonne presenti nel CSV
 * possono diventare categorie/tag.
 */
const RESERVED_COLUMNS =
  new Set([
    "Context",
    "Item Type",
    "Publication Year",
    "Author",
    "Title",
    "DOI",
    "Url",
    "Abstract Note",
    "Series",
    "Publisher",
    "Manual Tags",
    "Source",
    "_index",
    "decision",
  ]);

export interface LoadedPapers {
  papers: Paper[];

  /*
   * Nomi delle colonne-tag del CSV,
   * nello stesso ordine in cui compaiono
   * nel file CSV.
   */
  csvTagNames: string[];
}

export function loadPapers(): Promise<LoadedPapers> {
  return new Promise(
    (resolve, reject) => {
      const csvUrl =
        `${import.meta.env.BASE_URL}papers.csv`;

      console.log(
        "Loading CSV from:",
        csvUrl
      );

      Papa.parse<
        Record<string, string>
      >(csvUrl, {
        header: true,
        skipEmptyLines: true,
        download: true,

        complete: (
          results: ParseResult<
            Record<string, string>
          >
        ) => {
          console.log(
            "CSV loaded:",
            results.data.length,
            "rows"
          );

          try {
            /*
             * Tutte le colonne presenti
             * nel CSV.
             */
            const fields =
              results.meta.fields ??
              [];

            /*
             * Le colonne non riservate
             * diventano tag.
             *
             * L'ordine viene mantenuto
             * esattamente come nel CSV.
             */
            const csvTagNames =
              fields.filter(
                (field) =>
                  !RESERVED_COLUMNS.has(
                    field
                  )
              );

            console.log(
              "Tag columns:",
              csvTagNames
            );

            const papers: Paper[] =
              results.data.map(
                (
                  row,
                  index
                ) => {
                  /*
                   * Indice originale del CSV.
                   */
                  const parsedIndex =
                    Number(
                      row._index
                    );

                  const paperIndex =
                    Number.isFinite(
                      parsedIndex
                    )
                      ? parsedIndex
                      : index;

                  /*
                   * Decisione presente
                   * nel CSV.
                   */
                  const csvDecision =
                    row.decision;

                  const decision:
                    | Decision
                    | undefined =
                    csvDecision ===
                      "inutile" ||
                    csvDecision ===
                      "cite" ||
                    csvDecision ===
                      "ideas"
                      ? csvDecision
                      : undefined;

                  /*
                   * Legge i tag dal CSV.
                   *
                   * "1" -> true
                   * qualsiasi altra cosa -> false
                   */
                  const tags: Record<
                    string,
                    boolean
                  > = {};

                  for (
                    const tag of csvTagNames
                  ) {
                    tags[tag] =
                      row[tag] === "1";
                  }

                  return {
                    ...row,

                    _index:
                      paperIndex,

                    decision,

                    tags,
                  } as Paper;
                }
              );

            resolve({
              papers,
              csvTagNames,
            });
          } catch (error) {
            reject(error);
          }
        },

        error: (error) => {
          console.error(
            "CSV loading error:",
            error
          );

          console.error(
            "CSV URL:",
            csvUrl
          );

          reject(
            new Error(
              `Impossibile caricare papers.csv da ${csvUrl}`
            )
          );
        },
      });
    }
  );
}