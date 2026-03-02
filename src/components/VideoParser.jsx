import { useState } from "react";
import { apiClient } from "../api/client";

export default function VideoParser() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  async function handleParse(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setVideoUrl("");

    try {
      const result = await apiClient.parseVideo({ url });
      if (result.success) {
        setVideoUrl(result.video_url);
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
    link.download = `xiaohongshu_video_${Date.now()}.mp4`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="rounded-2xl border border-teal-400/30 bg-teal-900/20 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">🎬</span>
        <h3 className="text-lg font-semibold text-teal-200">视频解析</h3>
      </div>

      <p className="mb-3 text-sm text-neutral-400">
        输入小红书视频链接，提取无水印原视频
      </p>

      <form onSubmit={handleParse} className="space-y-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.xiaohongshu.com/explore/xxxxxx"
          className="w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          className="w-full rounded-xl border border-teal-400/30 bg-teal-600/80 px-4 py-2 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-teal-500/90 hover:ring-2 hover:ring-teal-300/20 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "解析中..." : "🔍 解析视频"}
        </button>
      </form>

      {videoUrl && (
        <div className="mt-4 space-y-3">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
            <video
              controls
              src={videoUrl}
              className="w-full"
              style={{ maxHeight: "300px" }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>

          <button
            onClick={handleDownload}
            className="w-full rounded-xl border border-fuchsia-400/30 bg-fuchsia-600/80 px-4 py-2 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-fuchsia-500/90 hover:ring-2 hover:ring-fuchsia-300/20"
          >
            ⬇️ 下载无水印视频
          </button>
        </div>
      )}
    </div>
  );
}
