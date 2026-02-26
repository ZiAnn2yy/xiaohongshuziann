"""
脚本分析服务

理论框架来源：content-growth-knowledge-base skill
API 调用规范：deepseek-api-dev skill
"""

import json
import logging
import re
from typing import Any

from .deepseek_client import DeepSeekClient

logger = logging.getLogger("backend.analyzer")


def _split_into_sentences(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    parts = re.split(r"(?<=[。！？；\n])", text.strip())
    sentences = [s.strip() for s in parts if s.strip()]
    if not sentences:
        sentences = [s.strip() for s in text.strip().split("\n") if s.strip()]
    return sentences


SYSTEM_PROMPT = """你是一名短视频爆款内容拆解专家。

你的分析基于「开场-冲突-转折-兑现」四段叙事结构（《脚本思维》），
结合 U&G 受众需求理论和《影响力》说服原则进行逐句标注。

## 角色定义（只用以下 6 种，不要自创）

- 开场：前 1-3 句，抓住注意力。判断标准：是否制造好奇、反常识、情绪冲击
- 冲突：引入矛盾、痛点、张力。判断标准：是否让观众产生「这事跟我有关」的感觉
- 转折：视角反转、意料之外的信息。判断标准：是否打破前文预期
- 兑现：给出方法、证据、案例、解决方案。判断标准：观众看完能带走什么
- 金句：高传播力的总结/观点句。判断标准：是否适合单独截图传播
- CTA：显式引导互动（关注/点赞/评论/转发）。注意：纯金句/总结不算 CTA

一句话可以同时是多个角色（用+连接）。
并非每个角色都必须出现（很多爆款没有 CTA）。

## 分析要求

每句话的 analysis 必须具体说明：
1. 这句话在叙事节奏中起什么作用
2. 满足了受众的什么需求（信息/情绪/社交/身份，选最相关的 1-2 个）
3. 如果用到了说服策略（社会认同/权威/稀缺/互惠/喜好），指出是哪个
4. 不要写「承上启下」「推进节奏」这种套话

返回严格 JSON，所有文字用中文，不要 markdown 围栏。"""

USER_PROMPT_TEMPLATE = """分析以下短视频脚本，返回 JSON。

## 返回结构

{
  "sentenceAnalysis": [
    {
      "sentence": "原文中的一句话",
      "role": "该句的角色（开场/冲突/转折/兑现/金句/CTA，可多选用+连接）",
      "analysis": "具体分析：叙事作用 + 满足了什么受众需求 + 用了什么说服策略（中文，2-3句）"
    }
  ],
  "summary": {
    "whyWorks": "一句话说明：如果这是爆款，它为什么能打动目标受众（聚焦最大亮点）",
    "mainIssue": "一句话指出：这条内容目前最大的短板/风险点是什么（结构、节奏、视角或说服力）",
    "oneLineAdvice": "给创作者的一句核心建议（例如：钩子更聚焦某个痛点，或结尾增加具体行动指令）"
  }
}

## 要求

1. sentenceAnalysis 必须覆盖全文每一句话，不能遗漏
2. role 只能从 6 种中选：开场、冲突、转折、兑现、金句、CTA
3. analysis 必须具体，禁止「承上启下」「推进节奏」等套话
4. 纯金句/总结不是 CTA，只有显式引导互动（关注/点赞/评论/转发）才是 CTA
5. 如果脚本没有 CTA，就不要标 CTA
6. summary 必须用通俗中文填写三项：whyWorks / mainIssue / oneLineAdvice，禁止空字符串或套话

## 脚本原文

{source_text}"""


class AnalyzerService:
    def __init__(self, client: DeepSeekClient) -> None:
        self.client = client

    async def analyze(self, payload: dict[str, str]) -> dict[str, Any]:
        if not self.client.enabled:
            logger.warning("DeepSeek not configured, returning fallback")
            return self._build_fallback(payload, reason="deepseek_not_configured")

        messages = self._build_messages(payload)
        try:
            response = await self.client.chat_completion(
                messages,
                response_format={"type": "json_object"},
                timeout_override=60,
            )
            content = (
                response.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            parsed = self._parse_json_content(content)
            logger.info(
                "deepseek_response_keys=%s",
                list(parsed.keys()) if parsed else "empty",
            )
            if not parsed:
                logger.warning("DeepSeek returned empty/unparseable content")
                return self._build_fallback(payload, reason="deepseek_unparseable_response")

            normalized = self._normalize_keys(parsed)
            normalized["_meta"] = {
                "analysisSource": "deepseek",
                "isFallback": False,
                "reason": "",
            }
            return normalized
        except Exception as exc:
            logger.exception("analyze failed: %s", exc)
            return self._build_fallback(payload, reason="deepseek_request_failed")

    def _build_messages(self, payload: dict[str, str]) -> list[dict[str, str]]:
        user_prompt = USER_PROMPT_TEMPLATE.format(
            source_text=payload["sourceText"],
        )
        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    def _parse_json_content(self, content: str) -> dict[str, Any]:
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
        KEY_MAP = {
            "sentence_analysis": "sentenceAnalysis",
            "sentences": "sentenceAnalysis",
            "逐句分析": "sentenceAnalysis",
            "逐句拆解": "sentenceAnalysis",
            "summary": "summary",
            "分析总结": "summary",
        }
        normalized = {}
        for key, value in data.items():
            normalized[KEY_MAP.get(key, key)] = value

        sa = normalized.get("sentenceAnalysis")
        if isinstance(sa, dict):
            normalized["sentenceAnalysis"] = list(sa.values()) if sa else []
        elif not isinstance(sa, list):
            if "sentenceAnalysis" in normalized:
                normalized["sentenceAnalysis"] = []

        # summary 结构兜底
        if "summary" not in normalized or not isinstance(normalized["summary"], dict):
            normalized["summary"] = {
                "whyWorks": "",
                "mainIssue": "",
                "oneLineAdvice": "",
            }

        return normalized

    def _build_fallback(self, payload: dict[str, str], reason: str) -> dict[str, Any]:
        text = payload["sourceText"].strip()
        sentences = _split_into_sentences(text)
        if not sentences:
            sentences = [text]

        sentence_analysis = []
        for i, s in enumerate(sentences):
            if i == 0:
                role, analysis = "开场", "开场句，制造好奇或情绪冲击以抓住注意力。"
            elif i == len(sentences) - 1:
                role, analysis = "金句", "收尾金句，用于总结观点或引发讨论。"
            else:
                role, analysis = "兑现", "提供具体信息、方法或案例。"
            sentence_analysis.append(
                {"sentence": s, "role": role, "analysis": analysis}
            )

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
            "summary": {
                "whyWorks": "兜底分析：整体结构完整，但未获得 DeepSeek 实时分析，无法判断真实传播效果。",
                "mainIssue": "兜底分析只按句子顺序粗分角色，未结合受众需求和说服策略。",
                "oneLineAdvice": "请检查 DeepSeek 配置或错误日志，让模型分析后再看总结会更有参考价值。",
            },
        }
