import { useNavigate, useLocation } from "react-router-dom";
import ResultPanel from "../components/ResultPanel";

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result;

  if (!result) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h1 className="text-2xl font-semibold">内容逆向实验室 · 大学生活</h1>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
            >
              返回输入
            </button>
          </header>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">
            <p>暂无分析结果，请先提交脚本进行分析。</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h1 className="text-2xl font-semibold">内容逆向实验室 · 大学生活</h1>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            返回输入
          </button>
        </header>

        <ResultPanel result={result} />
      </div>
    </main>
  );
}
