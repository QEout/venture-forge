"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Idea } from "@/lib/types";
import { fetchIdeas } from "@/lib/api";

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "#3B82F615", text: "#3B82F6", label: "Draft" },
  discussing: { bg: "#F59E0B15", text: "#F59E0B", label: "Discussing..." },
  discussed: { bg: "#10B98115", text: "#10B981", label: "Discussed" },
};

const LAYER_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

export default function HomePage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdeas()
      .then(setIdeas)
      .catch(() => setIdeas([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight"
          >
            <span className="pixel-text text-amber-500">Venture</span>
            <span className="text-slate-900">Forge</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            终极产品创新孵化器。
            <br />
            <span className="text-sm text-slate-400 mt-2 inline-block">
              输入你的想法，让它经历我们独创的 4 层模拟验证：
            </span>
          </motion.p>

          {/* 4-Layer Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left"
          >
            {[
              { label: "第一层", title: "AI 鲨鱼坦克辩论", desc: "5位AI角色（投资人、用户、竞品）多维度辩论你的想法，找出漏洞并生成改进版。" },
              { label: "第二层", title: "蒙特卡洛商业模型", desc: "基于真实市场数据，进行1万次获客成本、LTV和现金流的算法迭代，预测财务成功率。" },
              { label: "第三层", title: "OASIS 社交传播模拟", desc: "模拟2000名AI用户对产品发布的真实反应，生成病毒式传播曲线和社交媒体评论流。" },
              { label: "第四层", title: "Pitch Deck 生成", desc: "自动将前三层的模拟数据和改进方案，整合为一份结构清晰、可直接用于融资的商业计划书。" },
            ].map((layer, i) => (
              <div
                key={i}
                className="card p-4"
                style={{ borderColor: `${LAYER_COLORS[i]}30` }}
              >
                <div
                  className="pixel-text text-[10px] font-bold mb-1"
                  style={{ color: LAYER_COLORS[i] }}
                >
                  {layer.label}
                </div>
                <h3 className="pixel-text text-sm font-bold text-slate-900 mb-2">{layer.title}</h3>
                <p className="text-xs text-slate-500">{layer.desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <Link
              href="/lab/new"
              className="pixel-btn pixel-text inline-flex items-center gap-2 px-8 py-4 font-bold text-sm bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100"
            >
              + 开始你的模拟之旅
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Idea list */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="text-center text-slate-400 py-12 pixel-text text-sm">Loading...</div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">
              还没有任何 idea。点击上方按钮开始你的第一次讨论。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="pixel-text text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Your Ideas
            </h2>
            {ideas.map((idea, i) => {
              const status = STATUS_STYLE[idea.status] || STATUS_STYLE.draft;
              return (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/lab/${idea.id}`} className="block">
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="pixel-text text-sm font-bold text-slate-900">
                            {idea.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {idea.problem?.slice(0, 80)}
                            {idea.problem?.length > 80 ? "..." : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="pixel-text px-2 py-1 text-[10px] font-bold"
                            style={{ background: status.bg, color: status.text, border: `1px solid ${status.text}30` }}
                          >
                            {status.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(idea.ts).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
