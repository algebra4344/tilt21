"use client";

import { useEffect, useState } from "react";
import type { CorrectionInfo } from "@/hooks/useSoloGame";

type CorrectionToastProps = {
  correction: CorrectionInfo | null;
};

// Remount with a changing `key` (e.g. correction.timestamp) to reset the toast.
export default function CorrectionToast({ correction }: CorrectionToastProps) {
  const [visible, setVisible] = useState(true);
  const [bouncing, setBouncing] = useState(true);

  useEffect(() => {
    const bounceTimer = setTimeout(() => setBouncing(false), 200);
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, correction?.isCorrect ? 1200 : 3000);

    return () => {
      clearTimeout(bounceTimer);
      clearTimeout(hideTimer);
    };
  }, [correction]);

  if (!correction) return null;
  const current = correction;

  return (
    <div className="min-h-[36px] flex items-center justify-center">
      <div
        className={`transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        } ${bouncing ? "scale-105" : "scale-100"}`}
        style={{ transition: "opacity 0.2s, transform 0.2s" }}
      >
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-medium ${
            current.isCorrect
              ? "bg-green-900/80 border-green-500/50 text-green-200"
              : "bg-red-900/80 border-red-500/50 text-red-200"
          }`}
        >
          <span>{current.isCorrect ? "✓" : "→"}</span>
          {!current.isCorrect && current.message && (
            <span>{current.message}</span>
          )}
          {current.isCorrect && <span>Nice</span>}
        </div>
      </div>
    </div>
  );
}
