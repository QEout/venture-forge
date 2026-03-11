"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Agent, RecommendedCombo } from "@/lib/types";
import { fetchAgents, createIdea } from "@/lib/api";
import { AgentSelector } from "@/components/agents/AgentSelector";

const PRESETS: { label: string; emoji: string; data: typeof EMPTY_FORM }[] = [
  {
    label: "AI 编程助手",
    emoji: "🤖",
    data: {
      name: "CodePilot AI",
      problem: "开发者在编写复杂业务逻辑时需要频繁查文档、搜 Stack Overflow，上下文切换严重影响效率，初级开发者更是难以写出高质量代码",
      solution: "基于大语言模型的 IDE 插件，能理解项目上下文、自动补全复杂逻辑、生成单元测试，并提供代码审查建议。支持私有化部署保证代码安全",
      target_user: "中小型软件公司的开发团队、独立开发者",
      biz_model: "SaaS 订阅制：个人版 $10/月，团队版 $30/人/月，企业私有化部署另议",
    },
  },
  {
    label: "宠物健康管家",
    emoji: "🐾",
    data: {
      name: "PawCare",
      problem: "宠物主人难以判断宠物的健康状况，常常错过疾病早期信号。去宠物医院排队久、费用高，很多小问题其实不需要就医",
      solution: "通过智能项圈采集宠物活动量、心率、体温等数据，结合 AI 分析给出健康预警。内置在线问诊功能，连接持证兽医进行远程咨询",
      target_user: "一二线城市养猫养狗的年轻人（25-40岁）",
      biz_model: "硬件（智能项圈）一次性销售 ¥399 + App 会员 ¥19.9/月（含在线问诊额度）",
    },
  },
  {
    label: "社区团购 2.0",
    emoji: "🛒",
    data: {
      name: "鲜邻到家",
      problem: "社区团购平台品控差、配送不稳定，消费者信任度低。团长收入不稳定，供应链效率低导致生鲜损耗率高达 20-30%",
      solution: "自建前置仓 + 自动化分拣系统，把损耗率控制在 5% 以内。用 AI 预测社区需求动态调整库存，团长升级为社区服务管家提供增值服务",
      target_user: "三四线城市家庭主妇、注重食品品质的中产家庭",
      biz_model: "商品差价 + 平台佣金 8%，团长分佣 10-15%，远期拓展社区广告和本地生活服务",
    },
  },
  {
    label: "跨境独立站建站",
    emoji: "🌍",
    data: {
      name: "ShopForge",
      problem: "中小卖家想做跨境电商独立站，但 Shopify 等平台学习成本高、插件费用贵，且不了解海外消费者偏好和合规要求",
      solution: "一键建站工具，内置针对不同国家/地区优化的模板、自动翻译、合规检查（GDPR/税务）、AI 选品推荐。集成支付和物流一站式搞定",
      target_user: "有供应链资源但缺乏技术能力的外贸工厂和跨境电商新手卖家",
      biz_model: "基础版免费（限 50 个 SKU），专业版 $49/月，每笔交易抽佣 1.5%",
    },
  },
  {
    label: "企业碳管理",
    emoji: "🌱",
    data: {
      name: "CarbonLens",
      problem: "随着碳中和政策推进，企业面临碳排放核算和报告压力，但缺乏专业工具。手动填表效率低、数据不准确，难以通过审计",
      solution: "自动对接企业 ERP/能源系统，实时采集排放数据并按国际标准（GHG Protocol）生成报告。提供减排路径模拟和碳交易市场行情",
      target_user: "需要进行 ESG 披露的上市公司、出口欧盟的制造业企业",
      biz_model: "SaaS 年费制：中型企业 ¥5 万/年，大型企业 ¥20 万/年，含咨询服务",
    },
  },
];

const EMPTY_FORM = { name: "", problem: "", solution: "", target_user: "", biz_model: "" };

export default function NewIdeaPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [combos, setCombos] = useState<Record<string, RecommendedCombo>>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchAgents().then((data) => {
      setAgents(data.agents || []);
      setCombos(data.combos || {});
      const defaultCombo = data.combos?.entrepreneur;
      if (defaultCombo) {
        setSelectedAgents(defaultCombo.agent_ids);
      }
    });
  }, []);

  const canSubmit =
    form.name.trim() && form.problem.trim() && selectedAgents.length >= 2 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const idea = await createIdea({ ...form, agent_ids: selectedAgents });
      router.push(`/lab/${idea.id}/layer1`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-slate-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="pixel-text text-xs text-slate-400 hover:text-slate-700">
            &lt;- Back
          </Link>
          <span className="text-slate-300">|</span>
          <span className="pixel-text text-xs font-bold text-slate-700">New Idea</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="pixel-text text-xl font-bold text-slate-900">
            描述你的想法
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            填写以下信息，选择讨论角色，然后开始讨论
          </p>
        </motion.div>

        {/* Preset Templates */}
        <div className="mt-6 flex flex-wrap gap-2">
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setForm(preset.data);
                setActivePreset(i);
              }}
              className={`pixel-text text-xs font-bold px-3 py-1.5 border-2 transition-all
                ${activePreset === i
                  ? "bg-amber-50 border-amber-400 text-amber-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600"
                }`}
            >
              {preset.emoji} {preset.label}
            </button>
          ))}
          {activePreset !== null && (
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setActivePreset(null);
              }}
              className="pixel-text text-xs font-bold px-3 py-1.5 border-2 border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition-all"
            >
              x 清空
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
          {/* Form */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              <label className="pixel-text block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                产品名称 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. VentureForge"
                className="pixel-input w-full px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="pixel-text block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                解决什么问题 *
              </label>
              <textarea
                value={form.problem}
                onChange={(e) => updateField("problem", e.target.value)}
                placeholder="用户面临的痛点是什么？"
                rows={3}
                className="pixel-input w-full px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>

            <div>
              <label className="pixel-text block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                你的方案
              </label>
              <textarea
                value={form.solution}
                onChange={(e) => updateField("solution", e.target.value)}
                placeholder="你打算怎么解决这个问题？"
                rows={3}
                className="pixel-input w-full px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="pixel-text block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                  目标用户
                </label>
                <input
                  type="text"
                  value={form.target_user}
                  onChange={(e) => updateField("target_user", e.target.value)}
                  placeholder="e.g. 创业者、大学生"
                  className="pixel-input w-full px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="pixel-text block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                  商业模式
                </label>
                <input
                  type="text"
                  value={form.biz_model}
                  onChange={(e) => updateField("biz_model", e.target.value)}
                  placeholder="e.g. SaaS 订阅、一次性付费"
                  className="pixel-input w-full px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
              
            </div>
                    {/* Submit */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="pixel-btn pixel-text text-sm font-bold px-6 py-3 bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "正在创建..." : "开始讨论 ->"}
          </button>
          <span className="pixel-text text-xs text-slate-400">
            {selectedAgents.length} 个角色已选择
          </span>
        </div>
          </div>

          {/* Agent selector */}
          <div className="lg:col-span-2">
            <AgentSelector
              agents={agents}
              combos={combos}
              selected={selectedAgents}
              onChange={setSelectedAgents}
            />
          </div>
        </div>


      </main>
    </div>
  );
}
