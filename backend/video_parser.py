"""
小红书视频解析模块

解析小红书视频链接，提取无水印视频URL。
支持短链接和完整笔记链接。
"""

import json
import logging
import re
from typing import Any, Optional

import httpx

logger = logging.getLogger("backend.video_parser")

XIAOHONGSHU_PATTERN = re.compile(r"https?://(?:www\.)?xiaohongshu\.com/explore/([a-zA-Z0-9]+)")
XHSLINK_PATTERN = re.compile(r"https?://(?:www\.)?xhslink\.com/o/([a-zA-Z0-9]+)")

INITIAL_STATE_PATTERNS = [
    re.compile(r"window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*;?\s*(?:</script>|$)", re.DOTALL),
    re.compile(r"window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*(?=\n|\r|$)", re.DOTALL),
    re.compile(r"__INITIAL_STATE__\s*[=:]\s*(\{.+?\})\s*;?\s*(?:</script>|$)", re.DOTALL),
]

SCRIPT_DATA_PATTERN = re.compile(r'<script[^>]*>\s*(?:window\.)?__\w+__\s*=\s*(\{.+?\})\s*;?\s*</script>', re.DOTALL)

VIDEO_KEY_PATTERNS = [
    "videoUrl", "masterUrl", "playUrl", "originVideoKey", 
    "video_url", "streamUrl", "mediaUrl", "contentUrl",
    "url", "video", "stream", "m3u8", "master"
]

VIDEO_URL_PATTERNS = [
    re.compile(r'"(https?://[^"\\]+\.mp4[^"\\]*)"'),
    re.compile(r'"(https?://[^"\\]+\.m3u8[^"\\]*)"'),
    re.compile(r'"(https?://[^"\\]*video[^"\\]*)"'),
    re.compile(r'"(https?://[^"\\]*xhscdn[^"\\]*)"'),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.xiaohongshu.com/",
    "Origin": "https://www.xiaohongshu.com",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?1",
    "Sec-Ch-Ua-Platform": '"iOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def clean_url(url: str) -> str:
    if not url:
        return url
    return url.replace("\\u002F", "/").replace("\\u0026", "&").replace("\\/", "/").replace("\\", "")


def is_video_url(url: str) -> bool:
    if not url:
        return False
    url_lower = url.lower()
    return any(kw in url_lower for kw in [".mp4", ".m3u8", "video", "xhscdn", "stream", "media"])


def recursive_find_video(data: Any, depth: int = 0, max_depth: int = 10) -> tuple[Optional[str], Optional[str]]:
    if depth > max_depth:
        return None, None

    if isinstance(data, dict):
        for key in VIDEO_KEY_PATTERNS:
            if key.lower() in [k.lower() for k in data.keys()]:
                for k, v in data.items():
                    if k.lower() == key.lower() and isinstance(v, str) and is_video_url(v):
                        url = clean_url(v)
                        vtype = "m3u8" if ".m3u8" in url.lower() else "mp4"
                        return url, vtype

        for key, value in data.items():
            if key.lower() in ["video", "media", "stream", "player", "consumer"]:
                if isinstance(value, dict):
                    result = recursive_find_video(value, depth + 1, max_depth)
                    if result[0]:
                        return result
                    for sub_key in ["masterUrl", "url", "videoUrl", "playUrl", "originVideoKey", "stream"]:
                        if sub_key in value:
                            v = value[sub_key]
                            if isinstance(v, str) and is_video_url(v):
                                url = clean_url(v)
                                vtype = "m3u8" if ".m3u8" in url.lower() else "mp4"
                                return url, vtype
                            elif isinstance(v, list) and v:
                                for item in v:
                                    if isinstance(item, dict) and "masterUrl" in item:
                                        mu = item["masterUrl"]
                                        if isinstance(mu, str) and is_video_url(mu):
                                            return clean_url(mu), "mp4"
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            result = recursive_find_video(item, depth + 1, max_depth)
                            if result[0]:
                                return result

        for value in data.values():
            result = recursive_find_video(value, depth + 1, max_depth)
            if result[0]:
                return result

    elif isinstance(data, list):
        for item in data:
            result = recursive_find_video(item, depth + 1, max_depth)
            if result[0]:
                return result

    return None, None


class VideoParserService:
    def __init__(self, timeout: float = 15.0, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries

    def _validate_url(self, url: str) -> Optional[str]:
        url = url.strip()
        if XIAOHONGSHU_PATTERN.search(url):
            return url
        if XHSLINK_PATTERN.search(url):
            return url
        return None

    def _extract_from_initial_state(self, html: str) -> tuple[Optional[str], Optional[str], dict]:
        diagnostics = {"found_initial_state": False, "json_parse_success": False}

        for pattern in INITIAL_STATE_PATTERNS:
            match = pattern.search(html)
            if match:
                diagnostics["found_initial_state"] = True
                json_str = match.group(1)
                
                try:
                    brace_count = 0
                    end_idx = 0
                    for i, c in enumerate(json_str):
                        if c == '{':
                            brace_count += 1
                        elif c == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    
                    if end_idx > 0:
                        json_str = json_str[:end_idx]
                    
                    data = json.loads(json_str)
                    diagnostics["json_parse_success"] = True
                    
                    if "note" in data:
                        note = data["note"]
                        if "noteDetailMap" in note:
                            note_detail = note["noteDetailMap"]
                            for note_id, note_data in note_detail.items():
                                if "note" in note_data:
                                    video_data = note_data["note"].get("video", {})
                                    if video_data:
                                        result = recursive_find_video(video_data)
                                        if result[0]:
                                            diagnostics["source"] = "initial_state.noteDetailMap"
                                            return result[0], result[1], diagnostics

                    result = recursive_find_video(data)
                    if result[0]:
                        diagnostics["source"] = "initial_state.recursive"
                        return result[0], result[1], diagnostics

                except json.JSONDecodeError as e:
                    diagnostics["json_error"] = str(e)[:100]
                    logger.debug("json_decode_error: %s", e)
                except Exception as e:
                    diagnostics["parse_error"] = str(e)[:100]
                    logger.debug("parse_error: %s", e)

        return None, None, diagnostics

    def _extract_from_script_tags(self, html: str) -> tuple[Optional[str], Optional[str], dict]:
        diagnostics = {"found_script_data": False}

        matches = SCRIPT_DATA_PATTERN.findall(html)
        for match in matches:
            diagnostics["found_script_data"] = True
            try:
                brace_count = 0
                end_idx = 0
                for i, c in enumerate(match):
                    if c == '{':
                        brace_count += 1
                    elif c == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break
                
                if end_idx > 0:
                    json_str = match[:end_idx]
                    data = json.loads(json_str)
                    result = recursive_find_video(data)
                    if result[0]:
                        diagnostics["source"] = "script_tag"
                        return result[0], result[1], diagnostics
            except (json.JSONDecodeError, Exception) as e:
                logger.debug("script_json_error: %s", e)

        return None, None, diagnostics

    def _extract_from_html_patterns(self, html: str) -> tuple[Optional[str], Optional[str], dict]:
        diagnostics = {"found_url_pattern": False}

        for pattern in VIDEO_URL_PATTERNS:
            matches = pattern.findall(html)
            for url in matches:
                url = clean_url(url)
                if is_video_url(url):
                    diagnostics["found_url_pattern"] = True
                    diagnostics["source"] = "html_pattern"
                    vtype = "m3u8" if ".m3u8" in url.lower() else "mp4"
                    return url, vtype, diagnostics

        return None, None, diagnostics

    def _extract_video_url(self, html: str) -> tuple[Optional[str], Optional[str], dict]:
        all_diagnostics = {"html_len": len(html)}

        url, vtype, diag = self._extract_from_initial_state(html)
        all_diagnostics.update(diag)
        if url:
            logger.info("extracted_from_initial_state")
            return url, vtype, all_diagnostics

        url, vtype, diag = self._extract_from_script_tags(html)
        all_diagnostics.update(diag)
        if url:
            logger.info("extracted_from_script_tags")
            return url, vtype, all_diagnostics

        url, vtype, diag = self._extract_from_html_patterns(html)
        all_diagnostics.update(diag)
        if url:
            logger.info("extracted_from_html_patterns")
            return url, vtype, all_diagnostics

        return None, None, all_diagnostics

    async def _fetch_with_retry(self, client: httpx.AsyncClient, url: str) -> Optional[httpx.Response]:
        for attempt in range(self.max_retries):
            try:
                response = await client.get(url, headers=HEADERS)
                response.raise_for_status()
                return response
            except httpx.TimeoutException:
                logger.warning("retry %s/%s timeout url=%s", attempt + 1, self.max_retries, url)
            except httpx.HTTPStatusError as e:
                logger.warning("retry %s/%s http_error url=%s status=%s", attempt + 1, self.max_retries, url, e.response.status_code)
                if 400 <= e.response.status_code < 500:
                    break
            except Exception as e:
                logger.warning("retry %s/%s error url=%s error=%s", attempt + 1, self.max_retries, url, e)

        return None

    async def parse(self, url: str) -> dict:
        validated_url = self._validate_url(url)
        if not validated_url:
            logger.warning("invalid_url url=%s", url)
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": "请输入有效的小红书链接（支持 xhslink.com 短链或 xiaohongshu.com/explore 链接）",
                "diagnostics": {"html_len": 0},
            }

        logger.info("parse_video url=%s", validated_url)
        print(f"解析视频: {validated_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await self._fetch_with_retry(client, validated_url)

            if not response:
                return {
                    "success": False,
                    "video_url": None,
                    "type": None,
                    "error": f"请求失败，已重试 {self.max_retries} 次",
                    "diagnostics": {"html_len": 0},
                }

            final_url = str(response.url)
            html = response.text

            video_url, video_type, diagnostics = self._extract_video_url(html)
            diagnostics["final_url"] = final_url

            if not video_url:
                logger.warning("video_not_found url=%s diagnostics=%s", validated_url, diagnostics)
                print(f"未找到视频，诊断信息: {diagnostics}")
                
                error_msg = f"未找到视频内容（HTML长度: {diagnostics.get('html_len', 0)}）"
                if not diagnostics.get("found_initial_state"):
                    error_msg += "，未找到 __INITIAL_STATE__"
                else:
                    error_msg += f"，已找到 __INITIAL_STATE__，解析{'成功' if diagnostics.get('json_parse_success') else '失败'}"
                
                return {
                    "success": False,
                    "video_url": None,
                    "type": None,
                    "error": error_msg,
                    "diagnostics": diagnostics,
                }

            logger.info("parse_success url=%s -> video_url=%s type=%s", validated_url, video_url[:50] + "...", video_type)
            print(f"解析视频: {validated_url} → {video_url[:60]}...")

            return {
                "success": True,
                "video_url": video_url,
                "type": video_type,
                "error": None,
                "diagnostics": diagnostics,
            }

        except Exception as e:
            logger.error("parse_error url=%s error=%s", validated_url, str(e))
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": f"解析失败：{str(e)}",
                "diagnostics": {"html_len": 0, "error": str(e)},
            }


video_parser_service = VideoParserService()
