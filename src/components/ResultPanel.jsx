import { useState } from "react";

const ROLE_COLORS = {
  "开场": "text-rose-400 border-rose-400/50",
  "冲突": "text-orange-400 border-orange-400/50",
  "转折": "text-amber-400 border-amber-400/50",
  "兑现": "text-teal-400 border-teal-400/50",
  "金句": "text-violet-400 border-violet-400/50",
  "CTA": "text-fuchsia-400 border-fuchsia-400/50",
};

function getRoleColor(role) {
  if (!role) return "text-neutral-400 border-neutral-500/50";
  for (const [key, cls] of Object.entries(ROLE_COLORS)) {
    if (role.includes(key)) return cls;
  }
  return "text-neutral-400 border-neutral-500/50";
}

function getRiskLevel(score) {
  if (score <= 3) return "low";
  if (score <= 6) return "mid";
  return "high";
}

function normalizeRole(role) {
  if (!role) return "";
  return role
    .split("+")
    .map((r) => r.trim())
    .sort()
    .join("+");
}

function groupConsecutiveSentences(sentences) {
  if (!sentences?.length) return [];

  const groups = [];
  let current = null;

  for (let i = 0; i < sentences.length; i++) {
    const item = sentences[i];
    const role = normalizeRole(item.role);

    if (current && current.role === role) {
      current.items.push({ ...item, originalIndex: i });
    } else {
      current = {
        role,
        rawRole: item.role,
        items: [{ ...item, originalIndex: i }],
      };
      groups.push(current);
    }
  }

  return groups;
}

function RoleTags({ role }) {
  if (!role) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {role.split("+").map((r, j) => (
        <span
          key={j}
          className={`inline-block rounded-full border px-2 py-0.5 text-xs ${getRoleColor(r.trim())}`}
        >
          {r.trim()}
        </span>
      ))}
    </div>
  );
}

function RiskBadge({ score }) {
  if (score === undefined || score === null) return null;
  const level = getRiskLevel(score);
  const colors = {
    low: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    mid: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    high: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };
  return (
    <span className={`ml-2 rounded border px-1.5 py-0.5 text-xs ${colors[level]}`}>
      风险 {score}/10
    </span>
  );
}

function CopyButton({ text, size = "sm" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const sizeClasses = size === "lg" 
    ? "px-4 py-2 text-sm font-medium" 
    : "px-3 py-1.5 text-xs";

  return (
    <button
      onClick={handleCopy}
      className={`rounded-2xl border border-violet-400/30 bg-violet-600/80 text-white backdrop-blur-sm shadow-lg shadow-violet-900/20 transition-all hover:scale-105 hover:bg-violet-500/90 hover:ring-2 hover:ring-violet-300/20 ${sizeClasses}`}
    >
      {copied ? "已复制 ✓" : "一键复制"}
    </button>
  );
}

function getEncouragement(score) {
  if (score <= 6) {
    return {
      text: "潜力股来啦！💕 专家已帮你优化到8+水准，继续卷就爆～",
      className: "bg-pink-900/40 border-pink-400/40 text-pink-200"
    };
  } else if (score >= 8) {
    return {
      text: "哇塞！已经很香了～✨",
      className: "bg-violet-900/40 border-violet-400/40 text-violet-200"
    };
  } else {
    return {
      text: "不错不错！再调调就能起飞啦～🌸",
      className: "bg-amber-900/40 border-amber-400/40 text-amber-200"
    };
  }
}

function HeroScoreCard({ score }) {
  if (score === undefined || score === null) return null;

  const getScoreColor = (s) => {
    if (s <= 3) return "from-rose-400 to-pink-400";
    if (s <= 6) return "from-amber-400 to-yellow-300";
    return "from-violet-500 to-fuchsia-400";
  };

  const getScoreLabel = (s) => {
    if (s <= 3) return "需要大改";
    if (s <= 6) return "有潜力但需优化";
    return "已经很好";
  };

  const getScoreBg = (s) => {
    if (s <= 3) return "bg-gradient-to-br from-rose-950/40 to-pink-950/20";
    if (s <= 6) return "bg-gradient-to-br from-amber-950/40 to-yellow-950/20";
    return "bg-gradient-to-br from-violet-950/40 to-fuchsia-950/20";
  };

  const encouragement = getEncouragement(score);

  return (
    <div className={`relative z-10 flex flex-col items-center justify-center rounded-2xl p-6 ${getScoreBg(score)}`}>
      <div className="relative">
        <div className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${getScoreColor(score)} text-5xl font-black text-white shadow-xl`}>
          {score}
        </div>
        <span className="absolute -right-2 -top-2 text-xl text-pink-300">💕</span>
      </div>
      <p className="mt-4 text-2xl font-bold text-neutral-100">{getScoreLabel(score)}</p>
      <p className="mt-1 text-sm text-neutral-400">爆款潜力评分 / 满分 10 分</p>
      <div className={`mt-4 inline-block backdrop-blur-sm border rounded-2xl px-5 py-3 text-sm font-medium shadow-md ${encouragement.className}`}>
        {encouragement.text}
      </div>
    </div>
  );
}

function HeroRewriteCard({ fullRewrite }) {
  const [expanded, setExpanded] = useState(false);
  if (!fullRewrite) return null;

  const PREVIEW_LENGTH = 500;
  const shouldTruncate = fullRewrite.length > 800;
  const displayText = shouldTruncate && !expanded 
    ? fullRewrite.substring(0, PREVIEW_LENGTH) + "..." 
    : fullRewrite;

  return (
    <div className="relative z-10 rounded-2xl border border-white/5 bg-neutral-900/70 p-4 shadow-xl shadow-violet-900/10 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-violet-300">✨ 专家改写版</h3>
        <CopyButton text={fullRewrite} size="lg" />
      </div>
      <div className="rounded-2xl bg-neutral-800/50 p-4 text-sm text-neutral-200 whitespace-pre-wrap">
        {displayText}
      </div>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-all"
        >
          {expanded ? "收起全文" : `展开全文（共 ${fullRewrite.length} 字）`}
        </button>
      )}
    </div>
  );
}

function HeroTitlesCard({ titles }) {
  if (!titles?.length) return null;

  return (
    <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {titles.map((title, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/5 bg-neutral-900/70 p-4 text-sm text-neutral-200 shadow-xl shadow-violet-900/10 backdrop-blur-md transition-all hover:scale-[1.02] hover:ring-2 hover:ring-violet-300/10"
        >
          <span className="mb-2 block text-xs font-medium text-fuchsia-400">🌸 爆款标题 {i + 1}</span>
          <p className="leading-relaxed">{title}</p>
        </div>
      ))}
    </div>
  );
}

function ActionPlanSection({ actions }) {
  if (!actions?.length) return null;

  const icons = ["💡", "🎯", "🚀"];

  return (
    <section className="rounded-2xl border border-white/5 bg-neutral-900/70 p-4 shadow-xl shadow-violet-900/10 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-semibold text-cyan-300">📋 行动清单</h3>
      <ul className="space-y-3">
        {actions.map((action, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl bg-neutral-800/50 p-3 text-sm transition-all hover:bg-neutral-700/50">
            <span className="text-teal-300 text-base">{icons[i] || "📌"}</span>
            <span className="text-neutral-200 leading-relaxed">{action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SummarySection({ summary }) {
  if (!summary) return null;
  const { whyWorks, mainIssue, oneLineAdvice } = summary;
  if (!whyWorks && !mainIssue && !oneLineAdvice) return null;

  return (
    <section className="rounded-2xl border border-white/5 bg-neutral-900/70 p-4 shadow-xl shadow-violet-900/10 backdrop-blur-md">
      <h3 className="mb-2 text-sm font-medium text-neutral-300">📝 分析总结</h3>
      {oneLineAdvice && (
        <p className="text-sm text-teal-300 font-medium">
          💫 {oneLineAdvice}
        </p>
      )}
      {whyWorks && (
        <p className="mt-2 text-sm text-neutral-300">
          <span className="text-neutral-500">为什么有效：</span>
          {whyWorks}
        </p>
      )}
      {mainIssue && (
        <p className="mt-1 text-sm text-neutral-300">
          <span className="text-neutral-500">最大问题：</span>
          {mainIssue}
        </p>
      )}
    </section>
  );
}

function CriticalIssuesSection({ issues }) {
  if (!issues?.length) return null;

  return (
    <section className="rounded-2xl border border-rose-500/20 bg-neutral-900/70 p-4 shadow-xl shadow-rose-900/10 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-medium text-rose-300">⚠️ 关键问题</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {issues.map((issue, i) => (
          <div key={i} className="rounded-2xl bg-rose-900/20 p-3 text-sm text-neutral-200">
            <span className="mb-1 block text-xs text-rose-400">问题 {i + 1}</span>
            {issue}
          </div>
        ))}
      </div>
    </section>
  );
}

function SentenceAnalysisSection({ sentences }) {
  const [expanded, setExpanded] = useState(false);
  const groups = groupConsecutiveSentences(sentences);
  if (!groups.length) return null;

  const totalSentences = sentences.length;

  return (
    <section className="rounded-2xl border border-white/5 bg-neutral-900/70 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <h3 className="text-sm font-medium text-neutral-300">
          📖 逐句拆解（共 {totalSentences} 句，点击{expanded ? "收起" : "展开"}）
        </h3>
        <span className="text-xs text-neutral-500">
          {expanded ? "▲ 收起" : "▼ 展开"}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-white/5 p-4">
          <ol className="space-y-3">
            {groups.map((group, gi) => {
              const isSingle = group.items.length === 1;
              const firstIdx = group.items[0].originalIndex;
              const lastIdx = group.items[group.items.length - 1].originalIndex;
              const rangeLabel = isSingle
                ? `${firstIdx + 1}.`
                : `${firstIdx + 1}-${lastIdx + 1}.`;

              return (
                <li key={gi} className="rounded-2xl bg-neutral-800/50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-xs text-neutral-500">
                      {rangeLabel}
                    </span>
                    <div className="flex-1">
                      <RoleTags role={group.rawRole} />
                      <div className="mt-2 space-y-2">
                        {group.items.map((item) => (
                          <div key={item.originalIndex} className={isSingle ? "" : "border-l-2 border-neutral-700/50 pl-3"}>
                            <div className="flex items-center">
                              <p className="text-sm text-neutral-100">{item.sentence}</p>
                              <RiskBadge score={item.riskScore} />
                            </div>
                            {item.analysis && (
                              <p className="mt-1 text-xs text-neutral-400">{item.analysis}</p>
                            )}
                            {item.rewriteDemo && (
                              <div className="mt-2 rounded-2xl border border-teal-500/20 bg-teal-900/20 p-2">
                                <p className="text-xs text-teal-300">✏️ 改写建议：</p>
                                <p className="mt-0.5 text-sm text-neutral-200">{item.rewriteDemo}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <aside className="rounded-2xl border border-white/5 bg-neutral-900/70 p-5 backdrop-blur-md">
        <h2 className="text-lg font-semibold">分析结果</h2>
        <p className="mt-3 rounded-2xl border border-dashed border-neutral-700 p-4 text-sm text-neutral-400">
          提交文本后，这里会展示结构化结果。
        </p>
      </aside>
    );
  }

  const analysisResult = result.analysisResult || {};

  return (
    <aside className="space-y-4">
      {result?._meta?.isFallback && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-900/20 p-3 text-xs text-amber-200">
          当前展示的是兜底结果（非 DeepSeek 实时分析）：{result?._meta?.reasonText || result?._meta?.reason || "未知原因"}
        </div>
      )}

      <section className="hero-bg relative overflow-hidden rounded-2xl border border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/30 to-neutral-950 p-6 shadow-2xl shadow-violet-900/20 backdrop-blur-md brightness-[1.03] contrast-[1.08] saturate-[1.15] before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-transparent before:to-black/20 before:pointer-events-none">
        <HeroScoreCard score={analysisResult.overallScore} />
        <div className="mt-5">
          <HeroRewriteCard fullRewrite={analysisResult.fullRewrite} />
        </div>
        <div className="mt-5">
          <HeroTitlesCard titles={analysisResult.newTitles} />
        </div>
      </section>

      <ActionPlanSection actions={analysisResult.actionPlan} />
      <SummarySection summary={result.summary} />
      <CriticalIssuesSection issues={analysisResult.criticalIssues} />
      <SentenceAnalysisSection sentences={result.sentenceAnalysis} />
    </aside>
  );
}
