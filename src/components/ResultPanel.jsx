const ROLE_COLORS = {
  "开场": "text-red-400 border-red-500/50",
  "冲突": "text-orange-400 border-orange-500/50",
  "转折": "text-yellow-400 border-yellow-500/50",
  "兑现": "text-green-400 border-green-500/50",
  "金句": "text-purple-400 border-purple-500/50",
  "CTA": "text-pink-400 border-pink-500/50",
};

function getRoleColor(role) {
  if (!role) return "text-slate-400 border-slate-500/50";
  for (const [key, cls] of Object.entries(ROLE_COLORS)) {
    if (role.includes(key)) return cls;
  }
  return "text-slate-400 border-slate-500/50";
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

function SentenceAnalysisSection({ sentences }) {
  const groups = groupConsecutiveSentences(sentences);
  if (!groups.length) return null;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <h3 className="mb-4 text-sm font-medium text-slate-300">逐句拆解</h3>
      <ol className="space-y-3">
        {groups.map((group, gi) => {
          const isSingle = group.items.length === 1;
          const firstIdx = group.items[0].originalIndex;
          const lastIdx = group.items[group.items.length - 1].originalIndex;
          const rangeLabel = isSingle
            ? `${firstIdx + 1}.`
            : `${firstIdx + 1}-${lastIdx + 1}.`;

          return (
            <li key={gi} className="rounded-lg bg-slate-900/50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-xs text-slate-500">
                  {rangeLabel}
                </span>
                <div className="flex-1">
                  <RoleTags role={group.rawRole} />
                  <div className="mt-2 space-y-2">
                    {group.items.map((item) => (
                      <div key={item.originalIndex} className={isSingle ? "" : "border-l-2 border-slate-700/50 pl-3"}>
                        <p className="text-sm text-slate-100">{item.sentence}</p>
                        {item.analysis && (
                          <p className="mt-1 text-xs text-slate-400">{item.analysis}</p>
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
    </section>
  );
}

function SummarySection({ summary }) {
  if (!summary) return null;
  const { whyWorks, mainIssue, oneLineAdvice } = summary;
  if (!whyWorks && !mainIssue && !oneLineAdvice) return null;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <h3 className="mb-2 text-sm font-medium text-slate-100">分析总结</h3>
      {whyWorks && (
        <p className="text-sm text-slate-100">
          <span className="text-slate-400">为什么有效：</span>
          {whyWorks}
        </p>
      )}
      {mainIssue && (
        <p className="mt-1.5 text-sm text-slate-100">
          <span className="text-slate-400">最大问题：</span>
          {mainIssue}
        </p>
      )}
      {oneLineAdvice && (
        <p className="mt-1.5 text-sm text-emerald-300">
          <span className="text-slate-400">一句建议：</span>
          {oneLineAdvice}
        </p>
      )}
    </section>
  );
}

export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold">分析结果</h2>
        <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
          提交文本后，这里会展示结构化结果。
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold">分析结果</h2>
      {result?._meta?.isFallback && (
        <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-900/20 p-3 text-xs text-amber-200">
          当前展示的是兜底结果（非 DeepSeek 实时分析）：{result?._meta?.reasonText || result?._meta?.reason || "未知原因"}
        </div>
      )}
      <div className="mt-4 space-y-4">
        <SummarySection summary={result.summary} />
        <SentenceAnalysisSection sentences={result.sentenceAnalysis} />
      </div>
    </aside>
  );
}
