"""IP geolocation lookup via ip-api.com (free tier, no API key needed)."""

from httpx import AsyncClient, HTTPError

# Free tier uses HTTP only; HTTPS requires paid "pro" plan.
# This is a server-to-server call so plain HTTP is acceptable.
IP_LOOKUP_URL = "http://ip-api.com/json/"


class IPLookupError(Exception):
    """Raised when the IP lookup fails."""


async def get_ip_info() -> dict:
    """
    Fetch IP geolocation info and return a normalized response.

    Maps ip-api.com fields:
        city       -> city
        regionName -> region
        country    -> country

    Raises IPLookupError on HTTP errors or when the API returns
    status "fail" (invalid IP, rate limited, etc.).
    """
    async with AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(IP_LOOKUP_URL)
            resp.raise_for_status()
        except HTTPError as e:
            raise IPLookupError(f"IP lookup failed: {e}") from e

    data = resp.json()

    if data.get("status") != "success":
        message = data.get("message", "Unknown error")
        raise IPLookupError(f"IP lookup failed: {message}")

    return {
        "city": data.get("city", ""),
        "region": data.get("regionName", ""),
        "country": data.get("country", ""),
    }
