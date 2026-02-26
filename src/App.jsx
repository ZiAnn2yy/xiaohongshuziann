import { Routes, Route, useNavigate } from "react-router-dom";
import InputPage from "./pages/InputPage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  const navigate = useNavigate();

  function handleResult(result) {
    navigate("/result", { state: { result } });
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <h1 className="text-2xl font-semibold">内容逆向实验室 · 大学生活</h1>
                <p className="mt-2 text-sm text-slate-400">
                  输入一段脚本，快速得到结构化分析结果。
                </p>
              </header>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <InputPage onResult={handleResult} />
              </div>
            </div>
          </main>
        }
      />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
