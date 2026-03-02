"""
小红书视频解析模块

解析小红书视频链接，提取无水印视频URL。
"""

import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger("backend.video_parser")

XIAOHONGSHU_PATTERN = re.compile(r"https?://(?:www\.)?xiaohongshu\.com/explore/([a-zA-Z0-9]+)")
VIDEO_URL_PATTERN = re.compile(r'"videoUrl"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"')
M3U8_URL_PATTERN = re.compile(r'"m3u8"\s*:\s*"(https?://[^"\\]+\.m3u8[^"\\]*)"')
BACKUP_VIDEO_PATTERN = re.compile(r'"url"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"')

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.xiaohongshu.com/",
    "Cache-Control": "no-cache",
}


class VideoParserService:
    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    def _validate_url(self, url: str) -> Optional[str]:
        match = XIAOHONGSHU_PATTERN.match(url.strip())
        if match:
            return url.strip()
        return None

    def _extract_video_url(self, html: str) -> Optional[str]:
        video_match = VIDEO_URL_PATTERN.search(html)
        if video_match:
            url = video_match.group(1)
            return url.replace("\\u002F", "/").replace("\\/", "/")

        m3u8_match = M3U8_URL_PATTERN.search(html)
        if m3u8_match:
            url = m3u8_match.group(1)
            return url.replace("\\u002F", "/").replace("\\/", "/")

        backup_match = BACKUP_VIDEO_PATTERN.search(html)
        if backup_match:
            url = backup_match.group(1)
            return url.replace("\\u002F", "/").replace("\\/", "/")

        return None

    async def parse(self, url: str) -> dict:
        validated_url = self._validate_url(url)
        if not validated_url:
            logger.warning("invalid_url url=%s", url)
            return {
                "success": False,
                "video_url": None,
                "error": "请输入有效的小红书视频链接（格式：https://www.xiaohongshu.com/explore/xxxxxx）",
            }

        logger.info("parse_video url=%s", validated_url)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(validated_url, headers=HEADERS, follow_redirects=True)
                response.raise_for_status()

            html = response.text
            video_url = self._extract_video_url(html)

            if not video_url:
                logger.warning("video_not_found url=%s", validated_url)
                return {
                    "success": False,
                    "video_url": None,
                    "error": "未找到视频内容，可能是图文笔记或链接已失效",
                }

            logger.info("parse_success url=%s video_url=%s", validated_url, video_url[:50] + "...")
            return {
                "success": True,
                "video_url": video_url,
                "error": None,
            }

        except httpx.TimeoutException:
            logger.error("timeout url=%s", validated_url)
            return {
                "success": False,
                "video_url": None,
                "error": "请求超时，请稍后重试",
            }
        except httpx.HTTPStatusError as e:
            logger.error("http_error url=%s status=%s", validated_url, e.response.status_code)
            return {
                "success": False,
                "video_url": None,
                "error": f"请求失败（状态码：{e.response.status_code}）",
            }
        except Exception as e:
            logger.error("parse_error url=%s error=%s", validated_url, str(e))
            return {
                "success": False,
                "video_url": None,
                "error": f"解析失败：{str(e)}",
            }


video_parser_service = VideoParserService()
