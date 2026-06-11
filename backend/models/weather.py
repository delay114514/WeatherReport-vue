"""Weather response models — the restructured data returned to the frontend."""

from pydantic import BaseModel


class CurrentWeatherOut(BaseModel):
    temperature: str
    humidity: str
    weather: str  # "多云"
    winddirection: str
    windpower: str
    reporttime: str
    daytemp: str  # from forecast[0]
    nighttemp: str  # from forecast[0]


class ForecastDayOut(BaseModel):
    date: str
    week: str
    dayweather: str
    nightweather: str
    daytemp: str
    nighttemp: str
    daywind: str
    nightwind: str
    daypower: str
    nightpower: str
    label: str  # "今天" | "明天" | "后天" | "大后天"


class WeatherCombinedOut(BaseModel):
    current: CurrentWeatherOut
    forecast: list[ForecastDayOut]


class AlertColor(BaseModel):
    code: str
    red: int
    green: int
    blue: int
    alpha: float


class WeatherAlertOut(BaseModel):
    headline: str
    description: str
    severity: str
    colorCode: str
    color: AlertColor
    expireTime: str
    issuedTime: str


class WeatherAlertsOut(BaseModel):
    alerts: list[WeatherAlertOut]
