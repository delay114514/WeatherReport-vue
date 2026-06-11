// ============================================
// 天气 API / Weather API
// ============================================

import { api } from './request'
import { BACKEND_BASE_URL } from '@/utils/constants'
/** 后端 /api/weather/combined 返回结构（不含 weatherImage，由前端 store 补充） */
interface WeatherCombinedResponse {
  current: Omit<import('@/types/weather').CurrentWeatherData, 'weatherImage'>
  forecast: Omit<import('@/types/weather').ForecastDayData, 'weatherImage'>[]
}

/**
 * 获取合并天气数据（实时 + 4日预报）
 * 后端并行请求高德 base + all，消除前端原有的 1.2s 间隔延迟
 * @param adcode - 行政区划编码
 */
export async function getWeatherCombined(
  adcode: string
): Promise<WeatherCombinedResponse> {
  const url = `${BACKEND_BASE_URL}/api/weather/combined?adcode=${adcode}`
  return api.get(url) as Promise<WeatherCombinedResponse>
}

/**
 * 获取天气预警信息
 * @param latitude - 纬度（精确到小数点后两位）
 * @param longitude - 经度（精确到小数点后两位）
 */
export async function fetchWeatherAlerts(
  latitude: number,
  longitude: number
): Promise<{ alerts: import('@/types/weather').WeatherAlert[] }> {
  const lat = latitude.toFixed(2)
  const lon = longitude.toFixed(2)
  const url = `${BACKEND_BASE_URL}/api/weather/alerts?lat=${lat}&lon=${lon}`
  return api.get(url) as Promise<{ alerts: import('@/types/weather').WeatherAlert[] }>
}
