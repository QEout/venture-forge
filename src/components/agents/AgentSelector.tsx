"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Agent, RecommendedCombo } from "@/lib/types";
import { AgentCard } from "./AgentCard";

interface AgentSelectorProps {
  agents: Agent[];
  combos: Record<string, RecommendedCombo>;
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function AgentSelector({ agents, combos, selected, onChange }: AgentSelectorProps) {
  const [showCombos, setShowCombos] = useState(true);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < 8) {
      onChange([...selected, id]);
    }
  };

  const applyCombos = (comboKey: string) => {
    const combo = combos[comboKey];
    if (combo) {
      onChange(combo.agent_ids);
      setShowCombos(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="pixel-text text-xs font-bold text-slate-900">
            选择讨论角色
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            选 3-8 个角色参与讨论 · 已选 {selected.length}/8
          </p>
        </div>
        <button
          onClick={() => setShowCombos(!showCombos)}
          className="pixel-text text-[10px] font-bold text-blue-600 hover:text-blue-800"
        >
          {showCombos ? "自由选择" : "推荐组合"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showCombos ? (
          <motion.div
            key="combos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-2 gap-2"
          >
            {Object.entries(combos).map(([key, combo]) => (
              <button
                key={key}
                onClick={() => applyCombos(key)}
                className="card p-3 text-left hover:border-blue-300 transition-colors"
              >
                <p className="pixel-text text-[11px] font-bold text-slate-900">
                  {combo.name_cn}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {combo.description_cn}
                </p>
                <div className="flex gap-1 mt-2">
                  {combo.agent_ids.map((aid) => {
                    const a = agents.find((ag) => ag.id === aid);
                    return a ? (
                      <span
                        key={aid}
                        className="w-6 h-6 flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${a.color}15`, border: `1px solid ${a.color}30`, color: a.color }}
                        title={a.name_cn}
                      >
                        {a.name_cn[0]}
                      </span>
                    ) : null;
                  })}
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-2 gap-2"
          >
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selected.includes(agent.id)}
                onClick={() => toggle(agent.id)}
                size="sm"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
