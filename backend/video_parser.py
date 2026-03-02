"""
小红书视频解析模块

解析小红书视频链接，提取无水印视频URL。
支持短链接和完整笔记链接。
"""

import json
import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger("backend.video_parser")

XIAOHONGSHU_PATTERN = re.compile(r"https?://(?:www\.)?xiaohongshu\.com/explore/([a-zA-Z0-9]+)")
XHSLINK_PATTERN = re.compile(r"https?://(?:www\.)?xhslink\.com/o/([a-zA-Z0-9]+)")

VIDEO_PATTERNS = [
    re.compile(r'"videoUrl"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"'),
    re.compile(r'"videoUrl"\s*:\s*"(https?://[^"\\]+)"'),
    re.compile(r'"masterUrl"\s*:\s*"(https?://[^"\\]+)"'),
    re.compile(r'"stream"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"'),
    re.compile(r'"url"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"'),
    re.compile(r'"video"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"'),
    re.compile(r'"playUrl"\s*:\s*"(https?://[^"\\]+)"'),
    re.compile(r'"originVideoKey"\s*:\s*"(https?://[^"\\]+)"'),
]

M3U8_PATTERNS = [
    re.compile(r'"m3u8"\s*:\s*"(https?://[^"\\]+\.m3u8[^"\\]*)"'),
    re.compile(r'"m3u8Url"\s*:\s*"(https?://[^"\\]+\.m3u8[^"\\]*)"'),
]

INITIAL_STATE_PATTERN = re.compile(r"window\.__INITIAL_STATE__\s*=\s*({.+?})\s*</script>", re.DOTALL)
SCRIPT_JSON_PATTERN = re.compile(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.+?)</script>', re.DOTALL)
VIDEO_TAG_PATTERN = re.compile(r'<video[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1 XHS/9.15.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.xiaohongshu.com/",
    "Origin": "https://www.xiaohongshu.com",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}


def clean_url(url: str) -> str:
    if not url:
        return url
    return url.replace("\\u002F", "/").replace("\\u0026", "&").replace("\\/", "/").replace("\\", "")


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

    def _extract_from_patterns(self, html: str) -> tuple[Optional[str], Optional[str]]:
        for pattern in VIDEO_PATTERNS:
            match = pattern.search(html)
            if match:
                url = clean_url(match.group(1))
                if ".mp4" in url or "video" in url.lower():
                    return url, "mp4"

        for pattern in M3U8_PATTERNS:
            match = pattern.search(html)
            if match:
                url = clean_url(match.group(1))
                return url, "m3u8"

        return None, None

    def _extract_from_initial_state(self, html: str) -> tuple[Optional[str], Optional[str]]:
        match = INITIAL_STATE_PATTERN.search(html)
        if not match:
            return None, None

        try:
            json_str = match.group(1)
            data = json.loads(json_str)

            note = data.get("note", {})
            note_detail = note.get("noteDetailMap", {})
            
            for note_id, note_data in note_detail.items():
                video = note_data.get("note", {}).get("video", {})
                
                media = video.get("media", {})
                if media:
                    stream = media.get("stream", {})
                    if stream:
                        h264 = stream.get("h264", [])
                        if h264:
                            for quality in h264:
                                master_url = quality.get("masterUrl")
                                if master_url:
                                    return clean_url(master_url), "mp4"

                video_url = video.get("url") or video.get("videoUrl") or video.get("playUrl")
                if video_url:
                    return clean_url(video_url), "mp4"

                consumer = video.get("consumer", {})
                origin_video_key = consumer.get("originVideoKey")
                if origin_video_key:
                    return clean_url(origin_video_key), "mp4"

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.debug("initial_state_parse_error: %s", e)

        return None, None

    def _extract_from_script_json(self, html: str) -> tuple[Optional[str], Optional[str]]:
        matches = SCRIPT_JSON_PATTERN.findall(html)
        for match in matches:
            try:
                data = json.loads(match)
                if isinstance(data, dict):
                    video_url = data.get("videoUrl") or data.get("contentUrl") or data.get("url")
                    if video_url:
                        return clean_url(video_url), "mp4"
            except json.JSONDecodeError:
                continue
        return None, None

    def _extract_from_video_tag(self, html: str) -> tuple[Optional[str], Optional[str]]:
        match = VIDEO_TAG_PATTERN.search(html)
        if match:
            return clean_url(match.group(1)), "mp4"
        return None, None

    def _extract_video_url(self, html: str) -> tuple[Optional[str], Optional[str]]:
        url, vtype = self._extract_from_initial_state(html)
        if url:
            logger.info("extracted_from_initial_state")
            return url, vtype

        url, vtype = self._extract_from_patterns(html)
        if url:
            logger.info("extracted_from_patterns")
            return url, vtype

        url, vtype = self._extract_from_script_json(html)
        if url:
            logger.info("extracted_from_script_json")
            return url, vtype

        url, vtype = self._extract_from_video_tag(html)
        if url:
            logger.info("extracted_from_video_tag")
            return url, vtype

        return None, None

    async def _fetch_with_retry(self, client: httpx.AsyncClient, url: str) -> Optional[httpx.Response]:
        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = await client.get(url, headers=HEADERS)
                response.raise_for_status()
                return response
            except httpx.TimeoutException:
                last_error = "timeout"
                logger.warning("retry %s/%s timeout url=%s", attempt + 1, self.max_retries, url)
            except httpx.HTTPStatusError as e:
                last_error = f"http_{e.response.status_code}"
                logger.warning("retry %s/%s http_error url=%s status=%s", attempt + 1, self.max_retries, url, e.response.status_code)
                if e.response.status_code >= 400 and e.response.status_code < 500:
                    break
            except Exception as e:
                last_error = str(e)
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
                "html_len": 0,
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
                    "html_len": 0,
                }

            final_url = str(response.url)
            html = response.text
            html_len = len(html)

            logger.info("final_url=%s html_len=%s", final_url, html_len)

            video_url, video_type = self._extract_video_url(html)

            if not video_url:
                logger.warning("video_not_found url=%s final_url=%s html_len=%s", validated_url, final_url, html_len)
                print(f"未找到视频，最终URL: {final_url}, HTML长度: {html_len}")
                return {
                    "success": False,
                    "video_url": None,
                    "type": None,
                    "error": f"未找到视频内容，可能是图文笔记或链接已失效（HTML长度: {html_len}）",
                    "html_len": html_len,
                    "final_url": final_url,
                }

            logger.info("parse_success url=%s -> video_url=%s type=%s", validated_url, video_url[:50] + "...", video_type)
            print(f"解析视频: {validated_url} → {video_url[:60]}...")

            return {
                "success": True,
                "video_url": video_url,
                "type": video_type,
                "error": None,
                "html_len": html_len,
            }

        except Exception as e:
            logger.error("parse_error url=%s error=%s", validated_url, str(e))
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": f"解析失败：{str(e)}",
                "html_len": 0,
            }


video_parser_service = VideoParserService()
