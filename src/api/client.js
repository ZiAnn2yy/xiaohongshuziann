const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const token = localStorage.getItem("crl_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Request failed");
  }
  return response.json();
}

export const apiClient = {
  login(payload) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  analyze(payload) {
    return request("/api/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  history() {
    return request("/api/history");
  },
  usage() {
    return request("/api/usage");
  },
};
