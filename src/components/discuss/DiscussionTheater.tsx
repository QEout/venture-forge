"use client";

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Agent, DiscussionMessage } from "@/lib/types";
import { discussStreamUrl, fetchDiscussions } from "@/lib/api";
import { PixelAvatar } from "../agents/PixelAvatar";

interface DiscussionTheaterProps {
  ideaId: string;
  agents: Agent[];
  mode: "live" | "replay";
  onComplete?: () => void;
}

interface TimelineEntry {
  type: "round" | "message";
  round?: number;
  titleEn?: string;
  titleCn?: string;
  message?: DiscussionMessage;
}

const ROUND_TITLES: Record<number, { en: string; cn: string }> = {
  1: { en: "Natural Reaction", cn: "自然反应" },
  2: { en: "Cross-Discussion", cn: "互相讨论" },
  3: { en: "Final Verdict", cn: "最终评定" },
};

const STANCE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  BULLISH:     { bg: "#ecfdf5", border: "#10b981", text: "#059669", label: "看好" },
  CAUTIOUS:    { bg: "#fffbeb", border: "#f59e0b", text: "#b45309", label: "谨慎" },
  BEARISH:     { bg: "#fef2f2", border: "#ef4444", text: "#dc2626", label: "看衰" },
  COMPETITIVE: { bg: "#f8fafc", border: "#94a3b8", text: "#64748b", label: "竞争" },
};

function SpeechCell({ msg, isLatest }: { msg: DiscussionMessage; isLatest: boolean }) {
  const s = msg.stance ? STANCE[msg.stance] : null;
  const scoreColor =
    msg.score !== undefined
      ? msg.score >= 70 ? "#059669" : msg.score >= 40 ? "#b45309" : "#dc2626"
      : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col border"
      style={{
        background: s?.bg || "#ffffff",
        borderColor: s?.border || "#e2e8f0",
        borderWidth: isLatest ? 2 : 1,
      }}
    >
      {/* Stance + Score bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b" style={{ borderColor: `${s?.border || "#e2e8f0"}30` }}>
        {s ? (
          <span className="pixel-text text-[9px] font-bold" style={{ color: s.text }}>
            {s.label}
          </span>
        ) : <span />}
        {scoreColor && (
          <span className="pixel-text text-[10px] font-bold" style={{ color: scoreColor }}>
            {msg.score}分
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 prose-pixel" style={{ maxHeight: 220 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>

      {/* Sources */}
      {msg.sources && msg.sources.length > 0 && (
        <div className="px-2.5 pb-1.5 border-t border-slate-100">
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pixel-text text-[8px] px-1 py-px text-slate-400 border border-slate-200 hover:text-amber-600 hover:border-amber-300 transition-colors"
              >
                [{i + 1}] {src.title.slice(0, 18)}
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ThinkingCell({ agent }: { agent: Agent }) {
  return (
    <div
      className="h-full flex items-center justify-center border-2 border-dashed"
      style={{ borderColor: `${agent.color}40`, minHeight: 80, background: `${agent.color}06` }}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="pixel-text text-[10px] font-bold" style={{ color: agent.color }}>{agent.name_cn}</span>
        <span className="pixel-text text-[9px] text-slate-400">
          思考中<span className="pixel-blink">_</span>
        </span>
      </div>
    </div>
  );
}

function EmptyCell({ roundStarted }: { roundStarted: boolean }) {
  return (
    <div className="h-full flex items-center justify-center border border-slate-100 bg-slate-50/50" style={{ minHeight: 60 }}>
      <span className="pixel-text text-[9px] text-slate-300">
        {roundStarted ? "—" : ""}
      </span>
    </div>
  );
}

export function DiscussionTheater({ ideaId, agents, mode, onComplete }: DiscussionTheaterProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [speakingAgent, setSpeakingAgent] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messageMatrix = useMemo(() => {
    const matrix: Record<string, Record<number, DiscussionMessage>> = {};
    for (const entry of timeline) {
      if (entry.type === "message" && entry.message) {
        const { agent_id, round } = entry.message;
        if (!matrix[agent_id]) matrix[agent_id] = {};
        matrix[agent_id][round] = entry.message;
      }
    }
    return matrix;
  }, [timeline]);

  const latestMsg = useMemo(() => {
    const msgs = timeline.filter((e) => e.type === "message" && e.message);
    return msgs[msgs.length - 1]?.message || null;
  }, [timeline]);

  const loadExisting = useCallback(async () => {
    try {
      const discussions = await fetchDiscussions(ideaId);
      if (!discussions || discussions.length === 0) return;

      const entries: TimelineEntry[] = [];
      let lastRound = 0;

      for (const d of discussions) {
        if (d.round_num !== lastRound) {
          lastRound = d.round_num;
          const titles = ROUND_TITLES[d.round_num] || { en: `Round ${d.round_num}`, cn: `第${d.round_num}轮` };
          entries.push({ type: "round", round: d.round_num, titleEn: titles.en, titleCn: titles.cn });
        }
        entries.push({
          type: "message",
          message: {
            round: d.round_num,
            agent_id: d.agent_id,
            agent_name: d.agent_name,
            content: d.content,
            stance: d.stance || undefined,
          },
        });
      }

      setTimeline(entries);
      setCurrentRound(lastRound);
      setIsComplete(true);
      onComplete?.();
    } catch (err) {
      console.error("Failed to load discussions:", err);
    }
  }, [ideaId, onComplete]);

  useEffect(() => {
    if (mode === "replay") {
      loadExisting();
      return;
    }

    const eventSource = new EventSource(discussStreamUrl(ideaId));

    eventSource.addEventListener("round_start", (e) => {
      const data = JSON.parse(e.data);
      setCurrentRound(data.round);
      setTimeline((prev) => [
        ...prev,
        { type: "round", round: data.round, titleEn: data.title_en, titleCn: data.title_cn },
      ]);
    });

    eventSource.addEventListener("agent_start", (e) => {
      const data = JSON.parse(e.data);
      setSpeakingAgent(data.agent_id);
    });

    eventSource.addEventListener("agent_message", (e) => {
      const msg: DiscussionMessage = JSON.parse(e.data);
      setTimeline((prev) => [...prev, { type: "message", message: msg }]);
      setSpeakingAgent(null);
    });

    eventSource.addEventListener("round_end", () => {
      setSpeakingAgent(null);
    });

    eventSource.addEventListener("complete", () => {
      setIsComplete(true);
      setSpeakingAgent(null);
      eventSource.close();
      onComplete?.();
    });

    eventSource.addEventListener("error", () => {
      eventSource.close();
    });

    return () => eventSource.close();
  }, [ideaId, mode, onComplete, loadExisting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [timeline]);

  const border = "1px solid #e2e8f0";

  return (
    <div ref={scrollRef} className="overflow-auto w-full">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "130px repeat(3, 1fr)",
          minWidth: 700,
        }}
      >
        {/* ── Header row ── */}
        <div
          className="flex items-center justify-center px-3 py-3 pixel-text text-[10px] text-slate-400 font-bold"
          style={{ background: "#f1f5f9", borderBottom: border, borderRight: border }}
        >
          评审
        </div>
        {[1, 2, 3].map((r) => {
          const rt = ROUND_TITLES[r];
          const isActive = r === currentRound && !isComplete;
          const isDone = r < currentRound || isComplete;
          return (
            <div
              key={r}
              className="flex flex-col items-center justify-center px-2 py-3"
              style={{
                background: isActive ? "#fffbeb" : "#f1f5f9",
                borderBottom: border,
                borderRight: r < 3 ? border : undefined,
              }}
            >
              <div className="flex items-center gap-1.5">
                {isDone && !isActive && (
                  <span className="text-emerald-500 text-xs">✓</span>
                )}
                {isActive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                )}
                <span
                  className="pixel-text text-[10px] font-bold"
                  style={{ color: isActive ? "#b45309" : isDone ? "#059669" : "#94a3b8" }}
                >
                  ROUND {r}
                </span>
              </div>
              <span className="text-[11px] mt-0.5 text-slate-500">{rt.cn}</span>
            </div>
          );
        })}

        {/* ── Agent rows ── */}
        {agents.map((agent, agentIdx) => {
          const isSpeaking = speakingAgent === agent.id;
          const isLastRow = agentIdx === agents.length - 1;

          return (
            <Fragment key={agent.id}>
              {/* Agent cell */}
              <motion.div
                animate={isSpeaking ? { backgroundColor: ["#f8fafc", "#fef3c7", "#f8fafc"] } : {}}
                transition={isSpeaking ? { repeat: Infinity, duration: 2 } : {}}
                className="flex flex-col items-center justify-center gap-1.5 px-3 py-4"
                style={{
                  background: "#f8fafc",
                  borderBottom: isLastRow ? undefined : border,
                  borderRight: border,
                }}
              >
                <PixelAvatar agent={agent} size={36} glowing={isSpeaking} />
                <span
                  className="pixel-text text-[10px] font-bold text-center max-w-[110px]"
                  style={{ color: isSpeaking ? agent.color : "#334155" }}
                >
                  {agent.name_cn}
                </span>
                <span className="text-[9px] text-center max-w-[110px] leading-tight text-slate-400">
                  {agent.identity_cn}
                </span>
                {isSpeaking && (
                  <span
                    className="pixel-text text-[8px] px-1.5 py-px mt-0.5"
                    style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}40`, color: agent.color }}
                  >
                    发言中
                  </span>
                )}
              </motion.div>

              {/* Round cells */}
              {[1, 2, 3].map((r) => {
                const msg = messageMatrix[agent.id]?.[r];
                const isThinking = isSpeaking && currentRound === r;
                const roundStarted = r <= currentRound;
                const isMsgLatest = !isComplete && latestMsg?.agent_id === agent.id && latestMsg?.round === r;

                return (
                  <div
                    key={r}
                    className="p-1.5"
                    style={{
                      borderBottom: isLastRow ? undefined : border,
                      borderRight: r < 3 ? border : undefined,
                      background: r === currentRound && !isComplete ? "#fffdf7" : undefined,
                    }}
                  >
                    {msg ? (
                      <SpeechCell msg={msg} isLatest={isMsgLatest} />
                    ) : isThinking ? (
                      <ThinkingCell agent={agent} />
                    ) : (
                      <EmptyCell roundStarted={roundStarted} />
                    )}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
