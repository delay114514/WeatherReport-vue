// ============================================
// 高德天气 API 响应类型 / Amap Weather API Types
// ============================================

/** 实况天气（base）—— 单条实时数据 */
export interface AmapLiveWeather {
  province: string
  city: string
  adcode: string
  reporttime: string       // "2018-12-13 14:30:00"
  temperature: string       // "22" (int-as-string from Amap)
  humidity: string          // "66" (int-as-string)
  weather: string           // "多云"
  winddirection: string     // "东北"
  windpower: string         // "≤3"
}

/** 实况天气 API 总响应 */
export interface AmapWeatherBaseResponse {
  status: '0' | '1'
  count: string
  info: string
  infocode: string
  lives: AmapLiveWeather[]
}

/** 天气预报单日数据 */
export interface AmapForecastCast {
  date: string              // "2018-12-13"
  week: string              // "4"
  dayweather: string        // "多云"
  nightweather: string      // "多云"
  daytemp: string           // "29"
  nighttemp: string         // "18"
  daywind: string           // "北"
  nightwind: string         // "北"
  daypower: string
  nightpower: string
}

/** 天气预报（all）—— 单城市预报块 */
export interface AmapForecast {
  city: string
  adcode: string
  province: string
  reporttime: string
  casts: AmapForecastCast[]  // [today, tomorrow, dayAfterTomorrow, 3DaysFromNow]
}

/** 天气预报 API 总响应 */
export interface AmapWeatherAllResponse {
  status: '0' | '1'
  count: string
  info: string
  infocode: string
  forecasts: AmapForecast[]
}

// ---- Internal Normalized Types ----

/** 当前天气展示数据（已标准化） */
export interface CurrentWeatherData {
  temperature: string
  humidity: string
  weather: string            // 原始中文天气文字，如 "多云"
  weatherImage: string       // 对应图片路径，如 "image/cloudy.jpg"
  winddirection: string
  windpower: string
  reporttime: string
  daytemp: string
  nighttemp: string
}

/** 单日预报展示数据 */
export interface ForecastDayData {
  date: string
  week: string
  dayweather: string
  nightweather: string
  weatherImage: string
  daytemp: string
  nighttemp: string
  daywind: string
  nightwind: string
  daypower: string
  nightpower: string
  label: string              // "今天" | "明天" | "后天" | "大后天"
}

/** 天气缓存条目 */
export interface WeatherCacheEntry {
  adcode: string
  data: {
    current: CurrentWeatherData
    forecast: ForecastDayData[]
  }
  timestamp: number          // Date.now() 记录
}

/** 天气关键词映射值 */
export type WeatherKeyword =
  | 'cloudy' | 'sunny' | 'overcast' | 'snowy' | 'rainy'
  | 'haze' | 'sandstorm' | 'windy'

// ---- 天气预警类型 / Weather Alert Types ----

/** 预警原始响应中的颜色 */
export interface AlertColor {
  code: string
  red: number
  green: number
  blue: number
  alpha: number
}

/** 预警原始响应条目 */
export interface RawAlertItem {
  id: string
  senderName: string
  issuedTime: string
  headline: string
  description: string
  severity: string
  color: AlertColor
  expireTime: string
  eventType?: { name: string; code: string }
}

/** 预警 API 响应 */
export interface WeatherAlertResponse {
  metadata: {
    tag: string
    zeroResult: boolean
  }
  alerts: RawAlertItem[]
}

/** 简化后的预警缓存数据 */
export interface WeatherAlert {
  headline: string
  description: string
  severity: string
  colorCode: string
  color: AlertColor
  expireTime: string
  issuedTime: string
}
