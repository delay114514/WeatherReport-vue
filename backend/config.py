"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    amap_api_key: str
    qweather_api_key: str
    deepseek_api_key: str = "sk-0fafe7a7794b47da91b7b3f1af46630f"
    address_json_path: str = ""  # 为空时自动探测
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
