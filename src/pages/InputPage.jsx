import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { verticalProfile } from "../config/vertical";
import { saveAnalysisHistory } from "../utils/localStorage";
import LoadingProgress from "../components/LoadingProgress";
import HistoryList from "../components/HistoryList";
import VideoParser from "../components/VideoParser";

const LOADING_STAGES = [
  { threshold: 0, text: "正在连接 AI 服务..." },
  { threshold: 15, text: "正在分析文案结构..." },
  { threshold: 35, text: "正在生成专家改写版..." },
  { threshold: 55, text: "正在提炼爆款标题..." },
  { threshold: 70, text: "正在制定行动清单..." },
  { threshold: 85, text: "正在逐句拆解分析..." },
  { threshold: 95, text: "即将完成，请稍候..." },
];

function getLoadingStage(progress) {
  for (let i = LOADING_STAGES.length - 1; i >= 0; i--) {
    if (progress >= LOADING_STAGES[i].threshold) {
      return LOADING_STAGES[i].text;
    }
  }
  return LOADING_STAGES[0].text;
}

export default function InputPage({ onResult }) {
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = Math.random() * 3 + 4;
        const next = prev + increment;
        return next >= 95 ? 95 : next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [loading]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.analyze({ sourceText });
      setProgress(100);
      setTimeout(() => {
        saveAnalysisHistory(result, sourceText);
        onResult(result);
        setSourceText("");
        setLoading(false);
      }, 500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleSelectHistory(result) {
    onResult(result);
  }

  const stageText = getLoadingStage(progress);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">🌸 输入素材文本</h2>
            <p className="mt-1 text-sm text-neutral-400">
              受众：{verticalProfile.audience}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="rounded-xl border border-violet-400/30 bg-violet-900/30 px-3 py-1.5 text-sm text-violet-300 backdrop-blur-sm transition-all hover:bg-violet-800/40 hover:ring-1 hover:ring-violet-500/20"
          >
            📜 历史
          </button>
        </div>

        <label className="block text-sm text-neutral-300" htmlFor="source-text">
          素材内容
        </label>
        <textarea
          id="source-text"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          className="h-48 w-full rounded-2xl border border-white/5 bg-neutral-900/70 p-3 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 backdrop-blur-md"
          placeholder={`粘贴脚本（${verticalProfile.constraints.minChars}-${verticalProfile.constraints.maxChars} 字）`}
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl border border-violet-400/30 bg-violet-600/80 px-4 py-2 text-white backdrop-blur-sm shadow-lg shadow-violet-900/20 transition-all hover:scale-105 hover:bg-violet-500/90 hover:ring-2 hover:ring-violet-300/20 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "分析中..." : "✨ 开始分析"}
        </button>

        {loading && <LoadingProgress progress={progress} stageText={stageText} />}
      </form>

      <div className="mt-6">
        <VideoParser />
      </div>

      <HistoryList
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectHistory={handleSelectHistory}
      />
    </>
  );
}
