import type { Decision, Paper } from "../types/Paper";

interface PaperCardProps {
  paper: Paper;
  displayDecision?: Decision | null;
}

function getContextStyle(context: string) {
  switch (context?.trim().toLowerCase()) {
    case "id focus":
      return {
        background: "#dbeafe",
        border: "#60a5fa",
      };

    case "cute&co focus":
      return {
        background: "#fce7f3",
        border: "#f472b6",
      };

    case "child focus":
      return {
        background: "#dcfce7",
        border: "#4ade80",
      };

    default:
      return {
        background: "#f3f4f6",
        border: "#9ca3af",
      };
  }
}

function getDecisionStyle(decision?: Decision | null) {
  switch (decision) {
    case "reject":
      return {
        background: "#fecaca",
        border: "#ef4444",
      };

    case "maybe":
      return {
        background: "#fed7aa",
        border: "#f97316",
      };

    case "accept":
      return {
        background: "#bbf7d0",
        border: "#22c55e",
      };

    default:
      return null;
  }
}

function PaperCard({
  paper,
  displayDecision,
}: PaperCardProps) {
  /*
   * La decisione permanente salvata sulla carta
   * ha la precedenza.
   *
   * displayDecision serve solo per eventuali
   * effetti temporanei durante lo swipe.
   */
  const decision =
    paper.decision ?? displayDecision ?? null;

  const contextStyle = getContextStyle(paper.Context);
  const decisionStyle = getDecisionStyle(decision);

  /*
   * Se esiste una decisione:
   *   reject -> rosso
   *   maybe  -> arancione
   *   accept -> verde
   *
   * Altrimenti:
   *   usa il colore del Context.
   */
  const cardStyle = decisionStyle ?? contextStyle;

  return (
    <article
      className="
        flex h-full w-full flex-col
        overflow-hidden
        border-2
        shadow-[6px_6px_0_rgba(0,0,0,0.18)]
      "
      style={{
        backgroundColor: cardStyle.background,
        borderColor: cardStyle.border,
      }}
    >
      {/* Top metadata */}
      <div
        className="
          relative
          flex shrink-0
          items-center
          justify-between
          px-5 pt-5
          sm:px-7 sm:pt-7
        "
      >
        {/* Series */}
        <div
          className="
            max-w-[35%]
            truncate
            font-mono
            text-xs
            font-bold
            uppercase
            tracking-wider
            text-black/55
          "
        >
          {paper.Series || ""}
        </div>

        {/* Context */}
        <div
          className="
            absolute
            left-1/2
            -translate-x-1/2
            whitespace-nowrap
            font-mono
            text-xs
            font-bold
            uppercase
            tracking-wider
            text-black/55
          "
        >
          {paper.Context}
        </div>

        {/* Publication year */}
        <div
          className="
            font-mono
            text-sm
            font-bold
            text-black/60
          "
        >
          {paper["Publication Year"]}
        </div>
      </div>

      {/* Title */}
      <div
        className="
          shrink-0
          px-6
          pt-5
          text-center
          sm:px-10
          sm:pt-7
        "
      >
        <h1
          className="
            text-xl
            font-black
            leading-tight
            tracking-tight
            text-black/85
            sm:text-2xl
            md:text-3xl
          "
        >
          {paper.Title || "Untitled paper"}
        </h1>
      </div>

      {/* Manual tags */}
      {paper["Manual Tags"] && (
        <div
          className="
            shrink-0
            px-6
            pt-4
            text-center
            sm:px-10
          "
        >
          <p
            className="
              text-xs
              font-medium
              italic
              text-black/50
            "
          >
            {paper["Manual Tags"]}
          </p>
        </div>
      )}

      {/* Abstract */}
      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          px-6
          pb-7
          pt-5
          sm:px-10
        "
      >
        <p
          className="
            whitespace-pre-wrap
            text-sm
            leading-relaxed
            text-black/75
            sm:text-base
          "
        >
          {paper["Abstract Note"] ||
            "No abstract available."}
        </p>
      </div>
    </article>
  );
}

export default PaperCard;