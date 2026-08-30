"use client";

import { useEffect, useState } from "react";

// Brief highlight when a pot is awarded. CSS-only, runs once, then unmounts.
export default function HomeConfetti({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!trigger || !visible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 bg-emerald-500/10"
      style={{ animation: "home-win-flash 1.2s ease-out forwards" }}
    >
      <style>{`
        @keyframes home-win-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
