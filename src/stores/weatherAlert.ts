// ============================================
// 天气预警 Store / Weather Alert Store
// ============================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWeatherAlerts } from '@/api/weather.api'
import { WEATHER_CACHE_TTL } from '@/utils/constants'
import { loadFromSession, saveToSession } from '@/utils/sessionCache'
import type { WeatherAlert } from '@/types/weather'

export interface AlertCacheEntry {
  data: WeatherAlert[]
  timestamp: number
}

const SESSION_KEY = 'alert_state'

interface AlertSessionData {
  currentAdcode: string | null
  cache: Record<string, AlertCacheEntry>
}

export const useWeatherAlertStore = defineStore('weatherAlert', () => {
  // ---- 从 sessionStorage 恢复 ----
  const persisted = loadFromSession<AlertSessionData>(SESSION_KEY, WEATHER_CACHE_TTL)

  // ---- State ----
  const alerts = ref<WeatherAlert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentAdcode = ref<string | null>(persisted?.currentAdcode ?? null)
  const cache = ref<Record<string, AlertCacheEntry>>(persisted?.cache ?? {})

  // 从 sessionStorage 恢复的缓存中加载当前预警
  if (persisted?.currentAdcode && persisted.cache[persisted.currentAdcode]) {
    alerts.value = persisted.cache[persisted.currentAdcode].data
  }

  // ---- Actions ----

  /** 同步缓存到 sessionStorage */
  function persistToSession(): void {
    saveToSession<AlertSessionData>(SESSION_KEY, {
      currentAdcode: currentAdcode.value,
      cache: cache.value,
    })
  }

  /**
   * 获取天气预警
   * 后端已完成：过期过滤、字段简化 → 返回 WeatherAlert[]
   * @param adcode  - 区划编码（缓存 key）
   * @param latitude  - 纬度
   * @param longitude - 经度
   */
  async function fetchAlerts(adcode: string, latitude: number, longitude: number): Promise<void> {
    // 检查缓存
    const cached = cache.value[adcode]
    if (cached && (Date.now() - cached.timestamp) < WEATHER_CACHE_TTL) {
      alerts.value = cached.data
      currentAdcode.value = adcode
      return
    }

    // 发起请求前先清空旧预警，避免切换城市时短暂残留
    alerts.value = []
    currentAdcode.value = adcode
    loading.value = true
    error.value = null

    try {
      const res = await fetchWeatherAlerts(latitude, longitude)

      // 竞态保护
      if (currentAdcode.value !== adcode) return

      // 后端已过滤过期预警 + 简化字段
      alerts.value = res.alerts ?? []

      // 写入缓存
      cache.value[adcode] = {
        data: alerts.value,
        timestamp: Date.now(),
      }

      persistToSession()
    } catch (err) {
      console.error('天气预警获取失败:', err)
      if (currentAdcode.value === adcode) {
        error.value = '预警数据获取失败'
      }
    } finally {
      loading.value = false
    }
  }

  function clearCache(): void {
    cache.value = {}
    alerts.value = []
  }

  return {
    alerts,
    loading,
    error,
    currentAdcode,
    cache,
    fetchAlerts,
    clearCache,
  }
})
