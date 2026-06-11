"""QWeather alert API client."""

from httpx import AsyncClient, HTTPError

from config import settings

ALERT_BASE = "https://mg3aandvh3.re.qweatherapi.com"


class QWeatherError(Exception):
    """Raised when the QWeather API returns a non-success response."""


async def get_weather_alerts(latitude: float, longitude: float) -> dict:
    """Fetch current weather alerts for a location."""
    lat = f"{latitude:.2f}"
    lon = f"{longitude:.2f}"
    url = f"{ALERT_BASE}/weatheralert/v1/current/{lat}/{lon}"

    async with AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, headers={"X-QW-Api-Key": settings.qweather_api_key})
            resp.raise_for_status()
        except HTTPError as e:
            raise QWeatherError(f"QWeather API request failed: {e}") from e

    return resp.json()
