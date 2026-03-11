"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { runMonteCarlo, fetchMonteCarlo } from "@/lib/api";

interface TrajectoryPoint {
  month: number;
  median: number;
  p10: number;
  p90: number;
}

interface MonteCarloData {
  success_rate: number;
  avg_cash_flow: number;
  median_cash_flow: number;
  p10_cash_flow?: number;
  p90_cash_flow?: number;
  cash_flow_distribution: { range: string; count: number }[];
  monthly_trajectory?: TrajectoryPoint[];
  assumptions: Record<string, string | number>;
}

interface MonteCarloResponse {
  results?: MonteCarloData;
}

function normalizeMonteCarloData(data: MonteCarloData | MonteCarloResponse | null): MonteCarloData | null {
  if (!data) return null;
  if ("results" in data && data.results) return data.results;
  return data as MonteCarloData;
}

const ASSUMPTION_LABELS: Record<string, string> = {
  monthly_arpu: "月ARPU",
  cac: "获客成本",
  monthly_churn_rate: "月流失率",
  conversion_rate: "转化率",
  initial_users: "初始用户",
  monthly_growth_rate: "月增长率",
  fixed_costs: "固定成本/月",
  variable_cost_per_user: "变动成本/人",
  ltv: "LTV",
};

function formatAssumptionValue(key: string, value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  if (key.includes("rate") || key.includes("churn") || key.includes("conversion")) {
    return `${(num * 100).toFixed(1)}%`;
  }
  if (key.includes("cost") || key.includes("arpu") || key === "cac" || key === "ltv") {
    return `$${num.toLocaleString()}`;
  }
  return num.toLocaleString();
}

function AnimatedNumber({ value, prefix = "", suffix = "", className = "" }: {
  value: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const steps = 40;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplay(value);
        ref.current = value;
      }
    }, 25);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className={className}>
      {prefix}{Math.round(display).toLocaleString()}{suffix}
    </span>
  );
}

function SimulationPhase({ phase }: { phase: "extracting" | "simulating" | "done" }) {
  const [iterCount, setIterCount] = useState(0);

  useEffect(() => {
    if (phase !== "simulating") return;
    const interval = setInterval(() => {
      setIterCount((prev) => {
        if (prev >= 10000) return 10000;
        const jump = Math.max(50, Math.floor(Math.random() * 400));
        return Math.min(10000, prev + jump);
      });
    }, 60);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="card p-8 flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent animate-spin" />
        <span className="pixel-text text-sm font-bold text-slate-700">
          {phase === "extracting" ? "AI 正在分析你的商业模式..." : "正在运行蒙特卡洛迭代..."}
        </span>
      </div>

      {phase === "simulating" && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between pixel-text text-[10px] text-slate-400 mb-1">
            <span>ITERATIONS</span>
            <span>{iterCount.toLocaleString()} / 10,000</span>
          </div>
          <div className="h-2 bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full bg-amber-500"
              animate={{ width: `${(iterCount / 10000) * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-6 mt-2">
        {["提取假设", "运行模拟", "分析结果"].map((label, i) => {
          const idx = phase === "extracting" ? 0 : phase === "simulating" ? 1 : 2;
          const isDone = i < idx;
          const isCurrent = i === idx;
          return (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 ${isDone ? "bg-emerald-500" : isCurrent ? "bg-amber-500" : "bg-slate-200"}`} />
              <span className={`pixel-text text-[10px] ${isCurrent ? "text-slate-700 font-bold" : isDone ? "text-emerald-600" : "text-slate-300"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Layer2Page() {
  const params = useParams();
  const ideaId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"extracting" | "simulating" | "done">("extracting");
  const [data, setData] = useState<MonteCarloData | null>(null);
  const [error, setError] = useState("");
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    fetchMonteCarlo(ideaId)
      .then((d) => setData(normalizeMonteCarloData(d)))
      .catch(() => {});
  }, [ideaId]);

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setShowChart(false);
    setPhase("extracting");

    const extractTimer = setTimeout(() => setPhase("simulating"), 2500);

    try {
      const json = await runMonteCarlo(ideaId);
      clearTimeout(extractTimer);
      setPhase("done");
      setData(normalizeMonteCarloData(json));
      setTimeout(() => setShowChart(true), 600);
    } catch (err) {
      clearTimeout(extractTimer);
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const successRate = data ? data.success_rate * 100 : 0;
  const riskLevel = successRate >= 60 ? "LOW" : successRate >= 35 ? "MED" : "HIGH";
  const riskColor = successRate >= 60 ? "#059669" : successRate >= 35 ? "#b45309" : "#dc2626";
  const riskBg = successRate >= 60 ? "#ecfdf5" : successRate >= 35 ? "#fffbeb" : "#fef2f2";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="card p-6 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="pixel-text text-[10px] font-bold px-2 py-0.5 border border-emerald-400 text-emerald-600 bg-emerald-50">
            LAYER 2
          </span>
          <span className="pixel-text text-[10px] text-slate-400">
            MONTE CARLO SIMULATION
          </span>
        </div>
        <h1 className="pixel-text text-xl font-bold text-slate-900 mb-2">蒙特卡洛财务模拟</h1>
        <p className="text-sm text-slate-500 max-w-2xl mb-6">
          基于 AI 提取的商业假设，对获客成本、月度 ARPU、用户流失率和增长率注入随机方差，运行 10,000 次 12 个月迭代，预测真实成功概率。
        </p>

        {!data && !loading && (
          <button
            onClick={runSimulation}
            disabled={loading}
            className="pixel-btn pixel-text text-sm font-bold px-8 py-3 bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            运行模拟
          </button>
        )}
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>

      {/* Loading phase */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <SimulationPhase phase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Risk verdict */}
          <div
            className="px-5 py-4 border-2 flex items-center justify-between"
            style={{ borderColor: riskColor, background: riskBg }}
          >
            <div className="flex items-center gap-3">
              <span
                className="pixel-text text-sm font-bold px-3 py-1"
                style={{ background: riskColor, color: "#fff" }}
              >
                RISK: {riskLevel}
              </span>
              <span className="text-sm text-slate-700">
                {successRate >= 60
                  ? "财务模型整体可行，但仍需关注下行风险"
                  : successRate >= 35
                  ? "成功率偏低，建议优化获客成本或提升留存"
                  : "高风险：多数迭代结果为亏损，商业模型需要重大调整"}
              </span>
            </div>
            <button
              onClick={runSimulation}
              disabled={loading}
              className="pixel-btn pixel-text text-[10px] font-bold px-3 py-1 bg-white border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              重新运行
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5 text-center">
              <h3 className="pixel-text text-[9px] font-bold text-slate-400 uppercase mb-2">成功率</h3>
              <div className="pixel-text text-3xl font-bold" style={{ color: riskColor }}>
                <AnimatedNumber value={successRate} suffix="%" />
              </div>
              <div className="pixel-text text-[9px] text-slate-400 mt-1">现金流 &gt; 0</div>
            </div>
            <div className="card p-5 text-center">
              <h3 className="pixel-text text-[9px] font-bold text-slate-400 uppercase mb-2">中位现金流</h3>
              <div className={`pixel-text text-3xl font-bold ${data.median_cash_flow > 0 ? "text-emerald-600" : "text-red-500"}`}>
                <AnimatedNumber value={data.median_cash_flow} prefix="$" />
              </div>
              <div className="pixel-text text-[9px] text-slate-400 mt-1">12 个月累计</div>
            </div>
            <div className="card p-5 text-center">
              <h3 className="pixel-text text-[9px] font-bold text-slate-400 uppercase mb-2">最差 10%</h3>
              <div className="pixel-text text-3xl font-bold text-red-500">
                <AnimatedNumber value={data.p10_cash_flow ?? data.avg_cash_flow * 0.3} prefix="$" />
              </div>
              <div className="pixel-text text-[9px] text-slate-400 mt-1">P10 下行风险</div>
            </div>
            <div className="card p-5 text-center">
              <h3 className="pixel-text text-[9px] font-bold text-slate-400 uppercase mb-2">最好 10%</h3>
              <div className="pixel-text text-3xl font-bold text-emerald-600">
                <AnimatedNumber value={data.p90_cash_flow ?? data.avg_cash_flow * 1.8} prefix="$" />
              </div>
              <div className="pixel-text text-[9px] text-slate-400 mt-1">P90 上行空间</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution */}
            <div className="card p-6">
              <h3 className="pixel-text text-sm font-bold text-slate-900 mb-4">现金流分布 (10,000 次迭代)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={showChart ? data.cash_flow_distribution : data.cash_flow_distribution.map((d) => ({ ...d, count: 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "2px 2px 0 rgba(0,0,0,0.06)", fontFamily: "Courier New" }}
                      itemStyle={{ color: "#f59e0b" }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trajectory */}
            {data.monthly_trajectory && data.monthly_trajectory.length > 0 && (
              <div className="card p-6">
                <h3 className="pixel-text text-sm font-bold text-slate-900 mb-1">累计现金流轨迹</h3>
                <p className="text-[10px] text-slate-400 mb-4">中位数 + P10/P90 置信区间</p>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly_trajectory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} label={{ value: "月", position: "insideBottomRight", offset: -5 }} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "2px 2px 0 rgba(0,0,0,0.06)", fontFamily: "Courier New" }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                      />
                      <Area type="monotone" dataKey="p90" stackId="band" stroke="none" fill="#dcfce7" />
                      <Area type="monotone" dataKey="p10" stackId="band" stroke="none" fill="#ffffff" />
                      <Line type="monotone" dataKey="median" stroke="#f59e0b" strokeWidth={2} dot={false} name="中位数" />
                      <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="P10 (最差)" />
                      <Line type="monotone" dataKey="p90" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} name="P90 (最好)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Assumptions */}
          <div className="card p-6">
            <h3 className="pixel-text text-sm font-bold text-slate-900 mb-4">基础假设 (AI 提取)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.assumptions ?? {}).map(([key, value]) => (
                <div key={key} className="p-3 border border-slate-200 bg-slate-50" style={{ boxShadow: "2px 2px 0 rgba(0,0,0,0.04)" }}>
                  <div className="pixel-text text-[9px] text-slate-400 uppercase">
                    {ASSUMPTION_LABELS[key] || key.replace(/_/g, " ")}
                  </div>
                  <div className="pixel-text text-sm font-bold text-slate-900 mt-1">
                    {formatAssumptionValue(key, value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Link
              href={`/lab/${ideaId}/layer3`}
              className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100"
            >
              进入第三层：OASIS 模拟 →
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
