"""
脚本分析服务

核心逻辑：调用 DeepSeek API 分析脚本，返回结构化结果。
"""

import json
import logging
import re
from typing import Any

from .deepseek_client import DeepSeekClient
from .prompts import SYSTEM_PROMPT_UNIVERSITY, build_user_prompt_university

logger = logging.getLogger("backend.analyzer")


def _split_into_sentences(text: str) -> list[str]:
    """将文本按句号、问号、感叹号等分割成句子列表"""
    if not text or not text.strip():
        return []
    parts = re.split(r"(?<=[。！？；\n])", text.strip())
    sentences = [s.strip() for s in parts if s.strip()]
    if not sentences:
        sentences = [s.strip() for s in text.strip().split("\n") if s.strip()]
    return sentences


class AnalyzerService:
    """分析服务：调用 DeepSeek API 分析脚本"""

    def __init__(self, client: DeepSeekClient) -> None:
        self.client = client

    async def analyze(self, payload: dict[str, str]) -> dict[str, Any]:
        """分析脚本，返回结构化结果"""
        if not self.client.enabled:
            logger.warning("DeepSeek not configured, returning fallback")
            return self._build_fallback(payload, reason="deepseek_not_configured")

        messages = self._build_messages(payload)
        try:
            response = await self.client.chat_completion(
                messages,
                response_format={"type": "json_object"},
                timeout_override=120,
            )
            content = self._extract_content(response)
            logger.info("deepseek_raw_content=%s", content[:500] if content else "empty")
            
            parsed = self._parse_json_content(content)
            logger.info("deepseek_response_keys=%s", list(parsed.keys()) if parsed else "empty")
            
            if not parsed:
                logger.warning("DeepSeek returned empty/unparseable content")
                return self._build_fallback(payload, reason="deepseek_unparseable_response")

            return self._build_success_response(parsed)
        except Exception as exc:
            logger.exception("analyze failed: %s", exc)
            return self._build_fallback(payload, reason="deepseek_request_failed")

    def _build_messages(self, payload: dict[str, str]) -> list[dict[str, str]]:
        """构建发送给 DeepSeek 的消息列表"""
        user_prompt = build_user_prompt_university(payload["sourceText"])
        return [
            {"role": "system", "content": SYSTEM_PROMPT_UNIVERSITY},
            {"role": "user", "content": user_prompt},
        ]

    def _extract_content(self, response: dict[str, Any]) -> str:
        """从 DeepSeek 响应中提取内容"""
        return response.get("choices", [{}])[0].get("message", {}).get("content", "")

    def _parse_json_content(self, content: str) -> dict[str, Any]:
        """解析 JSON 内容，支持从文本中提取 JSON"""
        if not content:
            return {}
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return {}
            try:
                return json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                return {}

    def _normalize_keys(self, data: dict[str, Any]) -> dict[str, Any]:
        """标准化字段名（处理中英文混用情况）"""
        KEY_MAP = {
            "sentence_analysis": "sentenceAnalysis",
            "sentences": "sentenceAnalysis",
            "逐句分析": "sentenceAnalysis",
            "逐句拆解": "sentenceAnalysis",
            "hook_diagnosis": "hookDiagnosis",
            "钩子诊断": "hookDiagnosis",
            "slide_away_points": "slideAwayPoints",
            "滑走点": "slideAwayPoints",
            "emotion_curve": "emotionCurve",
            "情绪曲线": "emotionCurve",
            "analysis_result": "analysisResult",
            "分析结果": "analysisResult",
        }
        normalized = {}
        for key, value in data.items():
            normalized[KEY_MAP.get(key, key)] = value
        return normalized

    def _build_success_response(self, parsed: dict[str, Any]) -> dict[str, Any]:
        """构建成功响应"""
        normalized = self._normalize_keys(parsed)
        normalized["_meta"] = {
            "analysisSource": "deepseek",
            "isFallback": False,
            "reason": "",
        }
        return normalized

    def _build_fallback(self, payload: dict[str, str], reason: str) -> dict[str, Any]:
        """构建兜底响应（当 DeepSeek 不可用时）"""
        text = payload["sourceText"].strip()
        sentences = _split_into_sentences(text)
        if not sentences:
            sentences = [text]

        sentence_analysis = self._build_fallback_sentences(sentences)
        reason_text_map = {
            "deepseek_not_configured": "未检测到 DEEPSEEK_API_KEY 环境变量",
            "deepseek_unparseable_response": "DeepSeek 返回内容无法解析为 JSON",
            "deepseek_request_failed": "DeepSeek 请求失败或超时",
        }

        return {
            "_meta": {
                "analysisSource": "fallback",
                "isFallback": True,
                "reason": reason,
                "reasonText": reason_text_map.get(reason, "未知原因"),
            },
            "sentenceAnalysis": sentence_analysis,
            "hookDiagnosis": {
                "strength": "中",
                "reason": "兜底分析：未获得 DeepSeek 实时分析。",
                "improvedHook": "请配置 DeepSeek API 后重新分析。",
            },
            "slideAwayPoints": [],
            "emotionCurve": {
                "peak": "兜底分析无法识别",
                "valley": "兜底分析无法识别",
                "overallTrend": "未知",
            },
            "summary": {
                "whyWorks": "兜底分析：未获得 DeepSeek 实时分析。",
                "mainIssue": "兜底分析只按句子顺序粗分角色。",
                "oneLineAdvice": "请检查 DeepSeek 配置。",
            },
            "analysisResult": {
                "overallScore": 1,
                "criticalIssues": [
                    "DeepSeek API 未配置或请求失败",
                    "无法获取实时分析结果",
                    "请检查 DEEPSEEK_API_KEY 环境变量"
                ],
                "fullRewrite": "请配置 DeepSeek API 后重新分析，获取完整改写建议。",
                "newTitles": [
                    "请配置 API 获取标题建议",
                    "请配置 API 获取标题建议",
                    "请配置 API 获取标题建议"
                ],
                "actionPlan": [
                    "第1步：检查 .env 文件中的 DEEPSEEK_API_KEY",
                    "第2步：确认 API Key 是否有效",
                    "第3步：重新提交分析请求"
                ]
            },
        }

    def _build_fallback_sentences(self, sentences: list[str]) -> list[dict[str, Any]]:
        """构建兜底的逐句分析"""
        result = []
        for i, s in enumerate(sentences):
            if i == 0:
                role, analysis = "开场", "开场句，制造好奇或情绪冲击。"
            elif i == len(sentences) - 1:
                role, analysis = "金句", "收尾金句，总结观点。"
            else:
                role, analysis = "兑现", "提供具体信息或方法。"
            result.append({
                "sentence": s,
                "role": role,
                "analysis": analysis,
                "riskScore": 0,
                "rewriteDemo": None,
            })
        return result
