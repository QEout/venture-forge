"use client";

import { motion } from "framer-motion";

interface RoundBannerProps {
  round: number;
  titleEn: string;
  titleCn: string;
}

const ROUND_COLORS = ["", "#60a5fa", "#fbbf24", "#34d399"];

export function RoundBanner({ round, titleEn, titleCn }: RoundBannerProps) {
  const color = ROUND_COLORS[round] || "#60a5fa";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 py-4"
    >
      <div className="flex-1 h-0 border-t border-dashed" style={{ borderColor: `${color}40` }} />
      <div
        className="pixel-text flex items-center gap-2 px-3 py-1.5"
        style={{
          background: `${color}15`,
          border: `2px solid ${color}50`,
          boxShadow: `2px 2px 0 rgba(0,0,0,0.3)`,
          color,
        }}
      >
        <span className="text-xs font-bold">{">"} ROUND {round}</span>
        <span style={{ color: `${color}60` }}>|</span>
        <span className="text-xs" style={{ color: "#e2e8f0" }}>{titleCn}</span>
        <span className="text-[10px]" style={{ color: "#64748b" }}>{titleEn}</span>
      </div>
      <div className="flex-1 h-0 border-t border-dashed" style={{ borderColor: `${color}40` }} />
    </motion.div>
  );
}
