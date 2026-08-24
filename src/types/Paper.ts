export type Decision = "inutile" | "cite" | "ideas";

export interface Paper {
  Context: string;
  "Item Type": string;
  "Publication Year": string;
  Author: string;
  Title: string;
  DOI: string;
  Url: string;
  "Abstract Note": string;
  Series: string;
  Publisher: string;
  "Manual Tags": string;
  Source: string;

  // indice originale della riga nel CSV
  _index: number;

  // decisione eventualmente già salvata
  decision?: Decision;
}