"""District endpoints."""

from fastapi import APIRouter, HTTPException

from services.amap import get_all_districts, AmapError
from utils.transformers import transform_districts

router = APIRouter(prefix="/api/district", tags=["district"])


@router.get("/all")
async def district_all():
    """Get full China district tree (provinces → cities → counties).

    Data is pre-restructured: municipalities (直辖市) are flattened,
    coordinates are parsed, and skipped provinces (台湾/港澳) are removed.
    """
    try:
        data = await get_all_districts()
    except AmapError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return transform_districts(data)
