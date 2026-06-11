// ============================================
// 天气 Store / Weather Store
// ============================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWeatherCombined } from '@/api/weather.api'
import { WEATHER_CACHE_TTL, MUNICIPALITIES } from '@/utils/constants'
import { loadFromSession, saveToSession } from '@/utils/sessionCache'
import { normalizeIconKeyword } from '@/utils/weather'
import type {
  CurrentWeatherData,
  ForecastDayData,
  WeatherCacheEntry,
} from '@/types/weather'
import type { LocationInfo } from '@/types/district'

const SESSION_KEY = 'weather_state'

/** 持久化到 sessionStorage 的数据结构 */
interface WeatherSessionData {
  currentLocation: LocationInfo | null
  cache: Record<string, WeatherCacheEntry>
}

export const useWeatherStore = defineStore('weather', () => {
  // ---- 从 sessionStorage 恢复 ----
  const persisted = loadFromSession<WeatherSessionData>(SESSION_KEY, WEATHER_CACHE_TTL)

  // ---- State ----
  const currentLocation = ref<LocationInfo | null>(persisted?.currentLocation ?? null)
  const currentWeather = ref<CurrentWeatherData | null>(null)
  const forecast = ref<ForecastDayData[]>([])
  const cache = ref<Record<string, WeatherCacheEntry>>(persisted?.cache ?? {})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTimestamp = ref(0)

  // ---- Getters ----

  const currentAdcode = computed(() => currentLocation.value?.adcode ?? null)

  /**
   * 从 LocationInfo 对象自动派生展示名。
   * 直辖市跳过冗余中间层：北京市海淀区（非 北京市 北京市 海淀区）
   */
  /**
   * 从 LocationInfo 自动派生展示名。
   *
   * 规则：
   *   province → "广东省"
   *   city     → "广东省 深圳市"（直辖市 → "北京市"）
   *   county   → "广东省 深圳市 南山区"（直辖市 → "北京市 海淀区"）
   */
  const currentLocationName = computed(() => {
    const loc = currentLocation.value
    if (!loc) return ''
    const parts: string[] = []
    const isMuni = MUNICIPALITIES.has(loc.province)

    if (loc.level === 'province') {
      parts.push(loc.name)
    } else if (loc.level === 'city') {
      if (!isMuni) {
        parts.push(loc.province)
      }
      parts.push(loc.name)
    } else if (loc.level === 'county') {
      if (isMuni) {
        // 直辖市：只拼省份 + 区县，跳过"XX城区"中间层
        parts.push(loc.province)
      } else {
        parts.push(loc.province)
        parts.push(loc.parent)   // parent = city name for county
      }
      parts.push(loc.name)
    }
    return parts.join(' ') || loc.name
  })

  const isCurrentCacheStale = computed(() => {
    const adcode = currentAdcode.value
    if (!adcode || !cache.value[adcode]) return true
    return (Date.now() - cache.value[adcode].timestamp) >= WEATHER_CACHE_TTL
  })

  const hasData = computed(() => currentWeather.value !== null)

  /** 同步缓存到 sessionStorage */
  function persistToSession(): void {
    saveToSession<WeatherSessionData>(SESSION_KEY, {
      currentLocation: currentLocation.value,
      cache: cache.value,
    })
  }

  // 从 sessionStorage 恢复的缓存中加载当前天气
  const adcode = currentLocation.value?.adcode
  if (adcode && persisted?.cache[adcode]) {
    const entry = persisted.cache[adcode]
    currentWeather.value = entry.data.current
    forecast.value = entry.data.forecast
    lastFetchTimestamp.value = entry.timestamp
  }

  // ---- Actions ----

  /**
   * 获取指定位置的天气数据。
   *
   * @param location - 完整的定位信息对象（来自 address.json 格式）
   *
   * - 缓存命中 + 未过期 → 直接使用缓存
   * - 否则 → 单次请求后端合并接口（后端并行获取 base+all，无延迟）
   * - 竞态处理：请求返回时 adcode 已变 → 丢弃结果
   */
  async function fetchWeather(location: LocationInfo): Promise<void> {
    const adcode = location.adcode

    // 相同地址，无操作
    if (adcode === currentAdcode.value && !isCurrentCacheStale.value) return

    // 检查缓存
    const cached = cache.value[adcode]
    if (cached && (Date.now() - cached.timestamp) < WEATHER_CACHE_TTL) {
      currentLocation.value = location
      currentWeather.value = cached.data.current
      forecast.value = cached.data.forecast
      lastFetchTimestamp.value = cached.timestamp
      console.log(`天气数据从缓存加载: ${adcode}`)
      return
    }

    // 需要请求
    currentLocation.value = location
    loading.value = true
    error.value = null

    try {
      const res = await getWeatherCombined(adcode)

      if (!res.current) {
        console.error('天气 API 返回异常：缺少 current 数据', res)
      }

      // 竞态检查
      if (currentAdcode.value !== adcode) {
        console.log(`天气数据已过期，丢弃: ${adcode}`)
        return
      }

      const current: CurrentWeatherData = {
        ...res.current,
        weatherImage: `/images/icon/${normalizeIconKeyword(res.current.weather)}.jpg`,
      }
      const forecastDays: ForecastDayData[] = res.forecast.map((d) => ({
        ...d,
        weatherImage: `/images/icon/${normalizeIconKeyword(d.dayweather)}.jpg`,
      }))

      cache.value[adcode] = {
        adcode,
        data: { current, forecast: forecastDays },
        timestamp: Date.now(),
      }

      currentWeather.value = current
      forecast.value = forecastDays
      lastFetchTimestamp.value = Date.now()
      persistToSession()

      console.log(`天气数据已获取: ${adcode}`)
    } catch (err) {
      console.error('天气数据获取失败:', err)
      if (adcode !== currentAdcode.value) {
        error.value = `获取天气数据失败，请稍后重试`
      } else {
        error.value = '天气数据获取失败，请稍后重试'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 刷新当前地址天气（供轮询调用）。
   * 无条件重新请求，忽略缓存。
   */
  async function refreshCurrentLocation(): Promise<void> {
    const loc = currentLocation.value
    if (!loc) return

    const adcode = loc.adcode
    loading.value = true
    try {
      const res = await getWeatherCombined(adcode)

      const current: CurrentWeatherData = {
        ...res.current,
        weatherImage: `/images/icon/${normalizeIconKeyword(res.current.weather)}.jpg`,
      }
      const forecastDays: ForecastDayData[] = res.forecast.map((d) => ({
        ...d,
        weatherImage: `/images/icon/${normalizeIconKeyword(d.dayweather)}.jpg`,
      }))

      cache.value[adcode] = {
        adcode,
        data: { current, forecast: forecastDays },
        timestamp: Date.now(),
      }

      currentWeather.value = current
      forecast.value = forecastDays
      lastFetchTimestamp.value = Date.now()
      persistToSession()

      console.log(`轮询刷新完成: ${adcode}`)
    } catch (err) {
      console.error('轮询刷新失败:', err)
    } finally {
      loading.value = false
    }
  }

  /** 清空缓存 */
  function clearCache(): void {
    cache.value = {}
  }

  /** 直接设置定位对象（不触发天气请求） */
  function setLocation(location: LocationInfo): void {
    currentLocation.value = location
    persistToSession()
  }

  /**
   * 将 agent 获取的天气数据存入缓存（weatherImage 由前端补全）。
   * 不改变 currentLocation / currentWeather，仅写入 cache。
   */
  function setExternalWeather(
    adcode: string,
    current: CurrentWeatherData,
    forecastDays: ForecastDayData[]
  ): void {
    cache.value[adcode] = {
      adcode,
      data: { current, forecast: forecastDays },
      timestamp: Date.now(),
    }
    persistToSession()
  }

  return {
    // state
    currentLocation,
    currentWeather,
    forecast,
    cache,
    loading,
    error,
    lastFetchTimestamp,
    // getters
    currentAdcode,
    currentLocationName,
    isCurrentCacheStale,
    hasData,
    // actions
    fetchWeather,
    refreshCurrentLocation,
    clearCache,
    setLocation,
    setExternalWeather,
  }
})
