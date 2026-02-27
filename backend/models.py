"""
Pydantic 模型定义

统一输入输出的数据结构，确保类型安全。
"""

from typing import Optional
from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    """分析请求输入"""
    sourceText: str = Field(min_length=1, max_length=5000, description="待分析的脚本文本")


class LoginRequest(BaseModel):
    """登录请求输入"""
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class SentenceAnalysisItem(BaseModel):
    """单句分析结果"""
    sentence: str = Field(description="原文句子")
    role: str = Field(description="角色标注：开场/冲突/转折/兑现/金句/CTA")
    analysis: str = Field(description="具体分析说明")
    riskScore: int = Field(default=0, ge=0, le=10, description="风险分数：0-10分，10分最高风险")
    rewriteDemo: Optional[str] = Field(default=None, description="改写示例，无则 null")


class HookDiagnosis(BaseModel):
    """钩子诊断结果"""
    strength: str = Field(description="钩子力度：弱/中/强")
    reason: str = Field(description="力度判断原因")
    improvedHook: str = Field(description="改进后的钩子版本")


class SlideAwayPoint(BaseModel):
    """滑走点识别"""
    sentenceIndex: int = Field(description="句子索引（从 0 开始）")
    reason: str = Field(description="滑走原因")
    fixSuggestion: str = Field(description="修复建议")


class EmotionCurve(BaseModel):
    """情绪曲线"""
    peak: str = Field(description="情绪峰值位置和类型")
    valley: str = Field(description="情绪低谷位置和原因")
    overallTrend: str = Field(description="整体情绪走向")


class Summary(BaseModel):
    """分析总结"""
    whyWorks: str = Field(description="为什么能打动受众")
    mainIssue: str = Field(description="最大短板")
    oneLineAdvice: str = Field(description="核心建议")


class AnalysisResult(BaseModel):
    """综合分析结果"""
    overallScore: int = Field(ge=1, le=10, description="整体分数：1-10分")
    criticalIssues: list[str] = Field(default_factory=list, description="关键问题列表（必须3条）")
    fullRewrite: str = Field(default="", description="完整改写版本")
    newTitles: list[str] = Field(default_factory=list, description="新标题建议（必须3个）")
    actionPlan: list[str] = Field(default_factory=list, description="行动清单（必须3步）")


class AnalysisMeta(BaseModel):
    """元数据"""
    analysisSource: str = Field(description="分析来源：deepseek/fallback")
    isFallback: bool = Field(description="是否为兜底结果")
    reason: str = Field(default="", description="原因代码")
    reasonText: str = Field(default="", description="原因说明")


class AnalysisResponse(BaseModel):
    """分析结果输出（完整版）"""
    meta: AnalysisMeta = Field(alias="_meta", description="元数据")
    sentenceAnalysis: list[SentenceAnalysisItem] = Field(description="逐句分析")
    hookDiagnosis: HookDiagnosis = Field(description="钩子诊断")
    slideAwayPoints: list[SlideAwayPoint] = Field(default_factory=list, description="滑走点列表")
    emotionCurve: EmotionCurve = Field(description="情绪曲线")
    summary: Summary = Field(description="分析总结")
    analysisResult: AnalysisResult = Field(default_factory=AnalysisResult, description="综合分析结果")

    class Config:
        populate_by_name = True
