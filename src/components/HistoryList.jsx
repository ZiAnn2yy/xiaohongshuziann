import { useState, useEffect } from "react";
import { getAnalysisHistory, clearAnalysisHistory } from "../utils/localStorage";

export default function HistoryList({ isOpen, onClose, onSelectHistory }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getAnalysisHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (record) => {
    if (record.result) {
      onSelectHistory(record.result);
      onClose();
    }
  };

  const handleClear = () => {
    clearAnalysisHistory();
    setHistory([]);
  };

  const getScoreColor = (score) => {
    if (score <= 3) return "text-rose-400";
    if (score <= 6) return "text-amber-400";
    return "text-violet-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-2xl shadow-violet-900/20 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-violet-300">📜 历史记录</h3>
          <div className="flex gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-xl border border-rose-400/30 bg-rose-900/30 px-3 py-1 text-xs text-rose-300 transition-all hover:bg-rose-800/40"
              >
                清空
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-600/50 bg-neutral-800/50 px-3 py-1 text-xs text-neutral-300 transition-all hover:bg-neutral-700/50"
            >
              关闭
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            <p className="text-sm">暂无历史记录</p>
            <p className="mt-1 text-xs">分析完成后会自动保存</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {history.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(record)}
                  className="w-full rounded-xl border border-white/5 bg-neutral-800/50 p-3 text-left transition-all hover:bg-neutral-700/50 hover:border-violet-500/30 hover:ring-1 hover:ring-violet-500/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">{record.timestamp}</span>
                    <span className={`text-sm font-bold ${getScoreColor(record.score)}`}>
                      {record.score}分
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-200 line-clamp-1">
                    {record.inputPreview || "无输入预览"}
                  </p>
                  {record.fullRewritePreview && (
                    <p className="mt-1 text-xs text-neutral-500 line-clamp-1">
                      💡 {record.fullRewritePreview}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-neutral-600 text-center">
          最多保留最近 5 条记录
        </p>
      </div>
    </div>
  );
}
