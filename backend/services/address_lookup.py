"""
本地行政区划查询模块 — 基于前端 address.json 缓存。

提供省/市/区县三级的名称→adcode 正向查询和 adcode→名称反向查询。
纯内存索引，零 API 调用，毫秒级响应。

数据结构 (from address.json):
  Province: {adcode, provinces, city[], level}
  City:     {adcode, city, county[], level, parent, longitude, latitude}
  County:   {adcode, countyorstreets, level, parent, longitude, latitude}
"""

import json
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Optional

# ---- Data Classes ----


@dataclass
class County:
    adcode: str
    name: str           # countyorstreets
    level: str
    parent: str         # city name
    longitude: float
    latitude: float


@dataclass
class City:
    adcode: str
    name: str           # city
    level: str
    parent: str         # province name
    longitude: float
    latitude: float
    counties: list[County] = field(default_factory=list)


@dataclass
class Province:
    adcode: str
    name: str           # provinces
    level: str
    cities: list[City] = field(default_factory=list)


@dataclass
class SearchResult:
    """统一的搜索结果"""
    adcode: str
    name: str
    full_name: str      # "广东省深圳市南山区"
    level: str          # "province" | "city" | "county"
    parent: str
    province: str
    longitude: float
    latitude: float


# ---- 直辖市和特殊地区 ----

# 直辖市：城市层级与省份名相同，显示时跳过冗余中间层
MUNICIPALITIES: set[str] = {"北京市", "天津市", "上海市", "重庆市"}

# 跳过这些地区（高德天气 API 不支持）
SKIP_PROVINCES: set[str] = {"香港特别行政区", "澳门特别行政区", "台湾省"}

# ---- 模块级缓存（惰性加载） ----

_data: list[Province] | None = None

# 三个索引字典：name → list of matching entities
_province_index: dict[str, list[Province]] = {}
_city_index: dict[str, list[City]] = {}
_county_index: dict[str, list[County]] = {}

# adcode → entity 反向索引
_adcode_index: dict[str, Province | City | County] = {}


def _resolve_path() -> Path:
    """解析 address.json 路径（优先使用配置，否则自动探测）。"""
    # 优先：配置中指定的路径
    try:
        from config import settings
        if settings.address_json_path:
            p = Path(settings.address_json_path)
            if p.exists():
                return p
    except Exception:
        pass  # 配置不存在或加载失败时回退到自动探测

    # 回退：自动探测
    current = Path(__file__).resolve().parent
    candidates = [
        current / "address.json",                                          # 同目录
        current.parent.parent / "src" / "assets" / "address" / "address.json",  # 项目根
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"address.json 未找到，尝试过: {[str(c) for c in candidates]}"
    )


def _load_raw() -> list[dict]:
    """读取并解析 address.json 原始数据。"""
    path = _resolve_path()
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_county(raw: dict) -> County:
    return County(
        adcode=raw["adcode"],
        name=raw["countyorstreets"],
        level=raw.get("level", "county"),
        parent=raw.get("parent", ""),
        longitude=raw.get("longitude", 0.0),
        latitude=raw.get("latitude", 0.0),
    )


def _parse_city(raw: dict) -> City | None:
    # 跳过无 adcode 的伪城市（如"省直辖县级行政区划"）
    if "adcode" not in raw:
        return None
    counties = [_parse_county(c) for c in raw.get("county", [])]
    return City(
        adcode=raw["adcode"],
        name=raw["city"],
        level=raw.get("level", "city"),
        parent=raw.get("parent", ""),
        longitude=raw.get("longitude", 0.0),
        latitude=raw.get("latitude", 0.0),
        counties=counties,
    )


def _parse_province(raw: dict) -> Province:
    parsed = [_parse_city(c) for c in raw.get("city", [])]
    cities = [ct for ct in parsed if ct is not None]
    return Province(
        adcode=raw["adcode"],
        name=raw["provinces"],
        level=raw.get("level", "province"),
        cities=cities,
    )


def _build_indices(data: list[Province]) -> None:
    """构建三个正向索引 + 一个 adcode 反向索引。"""
    _province_index.clear()
    _city_index.clear()
    _county_index.clear()
    _adcode_index.clear()

    for p in data:
        if p.name in SKIP_PROVINCES:
            continue

        _province_index.setdefault(p.name, []).append(p)
        _adcode_index[p.adcode] = p

        for c in p.cities:
            _city_index.setdefault(c.name, []).append(c)
            _adcode_index[c.adcode] = c

            for co in c.counties:
                _county_index.setdefault(co.name, []).append(co)
                _adcode_index[co.adcode] = co


def _ensure_loaded() -> list[Province]:
    """惰性加载：首次调用时读取 JSON 并构建索引。"""
    global _data
    if _data is None:
        raw = _load_raw()
        _data = [_parse_province(r) for r in raw]
        _build_indices(_data)
    return _data


# ---- 公共 API ----


def _match_full_name(query: str, full_name: str) -> bool:
    """
    检查 query 是否按顺序出现在 full_name 中（子序列匹配）。
    用于组合查询：query="广州天河" 匹配 full_name="广东省广州市天河区"。
    """
    qi = 0
    for ch in full_name:
        if ch == query[qi]:
            qi += 1
            if qi == len(query):
                return True
    return False


def search_address(query: str, max_results: int = 10) -> list[SearchResult]:
    """
    按名称搜索行政区划（省/市/区县三级）。

    搜索策略（优先级递减）：
    1. 精确匹配 — 名称完全相等
    2. 前缀匹配 — query 是名称的前缀
    3. 包含匹配 — 名称包含 query
    4. 全名子序列匹配 — query 各字符按序出现在 full_name 中（如"广州天河"→"广东省广州市天河区"）

    同名区县（如多个"市中区"）会返回多条结果，交给 LLM/用户选择。

    Args:
        query: 搜索关键词，如 "海淀"、"深圳"、"广东省"、"广州天河"
        max_results: 最多返回条数，默认 10

    Returns:
        匹配的 SearchResult 列表，已按级别和匹配质量排序
    """
    _ensure_loaded()
    query = query.strip()
    if not query:
        return []

    exact: list[SearchResult] = []
    prefix: list[SearchResult] = []
    contains: list[SearchResult] = []

    def _collect(
        results: list,
        name: str,
        province: Province,
        city: City | None,
        county: County | None,
    ) -> None:
        """构建 SearchResult 并加入对应优先级列表。"""
        if county:
            level = "county"
            adcode = county.adcode
            entity_name = county.name
            parent_name = county.parent
            province_name = province.name
            lon, lat = county.longitude, county.latitude
            # 构建 full_name
            if province.name in MUNICIPALITIES:
                full_name = f"{province.name}{entity_name}"
            else:
                full_name = f"{province.name}{parent_name}{entity_name}" if parent_name else f"{province.name}{entity_name}"
        elif city:
            level = "city"
            adcode = city.adcode
            entity_name = city.name
            parent_name = city.parent
            province_name = province.name
            lon, lat = city.longitude, city.latitude
            # 直辖市：城市名可能与省份名重复，跳过冗余
            if province.name in MUNICIPALITIES:
                full_name = province.name
            else:
                full_name = f"{province.name}{entity_name}"
        else:
            level = "province"
            adcode = province.adcode
            entity_name = province.name
            parent_name = ""
            province_name = province.name
            lon = lat = 0.0
            full_name = province.name

        results.append(SearchResult(
            adcode=adcode,
            name=entity_name,
            full_name=full_name,
            level=level,
            parent=parent_name,
            province=province_name,
            longitude=lon,
            latitude=lat,
        ))

    # ---- 省份级搜索 ----
    for prov_name, provs in _province_index.items():
        for p in provs:
            if query == prov_name:
                _collect(exact, prov_name, p, None, None)
            elif prov_name.startswith(query):
                _collect(prefix, prov_name, p, None, None)
            elif query in prov_name:
                _collect(contains, prov_name, p, None, None)

    # ---- 城市级搜索 ----
    for city_name, cities in _city_index.items():
        for c in cities:
            # 找到所属省份
            prov = _find_province_for_city(c)
            if prov is None:
                continue
            if query == city_name:
                _collect(exact, city_name, prov, c, None)
            elif city_name.startswith(query):
                _collect(prefix, city_name, prov, c, None)
            elif query in city_name:
                _collect(contains, city_name, prov, c, None)

    # ---- 区县级搜索 ----
    for county_name, counties in _county_index.items():
        for co in counties:
            city = _find_city_for_county(co)
            if city is None:
                continue
            prov = _find_province_for_city(city)
            if prov is None:
                continue
            if query == county_name:
                _collect(exact, county_name, prov, city, co)
            elif county_name.startswith(query):
                _collect(prefix, county_name, prov, city, co)
            elif query in county_name:
                _collect(contains, county_name, prov, city, co)

    # 合并结果：精确 > 前缀 > 包含
    all_results = exact + prefix + contains

    # ---- 第 4 级：full_name 子序列匹配（组合查询如"广州天河"） ----
    if len(all_results) < max_results:
        full_name_matches: list[SearchResult] = []
        seen_adcodes = {r.adcode for r in all_results}

        # 遍历所有区县
        for county_name, counties in _county_index.items():
            for co in counties:
                if co.adcode in seen_adcodes:
                    continue
                city = _find_city_for_county(co)
                if city is None:
                    continue
                prov = _find_province_for_city(city)
                if prov is None:
                    continue
                # 构建 full_name
                if prov.name in MUNICIPALITIES:
                    fn = f"{prov.name}{co.name}"
                else:
                    fn = f"{prov.name}{city.name}{co.name}"
                if _match_full_name(query, fn):
                    _collect(full_name_matches, county_name, prov, city, co)
                    seen_adcodes.add(co.adcode)

        # 遍历所有城市
        for city_name, cities in _city_index.items():
            for c in cities:
                if c.adcode in seen_adcodes:
                    continue
                prov = _find_province_for_city(c)
                if prov is None:
                    continue
                fn = prov.name if prov.name in MUNICIPALITIES else f"{prov.name}{c.name}"
                if _match_full_name(query, fn):
                    _collect(full_name_matches, city_name, prov, c, None)
                    seen_adcodes.add(c.adcode)

        # 遍历所有省份
        for prov_name, provs in _province_index.items():
            for p in provs:
                if p.adcode in seen_adcodes:
                    continue
                if _match_full_name(query, p.name):
                    _collect(full_name_matches, p.name, p, None, None)
                    seen_adcodes.add(p.adcode)

        all_results.extend(full_name_matches)

    return all_results[:max_results]


def adcode_to_name(adcode: str) -> dict | None:
    """
    根据 adcode 反查完整地址信息。

    Returns:
        {"adcode": "110108", "name": "海淀区", "full_name": "北京市海淀区",
         "level": "county", "province": "北京市", ...} 或 None
    """
    _ensure_loaded()
    entity = _adcode_index.get(adcode)
    if entity is None:
        return None

    if isinstance(entity, Province):
        return {
            "adcode": entity.adcode,
            "name": entity.name,
            "full_name": entity.name,
            "level": "province",
            "parent": "",
            "province": entity.name,
            "longitude": 0.0,
            "latitude": 0.0,
        }

    if isinstance(entity, City):
        prov = _find_province_for_city(entity)
        province_name = prov.name if prov else ""
        if province_name in MUNICIPALITIES:
            full_name = province_name
        else:
            full_name = f"{province_name}{entity.name}"
        return {
            "adcode": entity.adcode,
            "name": entity.name,
            "full_name": full_name,
            "level": "city",
            "parent": entity.parent,
            "province": province_name,
            "longitude": entity.longitude,
            "latitude": entity.latitude,
        }

    # County
    city = _find_city_for_county(entity)
    prov = _find_province_for_city(city) if city else None
    province_name = prov.name if prov else ""
    parent_name = entity.parent
    if province_name in MUNICIPALITIES:
        full_name = f"{province_name}{entity.name}"
    else:
        full_name = f"{province_name}{parent_name}{entity.name}"
    return {
        "adcode": entity.adcode,
        "name": entity.name,
        "full_name": full_name,
        "level": "county",
        "parent": parent_name,
        "province": province_name,
        "longitude": entity.longitude,
        "latitude": entity.latitude,
    }


def get_all_provinces() -> list[dict]:
    """获取所有省份列表（用于前端下拉等场景）。"""
    _ensure_loaded()
    return [
        {"adcode": p.adcode, "name": p.name}
        for p in _data
        if p.name not in SKIP_PROVINCES
    ]


def get_cities_by_province(province_name: str) -> list[dict]:
    """获取指定省份下的所有城市。"""
    _ensure_loaded()
    for p in _data:
        if p.name == province_name:
            return [
                {"adcode": c.adcode, "name": c.name}
                for c in p.cities
            ]
    return []


# ---- 热门城市速查表 ----


# 热门城市列表（直辖市 + 省会 + 副省级 + 经济强市）
_HOT_CITIES: set[str] = {
    # 直辖市
    "北京市", "上海市", "天津市", "重庆市",
    # 省会
    "广州市", "深圳市", "杭州市", "南京市", "武汉市", "成都市",
    "西安市", "长沙市", "合肥市", "南昌市", "福州市", "郑州市",
    "石家庄市", "太原市", "呼和浩特市", "沈阳市", "长春市", "哈尔滨市",
    "济南市", "青岛市", "南宁市", "贵阳市", "昆明市", "拉萨市",
    "兰州市", "西宁市", "银川市", "乌鲁木齐市", "海口市", "三亚市",
    # 经济强市 / 副省级
    "苏州市", "无锡市", "佛山市", "东莞市", "珠海市", "宁波市",
    "厦门市", "大连市", "温州市", "泉州市", "烟台市", "常州市",
    "徐州市", "嘉兴市", "绍兴市", "金华市", "南通市", "惠州市",
    "中山市", "廊坊市", "保定市", "洛阳市",
}


def get_hot_city_table() -> str:
    """
    生成热门城市的 adcode 速查表，用于注入 LLM System Prompt。
    每条格式: "城市名→adcode"，分号分隔。

    覆盖：热门城市本身 + 其核心区县（共约 150 条）。
    """
    _ensure_loaded()
    lines: list[str] = []

    for p in _data:
        if p.name in SKIP_PROVINCES:
            continue
        is_muni = p.name in MUNICIPALITIES

        for c in p.cities:
            if c.name in _HOT_CITIES or (is_muni and p.name in _HOT_CITIES):
                # 城市本身
                if is_muni:
                    lines.append(f"{p.name}→{c.adcode}")
                else:
                    lines.append(f"{c.name}→{c.adcode}")
                # 下辖区县（最多 15 个）
                for co in c.counties[:15]:
                    lines.append(f"{co.name}→{co.adcode}")

    return "; ".join(lines)


# ---- 内部辅助 ----

def _find_province_for_city(city: City) -> Province | None:
    """根据城市对象找到其所属省份。"""
    _ensure_loaded()
    for p in _data:
        for c in p.cities:
            if c.adcode == city.adcode:
                return p
    return None


def _find_city_for_county(county: County) -> City | None:
    """根据区县对象找到其所属城市。"""
    _ensure_loaded()
    for p in _data:
        for c in p.cities:
            for co in c.counties:
                if co.adcode == county.adcode:
                    return c
    return None
