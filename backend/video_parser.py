"""
小红书视频解析模块

解析小红书视频链接，提取无水印视频URL。
支持短链接和完整笔记链接。
"""

import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger("backend.video_parser")

XIAOHONGSHU_PATTERN = re.compile(r"https?://(?:www\.)?xiaohongshu\.com/explore/([a-zA-Z0-9]+)")
XHSLINK_PATTERN = re.compile(r"https?://(?:www\.)?xhslink\.com/o/([a-zA-Z0-9]+)")
VIDEO_URL_PATTERN = re.compile(r'"videoUrl"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"')
M3U8_URL_PATTERN = re.compile(r'"m3u8"\s*:\s*"(https?://[^"\\]+\.m3u8[^"\\]*)"')
BACKUP_VIDEO_PATTERN = re.compile(r'"url"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"')
STREAM_PATTERN = re.compile(r'"stream"\s*:\s*"(https?://[^"\\]+\.mp4[^"\\]*)"')

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.xiaohongshu.com/",
    "Cache-Control": "no-cache",
    "Cookie": "webId=; a1=; webId=; web_session=;",
}


class VideoParserService:
    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout

    def _validate_url(self, url: str) -> Optional[str]:
        url = url.strip()
        if XIAOHONGSHU_PATTERN.search(url):
            return url
        if XHSLINK_PATTERN.search(url):
            return url
        return None

    def _extract_video_url(self, html: str) -> tuple[Optional[str], Optional[str]]:
        video_match = VIDEO_URL_PATTERN.search(html)
        if video_match:
            url = video_match.group(1)
            url = url.replace("\\u002F", "/").replace("\\/", "/").replace("\\", "")
            return url, "mp4"

        stream_match = STREAM_PATTERN.search(html)
        if stream_match:
            url = stream_match.group(1)
            url = url.replace("\\u002F", "/").replace("\\/", "/").replace("\\", "")
            return url, "mp4"

        m3u8_match = M3U8_URL_PATTERN.search(html)
        if m3u8_match:
            url = m3u8_match.group(1)
            url = url.replace("\\u002F", "/").replace("\\/", "/").replace("\\", "")
            return url, "m3u8"

        backup_match = BACKUP_VIDEO_PATTERN.search(html)
        if backup_match:
            url = backup_match.group(1)
            url = url.replace("\\u002F", "/").replace("\\/", "/").replace("\\", "")
            return url, "mp4"

        return None, None

    async def parse(self, url: str) -> dict:
        validated_url = self._validate_url(url)
        if not validated_url:
            logger.warning("invalid_url url=%s", url)
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": "请输入有效的小红书链接（支持 xhslink.com 短链或 xiaohongshu.com/explore 链接）",
            }

        logger.info("parse_video url=%s", validated_url)
        print(f"解析视频: {validated_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(validated_url, headers=HEADERS)
                response.raise_for_status()

            final_url = str(response.url)
            html = response.text

            logger.info("final_url=%s html_len=%s", final_url, len(html))

            video_url, video_type = self._extract_video_url(html)

            if not video_url:
                logger.warning("video_not_found url=%s final_url=%s", validated_url, final_url)
                print(f"未找到视频，最终URL: {final_url}")
                return {
                    "success": False,
                    "video_url": None,
                    "type": None,
                    "error": "未找到视频内容，可能是图文笔记、需要登录或链接已失效",
                }

            logger.info("parse_success url=%s -> video_url=%s type=%s", validated_url, video_url[:50] + "...", video_type)
            print(f"解析视频: {validated_url} → {video_url[:60]}...")

            return {
                "success": True,
                "video_url": video_url,
                "type": video_type,
                "error": None,
            }

        except httpx.TimeoutException:
            logger.error("timeout url=%s", validated_url)
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": "请求超时，请稍后重试",
            }
        except httpx.HTTPStatusError as e:
            logger.error("http_error url=%s status=%s", validated_url, e.response.status_code)
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": f"请求失败（状态码：{e.response.status_code}）",
            }
        except Exception as e:
            logger.error("parse_error url=%s error=%s", validated_url, str(e))
            return {
                "success": False,
                "video_url": None,
                "type": None,
                "error": f"解析失败：{str(e)}",
            }


video_parser_service = VideoParserService()
