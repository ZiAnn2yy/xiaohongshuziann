import { useState, useRef, useCallback } from "react";

const SUPPORTED_FORMATS = ["mp3", "wav", "m4a", "mp4", "webm", "ogg", "flac", "aac"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
  
  const fileInputRef = useRef(null);
  const transcriberRef = useRef(null);

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

  const loadModel = async () => {
    if (modelLoaded || transcriberRef.current) return;

    setIsModelLoading(true);
    setProgress(0);
    setProgressText("正在加载 Whisper 模型...");

    try {
      const { pipeline } = await import("@xenova/transformers");
      
      transcriberRef.current = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-small",
        {
          quantized: true,
          progress_callback: (info) => {
            if (info.status === "downloading") {
              const percent = info.progress || 0;
              setProgress(Math.round(percent));
              setProgressText(`下载模型中... ${Math.round(percent)}%`);
            } else if (info.status === "loading") {
              setProgressText("加载模型到内存...");
            }
          },
        }
      );

      setModelLoaded(true);
      setProgress(100);
      setProgressText("模型加载完成！");
    } catch (err) {
      console.error("Model load error:", err);
      setError(`模型加载失败: ${err.message}`);
    } finally {
      setIsModelLoading(false);
    }
  };

  const transcribe = async () => {
    if (!file || !transcriberRef.current) {
      if (!modelLoaded) {
        await loadModel();
      }
      if (!transcriberRef.current) return;
    }

    setIsTranscribing(true);
    setProgress(0);
    setProgressText("正在转录音频...");
    setError("");
    setTranscript("");

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const audioData = audioBuffer.getChannelData(0);
      
      setProgressText("正在转录音频...");

      const result = await transcriberRef.current(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: "zh",
        task: "transcribe",
        return_timestamps: true,
        callback_function: (x) => {
          if (x.chunks) {
            const text = x.chunks
              .map((chunk) => `[${formatTimestamp(chunk.timestamp[0])}] ${chunk.text}`)
              .join("\n");
            setTranscript(text);
          }
        },
      });

      if (result.chunks) {
        const formattedText = result.chunks
          .map((chunk) => `[${formatTimestamp(chunk.timestamp[0])}] ${chunk.text}`)
          .join("\n");
        setTranscript(formattedText);
      } else if (result.text) {
        setTranscript(result.text);
      }

      setProgress(100);
      setProgressText("转录完成！");
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
      setProgressText("已复制到剪贴板！");
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
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-teal-300">🎙️ 语音转脚本</h3>
        <p className="mt-1 text-sm text-neutral-400">
          上传音频/视频文件，本地 AI 转录为带时间戳的脚本
        </p>
      </div>

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
              <span className="text-lg">
                {file.type.startsWith("video") ? "🎬" : "🎵"}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-200">{file.name}</p>
                <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-sm text-neutral-400 hover:text-rose-400"
            >
              ✕ 清除
            </button>
          </div>

          {mediaUrl && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {file.type.startsWith("video") ? (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full"
                  style={{ maxHeight: "200px" }}
                />
              ) : (
                <audio src={mediaUrl} controls className="w-full" />
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </p>
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

      <p className="text-xs text-neutral-500">
        💡 首次使用需下载 Whisper 模型（约 150MB），模型会缓存到浏览器本地。
        所有处理均在浏览器端完成，不上传服务器。
      </p>
    </div>
  );
}
