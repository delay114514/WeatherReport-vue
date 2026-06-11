"""Amap (高德) API client — all calls share a single httpx AsyncClient."""

import hashlib
import json
import time
from httpx import AsyncClient, HTTPError

from config import settings

AMAP_BASE = "https://restapi.amap.com/v3"

# ---- 天气 API 结果缓存 (5 分钟 TTL) ----

_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 300  # 秒


def _cache_key(path: str, params: dict) -> str:
    """生成缓存键：基于 path + 排序后的 params（排除 key）"""
    normalized = {k: v for k, v in params.items() if k != "key"}
    raw = path + json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


class AmapError(Exception):
    """Raised when the Amap API returns a non-success response."""


async def _get(path: str, params: dict | None = None, use_cache: bool = False) -> dict:
    """Internal GET helper that injects the API key.

    Args:
        path: API path
        params: query parameters (without key)
        use_cache: if True and path is a weather endpoint, use 5-min TTL cache
    """
    if params is None:
        params = {}
    params["key"] = settings.amap_api_key

    # 检查缓存（仅 weather 路径）
    if use_cache and "/weather/" in path:
        ck = _cache_key(path, params)
        now = time.time()
        if ck in _cache:
            ts, data = _cache[ck]
            if now - ts < CACHE_TTL:
                return data  # 缓存命中
            del _cache[ck]  # 过期，删除

    async with AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{AMAP_BASE}{path}", params=params)
            resp.raise_for_status()
        except HTTPError as e:
            raise AmapError(f"Amap API request failed: {e}") from e

    data = resp.json()
    if data.get("status") != "1":
        raise AmapError(f"Amap API error: {data.get('info', 'unknown')} (infocode={data.get('infocode')})")

    # 写入缓存（仅 weather 路径）
    if use_cache and "/weather/" in path:
        ck = _cache_key(path, params)
        _cache[ck] = (time.time(), data)
        # 清理过期条目（简单 LRU 式清理，每 100 次写入清理一次）
        if len(_cache) > 200:
            now = time.time()
            _cache.clear()  # 全清简单处理，避免 O(n) 遍历

    return data


async def get_weather_base(adcode: str) -> dict:
    """Get live weather (base). 5-min cache applied."""
    return await _get("/weather/weatherInfo", {"city": adcode, "extensions": "base"}, use_cache=True)


async def get_weather_all(adcode: str) -> dict:
    """Get weather forecast (all). 5-min cache applied."""
    return await _get("/weather/weatherInfo", {"city": adcode, "extensions": "all"}, use_cache=True)


async def geocode_regeo(longitude: float, latitude: float) -> dict:
    """Reverse geocode: lon,lat → adcode + address components."""
    return await _get("/geocode/regeo", {"location": f"{longitude},{latitude}"})


async def geocode_geo(address: str) -> dict:
    """Forward geocode: address → adcode."""
    return await _get("/geocode/geo", {"address": address})


async def get_all_districts() -> dict:
    """Fetch full China district tree (subdistrict=3, one call)."""
    return await _get("/config/district", {
        "keywords": "中国",
        "subdistrict": "3",
        "extensions": "base",
    })
