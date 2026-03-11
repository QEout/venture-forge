"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Agent, Idea } from "@/lib/types";
import { fetchIdea, fetchAgents, fetchDiscussions } from "@/lib/api";
import { DiscussionTheater } from "@/components/discuss/DiscussionTheater";
import { PixelAvatar } from "@/components/agents/PixelAvatar";

export default function Layer1Page() {
  const params = useParams();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<Idea | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hasExisting, setHasExisting] = useState(false);
  const [discussionStarted, setDiscussionStarted] = useState(false);
  const [discussionDone, setDiscussionDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchIdea(ideaId),
      fetchAgents(),
      fetchDiscussions(ideaId).catch(() => []),
    ]).then(([ideaData, agentData, discussions]) => {
      setIdea(ideaData);

      const alreadyDone = ideaData.status === "discussed" || (discussions && discussions.length > 0);
      if (alreadyDone) {
        setHasExisting(true);
        setDiscussionDone(true);
      }

      const selectedIds: string[] =
        typeof ideaData.agent_ids === "string"
          ? JSON.parse(ideaData.agent_ids)
          : ideaData.agent_ids;
      const allAgents: Agent[] = agentData.agents || [];
      setAgents(allAgents.filter((a) => selectedIds.includes(a.id)));
      setLoading(false);
    });
  }, [ideaId]);

  const handleComplete = useCallback(() => {
    setDiscussionDone(true);
  }, []);

  if (loading || !idea || agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-slate-400">加载中...</span>
      </div>
    );
  }

  const showStartButton = !discussionStarted && !hasExisting;
  const showTheater = discussionStarted || hasExisting;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="pixel-text text-[10px] font-bold px-2 py-0.5 border border-amber-400 text-amber-600 bg-amber-50">
            SHARK TANK
          </span>
          <span className="pixel-text text-[10px] text-slate-400">
            3-ROUND AI DEBATE
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">{idea.name}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{idea.problem}</p>
      </div>

      {/* Judges panel before start */}
      {showStartButton && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6"
        >
          <div className="border-b border-slate-100 pb-6">
            <h2 className="pixel-text text-[10px] font-bold text-slate-400 mb-4">评审席</h2>
            <div className="flex flex-wrap items-start gap-6 mb-6">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center gap-1.5"
                >
                  <PixelAvatar agent={agent} size={48} />
                  <span className="pixel-text text-xs font-bold" style={{ color: agent.color }}>
                    {agent.name_cn}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight max-w-[80px]">
                    {agent.identity_cn}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setDiscussionStarted(true)}
                className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                开始辩论
              </button>
              <span className="text-xs text-slate-400">
                {agents.length} 位评审 · 3 轮深度辩论
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Discussion theater - full width, no wrapper */}
      {showTheater && (
        <DiscussionTheater
          ideaId={ideaId}
          agents={agents}
          mode={hasExisting && !discussionStarted ? "replay" : "live"}
          onComplete={handleComplete}
        />
      )}

      {/* Next layer */}
      {discussionDone && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end px-6 pb-6"
        >
          <Link
            href={`/lab/${ideaId}/layer2`}
            className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
          >
            进入第二层：蒙特卡洛模拟 →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
