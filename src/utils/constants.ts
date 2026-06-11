// ============================================
// 全局常量 / Global Constants
// ============================================

/** 后端 API 基础路径（开发直连 localhost:8000，生产环境改为实际部署地址） */
export const BACKEND_BASE_URL = 'http://localhost:8000'

// ---- 以下常量仅为前端展示逻辑，不涉及 API Key ----
export const BG_KEYWORDS: Record<string, string> = {
  '多云': '多云',
  '晴': '晴',
  '阴': '阴',
  '雪': '雪',
  '雨': '雨',
  '雷': '雨',
  '雹': '雨',
  '暴': '雨',
  '雾': '雾',
  '霾': '霾',
  '尘': '沙尘',
  '沙': '沙尘',
  '风': '风',
}

// ---- 天气图标映射：天气文字 → 英文文件名（public/images/icon/） ----
export const ICON_KEYWORDS: Record<string, string> = {
  '多云': 'cloudy',
  '晴': 'sunny',
  '阴': 'overcast',
  '雪': 'snowy',
  '雨': 'rainy',
  '雷': 'thunderstorm',
  '雹': 'hail',
  '暴': 'thunderstorm',
  '雾': 'haze',
  '霾': 'haze',
  '尘': 'sandstorm',
  '沙': 'sandstorm',
  '风': 'windy',
}

// ---- 日期标签映射 ----
export const DAY_LABELS: Record<string, string> = {
  today: '今天',
  tomorrow: '明天',
  dayaftertomorrow: '后天',
  threedaysformnow: '大后天',
}

export const DAY_KEYS = ['today', 'tomorrow', 'dayaftertomorrow', 'threedaysformnow'] as const

// ---- 时间段判断阈值（小时） ----
export const NIGHT_END = 8
export const MORNING_END = 11
export const AFTERNOON_END = 18

// ---- 缓存与轮询 TTL（毫秒） ----
export const WEATHER_CACHE_TTL = 30 * 60 * 1000      // 30 分钟
export const POLLING_INTERVAL = 30 * 60 * 1000        // 30 分钟

// ---- 交互延迟 ----
export const DEBOUNCE_DELAY = 500                      // 搜索防抖 0.5 秒
export const API_DELAY = 500                          // 行政区划 API 间延迟

// ---- 默认回退值 ----
export const DEFAULT_ADCODE = '110101'                // 北京东城区
export const DEFAULT_LOCATION_NAME = '北京市'

// ---- 直辖市 / 特别行政区（city = province 名称，无 county 层级） ----
export const MUNICIPALITIES: Set<string> = new Set([
  '北京市', '天津市', '上海市', '重庆市',
  '澳门特别行政区', '香港特别行政区',
])

// ---- 跳过的省份 ----
export const SKIP_PROVINCES: Set<string> = new Set([
  '台湾省',
  '香港特别行政区',   // 高德天气 API 不支持
  '澳门特别行政区',   // 高德天气 API 不支持
])
