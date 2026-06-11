"""AI Weather Agent endpoints — wraps the DeepSeek agent as an HTTP API.

Supports dynamic context injection: request body fields are converted
to a structured "user context" block appended to the system prompt,
so the agent knows user location, preferences, etc. without the user
having to type them in every message.
"""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.deepseek_flash import build_agent
from services.amap import get_weather_base, get_weather_all
from services.address_lookup import adcode_to_name
from utils.transformers import transform_weather_combined

router = APIRouter(prefix="/api/agent", tags=["agent"])


# ---- Request Model ----
# 以下字段会作为上下文注入到 System Prompt 中。
# 新增辅助字段只需加在这里 + 在 _build_context() 中生成说明文字即可。

class WeatherSummary(BaseModel):
    """前端携带的当前定位城市天气摘要"""
    temperature: str = ""
    humidity: str = ""
    weather: str = ""
    daytemp: str = ""
    nighttemp: str = ""
    winddirection: str = ""
    windpower: str = ""


class ChatRequest(BaseModel):
    message: str = Field(..., description="用户问题，如 '今天天气怎么样？'")

    # -- 位置信息（前端自动携带，用户无感） --
    user_adcode: str | None = Field(
        default=None, description="用户当前城市的 adcode，如 440300"
    )
    user_city: str | None = Field(
        default=None, description="用户当前城市名，如 '深圳市'"
    )
    user_district: str | None = Field(
        default=None, description="用户当前区县名，如 '南山区'"
    )
    user_lat: float | None = Field(
        default=None, description="用户纬度"
    )
    user_lon: float | None = Field(
        default=None, description="用户经度"
    )

    # -- 查询偏好 --
    include_forecast: bool = Field(
        default=False, description="是否默认查未来天气预报"
    )
    preferred_units: str = Field(
        default="celsius", description="温度单位: celsius / fahrenheit"
    )

    # -- 输出控制 --
    stream: bool = Field(
        default=False, description="是否用 SSE 流式返回"
    )

    # -- 历史对话 --
    history: str | None = Field(
        default=None, description="历史对话上下文，格式: '用户: xxx; 助手: yyy'"
    )

    # -- 当前天气上下文（仅当用户未指定城市时使用） --
    current_weather: WeatherSummary | None = Field(
        default=None, description="当前定位城市的实时天气摘要"
    )
    current_forecast: list[dict] | None = Field(
        default=None, description="当前定位城市的预报摘要"
    )


# ---- Response Models ----

class ToolCallInfo(BaseModel):
    tool: str
    args: dict


class ChatResponse(BaseModel):
    reply: str
    tool_calls: list[ToolCallInfo] = Field(default_factory=list)


# ---- Context Builder ----

def _build_context(req: ChatRequest) -> str:
    """将请求中的辅助字段转换为注入 System Prompt 的上下文段落。

    格式：
        ## 当前用户上下文（自动注入，非用户输入）
        - 用户位于: 广东省深圳市南山区 (adcode=440305)
        - 用户坐标: 22.54, 114.06
        - 查询偏好: 需要预报, 温度单位=摄氏度

    这段会追加到 System Prompt 末尾，LLM 将其视为已确认的默认信息。
    如果用户消息中指定了不同的城市，LLM 应优先使用用户指定的城市。
    """
    parts: list[str] = []

    # 位置信息
    location_parts = []
    if req.user_city:
        location_parts.append(req.user_city)
    if req.user_district:
        location_parts.append(req.user_district)
    if location_parts:
        loc_str = "".join(location_parts)
        if req.user_adcode:
            parts.append(f"- 用户位于: {loc_str} (adcode={req.user_adcode})")
        else:
            parts.append(f"- 用户位于: {loc_str}")

    if req.user_lat is not None and req.user_lon is not None:
        parts.append(f"- 用户坐标: {req.user_lat}, {req.user_lon}")

    # 历史对话（每条用分号分隔，格式: 用户: xxx; 助手: yyy）
    if req.history:
        parts.append("")
        parts.append("## 历史对话上下文（此前已经完成的对话轮次）")
        parts.append(req.history)

    # 查询偏好
    prefs = []
    if req.include_forecast:
        prefs.append("需要查看未来几天预报")
    if req.preferred_units == "fahrenheit":
        prefs.append("温度单位=华氏度")
    if prefs:
        parts.append(f"- 查询偏好: {', '.join(prefs)}")

    # 当前天气数据（仅当用户未指定城市时使用）
    if req.current_weather:
        w = req.current_weather
        parts.append("")
        parts.append("## 用户当前位置的天气数据（仅当用户未明确指定其他城市时使用）")
        parts.append(
            f"- 当前天气: {w.weather}, {w.temperature}°C, "
            f"湿度{w.humidity}%, {w.winddirection}风{w.windpower}级"
        )
        parts.append(f"- 今日温度: {w.daytemp}°C / {w.nighttemp}°C")
        if req.current_forecast:
            forecasts = []
            for f in req.current_forecast:
                forecasts.append(
                    f"{f.get('label', '?')}({f.get('date', '?')}): "
                    f"{f.get('dayweather', '?')}, "
                    f"{f.get('nighttemp', '?')}~{f.get('daytemp', '?')}°C"
                )
            parts.append(f"- 未来预报: {'; '.join(forecasts)}")
        parts.append("")
        parts.append(
            "**重要**：以上天气数据仅限用户未明确指定其他城市时使用。"
            "如果用户明确说了城市名（如'北京天气'），必须以用户指定的城市为准，调用工具重新查询。"
            "对于'今天适合出门吗''要不要带伞'等未指明城市的日常问题，直接使用以上数据回答，无需调用工具。"
        )

    if not parts:
        return ""

    return (
        "## 当前用户上下文（自动注入，非用户输入）\n"
        + "\n".join(parts)
        + "\n\n"
          "说明：以上信息由系统自动提供。"
          "如果用户消息中未指定城市，默认查询上述城市。"
          "如果用户明确指定了其他城市，以用户指定的为准。"
    )


# ---- Endpoints ----

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """调用 AI 天气助手，动态注入请求中的位置/偏好等上下文。"""
    context = _build_context(req)
    agent = build_agent(extra_context=context)

    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": req.message}]}
    )

    messages = result.get("messages", [])

    # 提取 tool calls
    tool_calls = []
    for msg in messages:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append(ToolCallInfo(
                    tool=tc.get("name", "unknown"),
                    args=tc.get("args", {}),
                ))

    # 提取最终回复
    ai_messages = [
        m for m in messages
        if hasattr(m, "content") and m.content
        and getattr(m, "type", None) != "tool"
    ]
    reply = ai_messages[-1].content if ai_messages else "No response generated."

    return ChatResponse(reply=reply, tool_calls=tool_calls)


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """流式 SSE 版本，同样支持上下文注入。

    新增：当 agent 调用天气工具时，自动获取原始数据并转换为
    store 兼容结构作为 weather_data 事件发出。
    """
    context = _build_context(req)
    agent = build_agent(extra_context=context)

    # 记录 tool run_id → {name, args}，供 on_tool_end 使用
    pending_tools: dict[str, dict] = {}
    # 累积已发出的 weather_data（按 adcode 去重）
    emitted_weather_adcodes: set[str] = set()
    weather_data_events: list[dict] = []

    async def event_generator():
        nonlocal weather_data_events

        try:
            async for event in agent.astream_events(
                {"messages": [{"role": "user", "content": req.message}]},
                version="v2",
            ):
                kind = event.get("event", "")
                run_id = event.get("run_id", "")

                if kind == "on_tool_start":
                    name = event.get("name", "unknown")
                    args = event.get("data", {}).get("input", {})
                    pending_tools[run_id] = {"name": name, "args": args}

                    data = {
                        "type": "tool_call",
                        "tool": name,
                        "args": args,
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

                elif kind == "on_tool_end":
                    name = event.get("name", "unknown")
                    output = event.get("data", {}).get("output", "")
                    data = {
                        "type": "tool_result",
                        "tool": name,
                        "output": str(output)[:500],
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

                    # 天气工具 → 获取结构化数据
                    if name in ("get_current_weather", "get_weather_forecast"):
                        tool_info = pending_tools.get(run_id, {})
                        adcode = tool_info.get("args", {}).get("adcode", "")
                        if adcode and adcode not in emitted_weather_adcodes:
                            emitted_weather_adcodes.add(adcode)
                            try:
                                base_data, all_data = await asyncio.gather(
                                    get_weather_base(adcode),
                                    get_weather_all(adcode),
                                )
                                combined = transform_weather_combined(base_data, all_data)
                                city_info = adcode_to_name(adcode)
                                city_name = city_info.get("name", "") if city_info else ""

                                wd = {
                                    "type": "weather_data",
                                    "adcode": adcode,
                                    "city": city_name,
                                    "data": combined,
                                }
                                weather_data_events.append(wd)
                                yield f"data: {json.dumps(wd, ensure_ascii=False)}\n\n"
                            except Exception as e:
                                # weather_data 失败不影响主流程
                                yield f"data: {json.dumps({'type': 'log', 'message': f'weather_data fetch failed: {e}'})}\n\n"

                elif kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk", {})
                    if hasattr(chunk, "content") and chunk.content:
                        data = {"type": "token", "content": chunk.content}
                        yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

            # done 事件附带累积的 weather_data
            done = {"type": "done", "weather_data": weather_data_events}
            yield f"data: {json.dumps(done, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
