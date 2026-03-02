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
          <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 px-4 py-8 text-neutral-100">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              <InputPage onResult={handleResult} />
            </div>
          </main>
        }
      />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
