import logging
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .analyzer import AnalyzerService
from .deepseek_client import DeepSeekClient
from .models import AnalysisRequest, LoginRequest

# 从项目根目录加载 .env
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.main")


app = FastAPI(title="Content Reverse Lab API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

deepseek_client = DeepSeekClient()
analyzer_service = AnalyzerService(deepseek_client)


@app.get("/api/health")
async def health() -> dict[str, str]:
    status = {"status": "ok"}
    status["deepseek"] = "configured" if deepseek_client.enabled else "not_configured"
    return status


@app.post("/api/auth/login")
async def login(payload: LoginRequest) -> dict[str, str]:
    token = f"local-dev-token::{payload.username}"
    return {"token": token}


@app.post("/api/analyze")
async def analyze(payload: AnalysisRequest) -> dict[str, Any]:
    data = payload.model_dump()
    char_count = len(data.get("sourceText", ""))
    logger.info("analyze_request charCount=%s", char_count)
    return await analyzer_service.analyze(data)


@app.get("/api/history")
async def history() -> dict[str, list[Any]]:
    return {"items": []}


@app.get("/api/usage")
async def usage() -> dict[str, int]:
    return {"todayCalls": 0, "remainingQuota": 100}
