"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const STEPS = [
  { id: "layer1", label: "第一层：鲨鱼坦克", path: "/layer1" },
  { id: "layer2", label: "第二层：蒙特卡洛", path: "/layer2" },
  { id: "layer3", label: "第三层：OASIS", path: "/layer3" },
  { id: "layer4", label: "第四层：Pitch Deck", path: "/layer4" },
];

export default function IdeaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const pathname = usePathname();
  const currentStepIndex = STEPS.findIndex(step => pathname.includes(step.path));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-50">
        <div className=" px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              ← 返回首页
            </Link>
            <div className="text-sm font-mono text-[var(--accent-amber)]">
              Idea ID: {id}
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between relative">
            <div className="absolute left-0 top-[14px] w-full h-0.5 bg-[var(--border)] z-0" />
            
            {STEPS.map((step, index) => {
              const isActive = currentStepIndex === index;
              const isPast = currentStepIndex > index;
              
              return (
                <Link
                  key={step.id}
                  href={`/lab/${id}${step.path}`}
                  className={`relative z-10 flex flex-col items-center gap-2 group ${
                    isActive ? "text-[var(--accent-amber)]" : 
                    isPast ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                    ${isActive ? "bg-[var(--bg-primary)] border-[var(--accent-amber)]" : 
                      isPast ? "bg-[var(--accent-amber)] border-[var(--accent-amber)] text-white" : 
                      "bg-[var(--bg-primary)] border-[var(--border)] group-hover:border-[var(--text-muted)]"}
                  `}>
                    {isPast ? "✓" : index + 1}
                  </div>
                  <span className="text-xs font-medium bg-[var(--bg-secondary)] px-2">
                    {step.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1  w-full p-6">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
