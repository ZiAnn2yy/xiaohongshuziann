export default function LoadingProgress({ progress, stageText }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
          <p className="text-sm text-violet-300">{stageText || "AI正在分析..."}</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-pink-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
          <span>预计 15-30 秒</span>
          <span>{Math.floor(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
