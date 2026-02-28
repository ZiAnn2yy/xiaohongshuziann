const STORAGE_KEY = "xiaohongshu_analysis_history";
const MAX_HISTORY = 5;

export function saveAnalysisHistory(result, sourceText) {
  if (!result) return;

  const history = getAnalysisHistory();
  
  const timestamp = new Date();
  const formattedTime = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")} ${String(timestamp.getHours()).padStart(2, "0")}:${String(timestamp.getMinutes()).padStart(2, "0")}`;
  
  const inputPreview = sourceText && sourceText.length > 30 
    ? sourceText.substring(0, 30) + "..." 
    : sourceText || "";
  
  const score = result?.analysisResult?.overallScore || 0;
  
  const fullRewrite = result?.analysisResult?.fullRewrite || "";
  const fullRewritePreview = fullRewrite.length > 50 
    ? fullRewrite.substring(0, 50) + "..." 
    : fullRewrite;
  
  const newRecord = {
    id: Date.now().toString(),
    timestamp: formattedTime,
    inputPreview,
    score,
    fullRewritePreview,
    result,
    sourceText
  };
  
  const updatedHistory = [newRecord, ...history.filter(h => h.id !== newRecord.id)].slice(0, MAX_HISTORY);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
  
  return newRecord;
}

export function getAnalysisHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read history:", e);
    return [];
  }
}

export function getAnalysisById(id) {
  const history = getAnalysisHistory();
  return history.find(h => h.id === id) || null;
}

export function clearAnalysisHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear history:", e);
  }
}
