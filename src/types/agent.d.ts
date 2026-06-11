// ============================================
// Agent 聊天相关类型 / Agent Chat Types
// ============================================

import type { CurrentWeatherData, ForecastDayData } from './weather'

/** 发送给后端的聊天请求 */
export interface ChatRequest {
  message: string
  /** 历史对话上下文，格式: "用户: xxx; 助手: yyy; 用户: zzz" */
  history?: string | null
  user_adcode?: string | null
  user_city?: string | null
  user_district?: string | null
  user_lat?: number | null
  user_lon?: number | null
  include_forecast?: boolean
  stream: true
  /** 当前定位城市的天气摘要（仅当用户未指定城市时，LLM 直接使用） */
  current_weather?: {
    temperature: string
    humidity: string
    weather: string
    daytemp: string
    nighttemp: string
    winddirection: string
    windpower: string
  } | null
  /** 当前定位城市的预报摘要 */
  current_forecast?: Array<{
    label: string
    date: string
    dayweather: string
    nighttemp: string
    daytemp: string
  }> | null
}

/** SSE weather_data 事件 */
export interface WeatherDataEvent {
  adcode: string
  city: string
  data: {
    current: Omit<CurrentWeatherData, 'weatherImage'>
    forecast: Omit<ForecastDayData, 'weatherImage'>[]
  }
}

/** SSE done 事件 */
export interface DoneEvent {
  type: 'done'
  weather_data: WeatherDataEvent[]
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  weatherData?: WeatherDataEvent[]
  timestamp: number
}
