"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchOasis, fetchOasisRunDetail, fetchOasisRunStatus, startOasisSimulation } from "@/lib/api";

interface OasisComment {
  username: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  likes: number;
  time_offset: string;
}

interface OasisData {
  curve_data: { day: number; total_users: number; new_users: number }[];
  comments: OasisComment[];
}

interface OasisAction {
  id: string;
  round_num: number;
  timestamp: string;
  platform: string;
  agent_id: number;
  agent_name: string;
  action_type: string;
  action_args: {
    content?: string;
    sentiment?: "positive" | "negative" | "neutral";
    likes?: number;
    time_offset?: string;
    target_user?: string;
    target_excerpt?: string;
    count?: number;
    day?: number;
    new_users?: number;
    total_users?: number;
    message?: string;
  };
  success: boolean;
}

interface OasisRunStatus {
  idea_id: string;
  runner_status: "idle" | "starting" | "running" | "completed" | "failed";
  current_round: number;
  total_rounds: number;
  simulated_days: number;
  total_actions_count: number;
  visible_feed_count?: number;
  action_breakdown?: Record<string, number>;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
}

interface OasisRunDetail extends OasisRunStatus {
  curve_data: OasisData["curve_data"];
  all_actions: OasisAction[];
  recent_actions: OasisAction[];
}

const FEED_ACTION_TYPES = new Set(["CREATE_POST", "COMMENT", "REPOST", "LIKE"]);
const TEXT_ACTION_TYPES = new Set(["CREATE_POST", "COMMENT", "REPOST"]);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
  "bg-teal-500", "bg-orange-500",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function avatarInitial(name: string): string {
  return name.replace(/^@/, "").charAt(0).toUpperCase();
}

function detailToData(detail: OasisRunDetail): OasisData {
  const visibleActions = (detail.all_actions ?? []).filter((a) => TEXT_ACTION_TYPES.has(a.action_type));
  return {
    curve_data: detail.curve_data ?? [],
    comments: visibleActions.map((a) => ({
      username: a.agent_name,
      content: a.action_args?.content ?? "",
      sentiment: a.action_args?.sentiment ?? "neutral",
      likes: a.action_args?.likes ?? 0,
      time_offset: a.action_args?.time_offset ?? "刚刚",
    })),
  };
}

function fallbackActionsFromData(d: OasisData): OasisAction[] {
  return d.comments.map((c, i) => ({
    id: `fallback-${i}`, round_num: i + 1, timestamp: "", platform: "social",
    agent_id: i + 1, agent_name: c.username, action_type: "CREATE_POST",
    action_args: { content: c.content, sentiment: c.sentiment, likes: c.likes, time_offset: c.time_offset },
    success: true,
  }));
}

function statusLabel(s: OasisRunStatus["runner_status"]): string {
  switch (s) {
    case "starting": return "启动中";
    case "running": return "运行中";
    case "completed": return "已完成";
    case "failed": return "失败";
    default: return "未启动";
  }
}

function actionIcon(t: string): string {
  switch (t) {
    case "COMMENT": return "💬";
    case "REPOST": return "🔁";
    case "LIKE": return "👍";
    default: return "";
  }
}

function actionTypeLabel(t: string): string {
  switch (t) {
    case "CREATE_POST": return "发帖";
    case "COMMENT": return "评论";
    case "REPOST": return "转发";
    case "LIKE": return "点赞";
    default: return t;
  }
}

function PostCard({ action }: { action: OasisAction }) {
  const name = action.agent_name;
  const args = action.action_args;
  const sentiment = args.sentiment ?? "neutral";
  const isLike = action.action_type === "LIKE";
  const isRepost = action.action_type === "REPOST";
  const isComment = action.action_type === "COMMENT";

  return (
    <div className="bg-white border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors" style={{ boxShadow: "2px 2px 0 rgba(0,0,0,0.04)" }}>
      {isRepost && (
        <div className="px-4 pt-3 flex items-center gap-1.5 pixel-text text-[10px] text-slate-400">
          <span>🔁</span>
          <span>{name} 转发了</span>
        </div>
      )}
      {isComment && (
        <div className="px-4 pt-3 flex items-center gap-1.5 pixel-text text-[10px] text-slate-400">
          <span>💬</span>
          <span>{name} 回复了 @{args.target_user ?? "某用户"}</span>
        </div>
      )}
      {isLike && (
        <div className="px-4 pt-3 flex items-center gap-1.5 pixel-text text-[10px] text-slate-400">
          <span>👍</span>
          <span>{name} 赞了 @{args.target_user ?? "某用户"} 的内容</span>
        </div>
      )}

      <div className="p-4 flex gap-3">
        <div className={`w-10 h-10 shrink-0 flex items-center justify-center text-white font-bold text-sm ${avatarColor(name)}`}>
          {avatarInitial(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="pixel-text text-xs font-bold text-slate-900 truncate">{name}</span>
            <span className="pixel-text text-[10px] text-slate-400 shrink-0">{args.time_offset ?? `第 ${action.round_num} 天`}</span>
          </div>

          {isLike ? (
            <p className="text-sm text-slate-500 italic mt-1">
              {args.target_excerpt ? `"${args.target_excerpt}..."` : "对这条内容表示认可"}
            </p>
          ) : (
            <p className="text-sm text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">{args.content ?? ""}</p>
          )}

          <div className="flex items-center gap-5 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span>♡</span>
              <span>{isLike ? (args.count ?? 0) : (args.likes ?? 0)}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>💬</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🔁</span>
            </span>

            <div className="ml-auto">
              {sentiment === "positive" && <span className="pixel-text text-[10px] font-bold text-emerald-600">看好</span>}
              {sentiment === "negative" && <span className="pixel-text text-[10px] font-bold text-red-500">担忧</span>}
              {sentiment === "neutral" && <span className="pixel-text text-[10px] font-bold text-slate-400">中立</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DaySeparator({ day, newUsers, totalUsers }: { day: number; newUsers: number; totalUsers: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-slate-200" />
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 pixel-text text-[10px] text-slate-500">
        <span className="font-bold">第 {day} 天</span>
        <span className="text-slate-300">|</span>
        <span>+{newUsers} 新用户</span>
        <span className="text-slate-300">|</span>
        <span>累计 {totalUsers}</span>
      </div>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export default function Layer3Page() {
  const params = useParams();
  const ideaId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OasisData | null>(null);
  const [actions, setActions] = useState<OasisAction[]>([]);
  const [allActions, setAllActions] = useState<OasisAction[]>([]);
  const [runStatus, setRunStatus] = useState<OasisRunStatus | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "chart">("feed");
  const pollingRef = useRef<number | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const refreshRunDetail = useCallback(async () => {
    const detail = (await fetchOasisRunDetail(ideaId)) as OasisRunDetail;
    setRunStatus(detail);
    setData(detailToData(detail));
    setActions((detail.all_actions ?? []).filter((a) => FEED_ACTION_TYPES.has(a.action_type)));
    setAllActions(detail.all_actions ?? []);

    if (detail.runner_status === "completed" || detail.runner_status === "failed") {
      setLoading(false);
      stopPolling();
    }
  }, [ideaId, stopPolling]);

  const refreshRunStatus = useCallback(async () => {
    const status = (await fetchOasisRunStatus(ideaId)) as OasisRunStatus;
    setRunStatus(status);

    if (status.runner_status === "running" || status.runner_status === "starting") {
      setLoading(true);
      await refreshRunDetail();
      return;
    }

    if (status.runner_status === "completed" || status.runner_status === "failed") {
      setLoading(false);
      await refreshRunDetail();
      stopPolling();
    }
  }, [ideaId, refreshRunDetail, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    void refreshRunStatus();
    pollingRef.current = window.setInterval(() => {
      void refreshRunStatus();
    }, 2000);
  }, [refreshRunStatus, stopPolling]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const status = (await fetchOasisRunStatus(ideaId)) as OasisRunStatus;
        if (cancelled) return;
        setRunStatus(status);

        if (status.runner_status !== "idle") {
          await refreshRunDetail();
          if (!cancelled && (status.runner_status === "running" || status.runner_status === "starting")) {
            setLoading(true);
            startPolling();
          }
          return;
        }

        const result = (await fetchOasis(ideaId)) as OasisData | null;
        if (cancelled || !result) return;
        setData(result);
        const fb = fallbackActionsFromData(result);
        setActions(fb);
        setAllActions(fb);
      } catch {
        /* let page stay interactive */
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [ideaId, refreshRunDetail, startPolling, stopPolling]);

  useEffect(() => {
    if (loading && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [actions.length, loading]);

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    setData({ curve_data: [], comments: [] });
    setActions([]);
    setAllActions([]);
    stopPolling();

    try {
      const status = (await startOasisSimulation(ideaId)) as OasisRunStatus;
      setRunStatus(status);
      startPolling();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "模拟启动失败");
    }
  };

  const sentimentActions = actions.filter((a) => TEXT_ACTION_TYPES.has(a.action_type));
  const positive = sentimentActions.filter((a) => a.action_args.sentiment === "positive").length;
  const negative = sentimentActions.filter((a) => a.action_args.sentiment === "negative").length;
  const neutral = sentimentActions.filter((a) => a.action_args.sentiment === "neutral").length;
  const totalSentiment = positive + negative + neutral || 1;
  const latestUsers = data?.curve_data.at(-1)?.total_users ?? 0;
  const progressPct = runStatus ? Math.round((runStatus.current_round / (runStatus.total_rounds || 30)) * 100) : 0;

  const feedItems: (OasisAction | { type: "day_sep"; day: number; new_users: number; total_users: number })[] = [];
  for (const action of allActions) {
    if (action.action_type === "DAY_SUMMARY") {
      feedItems.push({
        type: "day_sep",
        day: action.action_args.day ?? action.round_num,
        new_users: action.action_args.new_users ?? 0,
        total_users: action.action_args.total_users ?? 0,
      });
    } else if (FEED_ACTION_TYPES.has(action.action_type)) {
      feedItems.push(action);
    }
  }

  const hasData = data && (data.curve_data.length > 0 || actions.length > 0);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="card p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="pixel-text text-[10px] font-bold px-2 py-0.5 border border-blue-400 text-blue-600 bg-blue-50">
            LAYER 3
          </span>
          <span className="pixel-text text-[10px] text-slate-400">
            OASIS SOCIAL SIMULATION
          </span>
        </div>
        <h1 className="pixel-text text-xl font-bold text-slate-900 mb-1">OASIS 社交传播模拟</h1>
        <p className="text-slate-500 text-sm mb-5 max-w-xl mx-auto">
          模拟 2,000 名用户在 30 天内对你的产品的真实反应，生成社交信息流与扩散曲线。
        </p>

        <button
          onClick={runSimulation}
          disabled={loading}
          className="pixel-btn pixel-text text-sm font-bold px-6 py-3 bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? "正在后台推进模拟..." : hasData ? "重新运行模拟" : "启动 OASIS 模拟"}
        </button>

        {runStatus && runStatus.runner_status !== "idle" && (
          <div className="mt-4 max-w-md mx-auto">
            <div className="flex justify-between pixel-text text-[10px] text-slate-400 mb-1.5">
              <span>{statusLabel(runStatus.runner_status)}</span>
              <span>{runStatus.current_round}/{runStatus.total_rounds || 30} 天</span>
            </div>
            <div className="h-1.5 bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            {runStatus.action_breakdown && Object.keys(runStatus.action_breakdown).length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 pixel-text text-[10px] text-slate-400">
                {Object.entries(runStatus.action_breakdown).map(([type, count]) => (
                  <span key={type}>{actionIcon(type)} {actionTypeLabel(type)} {count}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Tabs */}
      {hasData && (
        <div className="flex items-center gap-0 self-start border border-slate-200">
          <button
            onClick={() => setActiveTab("feed")}
            className={`pixel-text text-xs font-bold px-4 py-1.5 transition-all ${activeTab === "feed" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:text-slate-700"}`}
          >
            信息流
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`pixel-text text-xs font-bold px-4 py-1.5 transition-all border-l border-slate-200 ${activeTab === "chart" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:text-slate-700"}`}
          >
            数据面板
          </button>
        </div>
      )}

      {hasData && activeTab === "feed" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main feed */}
          <div className="space-y-3">
            {loading && !feedItems.length && (
              <div className="card p-8 text-center">
                <div className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
                <p className="pixel-text text-xs text-slate-500">正在生成真实用户评论，请稍候...</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {feedItems.map((item, i) => {
                if ("type" in item && item.type === "day_sep") {
                  return <DaySeparator key={`day-${item.day}`} day={item.day} newUsers={item.new_users} totalUsers={item.total_users} />;
                }
                const action = item as OasisAction;
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PostCard action={action} />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div ref={feedEndRef} />

            {!loading && !feedItems.length && (
              <div className="card p-12 text-center text-slate-400 text-sm">
                启动模拟后，这里会像真实社区一样，逐条出现用户的帖子、评论和转发。
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-4">
              <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">模拟概览</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">累计用户</span>
                  <span className="pixel-text font-bold text-lg text-slate-900">{latestUsers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">信息流动态</span>
                  <span className="pixel-text font-bold text-lg text-slate-900">{actions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">模拟天数</span>
                  <span className="pixel-text font-bold text-lg text-slate-900">{runStatus?.current_round ?? 0}/30</span>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">舆情分布</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500" />
                  <span className="text-sm text-slate-600 flex-1">看好</span>
                  <span className="pixel-text text-sm font-bold text-slate-900">{positive}</span>
                  <span className="pixel-text text-[10px] text-slate-400 w-10 text-right">{Math.round((positive / totalSentiment) * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-400" />
                  <span className="text-sm text-slate-600 flex-1">中立</span>
                  <span className="pixel-text text-sm font-bold text-slate-900">{neutral}</span>
                  <span className="pixel-text text-[10px] text-slate-400 w-10 text-right">{Math.round((neutral / totalSentiment) * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400" />
                  <span className="text-sm text-slate-600 flex-1">担忧</span>
                  <span className="pixel-text text-sm font-bold text-slate-900">{negative}</span>
                  <span className="pixel-text text-[10px] text-slate-400 w-10 text-right">{Math.round((negative / totalSentiment) * 100)}%</span>
                </div>
                <div className="flex h-2 overflow-hidden mt-2 border border-slate-100">
                  <div style={{ width: `${(positive / totalSentiment) * 100}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${(neutral / totalSentiment) * 100}%` }} className="bg-slate-300" />
                  <div style={{ width: `${(negative / totalSentiment) * 100}%` }} className="bg-red-400" />
                </div>
              </div>
            </div>

            {data && data.curve_data.length > 1 && (
              <div className="card p-4">
                <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">用户增长趋势</h4>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.curve_data}>
                      <Line type="monotone" dataKey="total_users" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <YAxis hide domain={["auto", "auto"]} />
                      <XAxis hide dataKey="day" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {loading && (
              <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
                <span className="pixel-text text-[10px] font-bold text-amber-700">
                  {">"} SIMULATING<span className="pixel-blink">_</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasData && activeTab === "chart" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="pixel-text text-sm font-bold text-slate-900 mb-4">采用曲线 (30 天)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.curve_data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} label={{ value: "天数", position: "insideBottom", offset: -5 }} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "2px 2px 0 rgba(0,0,0,0.06)" }} />
                  <Line type="monotone" dataKey="total_users" stroke="#f59e0b" strokeWidth={3} dot={false} name="总用户数" />
                  <Line type="monotone" dataKey="new_users" stroke="#10b981" strokeWidth={2} dot={false} name="新增用户/天" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between items-center text-sm text-slate-500">
              <span>总市场规模: 2,000</span>
              <span className="pixel-text font-bold text-amber-600">累计用户: {latestUsers.toLocaleString()}</span>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="pixel-text text-sm font-bold text-slate-900 mb-4">情感分析</h3>
            <div className="space-y-4">
              {[
                { label: "看好", count: positive, color: "bg-emerald-500", pct: Math.round((positive / totalSentiment) * 100) },
                { label: "中立", count: neutral, color: "bg-slate-400", pct: Math.round((neutral / totalSentiment) * 100) },
                { label: "担忧", count: negative, color: "bg-red-400", pct: Math.round((negative / totalSentiment) * 100) },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="pixel-text text-slate-900 font-bold">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 overflow-hidden border border-slate-100">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Next layer */}
      {hasData && !loading && (
        <div className="flex justify-end">
          <Link
            href={`/lab/${ideaId}/layer4`}
            className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100"
          >
            进入第四层：生成 Pitch Deck →
          </Link>
        </div>
      )}
    </div>
  );
}
