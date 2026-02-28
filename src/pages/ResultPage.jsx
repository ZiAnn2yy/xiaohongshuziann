import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ResultPanel from "../components/ResultPanel";
import HistoryList from "../components/HistoryList";

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/80 text-white text-lg backdrop-blur-sm shadow-lg shadow-violet-900/20 transition-all hover:scale-110 hover:bg-violet-500/90 hover:ring-2 hover:ring-violet-300/20 z-50"
      aria-label="回到顶部"
    >
      ↑
    </button>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result;
  const [showHistory, setShowHistory] = useState(false);

  function handleSelectHistory(historyResult) {
    navigate("/result", { state: { result: historyResult }, replace: true });
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 px-4 py-8 text-neutral-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="hero-bg relative overflow-hidden flex items-center justify-between rounded-2xl border border-white/5 bg-neutral-900/70 p-6 backdrop-blur-md brightness-[1.03] contrast-[1.08] saturate-[1.15] before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-transparent before:to-black/20 before:pointer-events-none">
            <h1 className="hero-title relative z-10 text-2xl font-semibold">💕 内容逆向实验室 · 大学生活</h1>
            <div className="relative z-10 flex gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="rounded-2xl border border-violet-400/30 bg-violet-900/30 px-4 py-2 text-sm text-violet-300 backdrop-blur-sm transition-all hover:bg-violet-800/40 hover:ring-1 hover:ring-violet-500/20"
              >
                📜 历史
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-2xl border border-violet-400/30 bg-violet-600/80 px-4 py-2 text-sm text-white backdrop-blur-sm shadow-lg shadow-violet-900/20 transition-all hover:scale-105 hover:bg-violet-500/90 hover:ring-2 hover:ring-violet-300/20"
              >
                返回输入
              </button>
            </div>
          </header>
          <div className="rounded-2xl border border-white/5 bg-neutral-900/70 p-8 text-center text-neutral-400 backdrop-blur-md">
            <p>暂无分析结果，请先提交脚本进行分析。</p>
          </div>
        </div>
        <HistoryList
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          onSelectHistory={handleSelectHistory}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 px-4 py-8 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="hero-bg relative overflow-hidden flex items-center justify-between rounded-2xl border border-white/5 bg-neutral-900/70 p-6 backdrop-blur-md brightness-[1.03] contrast-[1.08] saturate-[1.15] before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-transparent before:to-black/20 before:pointer-events-none">
          <h1 className="hero-title relative z-10 text-2xl font-semibold">💕 内容逆向实验室 · 大学生活</h1>
          <div className="relative z-10 flex gap-2">
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="rounded-2xl border border-violet-400/30 bg-violet-900/30 px-4 py-2 text-sm text-violet-300 backdrop-blur-sm transition-all hover:bg-violet-800/40 hover:ring-1 hover:ring-violet-500/20"
            >
              📜 历史
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-2xl border border-violet-400/30 bg-violet-600/80 px-4 py-2 text-sm text-white backdrop-blur-sm shadow-lg shadow-violet-900/20 transition-all hover:scale-105 hover:bg-violet-500/90 hover:ring-2 hover:ring-violet-300/20"
            >
              返回输入
            </button>
          </div>
        </header>

        <ResultPanel result={result} />
      </div>
      <BackToTopButton />
      <HistoryList
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectHistory={handleSelectHistory}
      />
    </main>
  );
}
