# WeatherReport-vue

基于 Vue 3 + FastAPI 的智能天气预报应用，集成 DeepSeek AI 天气助手，数据来源为[高德开放平台天气 API](https://lbs.amap.com/api/webservice/guide/api/weatherinfo)。

## 功能概览

- **实时天气 + 4 日预报** — 温度、湿度、风力、天气状况，按 adcode 缓存 30 分钟
- **AI 天气助手** — 自然语言对话式天气查询，支持流式输出、Markdown 渲染、内嵌天气卡片
- **城市搜索** — 省/市/区三级行政区划索引，模糊匹配 + 搜索历史 FIFO
- **自适应背景** — 根据天气类型 + 时段（早/午/晚）动态切换背景
- **多级定位回退** — HTML5 定位 → IP 定位 (ip-api.com) → 定位失败页面（可重试或使用默认位置）
- **响应式布局** — 移动端 / 平板 / 桌面 / 宽屏自适应

## 技术栈

### 前端

| 分类 | 选型 |
|------|------|
| 构建 | pnpm + Vite 8.x |
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 样式 | Less + PostCSS（postcss-pxtorem） |
| Markdown | marked |
| 请求 | 原生 fetch（SSE 流式读取） |
| 类型 | TypeScript |

### 后端

| 分类 | 选型 |
|------|------|
| 框架 | FastAPI |
| 服务器 | Uvicorn |
| AI 框架 | LangChain + DeepSeek |
| HTTP 客户端 | httpx（异步） |
| 配置管理 | pydantic-settings |

## 快速开始

### 1. 环境准备

```bash
# 前端
pnpm install

# 后端 — 创建虚拟环境并安装依赖
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
# 或 .venv\Scripts\activate     # Windows CMD
pip install -r backend/requirements.txt
```

### 2. 配置 API Key

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入真实密钥：

```env
AMAP_API_KEY=你的高德开放平台API_KEY
QWEATHER_API_KEY=你的和风天气API_KEY
DEEPSEEK_API_KEY=你的DeepSeek_API_KEY
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### 3. 启动

```bash
# 终端 1 — 启动后端（端口 8000）
cd backend
uvicorn main:app --reload --port 8000

# 终端 2 — 启动前端（端口 5173）
pnpm dev
```

访问 `http://localhost:5173` 即可使用。

## 项目结构

```
WeatherReport-vue/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── postcss.config.js
├── env.d.ts
│
├── backend/                        # Python FastAPI 后端
│   ├── .env / .env.example         # 环境变量（API 密钥等）
│   ├── requirements.txt
│   ├── config.py                   # Pydantic Settings 配置
│   ├── main.py                     # FastAPI 入口：CORS + 路由注册
│   ├── models/                     # Pydantic 响应模型
│   │   └── weather.py              # CurrentWeatherOut, ForecastDayOut 等
│   ├── routers/                    # API 路由
│   │   ├── agent.py                # AI 天气助手 SSE 流式端点
│   │   ├── weather.py              # 天气数据端点
│   │   ├── geocode.py              # 地理编码端点
│   │   ├── district.py             # 行政区划端点
│   │   └── ip.py                   # IP 定位端点
│   ├── services/                   # 外部 API 客户端 + Agent 逻辑
│   │   ├── deepseek_flash.py       # DeepSeek Agent 定义（工具 + 提示词 + build_agent）
│   │   ├── amap.py                 # 高德 API 异步客户端（5 分钟内存缓存）
│   │   ├── address_lookup.py       # 本地 address.json 索引（模糊搜索 adcode）
│   │   ├── qweather.py             # 和风天气 API 客户端
│   │   └── ip_lookup.py            # IP 定位 (ip-api.com)
│   └── utils/
│       └── transformers.py         # 数据转换（Amap → 前端格式）
│
├── public/
│   └── images/                     # 天气背景/图标图片
│
└── src/                            # Vue 3 前端
    ├── main.ts                     # 应用入口
    ├── App.vue                     # 根组件：背景过渡 + 轮询
    │
    ├── types/                      # TypeScript 类型
    │   ├── agent.d.ts              # ChatRequest, ChatMessage, WeatherDataEvent
    │   ├── weather.d.ts
    │   ├── district.d.ts
    │   ├── location.d.ts
    │   └── search.d.ts
    │
    ├── api/                        # API 层
    │   ├── request.ts              # fetch 封装
    │   ├── weather.api.ts
    │   ├── district.api.ts
    │   └── location.api.ts
    │
    ├── stores/                     # Pinia 状态管理
    │   ├── index.ts
    │   ├── agent.ts                # AI 助手：消息列表、流式状态、上下文组装、SSE 回调
    │   ├── weather.ts              # 天气缓存 + 竞态防护
    │   ├── district.ts             # 行政区划缓存
    │   ├── search.ts               # 搜索 + 历史记录
    │   └── weatherAlert.ts         # 天气预警
    │
    ├── utils/
    │   ├── constants.ts            # 全局常量
    │   ├── streamRequest.ts        # SSE 流式客户端（ReadableStream 解析）
    │   ├── weather.ts              # 天气关键词映射、时段判断
    │   ├── debounce.ts
    │   ├── polling.ts
    │   └── sessionCache.ts         # sessionStorage TTL 缓存
    │
    ├── composables/
    │   └── useBackgroundImage.ts   # 背景图片预加载 + 淡入淡出
    │
    ├── components/
    │   ├── AgentEntry.vue          # AI 助手入口按钮
    │   ├── MiniWeatherCard.vue     # 聊天内嵌实时天气卡片
    │   ├── MiniForecastRow.vue     # 聊天内嵌预报行
    │   ├── SearchBox.vue           # 城市搜索框
    │   ├── CurrentWeather.vue      # 实时天气卡片
    │   ├── ForecastCard.vue        # 单日预报卡片
    │   ├── ForecastGrid.vue        # 四日预报网格
    │   ├── WeatherAlertCard.vue    # 天气预警卡片
    │   ├── WeatherAlertModal.vue   # 天气预警弹窗
    │   ├── LoadingOverlay.vue      # 加载弹窗
│   └── LocationUnavailable.vue # 定位失败页面
    │
    ├── views/
    │   ├── Home.vue                # 主页面：定位 → 天气 → 搜索
    │   └── ChatView.vue            # AI 聊天页面：SSE 流式消息 + Markdown + 天气卡片
    │
    ├── router/
    │   └── index.ts                # / → Home, /chat → ChatView
    │
    └── assets/
        ├── less/
        │   ├── variables.less      # 颜色/圆角/断点
        │   ├── mixins.less         # 毛玻璃/天气卡片/响应式
        │   └── global.less         # 全局样式
        ├── images/                 # 天气图标
        └── address/
            └── address.json        # 全国省市区静态数据（~953KB）
```

## 核心架构

### AI Agent 数据流

```
用户输入文字
     │
     ▼
ChatView.vue → agentStore.sendMessage()
     │
     ▼
streamRequest.ts → POST /api/agent/chat/stream (SSE)
     │
     ▼
backend/routers/agent.py
     │
     ├─ _build_context() → 注入位置/天气/历史上下文
     │
     ▼
backend/services/deepseek_flash.py
     │
     ├─ build_agent(extra_context)
     ├─ 5 个 LangChain 工具：
     │   ├─ get_current_weather(adcode)      → 实时天气
     │   ├─ get_weather_forecast(adcode)      → 4 天预报
     │   ├─ search_address_cache(city_name)   → 本地 adcode 查询
     │   ├─ search_city_adcode(city_name)     → 高德 API 查询
     │   └─ get_location_adcode(lon, lat)     → 逆地理编码
     │
     ▼
SSE 事件流 → 前端
     ├─ token        → 逐字追加到消息
     ├─ tool_call    → 工具调用通知
     ├─ tool_result  → 工具结果
     ├─ weather_data → 内嵌天气卡片数据
     └─ done         → 流式结束
```

### 天气 Agent 能力

| 能力 | 说明 |
|------|------|
| 实时天气 | 温度、湿度、天气状况、风力风向 |
| 4 天预报 | 当天 + 未来 3 天，含白天/夜间天气、温度、风力 |
| 穿衣指数 | 根据体感温度、昼夜温差 → 具体穿着建议 |
| 洗车指数 | 近几天降水、风力 → 是否适宜洗车 |
| 运动指数 | 温度、雨雪、风力 → 户外运动适宜度 |
| 防晒指数 | 天气晴朗程度、季节、日照 → 防晒等级 |
| 晾晒指数 | 晴雨、湿度、风力 → 是否适合晾晒 |
| 出游指数 | 降水、温度、风力 → 综合出行建议 |
| 感冒指数 | 昼夜温差、降温幅度 → 感冒风险 |
| 带伞指数 | 降水概率 → 是否需要带伞 |

### 缓存策略

| 场景 | 行为 |
|------|------|
| 首次查询城市 A | 后端 Amap 客户端 5 分钟内存缓存；前端 Pinia store 30 分钟 TTL |
| 30 分钟内再次查询 A | 前端直接读缓存，不发请求 |
| 超过 30 分钟查询 A | 重新请求后端 → 后端可能命中 5 分钟缓存或转发高德 API |
| 快速连续切换城市 | 竞态防护：旧请求返回时 adcode 已变 → 丢弃结果 |

### 定位回退链

```
HTML5 Geolocation (navigator.geolocation)
    ↓ 失败/拒绝（无弹窗，静默降级）
IP 定位 (ip-api.com → 高德正向地理编码)
    ↓ 失败
LocationUnavailable 页面
  ├─ [重新尝试定位] → 重新执行完整定位流程
  └─ [使用默认位置(北京)] → 北京东城区 (adcode=110101)
```

> 注意：IP 定位已从已废弃的 `ip.useragentinfo.com` 迁移至 `ip-api.com`（免费套餐，无需 API Key，45 次/分钟速率限制）。默认北京位置不再自动启用，改为由用户在定位失败页面手动选择。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/weather/combined?adcode=` | 实时 + 预报聚合数据 |
| `GET` | `/api/weather/alerts?lat=&lon=` | 天气预警 |
| `GET` | `/api/geocode/...` | 地理编码相关 |
| `GET` | `/api/district/all` | 刷新行政区划数据 |
| `GET` | `/api/ip/lookup` | IP 定位 (ip-api.com 代理) |
| `POST` | `/api/agent/chat` | AI 助手（非流式） |
| `POST` | `/api/agent/chat/stream` | AI 助手（SSE 流式） |

## 响应式断点

| 断点 | 范围 | 布局 |
|------|------|------|
| 移动端 | 0–767px | 搜索全宽、预报 2×2、聊天全宽 |
| 平板 | 768–1023px | 搜索 60%、预报 4 列、聊天消息 700px |
| 桌面 | 1024–1400px | 聊天消息 900px |
| 宽屏 | 1400px+ | 聊天消息 1000px、加宽侧边留白 |

## 天气图片映射

中文天气关键词 → 图片文件名：

| 天气 | 图片 |
|------|------|
| 晴 | sunny.jpg |
| 多云 | cloudy.jpg |
| 阴 | overcast.jpg |
| 雨 | rainy.jpg |
| 雪 | snowy.jpg |
| 雾/霾 | haze.jpg |
| 沙尘 | sandstorm.jpg |
| 风 | windy.jpg |
| 默认 | Chinamap.JPG |

匹配规则：取第一个包含关系的关键词（如"多云转晴" → cloudy）。

## 环境变量

`backend/.env`：

| 变量 | 说明 |
|------|------|
| `AMAP_API_KEY` | 高德开放平台 API Key（天气/地理编码/行政区划） |
| `QWEATHER_API_KEY` | 和风天气 API Key |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（AI 助手） |
| `CORS_ORIGINS` | 允许的前端来源，逗号分隔 |
