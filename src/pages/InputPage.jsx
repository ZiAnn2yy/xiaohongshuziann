import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { verticalProfile } from "../config/vertical";
import { saveAnalysisHistory } from "../utils/localStorage";
import LoadingProgress from "../components/LoadingProgress";
import HistoryList from "../components/HistoryList";

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

function TextAnalysisPanel({ onResult }) {
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

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

  const stageText = getLoadingStage(progress);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-violet-300">🌸 输入素材文本</h3>
        <p className="mt-1 text-sm text-neutral-400">
          受众：{verticalProfile.audience}
        </p>
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
        disabled={loading}
      />

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-violet-600/80 px-4 py-3 text-white font-medium backdrop-blur-sm transition-all hover:scale-105 hover:bg-violet-500/90 hover:ring-2 hover:ring-violet-300/20 disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? "分析中..." : "✨ 开始分析"}
      </button>

      {loading && <LoadingProgress progress={progress} stageText={stageText} />}
    </form>
  );
}

function VideoParserPanel() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("");

  async function handleParse(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setVideoUrl("");
    setVideoType("");

    try {
      const result = await apiClient.parseVideo({ url });
      if (result.success) {
        setVideoUrl(result.video_url);
        setVideoType(result.type || "mp4");
      } else {
        setError(result.error || "解析失败");
      }
    } catch (err) {
      setError(err.message || "请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `xhs_video_${Date.now()}.${videoType === "m3u8" ? "m3u8" : "mp4"}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-fuchsia-300">🎬 视频解析</h3>
        <p className="mt-1 text-sm text-neutral-400">
          输入小红书视频链接，提取无水印原视频
        </p>
      </div>

      <form onSubmit={handleParse} className="space-y-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://xhslink.com/o/xxxxxx 或 https://www.xiaohongshu.com/explore/xxxxxx"
          className="w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          disabled={loading}
        />

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full rounded-xl bg-fuchsia-600/80 px-4 py-3 text-white font-medium backdrop-blur-sm transition-all hover:scale-105 hover:bg-fuchsia-500/90 hover:ring-2 hover:ring-fuchsia-300/20 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "解析中..." : "🔍 解析视频"}
        </button>
      </form>

      {videoUrl && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span>📁 格式: {videoType?.toUpperCase()}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
            <video
              controls
              src={videoUrl}
              className="w-full rounded-xl"
              style={{ maxHeight: "300px" }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>

          <button
            onClick={handleDownload}
            className="w-full rounded-xl border border-fuchsia-400/30 bg-fuchsia-600/80 px-4 py-3 text-white font-medium backdrop-blur-sm transition-all hover:scale-105 hover:bg-fuchsia-500/90 hover:ring-2 hover:ring-fuchsia-300/20"
          >
            ⬇️ 下载无水印视频
          </button>
        </div>
      )}
    </div>
  );
}

export default function InputPage({ onResult }) {
  const [activeTab, setActiveTab] = useState("text");
  const [showHistory, setShowHistory] = useState(false);

  function handleSelectHistory(result) {
    onResult(result);
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-violet-300 flex items-center gap-2">
            ♥️ 内容逆向实验室 · 大学生活
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            输入一段脚本，快速得到结构化分析结果。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="rounded-xl border border-violet-400/30 bg-violet-900/30 px-4 py-2 text-sm text-violet-300 backdrop-blur-sm transition-all hover:bg-violet-800/40 hover:ring-1 hover:ring-violet-500/20"
        >
          📜 历史
        </button>
      </header>

      <div className="flex flex-col gap-4 md:flex-row">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 rounded-2xl border p-4 text-left backdrop-blur-md transition-all ${
            activeTab === "text"
              ? "border-violet-400/50 bg-violet-900/30 ring-2 ring-violet-500/30"
              : "border-white/5 bg-neutral-900/70 hover:border-violet-400/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <div>
              <h2 className="text-lg font-semibold text-violet-300">脚本文案分析</h2>
              <p className="text-sm text-neutral-400">AI 深度分析脚本结构</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex-1 rounded-2xl border p-4 text-left backdrop-blur-md transition-all ${
            activeTab === "video"
              ? "border-fuchsia-400/50 bg-fuchsia-900/30 ring-2 ring-fuchsia-500/30"
              : "border-white/5 bg-neutral-900/70 hover:border-fuchsia-400/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <div>
              <h2 className="text-lg font-semibold text-fuchsia-300">视频解析</h2>
              <p className="text-sm text-neutral-400">提取无水印原视频</p>
            </div>
          </div>
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-neutral-900/70 p-5 backdrop-blur-md">
        {activeTab === "text" ? (
          <TextAnalysisPanel onResult={onResult} />
        ) : (
          <VideoParserPanel />
        )}
      </div>

      <HistoryList
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectHistory={handleSelectHistory}
      />
    </>
  );
}
