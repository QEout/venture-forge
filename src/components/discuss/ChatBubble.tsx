"use client";

import { motion } from "framer-motion";
import type { Agent } from "@/lib/types";
import { PixelAvatar } from "../agents/PixelAvatar";

interface Source {
  title: string;
  url: string;
}

interface ChatBubbleProps {
  agent: Agent;
  content: string;
  round: number;
  stance?: string;
  score?: number;
  isLatest?: boolean;
  sources?: Source[];
}

const STANCE_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  BULLISH:     { bg: "#0a291880", border: "#10B981", text: "#34d399", label: "看好" },
  CAUTIOUS:    { bg: "#271f0a80", border: "#F59E0B", text: "#fbbf24", label: "谨慎" },
  BEARISH:     { bg: "#270a0a80", border: "#EF4444", text: "#f87171", label: "看衰" },
  COMPETITIVE: { bg: "#14192580", border: "#64748B", text: "#94a3b8", label: "竞争" },
};

export function ChatBubble({ agent, content, round, stance, score, isLatest, sources }: ChatBubbleProps) {
  const stanceInfo = stance ? STANCE_STYLE[stance] : null;
  const borderColor = stanceInfo?.border || "#2a3352";
  const scoreBg = score !== undefined
    ? (score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444")
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full"
    >
      <div
        className="flex flex-col h-full"
        style={{
          background: stanceInfo?.bg || "#141925",
          border: `2px solid ${borderColor}`,
          boxShadow: isLatest
            ? `3px 3px 0 rgba(0,0,0,0.5), inset 0 0 12px ${borderColor}20`
            : "3px 3px 0 rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-3 py-2"
          style={{ borderBottom: `1px solid ${borderColor}40` }}
        >
          <PixelAvatar agent={agent} size={32} glowing={isLatest} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="pixel-text text-xs font-bold" style={{ color: agent.color }}>
                {agent.name_cn}
              </span>
              {stanceInfo && (
                <span
                  className="pixel-text text-[9px] px-1.5 py-px"
                  style={{
                    border: `1px solid ${stanceInfo.border}60`,
                    color: stanceInfo.text,
                    background: `${stanceInfo.border}15`,
                  }}
                >
                  {stanceInfo.label}
                </span>
              )}
            </div>
            <span className="text-[10px] block" style={{ color: "#64748b" }}>
              {agent.identity_cn}
            </span>
          </div>

          {score !== undefined && (
            <div
              className="pixel-text text-xs font-bold px-2 py-0.5"
              style={{
                background: `${scoreBg}20`,
                border: `1px solid ${scoreBg}60`,
                color: scoreBg,
              }}
            >
              {score}
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className="flex-1 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: "#cbd5e1" }}
        >
          {content}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="px-3 pb-2" style={{ borderTop: `1px solid ${borderColor}30` }}>
            <div className="pixel-text text-[9px] mt-1.5 mb-1" style={{ color: "#4ade80" }}>
              {">"} REF ({sources.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pixel-text text-[9px] px-1.5 py-px hover:brightness-125 transition-all"
                  style={{
                    color: "#94a3b8",
                    border: "1px solid #2a3352",
                    background: "#0c101b",
                  }}
                >
                  [{i + 1}] {src.title.slice(0, 20)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
