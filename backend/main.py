"""WeatherReport Backend — FastAPI application entry point.

Proxies Amap (高德) and QWeather APIs, hiding API keys from the frontend.
Restructures raw API responses into frontend-friendly formats.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import weather, geocode, district, ip, agent

app = FastAPI(
    title="WeatherReport Backend",
    description="API proxy and data transformer for WeatherReport-vue",
    version="1.0.0",
)

# CORS — allow frontend dev server and preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(weather.router)
app.include_router(geocode.router)
app.include_router(district.router)
app.include_router(ip.router)
app.include_router(agent.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
