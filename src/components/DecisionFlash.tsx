import { AnimatePresence, motion } from "framer-motion";
import type { Decision } from "../types/Paper";

interface DecisionFlashProps {
  decision: Decision | null;
}

function DecisionFlash({ decision }: DecisionFlashProps) {
  return (
    <AnimatePresence>
      {decision && (
        <motion.div
          key={decision}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className={`
            pointer-events-none
            absolute inset-x-0 bottom-0
            h-28
            blur-2xl
            ${
              decision === "accept"
                ? "bg-green-500"
                : decision === "reject"
                ? "bg-red-500"
                : "bg-orange-400"
            }
          `}
        />
      )}
    </AnimatePresence>
  );
}

export default DecisionFlash;