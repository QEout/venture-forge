"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { generatePitchDeck, fetchPitchDeck } from "@/lib/api";

interface Slide {
  title: string;
  content: string[];
  chart_type?: string;
}

interface PitchDeckData {
  slides: Slide[];
}

export default function Layer4Page() {
  const params = useParams();
  const ideaId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PitchDeckData | null>(null);
  const [error, setError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchPitchDeck(ideaId).then((d) => { if (d) setData(d); }).catch(() => {});
  }, [ideaId]);

  const generateDeck = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await generatePitchDeck(ideaId);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    if (data && currentSlide < data.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {!data && (
        <div className="card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="pixel-text text-[10px] font-bold px-2 py-0.5 border border-violet-400 text-violet-600 bg-violet-50">
              LAYER 4
            </span>
            <span className="pixel-text text-[10px] text-slate-400">
              PITCH DECK GENERATOR
            </span>
          </div>
          <h1 className="pixel-text text-xl font-bold text-slate-900 mb-4">最后一步：生成 Pitch Deck</h1>
          <p className="text-sm text-slate-500 max-w-xl mb-8">
            我们将综合 AI 鲨鱼坦克的反馈、蒙特卡洛财务预测和 OASIS 社交传播数据，生成一份连贯的 6 页商业计划书。
          </p>

          <button
            onClick={generateDeck}
            disabled={loading}
            className="pixel-btn pixel-text text-sm font-bold px-8 py-3 bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            {loading ? "正在综合数据并生成..." : "生成 Pitch Deck"}
          </button>
          {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        </div>
      )}

      {data && data.slides && (
        <div className="flex flex-col items-center gap-6">
          {/* Slide Viewer */}
          <div
            className="w-full max-w-4xl aspect-video bg-white text-black overflow-hidden relative"
            style={{ border: "2px solid #e2e8f0", boxShadow: "4px 4px 0 rgba(0,0,0,0.08)" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-12 flex flex-col"
              >
                <div className="flex-1 flex flex-col">
                  {currentSlide === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <h1 className="pixel-text text-4xl font-bold mb-6 text-slate-900">{data.slides[currentSlide].title}</h1>
                      {data.slides[currentSlide].content.map((text: string, i: number) => (
                        <p key={i} className="text-xl text-slate-500 font-medium">{text}</p>
                      ))}
                    </div>
                  ) : (
                    <>
                      <h2
                        className="pixel-text text-3xl font-bold text-slate-900 mb-8 pb-4 self-start"
                        style={{ borderBottom: "3px solid #f59e0b" }}
                      >
                        {data.slides[currentSlide].title}
                      </h2>

                      <div className="flex-1 grid grid-cols-1 gap-8">
                        <ul className="space-y-6 text-lg text-slate-700 list-disc pl-8">
                          {data.slides[currentSlide].content.map((text: string, i: number) => (
                            <li key={i} className="leading-relaxed">{text}</li>
                          ))}
                        </ul>

                        {data.slides[currentSlide].chart_type === "feasibility_score" && (
                          <div className="mt-8 bg-slate-50 p-6 flex items-center justify-center border-2 border-dashed border-slate-300">
                            <span className="pixel-text text-sm text-slate-400">[ AI 鲨鱼坦克可行性评分图表 ]</span>
                          </div>
                        )}
                        {data.slides[currentSlide].chart_type === "monte_carlo_cashflow" && (
                          <div className="mt-8 bg-slate-50 p-6 flex items-center justify-center border-2 border-dashed border-slate-300">
                            <span className="pixel-text text-sm text-slate-400">[ 蒙特卡洛现金流预测图表 ]</span>
                          </div>
                        )}
                        {data.slides[currentSlide].chart_type === "oasis_spread" && (
                          <div className="mt-8 bg-slate-50 p-6 flex items-center justify-center border-2 border-dashed border-slate-300">
                            <span className="pixel-text text-sm text-slate-400">[ OASIS 病毒式采用曲线图表 ]</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Slide Footer */}
                <div className="mt-auto pt-8 flex justify-between items-center pixel-text text-xs text-slate-400 font-bold">
                  <span>VentureForge 自动生成</span>
                  <span>{currentSlide + 1} / {data.slides.length}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="pixel-btn w-10 h-10 flex items-center justify-center bg-white border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              &lt;-
            </button>
            <div className="flex gap-2">
              {data.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-3 h-3 transition-colors ${
                    i === currentSlide ? "bg-amber-500" : "bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              disabled={currentSlide === data.slides.length - 1}
              className="pixel-btn w-10 h-10 flex items-center justify-center bg-white border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              -&gt;
            </button>
          </div>

          {currentSlide === data.slides.length - 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
              <Link href="/" className="pixel-btn pixel-text text-xs font-bold px-6 py-2.5 bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100">
                返回首页
              </Link>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
