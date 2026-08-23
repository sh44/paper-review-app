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

  const rejectOpacity = useTransform(
    x,
    [-180, -60, 0],
    [1, 0.5, 0]
  );

  const acceptOpacity = useTransform(
    x,
    [0, 60, 180],
    [0, 0.5, 1]
  );

  const maybeOpacity = useTransform(
    y,
    [0, 60, 180],
    [0, 0.5, 1]
  );

  const decide = async (decision: Decision) => {
    let targetX = 0;
    let targetY = 0;

    if (decision === "reject") {
      targetX = -window.innerWidth * 1.3;
    }

    if (decision === "accept") {
      targetX = window.innerWidth * 1.3;
    }

    if (decision === "maybe") {
      targetY = window.innerHeight * 1.3;
    }

    /*
     * Prima anima la card fuori dallo schermo.
     *
     * Poi comunichiamo ad App la decisione.
     *
     * App cambierà currentIndex e, grazie al key
     * sulla SwipeCard, verrà montata una nuova istanza
     * con x/y nuovamente a 0.
     */
    await animate(
      decision === "maybe" ? y : x,
      decision === "maybe" ? targetY : targetX,
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
          if (!isTouchDevice) {
            return;
          }

          const horizontal = info.offset.x;
          const vertical = info.offset.y;

          /*
           * Swipe orizzontale.
           */
          if (Math.abs(horizontal) > 120) {
            void decide(
              horizontal > 0
                ? "accept"
                : "reject"
            );

            return;
          }

          /*
           * Swipe verticale.
           */
          if (Math.abs(vertical) > 120) {
            void decide("maybe");
            return;
          }

          /*
           * Swipe troppo piccolo:
           * riportiamo la card al centro.
           */
          void animate(x, 0, {
            type: "spring",
            stiffness: 500,
            damping: 30,
          });

          void animate(y, 0, {
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

        {/* Reject */}
        <motion.div
          style={{ opacity: rejectOpacity }}
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
          Reject
        </motion.div>

        {/* Accept */}
        <motion.div
          style={{ opacity: acceptOpacity }}
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
          Accept
        </motion.div>

        {/* Maybe */}
        <motion.div
          style={{ opacity: maybeOpacity }}
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
          Maybe
        </motion.div>
      </motion.div>
    </div>
  );
}

export default SwipeCard;