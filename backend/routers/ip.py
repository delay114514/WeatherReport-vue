"""IP geolocation endpoint (ip-api.com free tier)."""

from fastapi import APIRouter, HTTPException

from services.ip_lookup import get_ip_info, IPLookupError

router = APIRouter(prefix="/api/ip", tags=["ip"])


@router.get("/lookup")
async def ip_lookup():
    """
    Proxy IP geolocation via ip-api.com.

    Returns normalized {city, region, country}. No API key needed
    on either side (free tier, 45 req/min rate limit).
    """
    try:
        return await get_ip_info()
    except IPLookupError as e:
        raise HTTPException(status_code=502, detail=str(e))
