"""Data transformation utilities — restructure raw API responses for frontend consumption."""

from datetime import datetime, timezone

# ---- Constants (mirrored from frontend src/utils/constants.ts) ----

DAY_LABELS = ["今天", "明天", "后天", "大后天"]

# QWeather severity → Chinese (API returns lowercase)
SEVERITY_MAP: dict[str, str] = {
    "minor": "蓝色预警",
    "moderate": "黄色预警",
    "major": "橙色预警",
    "severe": "红色预警",
    "extreme": "红色预警",
    "unknown": "提示",
}

SKIP_PROVINCES: set[str] = {
    "台湾省",
    "香港特别行政区",
    "澳门特别行政区",
}

MUNICIPALITIES: set[str] = {
    "北京市", "天津市", "上海市", "重庆市",
    "澳门特别行政区", "香港特别行政区",
}

MUNICIPALITY_CITY_NAMES: set[str] = {
    "北京城区", "上海城区", "天津城区",
    "重庆城区", "重庆郊县",
}


def parse_center(center: str | None) -> tuple[float, float]:
    """Parse Amap center string "lon,lat" → (longitude, latitude)."""
    if not center:
        return (0.0, 0.0)
    parts = center.split(",")
    if len(parts) != 2:
        return (0.0, 0.0)
    try:
        lon = float(parts[0])
        lat = float(parts[1])
        return (lon, lat)
    except ValueError:
        return (0.0, 0.0)


# ---- Weather ----

def transform_weather_combined(base_data: dict, all_data: dict) -> dict:
    """Combine Amap weather base + all responses into one frontend-ready object."""
    live = base_data.get("lives", [{}])[0]
    casts = all_data.get("forecasts", [{}])[0].get("casts", [])

    current = {
        "temperature": live.get("temperature", "--"),
        "humidity": live.get("humidity", "--"),
        "weather": live.get("weather", "--"),
        "winddirection": live.get("winddirection", "--"),
        "windpower": live.get("windpower", "--"),
        "reporttime": live.get("reporttime", ""),
        "daytemp": casts[0].get("daytemp", "--") if casts else "--",
        "nighttemp": casts[0].get("nighttemp", "--") if casts else "--",
    }

    forecast = []
    for i, cast in enumerate(casts[:4]):
        forecast.append({
            "date": cast.get("date", ""),
            "week": cast.get("week", ""),
            "dayweather": cast.get("dayweather", "--"),
            "nightweather": cast.get("nightweather", "--"),
            "daytemp": cast.get("daytemp", "--"),
            "nighttemp": cast.get("nighttemp", "--"),
            "daywind": cast.get("daywind", "--"),
            "nightwind": cast.get("nightwind", "--"),
            "daypower": cast.get("daypower", "--"),
            "nightpower": cast.get("nightpower", "--"),
            "label": DAY_LABELS[i] if i < len(DAY_LABELS) else f"第{i + 1}天",
        })

    return {"current": current, "forecast": forecast}


# ---- Alerts ----

def transform_alerts(raw_data: dict) -> dict:
    """Filter expired alerts and simplify fields for frontend."""
    alerts = raw_data.get("alerts", [])
    now = datetime.now(timezone.utc)

    simplified = []
    for a in alerts:
        expire_str = a.get("expireTime", "")
        try:
            expire_time = datetime.fromisoformat(expire_str.replace("Z", "+00:00"))
            if expire_time <= now:
                continue
        except (ValueError, AttributeError):
            pass  # keep if we can't parse expire time

        color = a.get("color", {})
        simplified.append({
            "headline": a.get("headline", ""),
            "description": a.get("description", ""),
            "severity": SEVERITY_MAP.get(a.get("severity", "").lower(), "提示"),
            "colorCode": color.get("code", "unknown") if isinstance(color, dict) else "unknown",
            "color": {
                "code": color.get("code", "") if isinstance(color, dict) else "",
                "red": color.get("red", 0) if isinstance(color, dict) else 0,
                "green": color.get("green", 0) if isinstance(color, dict) else 0,
                "blue": color.get("blue", 0) if isinstance(color, dict) else 0,
                "alpha": color.get("alpha", 1.0) if isinstance(color, dict) else 1.0,
            },
            "expireTime": a.get("expireTime", ""),
            "issuedTime": a.get("issuedTime", ""),
        })

    return {"alerts": simplified}


# ---- Districts ----

def _build_county_list(district_items: list[dict], parent_name: str) -> list[dict]:
    """Recursively extract county-level entries from Amap district items."""
    counties = []
    for item in district_items:
        lon, lat = parse_center(item.get("center"))
        counties.append({
            "adcode": item.get("adcode", ""),
            "countyorstreets": item.get("name", ""),
            "level": "county",
            "parent": parent_name,
            "longitude": lon,
            "latitude": lat,
        })
    return counties


def transform_districts(district_data: dict) -> dict:
    """Restructure Amap district tree → flat Province[] list for frontend.

    Handles 直辖市 (Beijing/Shanghai/Tianjin/Chongqing) specially:
    - Creates a synthetic city directly under province, skipping pseudo-city layers
      like "北京城区" / "重庆郊县".
    """
    province_items = district_data.get("districts", [{}])[0].get("districts", [])
    provinces = []

    for p_item in province_items:
        p_name = p_item.get("name", "")
        if p_name in SKIP_PROVINCES:
            continue

        cities = []

        if p_name in MUNICIPALITIES:
            # 直辖市: create a synthetic city, then collect all counties
            synthetic_city = {
                "adcode": p_item.get("adcode", ""),
                "city": p_name,
                "county": [],
                "level": "city",
                "parent": p_name,
                "longitude": 0.0,
                "latitude": 0.0,
            }
            pseudo_cities = p_item.get("districts", [])
            for pc in pseudo_cities:
                # Each pseudo-city (e.g. "北京城区") has counties under it
                for co_item in pc.get("districts", []):
                    lon, lat = parse_center(co_item.get("center"))
                    synthetic_city["county"].append({
                        "adcode": co_item.get("adcode", ""),
                        "countyorstreets": co_item.get("name", ""),
                        "level": "county",
                        "parent": p_name,  # parent = province name for 直辖市
                        "longitude": lon,
                        "latitude": lat,
                    })
            # Set city center from first county if available
            if synthetic_city["county"]:
                synthetic_city["longitude"] = synthetic_city["county"][0]["longitude"]
                synthetic_city["latitude"] = synthetic_city["county"][0]["latitude"]
            cities.append(synthetic_city)
        else:
            # Normal province: iterate city → county
            for c_item in p_item.get("districts", []):
                c_lon, c_lat = parse_center(c_item.get("center"))
                counties = _build_county_list(
                    c_item.get("districts", []),
                    c_item.get("name", ""),
                )
                cities.append({
                    "adcode": c_item.get("adcode", ""),
                    "city": c_item.get("name", ""),
                    "county": counties,
                    "level": "city",
                    "parent": p_name,
                    "longitude": c_lon,
                    "latitude": c_lat,
                })

        provinces.append({
            "adcode": p_item.get("adcode", ""),
            "provinces": p_name,
            "city": cities,
            "level": "province",
        })

    return {"provinces": provinces}
