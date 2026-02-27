export default function LoadingProgress({ progress }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-violet-500/30 bg-violet-950/30 p-4 backdrop-blur-sm">
        <p className="text-sm text-violet-300">
          AI正在深度拆解你的笔记... 预计15-30秒（越长越准）
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-neutral-400">{Math.floor(progress)}%</p>
      </div>
    </div>
  );
}
