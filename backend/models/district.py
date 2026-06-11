"""District / administrative division response models."""

from pydantic import BaseModel


class CountyOut(BaseModel):
    adcode: str
    countyorstreets: str
    level: str = "county"
    parent: str
    longitude: float
    latitude: float


class CityOut(BaseModel):
    adcode: str
    city: str
    county: list[CountyOut]
    level: str = "city"
    parent: str
    longitude: float
    latitude: float


class ProvinceOut(BaseModel):
    adcode: str
    provinces: str
    city: list[CityOut]
    level: str = "province"


class DistrictAllOut(BaseModel):
    provinces: list[ProvinceOut]
