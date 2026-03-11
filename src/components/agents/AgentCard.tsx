"use client";

import { motion } from "framer-motion";
import type { Agent } from "@/lib/types";
import { PixelAvatar } from "./PixelAvatar";

interface AgentCardProps {
  agent: Agent;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function AgentCard({ agent, selected, onClick, size = "md" }: AgentCardProps) {
  const isMd = size === "md";

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`card text-left transition-all cursor-pointer ${isMd ? "p-4" : "p-3"}`}
      style={selected ? { borderColor: agent.color, boxShadow: `0 0 0 2px ${agent.color}` } : undefined}
    >
      <div className="flex items-start gap-3">
        <PixelAvatar agent={agent} size={isMd ? 48 : 36} glowing={selected} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`pixel-text font-bold ${isMd ? "text-xs" : "text-[11px]"} text-slate-900`}>
              {agent.name_cn}
            </span>
          </div>

          <p className={`text-slate-500 mt-0.5 ${isMd ? "text-xs" : "text-[11px]"} leading-snug`}>
            {agent.identity_cn}
          </p>

          {isMd && (
            <div className="flex flex-wrap gap-1 mt-2">
              {agent.tags.map((tag) => (
                <span
                  key={tag}
                  className="pixel-text px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: `${agent.color}15`,
                    color: agent.color,
                    border: `1px solid ${agent.color}30`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 flex items-center justify-center text-white text-xs shrink-0"
            style={{ background: agent.color }}
          >
            ✓
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
