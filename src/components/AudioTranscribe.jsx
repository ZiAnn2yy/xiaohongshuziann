import { useState, useRef, useCallback } from "react";

const SUPPORTED_FORMATS = ["mp3", "wav", "m4a", "mp4", "webm", "ogg", "flac", "aac"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const MODEL_OPTIONS = [
  { id: "tiny", name: "Tiny (~75MB)", model: "Xenova/whisper-tiny", size: 75 },
  { id: "small", name: "Small (~250MB)", model: "Xenova/whisper-small", size: 250 },
  { id: "medium", name: "Medium (~750MB)", model: "Xenova/whisper-medium", size: 750 },
];

function formatTimestamp(seconds) {
  if (!seconds || !isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function isNetworkError(error) {
  const msg = error?.message?.toLowerCase() || "";
  return (
    msg.includes("unexpected token") ||
    msg.includes("<!doctype") ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("cors") ||
    msg.includes("timeout")
  );
}

export default function AudioTranscribe() {
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [selectedModel, setSelectedModel] = useState("tiny");
  const [showModelSelector, setShowModelSelector] = useState(false);

  const fileInputRef = useRef(null);
  const transcriberRef = useRef(null);
  const currentModelRef = useRef(null);

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !SUPPORTED_FORMATS.includes(ext)) {
      setError(`不支持的文件格式。支持: ${SUPPORTED_FORMATS.join(", ")}`);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`文件太大（最大 ${formatFileSize(MAX_FILE_SIZE)}）`);
      return;
    }

    setError("");
    setFile(selectedFile);
    setTranscript("");

    const url = URL.createObjectURL(selectedFile);
    setMediaUrl(url);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    handleFileSelect(selectedFile);
  }, [handleFileSelect]);

  const clearCache = async () => {
    try {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      transcriberRef.current = null;
      currentModelRef.current = null;
      setModelLoaded(false);
      setProgress(0);
      setProgressText("");
      setError("");
      alert("缓存已清除！请刷新页面后重试。");
    } catch (err) {
      console.error("Clear cache error:", err);
      setError("清除缓存失败: " + err.message);
    }
  };

  const loadModel = async (modelId) => {
    if (modelLoaded && currentModelRef.current === modelId && transcriberRef.current) {
      return true;
    }

    setIsModelLoading(true);
    setProgress(0);
    setError("");

    const modelConfig = MODEL_OPTIONS.find((m) => m.id === modelId) || MODEL_OPTIONS[0];

    setProgressText(`正在加载 Whisper ${modelConfig.name} 模型...`);

    try {
      const { pipeline, env } = await import("@xenova/transformers");

      env.allowLocalModels = true;
      env.localModelPath = "/models/";

      const modelName = modelConfig.model;

      transcriberRef.current = await pipeline("automatic-speech-recognition", modelName, {
        quantized: true,
        progress_callback: (info) => {
          if (info.status === "downloading") {
            const percent = info.progress || 0;
            setProgress(Math.round(percent));
            setProgressText(`下载模型中... ${Math.round(percent)}% (${modelConfig.size}MB)`);
          } else if (info.status === "loading") {
            setProgressText("加载模型到内存...");
            setProgress(90);
          } else if (info.status === "ready") {
            setProgress(100);
            setProgressText("模型加载完成！");
          }
        },
      });

      currentModelRef.current = modelId;
      setModelLoaded(true);
      setProgress(100);
      setProgressText(`✓ ${modelConfig.name} 模型已就绪`);
      return true;
    } catch (err) {
      console.error("Model load error:", err);

      let errorMsg = err.message;

      if (isNetworkError(err)) {
        errorMsg =
          "⚠️ 网络受限，无法连接 Hugging Face 模型服务器。\n\n请尝试：\n1. 检查 VPN 是否连接\n2. 切换到更小的模型（Tiny）\n3. 点击「清缓存重试」";
      } else if (err.message?.includes("<!doctype")) {
        errorMsg = "⚠️ 模型下载被重定向，可能是网络问题。请检查 VPN 连接。";
      }

      setError(errorMsg);
      return false;
    } finally {
      setIsModelLoading(false);
    }
  };

  const transcribe = async () => {
    if (!file) return;

    if (!modelLoaded || !transcriberRef.current || currentModelRef.current !== selectedModel) {
      const success = await loadModel(selectedModel);
      if (!success) return;
    }

    if (!transcriberRef.current) {
      setError("模型未加载，请重试");
      return;
    }

    setIsTranscribing(true);
    setProgress(0);
    setProgressText("正在解码音频...");
    setError("");
    setTranscript("");

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      const arrayBuffer = await file.arrayBuffer();
      setProgressText("正在解码音频文件...");

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      setProgress(30);
      setProgressText("正在转录音频（这可能需要几分钟）...");

      const result = await transcriberRef.current(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: "zh",
        task: "transcribe",
        return_timestamps: true,
      });

      setProgress(90);
      setProgressText("正在格式化结果...");

      if (result.chunks && result.chunks.length > 0) {
        const formattedText = result.chunks
          .map((chunk) => {
            const ts = chunk.timestamp?.[0] ?? 0;
            return `[${formatTimestamp(ts)}] ${chunk.text?.trim() || ""}`;
          })
          .filter((line) => line.includes("] ") && line.split("] ")[1])
          .join("\n");
        setTranscript(formattedText);
      } else if (result.text) {
        setTranscript(result.text);
      }

      setProgress(100);
      setProgressText("✓ 转录完成！");
    } catch (err) {
      console.error("Transcription error:", err);
      setError(`转录失败: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setProgressText("✓ 已复制到剪贴板！");
      setTimeout(() => setProgressText(""), 2000);
    } catch (err) {
      setError("复制失败");
    }
  };

  const clearFile = () => {
    setFile(null);
    setMediaUrl("");
    setTranscript("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = isModelLoading || isTranscribing;

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-teal-300">🎙️ 语音转脚本</h3>
          <p className="mt-1 text-sm text-neutral-400">
            上传音频/视频文件，本地 AI 转录为带时间戳的脚本
          </p>
        </div>
        <button
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-700"
        >
          模型: {MODEL_OPTIONS.find((m) => m.id === selectedModel)?.name}
        </button>
      </div>

      {showModelSelector && (
        <div className="rounded-xl border border-teal-400/30 bg-teal-900/20 p-3">
          <p className="mb-2 text-xs text-neutral-400">选择模型大小（越小越快，越大越准）：</p>
          <div className="flex gap-2">
            {MODEL_OPTIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedModel(m.id);
                  setShowModelSelector(false);
                  if (modelLoaded) {
                    setModelLoaded(false);
                    transcriberRef.current = null;
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                  selectedModel === m.id
                    ? "bg-teal-600 text-white"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-neutral-900/50 p-8 transition-all hover:border-teal-400/50"
        >
          <div className="mb-3 text-4xl">📁</div>
          <p className="mb-2 text-sm text-neutral-300">拖拽文件到这里，或点击选择</p>
          <p className="mb-4 text-xs text-neutral-500">
            支持: {SUPPORTED_FORMATS.join(", ")}（最大 {formatFileSize(MAX_FILE_SIZE)}）
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_FORMATS.map((f) => `.${f}`).join(",")}
            onChange={handleInputChange}
            className="hidden"
            id="audio-file-input"
          />
          <label
            htmlFor="audio-file-input"
            className="cursor-pointer rounded-xl bg-teal-600/80 px-6 py-2 text-sm text-white transition-all hover:scale-105 hover:bg-teal-500/90"
          >
            选择文件
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-neutral-800/50 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{file.type.startsWith("video") ? "🎬" : "🎵"}</span>
              <div>
                <p className="text-sm font-medium text-neutral-200">{file.name}</p>
                <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button onClick={clearFile} className="text-sm text-neutral-400 hover:text-rose-400">
              ✕ 清除
            </button>
          </div>

          {mediaUrl && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {file.type.startsWith("video") ? (
                <video src={mediaUrl} controls className="w-full" style={{ maxHeight: "200px" }} />
              ) : (
                <audio src={mediaUrl} controls className="w-full" />
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-900/20 p-3">
          <p className="whitespace-pre-line text-sm text-rose-400">{error}</p>
          {(isNetworkError({ message: error }) || error.includes("网络")) && (
            <button
              onClick={clearCache}
              className="mt-2 rounded-lg bg-rose-600/50 px-3 py-1 text-xs text-white hover:bg-rose-500/50"
            >
              🗑️ 清缓存重试
            </button>
          )}
        </div>
      )}

      {(isLoading || progressText) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">{progressText}</span>
            <span className="text-teal-400">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={transcribe}
          disabled={!file || isLoading}
          className="flex-1 rounded-xl bg-teal-600/80 px-4 py-3 text-white font-medium backdrop-blur-sm transition-all hover:scale-105 hover:bg-teal-500/90 hover:ring-2 hover:ring-teal-300/20 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isModelLoading
            ? "加载模型中..."
            : isTranscribing
            ? "转录中..."
            : modelLoaded
            ? "🎙️ 开始转写"
            : "⬇️ 加载模型并转写"}
        </button>
        {modelLoaded && (
          <button
            onClick={clearCache}
            className="rounded-xl border border-neutral-600 px-4 py-3 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"
            title="清除模型缓存"
          >
            🗑️
          </button>
        )}
      </div>

      {transcript && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">转录结果</span>
            <button
              onClick={copyToClipboard}
              className="rounded-lg bg-neutral-800 px-3 py-1 text-sm text-neutral-300 transition-all hover:bg-neutral-700"
            >
              📋 复制全文
            </button>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="h-64 w-full rounded-xl border border-white/10 bg-neutral-900/70 p-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="转录结果将显示在这里..."
          />
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-3">
        <p className="text-xs text-neutral-500">
          💡 <strong>使用提示：</strong>
        </p>
        <ul className="mt-1 space-y-1 text-xs text-neutral-500">
          <li>• 首次使用需下载 Whisper 模型（Tiny 约 75MB）</li>
          <li>• 模型会缓存到浏览器本地，下次无需重新下载</li>
          <li>• 所有处理均在浏览器端完成，不上传服务器</li>
          <li>• 如遇网络错误，请检查 VPN 是否连接 Hugging Face</li>
        </ul>
      </div>
    </div>
  );
}
