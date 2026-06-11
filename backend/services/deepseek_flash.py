import json
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config import settings

# 导入你的高德 API 客户端
from services.amap import (
    get_weather_base,
    get_weather_all,
    geocode_regeo,
    geocode_geo,
    AmapError
)

# 导入本地地址缓存查找
from services.address_lookup import search_address, adcode_to_name, get_hot_city_table


# 1. 定义 Tools - 将你的 API 函数包装成 LangChain tools
@tool
async def get_current_weather(adcode: str) -> str:
    """
    获取指定城市的实时天气信息。
    
    Args:
        adcode: 城市行政区划代码，如北京是110000，上海是310000
        
    Returns:
        包含温度、湿度、天气状况、风力等实时天气信息的JSON字符串
    """
    try:
        data = await get_weather_base(adcode)
        if data.get("lives"):
            weather = data["lives"][0]
            return json.dumps({
                "城市": weather.get("city"),
                "天气": weather.get("weather"),
                "温度": f"{weather.get('temperature')}°C",
                "风向": weather.get("winddirection"),
                "风力": weather.get("windpower"),
                "湿度": f"{weather.get('humidity')}%",
                "报告时间": weather.get("reporttime")
            }, ensure_ascii=False, indent=2)
        return "未获取到天气数据"
    except AmapError as e:
        return f"获取天气失败: {str(e)}"


@tool
async def get_weather_forecast(adcode: str) -> str:
    """
    获取指定城市未来4天的天气预报（含当天，共4天）。

    Args:
        adcode: 城市行政区划代码，如北京是110000

    Returns:
        包含未来4天天气预测的JSON字符串，包括温度、天气状况、风力等
    """
    try:
        data = await get_weather_all(adcode)
        if data.get("forecasts"):
            forecast = data["forecasts"][0]
            casts = forecast.get("casts", [])
            
            forecast_list = []
            for cast in casts:
                forecast_list.append({
                    "日期": cast.get("date"),
                    "星期": cast.get("week"),
                    "白天天气": cast.get("dayweather"),
                    "夜间天气": cast.get("nightweather"),
                    "白天温度": f"{cast.get('daytemp')}°C",
                    "夜间温度": f"{cast.get('nighttemp')}°C",
                    "白天风力": cast.get("daypower"),
                    "夜间风力": cast.get("nightpower")
                })
            
            return json.dumps({
                "城市": forecast.get("city"),
                "预报": forecast_list
            }, ensure_ascii=False, indent=2)
        return "未获取到天气预报数据"
    except AmapError as e:
        return f"获取天气预报失败: {str(e)}"


@tool
async def get_location_adcode(longitude: float, latitude: float) -> str:
    """
    根据经纬度获取对应的行政区划代码和地址信息。
    
    Args:
        longitude: 经度
        latitude: 纬度
        
    Returns:
        包含地址和adcode的JSON字符串
    """
    try:
        data = await geocode_regeo(longitude, latitude)
        if data.get("regeocode"):
            regeo = data["regeocode"]
            address_component = regeo.get("addressComponent", {})
            return json.dumps({
                "地址": regeo.get("formatted_address"),
                "城市": address_component.get("city"),
                "区县": address_component.get("district"),
                "adcode": address_component.get("adcode"),
                "城市代码": address_component.get("citycode")
            }, ensure_ascii=False, indent=2)
        return "未获取到位置信息"
    except AmapError as e:
        return f"获取位置失败: {str(e)}"


@tool
async def search_city_adcode(city_name: str) -> str:
    """
    根据城市名称搜索对应的行政区划代码。
    
    Args:
        city_name: 城市名称，如"北京"、"上海浦东"等
        
    Returns:
        包含城市信息和adcode的JSON字符串
    """
    try:
        data = await geocode_geo(city_name)
        if data.get("geocodes"):
            geocode = data["geocodes"][0]
            return json.dumps({
                "地址": geocode.get("formatted_address"),
                "城市": geocode.get("city"),
                "adcode": geocode.get("adcode"),
                "坐标": geocode.get("location")
            }, ensure_ascii=False, indent=2)
        return "未找到该城市信息"
    except AmapError as e:
        return f"搜索城市失败: {str(e)}"


@tool
async def search_address_cache(city_name: str) -> str:
    """
    在本地地址缓存中查找城市/区县的行政区划代码（adcode）。
    覆盖全国省、市、区县三级行政区划，支持模糊匹配。
    优先使用此工具查找 adcode，无需消耗 API 配额。

    Args:
        city_name: 城市或区县名称，如"北京"、"深圳"、"海淀"等

    Returns:
        包含匹配结果的 JSON 字符串，每条包含 adcode、全名、级别、坐标等
    """
    results = search_address(city_name, max_results=10)
    if not results:
        return json.dumps({
            "message": f"本地缓存中未找到'{city_name}'，请尝试使用 search_city_adcode 调用高德API查询",
            "results": []
        }, ensure_ascii=False, indent=2)

    return json.dumps({
        "query": city_name,
        "count": len(results),
        "results": [
            {
                "adcode": r.adcode,
                "名称": r.name,
                "完整地址": r.full_name,
                "级别": r.level,
                "所属上级": r.parent,
                "所在省份": r.province,
                "经度": r.longitude,
                "纬度": r.latitude,
            }
            for r in results
        ]
    }, ensure_ascii=False, indent=2)


# 2. 创建 LLM 实例（使用新版 init_chat_model）
llm = init_chat_model(
    model="deepseek-chat",
    model_provider="deepseek",
    temperature=0.7,
    api_key=settings.deepseek_api_key,
)


# 3. 定义系统提示词
SYSTEM_PROMPT = """你是一个专业的气象服务助手，能够通过高德地图API获取准确的天气数据。

你的能力：
1. 查询实时天气：获取当前温度、湿度、天气状况、风力等信息
2. 查询天气预报：获取未来4天的天气预测（含当天，共4天）
3. 位置查询：通过经纬度或城市名称获取位置信息
4. 综合气象分析：结合实时数据和预报数据，提供全面的天气分析
5. 生活指数分析：综合温度、湿度、风力、降水、温差等气象要素，对以下常见活动进行智能研判：
   - 穿衣指数：体感温度、昼夜温差 → 直接告诉用户出门应该穿什么衣服（如上衣、下装、外套、鞋子等具体类型），再说明是否需要备用衣物应对温差
   - 洗车指数：近几天有无降水、风力大小 → 是否适宜洗车
   - 运动指数：温度是否适宜、有无雨雪大风、空气质量 → 是否适合户外运动
   - 防晒/紫外线：天气晴朗程度、季节和日照强度 → 防晒等级建议
   - 晾晒指数：天气晴雨、湿度、风力 → 是否适合晾晒衣物
   - 出游指数：降水概率、温度舒适度、风力 → 综合出行适宜度
   - 感冒指数：昼夜温差、降温幅度 → 感冒风险提示
   - 带伞指数：降水概率 → 是否需要带伞
   分析时需结合具体数据说明判断依据，而非仅给结论
6. 只回答天气或与当前天气相关的生活问题，拒绝闲聊

工作流程：
1. 当用户询问天气时，首先确认用户查询的地点和时间范围
2. 对模糊地点主动追问澄清
3. 若用户问题中无涉及任何城市地址或经纬度，默认使用用户携带的当前的地址信息json对象
3. 如果用户提供的是城市/区县名称，优先使用 search_address_cache 在本地地址库中查找 adcode（覆盖全国省市县三级，零 API 消耗）
4. 仅当本地查找无结果时，才使用 search_city_adcode 调用高德 API
5. 如果用户提供的是经纬度，使用 get_location_adcode 获取位置信息
6. 根据用户需求选择合适的天气查询工具（实时天气或预报）
7. 将获取的数据以友好、专业的方式呈现给用户

回答要求：
- 使用专业但不晦涩的天气术语
- 根据天气情况提供生活建议（穿衣、出行、防晒、带伞等）
- 当用户询问或话题涉及生活指数时，主动分析相关指数，使用三级指标（✅适宜 / ⚠️一般 / ❌不建议），并附上简短的判断依据（如"温度35°C且无风，不适宜户外运动"）。穿衣指数必须给出具体穿着建议（如"建议穿短袖T恤+薄长裤，带一件薄外套"），不能只描述温度
- 用户未指定具体指数时，默认给出穿衣、带伞、出行三项最常用的建议
- 对于特殊天气（高温、暴雨、大风等），给出特别提醒
- 预报数据最多覆盖4天（今天+未来3天），当用户询问超过此范围（如"未来一周"）时，需明确告知只能预报4天
- 语气亲切自然，结构清晰易读
- 如果用户只说了城市名没说明查实时还是预报，主动询问。
- 默认用中文回答，但如果用户用英文提问，就用英文回答。

请根据用户的问题，合理使用工具来获取天气数据。"""

# 动态注入热门城市 adcode 速查表
_HOT_CITY_TABLE = get_hot_city_table()
SYSTEM_PROMPT += f"""

## 热门城市 adcode 速查表

以下是常见城市的 adcode 对照表（格式: 名称→adcode，分号分隔）。
当用户查询这些城市时，你可以直接使用对应的 adcode 调用天气工具，无需先调用 search_address_cache。

{_HOT_CITY_TABLE}

注意：如果用户查询的城市不在表中，再使用 search_address_cache 或 search_city_adcode 查找。"""


# 4. 通用 Base Prompt（不含上下文注入，供 build_agent 使用）
BASE_SYSTEM_PROMPT = SYSTEM_PROMPT  # 保留原始版本

# 可用工具列表（模块级共享，所有 agent 实例复用）
tools = [
    get_current_weather,
    get_weather_forecast,
    get_location_adcode,
    search_address_cache,
    search_city_adcode,
]


def build_agent(extra_context: str = ""):
    """
    创建一个带有动态上下文的 Agent 实例。

    Args:
        extra_context: 追加到 System Prompt 末尾的上下文信息。
                       用于注入请求级别的数据（用户位置、偏好等）。
                       格式建议：Markdown 段落或结构化字段。

    Returns:
        配置好的 CompiledStateGraph agent 实例
    """
    final_prompt = SYSTEM_PROMPT
    if extra_context:
        final_prompt += f"\n\n{extra_context}"

    return create_agent(
        model=llm,
        tools=tools,
        system_prompt=final_prompt,
    )


# 默认 agent（无额外上下文，兼容旧调用方式）
agent = build_agent()


# 5. 使用示例 - 流式输出
async def query_weather(user_input: str):
    """查询天气的主函数"""
    print(f"👤 用户: {user_input}\n")
    print("🤖 助手: ", end="", flush=True)

    async for chunk in agent.astream(
        {"messages": [{"role": "user", "content": user_input}]}
    ):
        if "messages" in chunk:
            msg = chunk["messages"]
            if hasattr(msg, 'content') and msg.content:
                print(msg.content, end="", flush=True)

    print("\n" + "="*50)


# 6. 运行示例
async def main():
    queries = [
        "北京今天天气怎么样？",
        "上海的经纬度是121.47,31.23，这里未来三天天气如何？",
        "广州天河区现在热不热？需要防晒吗？",
        "深圳和北京哪个更热？"
    ]
    
    for query in queries:
        await query_weather(query)
        print()


# 运行
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())