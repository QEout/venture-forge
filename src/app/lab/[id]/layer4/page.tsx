"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

import { generatePitchDeck, fetchPitchDeck } from "@/lib/api";

/* ── Types ── */

interface Slide {
  title: string;
  content: string[];
  chart_type?: string;
}

interface FeasibilityScore {
  agent: string;
  score: number;
  stance: string;
}

interface TrajectoryPoint {
  month: number;
  median: number;
  p10: number;
  p90: number;
}

interface LayerData {
  feasibility_scores?: FeasibilityScore[];
  monte_carlo?: {
    success_rate: number;
    avg_cash_flow: number;
    median_cash_flow: number;
    p10_cash_flow: number;
    p90_cash_flow: number;
    trajectory?: TrajectoryPoint[];
    distribution?: { range: string; count: number }[];
    assumptions?: Record<string, number>;
  };
  oasis?: {
    curve_data?: { day: number; total_users: number; new_users: number }[];
    sentiment?: { positive: number; neutral: number; negative: number };
    total_comments?: number;
  };
}

interface PitchDeckData {
  slides: Slide[];
  layer_data?: LayerData;
}

const STANCE_COLORS: Record<string, string> = {
  BULLISH: "#10b981",
  CAUTIOUS: "#f59e0b",
  BEARISH: "#ef4444",
  COMPETITIVE: "#6366f1",
};

const STANCE_LABELS: Record<string, string> = {
  BULLISH: "看好",
  CAUTIOUS: "谨慎",
  BEARISH: "看衰",
  COMPETITIVE: "竞争",
};

/* ── Chart components ── */

function FeasibilityChart({ scores }: { scores: FeasibilityScore[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scores} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
          <YAxis type="category" dataKey="agent" stroke="#94a3b8" fontSize={11} width={55} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "2px 2px 0 rgba(0,0,0,0.06)", fontFamily: "Courier New" }}
            formatter={(value) => [`${value} 分`, "评分"]}
          />
          <Bar dataKey="score" barSize={20}>
            {scores.map((s, i) => (
              <Cell key={i} fill={STANCE_COLORS[s.stance] || "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CashFlowChart({ trajectory }: { trajectory: TrajectoryPoint[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trajectory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} label={{ value: "月", position: "insideBottomRight", offset: -5 }} />
          <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "2px 2px 0 rgba(0,0,0,0.06)", fontFamily: "Courier New" }}
            formatter={(value) => [`¥${Number(value).toLocaleString()}`, ""]}
          />
          <Area type="monotone" dataKey="p90" stroke="none" fill="#dcfce7" fillOpacity={0.6} name="P90" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="#fee2e2" fillOpacity={0.6} name="P10" />
          <Line type="monotone" dataKey="median" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="中位数" />
          <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="最差 10%" />
          <Line type="monotone" dataKey="p90" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} name="最好 10%" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function OasisChart({ curve }: { curve: { day: number; total_users: number; new_users: number }[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={curve}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} label={{ value: "天", position: "insideBottomRight", offset: -5 }} />
          <YAxis stroke="#94a3b8" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "2px 2px 0 rgba(0,0,0,0.06)", fontFamily: "Courier New" }}
          />
          <Line type="monotone" dataKey="total_users" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="累计用户" />
          <Line type="monotone" dataKey="new_users" stroke="#10b981" strokeWidth={1.5} dot={false} name="日新增" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SentimentBar({ sentiment }: { sentiment: { positive: number; neutral: number; negative: number } }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative || 1;
  const segments = [
    { label: "正面", count: sentiment.positive, pct: Math.round((sentiment.positive / total) * 100), color: "#10b981" },
    { label: "中立", count: sentiment.neutral, pct: Math.round((sentiment.neutral / total) * 100), color: "#94a3b8" },
    { label: "负面", count: sentiment.negative, pct: Math.round((sentiment.negative / total) * 100), color: "#ef4444" },
  ];
  return (
    <div>
      <div className="flex h-4 overflow-hidden border border-slate-200 mb-2">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex justify-between pixel-text text-[10px]">
        {segments.map((s) => (
          <span key={s.label} style={{ color: s.color }}>{s.label} {s.count} ({s.pct}%)</span>
        ))}
      </div>
    </div>
  );
}

/* ── Generation status animation ── */

const GEN_STEPS = [
  { label: "汇总三层数据", duration: 2000 },
  { label: "AI 撰写计划书", duration: 0 },
  { label: "渲染图表", duration: 800 },
];

function GenerationStatus({ phase }: { phase: number }) {
  return (
    <div className="card p-8 flex flex-col items-center gap-5 text-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent animate-spin" />
        <span className="pixel-text text-sm font-bold text-slate-700">
          {GEN_STEPS[phase]?.label || "处理中"}...
        </span>
      </div>

      <div className="flex gap-8">
        {GEN_STEPS.map((step, i) => {
          const isDone = i < phase;
          const isCurrent = i === phase;
          return (
            <div key={step.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 flex items-center justify-center pixel-text text-[8px] font-bold ${
                isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-violet-500 text-white" : "bg-slate-200 text-slate-400"
              }`}>
                {isDone ? "✓" : i + 1}
              </span>
              <span className={`pixel-text text-[10px] ${
                isCurrent ? "text-slate-700 font-bold" : isDone ? "text-emerald-600" : "text-slate-300"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Slide section ── */

function SlideSection({
  slide, index, total, layerData, slideRef,
}: {
  slide: Slide; index: number; total: number; layerData?: LayerData;
  slideRef?: (el: HTMLDivElement | null) => void;
}) {
  const isCover = index === 0;
  const chartType = slide.chart_type || "none";

  return (
    <div
      ref={slideRef}
      className="bg-white w-full"
      style={{
        aspectRatio: "16/9",
        border: "2px solid #e2e8f0",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.08)",
        pageBreakAfter: "always",
      }}
    >
      <div className="h-full flex flex-col p-10 md:p-14">
        {isCover ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="pixel-text text-[10px] font-bold px-3 py-1 border border-amber-400 text-amber-600 bg-amber-50 mb-6">
              商业计划书
            </div>
            <h1 className="pixel-text text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              {slide.title}
            </h1>
            {slide.content.map((text, i) => (
              <p key={i} className="text-lg md:text-xl text-slate-500 leading-relaxed">{text}</p>
            ))}
            <div className="mt-10 pixel-text text-[10px] text-slate-300">
              VentureForge AI 自动生成
            </div>
          </div>
        ) : (
          <>
            <h2
              className="pixel-text text-2xl md:text-3xl font-bold text-slate-900 mb-6 pb-3"
              style={{ borderBottom: "3px solid #f59e0b" }}
            >
              {slide.title}
            </h2>

            <div className={`flex-1 ${chartType !== "none" ? "grid grid-cols-1 md:grid-cols-2 gap-8" : ""}`}>
              <ul className="space-y-4 text-base md:text-lg text-slate-700">
                {slide.content.map((text, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-amber-500 shrink-0 mt-1">▸</span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>

              {chartType === "feasibility_score" && layerData?.feasibility_scores && layerData.feasibility_scores.length > 0 && (
                <div className="flex flex-col">
                  <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase mb-3">AI 评审评分</h4>
                  <FeasibilityChart scores={layerData.feasibility_scores} />
                </div>
              )}

              {chartType === "monte_carlo_cashflow" && layerData?.monte_carlo && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-slate-200 bg-slate-50">
                      <div className="pixel-text text-[9px] text-slate-400 uppercase">成功率</div>
                      <div className="pixel-text text-lg font-bold" style={{ color: layerData.monte_carlo.success_rate >= 0.5 ? "#059669" : "#dc2626" }}>
                        {(layerData.monte_carlo.success_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 border border-slate-200 bg-slate-50">
                      <div className="pixel-text text-[9px] text-slate-400 uppercase">中位现金流</div>
                      <div className={`pixel-text text-lg font-bold ${layerData.monte_carlo.median_cash_flow >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        ¥{Math.round(layerData.monte_carlo.median_cash_flow).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {layerData.monte_carlo.trajectory && layerData.monte_carlo.trajectory.length > 0 && (
                    <div>
                      <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase mb-2">12 个月现金流轨迹</h4>
                      <CashFlowChart trajectory={layerData.monte_carlo.trajectory} />
                    </div>
                  )}
                </div>
              )}

              {chartType === "oasis_spread" && layerData?.oasis && (
                <div className="flex flex-col gap-4">
                  {layerData.oasis.sentiment && (
                    <div>
                      <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase mb-2">用户舆情</h4>
                      <SentimentBar sentiment={layerData.oasis.sentiment} />
                    </div>
                  )}
                  {layerData.oasis.curve_data && layerData.oasis.curve_data.length > 0 && (
                    <div>
                      <h4 className="pixel-text text-[10px] font-bold text-slate-400 uppercase mb-2">30 天用户采纳曲线</h4>
                      <OasisChart curve={layerData.oasis.curve_data} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-auto pt-4 flex justify-between items-center pixel-text text-[10px] text-slate-300 font-bold">
          <span>VentureForge</span>
          <span>{index + 1} / {total}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */

export default function Layer4Page() {
  const params = useParams();
  const ideaId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [genPhase, setGenPhase] = useState(0);
  const [data, setData] = useState<PitchDeckData | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"" | "pptx" | "pdf">("");

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchPitchDeck(ideaId).then((d) => { if (d) setData(d); }).catch(() => {});
  }, [ideaId]);

  const generateDeck = async (force = false) => {
    setLoading(true);
    setError("");
    setData(null);
    setGenPhase(0);

    const phaseTimer = setTimeout(() => setGenPhase(1), GEN_STEPS[0].duration);

    try {
      const json = await generatePitchDeck(ideaId, force);
      clearTimeout(phaseTimer);
      setGenPhase(2);
      await new Promise((r) => setTimeout(r, GEN_STEPS[2].duration));
      setData(json);
    } catch (err) {
      clearTimeout(phaseTimer);
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const exportPptx = useCallback(async () => {
    if (!data?.slides || exporting) return;
    setExporting("pptx");

    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      const slides = data.slides;
      const ld = data.layer_data;

      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const pSlide = pptx.addSlide();
        const chartType = s.chart_type || "none";

        pSlide.addShape("rect" as never, {
          x: 0, y: 0, w: "100%", h: "100%", fill: { color: "FFFFFF" },
        });

        if (i === 0) {
          pSlide.addShape("rect" as never, {
            x: 4.5, y: 1.4, w: 4.33, h: 0.6,
            fill: { color: "fffbeb" },
            border: { type: "solid", color: "fbbf24", pt: 1 },
          } as never);
          pSlide.addText("商业计划书", {
            x: 4.5, y: 1.4, w: 4.33, h: 0.6, align: "center",
            fontSize: 14, color: "92400e", fontFace: "Courier New",
          });
          pSlide.addText(s.title, {
            x: 0.5, y: 2.5, w: 12.33, h: 1.2, align: "center",
            fontSize: 36, bold: true, color: "0f172a", fontFace: "Courier New",
          });
          s.content.forEach((text, j) => {
            pSlide.addText(text, {
              x: 0.5, y: 4 + j * 0.6, w: 12.33, h: 0.5, align: "center",
              fontSize: 18, color: "64748b",
            });
          });
          pSlide.addText("VentureForge AI 自动生成", {
            x: 0.5, y: 6.5, w: 12.33, h: 0.3, align: "center",
            fontSize: 9, color: "cbd5e1", fontFace: "Courier New",
          });
        } else {
          pSlide.addShape("rect" as never, {
            x: 0.5, y: 0.4, w: 12.33, h: 0.05, fill: { color: "f59e0b" },
          });
          pSlide.addText(s.title, {
            x: 0.5, y: 0.5, w: 12.33, h: 0.8, fontSize: 28, bold: true,
            color: "0f172a", fontFace: "Courier New",
          });

          const contentW = chartType !== "none" ? 6 : 12.33;

          s.content.forEach((text, j) => {
            pSlide.addText(`▸ ${text}`, {
              x: 0.5, y: 1.6 + j * 0.7, w: contentW, h: 0.6,
              fontSize: 14, color: "334155", valign: "top",
            });
          });

          if (chartType === "feasibility_score" && ld?.feasibility_scores && ld.feasibility_scores.length > 0) {
            const chartData = [{
              name: "评分",
              labels: ld.feasibility_scores.map((s) => `${s.agent} (${STANCE_LABELS[s.stance] || s.stance})`),
              values: ld.feasibility_scores.map((s) => s.score),
            }];
            pSlide.addChart("bar" as never, chartData, {
              x: 7.2, y: 1.4, w: 5.5, h: 4.5,
              showValue: true,
              catAxisOrientation: "minMax",
              barDir: "bar",
              showTitle: true, title: "AI 评审评分",
              titleFontSize: 10,
            } as never);
          }

          if (chartType === "monte_carlo_cashflow" && ld?.monte_carlo?.trajectory) {
            const chartData = [
              { name: "中位数", labels: ld.monte_carlo.trajectory.map((t) => `${t.month}`), values: ld.monte_carlo.trajectory.map((t) => t.median) },
              { name: "P10", labels: ld.monte_carlo.trajectory.map((t) => `${t.month}`), values: ld.monte_carlo.trajectory.map((t) => t.p10) },
              { name: "P90", labels: ld.monte_carlo.trajectory.map((t) => `${t.month}`), values: ld.monte_carlo.trajectory.map((t) => t.p90) },
            ];
            pSlide.addText(
              `成功率: ${(ld.monte_carlo.success_rate * 100).toFixed(1)}%   中位现金流: ¥${Math.round(ld.monte_carlo.median_cash_flow).toLocaleString()}`,
              { x: 7.2, y: 1.4, w: 5.5, h: 0.4, fontSize: 11, color: "64748b", fontFace: "Courier New" },
            );
            pSlide.addChart("line" as never, chartData, {
              x: 7.2, y: 2.0, w: 5.5, h: 4,
              showTitle: true, title: "12个月现金流轨迹",
              titleFontSize: 10, titleColor: "94a3b8",
              showLegend: true, legendPos: "b", legendFontSize: 9,
            });
          }

          if (chartType === "oasis_spread" && ld?.oasis?.curve_data) {
            const chartData = [
              { name: "累计用户", labels: ld.oasis.curve_data.map((d) => `${d.day}`), values: ld.oasis.curve_data.map((d) => d.total_users) },
              { name: "日新增", labels: ld.oasis.curve_data.map((d) => `${d.day}`), values: ld.oasis.curve_data.map((d) => d.new_users) },
            ];
            if (ld.oasis.sentiment) {
              const sent = ld.oasis.sentiment;
              const total = sent.positive + sent.neutral + sent.negative || 1;
              pSlide.addText(
                `舆情: 正面 ${Math.round((sent.positive / total) * 100)}% | 中立 ${Math.round((sent.neutral / total) * 100)}% | 负面 ${Math.round((sent.negative / total) * 100)}%`,
                { x: 7.2, y: 1.4, w: 5.5, h: 0.4, fontSize: 11, color: "64748b", fontFace: "Courier New" },
              );
            }
            pSlide.addChart("line" as never, chartData, {
              x: 7.2, y: 2.0, w: 5.5, h: 4,
              showTitle: true, title: "30天用户采纳曲线",
              titleFontSize: 10, titleColor: "94a3b8",
              showLegend: true, legendPos: "b", legendFontSize: 9,
            });
          }
        }

        pSlide.addText(`VentureForge`, {
          x: 0.3, y: 7, w: 3, h: 0.3, fontSize: 8, color: "cbd5e1", fontFace: "Courier New",
        });
        pSlide.addText(`${i + 1} / ${slides.length}`, {
          x: 10.33, y: 7, w: 3, h: 0.3, fontSize: 8, color: "cbd5e1", fontFace: "Courier New", align: "right",
        });
      }

      const ideaName = slides[0]?.title || "PitchDeck";
      await pptx.writeFile({ fileName: `${ideaName}_商业计划书.pptx` });
    } catch (err) {
      console.error("PPTX export failed:", err);
    } finally {
      setExporting("");
    }
  }, [data, exporting]);

  const exportPdf = useCallback(async () => {
    if (!data?.slides || exporting) return;
    setExporting("pdf");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slideRefs.current.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;

        const canvas = await html2canvas(el, {
          scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
      }

      const ideaName = data.slides[0]?.title || "PitchDeck";
      pdf.save(`${ideaName}_商业计划书.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting("");
    }
  }, [data, exporting]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Empty state / initial */}
      {!data && !loading && (
        <div className="card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="pixel-text text-[10px] font-bold px-2 py-0.5 border border-violet-400 text-violet-600 bg-violet-50">
              LAYER 4
            </span>
            <span className="pixel-text text-[10px] text-slate-400">
              PITCH DECK GENERATOR
            </span>
          </div>
          <h1 className="pixel-text text-xl font-bold text-slate-900 mb-4">最后一步：生成商业计划书</h1>
          <p className="text-sm text-slate-500 max-w-xl mb-8">
            综合 AI 鲨鱼坦克辩论、蒙特卡洛财务预测和 OASIS 社交传播数据，自动生成一份包含真实图表的中文商业计划书。支持下载 PPTX 和 PDF。
          </p>

          <button
            onClick={() => generateDeck()}
            className="pixel-btn pixel-text text-sm font-bold px-8 py-3 bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100"
          >
            生成商业计划书
          </button>
          {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        </div>
      )}

      {/* Generation progress */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <GenerationStatus phase={genPhase} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {data && data.slides && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="pixel-text text-[10px] font-bold px-2 py-0.5 border border-violet-400 text-violet-600 bg-violet-50">
                PITCH DECK
              </span>
              <span className="pixel-text text-xs text-slate-400">
                {data.slides.length} 页
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportPptx}
                disabled={!!exporting}
                className="pixel-btn pixel-text text-xs font-bold px-5 py-2 bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                {exporting === "pptx" ? "正在导出..." : "下载 PPTX"}
              </button>
              <button
                onClick={exportPdf}
                disabled={!!exporting}
                className="pixel-btn pixel-text text-xs font-bold px-5 py-2 bg-white border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {exporting === "pdf" ? "正在导出..." : "下载 PDF"}
              </button>
              <button
                onClick={() => generateDeck(true)}
                disabled={loading}
                className="pixel-btn pixel-text text-xs font-bold px-5 py-2 bg-white border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "生成中..." : "重新生成"}
              </button>
            </div>
          </div>

          {/* Slides */}
          <div className="space-y-8 max-w-5xl mx-auto">
            {data.slides.map((slide, i) => (
              <SlideSection
                key={i}
                slide={slide}
                index={i}
                total={data.slides.length}
                layerData={data.layer_data}
                slideRef={(el) => { slideRefs.current[i] = el; }}
              />
            ))}
          </div>

          {/* Bottom nav */}
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <Link
              href="/"
              className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              返回首页
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={exportPptx}
                disabled={!!exporting}
                className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                {exporting === "pptx" ? "正在导出..." : "下载 PPTX"}
              </button>
              <button
                onClick={exportPdf}
                disabled={!!exporting}
                className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-white border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {exporting === "pdf" ? "正在导出..." : "下载 PDF"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
