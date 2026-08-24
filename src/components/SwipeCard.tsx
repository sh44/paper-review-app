import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";

import type { Paper, Decision } from "../types/Paper";

import PaperCard from "./PaperCard";

import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

interface SwipeCardProps {
  paper: Paper;
  onDecision: (decision: Decision) => void;
  displayDecision?: Decision | null;
}

function SwipeCard({
  paper,
  onDecision,
  displayDecision,
}: SwipeCardProps) {
  const isTouchDevice = useIsTouchDevice();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(
    x,
    [-500, 0, 500],
    [-15, 0, 15]
  );

  const inutileOpacity = useTransform(
    x,
    [-180, -60, 0],
    [1, 0.5, 0]
  );

  const ideasOpacity = useTransform(
    x,
    [0, 60, 180],
    [0, 0.5, 1]
  );

  const citeOpacity = useTransform(
    y,
    [0, 60, 180],
    [0, 0.5, 1]
  );

  const decide = async (decision: Decision) => {
    let targetX = 0;
    let targetY = 0;

    if (decision === "inutile") {
      targetX = -window.innerWidth * 1.3;
    }

    if (decision === "ideas") {
      targetX = window.innerWidth * 1.3;
    }

    if (decision === "cite") {
      targetY = window.innerHeight * 1.3;
    }

    await animate(
      decision === "cite" ? y : x,
      decision === "cite" ? targetY : targetX,
      {
        duration: 0.25,
        ease: "easeOut",
      }
    );

    onDecision(decision);
  };

  return (
    <div className="relative h-full w-full">
      <motion.div
        style={{
          x,
          y,
          rotate,
        }}
        drag={isTouchDevice}
        dragConstraints={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
        dragElastic={1}
        onDragEnd={(_, info) => {
          if (!isTouchDevice) return;

          const horizontal = info.offset.x;
          const vertical = info.offset.y;

          if (Math.abs(horizontal) > 120) {
            decide(
              horizontal > 0
                ? "ideas"
                : "inutile"
            );

            return;
          }

          if (Math.abs(vertical) > 120) {
            decide("cite");
            return;
          }

          animate(x, 0, {
            type: "spring",
            stiffness: 500,
            damping: 30,
          });

          animate(y, 0, {
            type: "spring",
            stiffness: 500,
            damping: 30,
          });
        }}
        className={`
          absolute inset-0
          ${
            isTouchDevice
              ? "cursor-grab active:cursor-grabbing"
              : ""
          }
        `}
      >
        <PaperCard
          paper={paper}
          displayDecision={displayDecision}
        />

        {/* Inutile */}
        <motion.div
          style={{ opacity: inutileOpacity }}
          className="
            pointer-events-none
            absolute left-5 top-5
            border-2 border-red-700
            bg-red-100
            px-4 py-2
            text-xl font-black uppercase
            tracking-wider text-red-700
          "
        >
          Inutile
        </motion.div>

        {/* Ideas */}
        <motion.div
          style={{ opacity: ideasOpacity }}
          className="
            pointer-events-none
            absolute right-5 top-5
            border-2 border-green-700
            bg-green-100
            px-4 py-2
            text-xl font-black uppercase
            tracking-wider text-green-700
          "
        >
          Ideas
        </motion.div>

        {/* Cite */}
        <motion.div
          style={{ opacity: citeOpacity }}
          className="
            pointer-events-none
            absolute left-1/2 top-5
            -translate-x-1/2
            border-2 border-orange-700
            bg-orange-100
            px-4 py-2
            text-xl font-black uppercase
            tracking-wider text-orange-700
          "
        >
          Cite
        </motion.div>
      </motion.div>
    </div>
  );
}

export default SwipeCard;