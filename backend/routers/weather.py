"""Weather endpoints."""

import asyncio

from fastapi import APIRouter, HTTPException

from services.amap import get_weather_base, get_weather_all, AmapError
from services.qweather import get_weather_alerts, QWeatherError
from utils.transformers import transform_weather_combined, transform_alerts

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/combined")
async def weather_combined(adcode: str):
    """Get combined weather data (live + 4-day forecast) for an adcode.

    Calls Amap base & all in parallel — eliminates the 1.2s sequential delay
    that the frontend previously had to impose.
    """
    try:
        base_data, all_data = await asyncio.gather(
            get_weather_base(adcode),
            get_weather_all(adcode),
        )
    except AmapError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return transform_weather_combined(base_data, all_data)


@router.get("/alerts")
async def weather_alerts(lat: float, lon: float):
    """Get weather alerts for a location (filters expired alerts)."""
    try:
        raw = await get_weather_alerts(lat, lon)
    except QWeatherError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if raw.get("metadata", {}).get("zeroResult") or not raw.get("alerts"):
        return {"alerts": []}

    return transform_alerts(raw)
