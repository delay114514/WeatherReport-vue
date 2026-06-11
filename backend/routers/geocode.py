"""Geocoding endpoints."""

from fastapi import APIRouter, HTTPException

from services.amap import geocode_regeo, geocode_geo, AmapError

router = APIRouter(prefix="/api/geocode", tags=["geocode"])


@router.get("/regeo")
async def regeo(lon: float, lat: float):
    """Reverse geocode: longitude,latitude → adcode + address."""
    try:
        data = await geocode_regeo(lon, lat)
    except AmapError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "status": data.get("status", "0"),
        "regeocode": data.get("regeocode", {}),
    }


@router.get("/geo")
async def geo(address: str):
    """Forward geocode: address text → adcode."""
    try:
        data = await geocode_geo(address)
    except AmapError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "status": data.get("status", "0"),
        "geocodes": data.get("geocodes", []),
    }
