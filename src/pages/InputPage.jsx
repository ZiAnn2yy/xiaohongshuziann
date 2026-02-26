import { useState } from "react";
import { apiClient } from "../api/client";
import { verticalProfile } from "../config/vertical";

export default function InputPage({ onResult }) {
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.analyze({ sourceText });
      onResult(result);
      setSourceText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">输入素材文本</h2>
        <p className="mt-1 text-sm text-slate-400">
          受众：{verticalProfile.audience}
        </p>
      </div>

      <label className="block text-sm text-slate-300" htmlFor="source-text">
        素材内容
      </label>
      <textarea
        id="source-text"
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        className="h-48 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={`粘贴脚本（${verticalProfile.constraints.minChars}-${verticalProfile.constraints.maxChars} 字）`}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "分析中..." : "开始分析"}
      </button>
    </form>
  );
}
