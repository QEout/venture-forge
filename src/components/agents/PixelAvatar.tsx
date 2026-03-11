"use client";

import type { Agent } from "@/lib/types";

const AVATAR_EMOJI: Record<string, string> = {
  peter_steele: "🦈",
  ray_thunder: "⚡",
  jony_lin: "🎨",
  linus_sharp: "💻",
  jenny_park: "🛍️",
  zoe_vibe: "🎧",
  victor_crush: "🏢",
  kara_stinger: "🎤",
  nassir_black: "🔮",
  mary_spectrum: "📊",
};

interface PixelAvatarProps {
  agent: Agent;
  size?: number;
  glowing?: boolean;
}

export function PixelAvatar({ agent, size = 48, glowing }: PixelAvatarProps) {
  const emoji = AVATAR_EMOJI[agent.id] || "👤";

  return (
    <div
      className="relative flex items-center justify-center shrink-0 pixel-text"
      style={{
        width: size,
        height: size,
        background: `${agent.color}12`,
        border: `2px solid ${glowing ? agent.color : `${agent.color}40`}`,
        fontSize: size * 0.45,
        boxShadow: glowing
          ? `0 0 0 1px ${agent.color}, 2px 2px 0 rgba(0,0,0,0.08)`
          : "2px 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      {emoji}
    </div>
  );
}
