"""Geocoding response models."""

from pydantic import BaseModel


class AddressComponent(BaseModel):
    adcode: str
    district: str
    city: str
    province: str


class RegeoData(BaseModel):
    addressComponent: AddressComponent


class RegeoOut(BaseModel):
    status: str  # "0" | "1"
    regeocode: RegeoData


class GeoResult(BaseModel):
    adcode: str | None = None


class GeoOut(BaseModel):
    status: str
    geocodes: list[GeoResult] | None = None
