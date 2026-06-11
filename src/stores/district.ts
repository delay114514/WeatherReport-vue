// ============================================
// 行政区划 Store / District Store
// ============================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchAllDistricts,
} from '@/api/district.api'
import {
  MUNICIPALITIES,
  SKIP_PROVINCES,
} from '@/utils/constants'
import addressJson from '@/assets/address/address.json'
import type {
  Province, City, County,
  DistrictSearchResult,
  LocationInfo,
} from '@/types/district'

const STORAGE_KEY = 'govdata'

/** 缓存数据版本号：数据格式变更时递增，旧版本缓存自动失效 */
const CACHE_VERSION = 4

/** 缓存有效期：30 天（毫秒） */
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000

export const useDistrictStore = defineStore('district', () => {
  // ---- State ----
  const provinces = ref<Province[]>([])
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let initPromise: Promise<void> | null = null

  // ---- Getters ----
  const isReady = computed(() => initialized.value && !loading.value)

  // ---- Actions ----

  /**
   * 从预置的 JSON 文件加载行政区划数据（无网络开销，瞬时完成）
   */
  function loadFromJsonFile(): Province[] {
    return addressJson as Province[]
  }

  /**
   * 后台静默从后端 API 刷新行政区划数据并更新 localStorage
   * 后端已完成：直辖市重组、坐标解析、跳过省份过滤
   * 失败不影响用户使用（已有 JSON 文件数据兜底）
   */
  async function backgroundRefreshFromApi(): Promise<void> {
    try {
      console.log('后台静默刷新行政区划数据...')
      const res = await fetchAllDistricts()
      // 后端已重组为 Province[] 结构，直接使用
      provinces.value = res.provinces
      saveToStorage(res.provinces)
      console.log('后台刷新完成，行政区划数据已更新，共', res.provinces.length, '个省份')
    } catch (err) {
      console.error('后台刷新行政区划数据失败（不影响使用，已有预置数据兜底）:', err)
    }
  }

  /**
   * 初始化行政区划数据（仅本地：缓存 → JSON 文件，不触发网络）
   * 后台 API 刷新由 refreshFromApi() 单独调用
   */
  async function initDistricts(force = false): Promise<void> {
    // 防止并发初始化
    if (loading.value) return initPromise!
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    initPromise = (async () => {
      try {
        // 1. 优先从 localStorage 加载缓存
        const cached = loadFromStorage()
        if (cached && cached.length > 0 && !force) {
          provinces.value = cached
          initialized.value = true
          console.log('行政区划数据已从缓存加载:', provinces.value.length, '个省份')
          return
        }

        // 2. 缓存不存在 → 从预置 JSON 文件加载（瞬时，无网络）
        console.log('首次访问，从预置 JSON 文件加载行政区划数据...')
        provinces.value = loadFromJsonFile().filter((p) => !SKIP_PROVINCES.has(p.provinces))
        initialized.value = true
        console.log('行政区划数据已从 JSON 文件加载:', provinces.value.length, '个省份')
      } catch (err) {
        console.error('行政区划数据初始化失败:', err)
        error.value = '行政区划数据加载失败，请刷新页面重试'
        throw err
      } finally {
        loading.value = false
      }
    })()

    return initPromise
  }

  /**
   * 后台从 API 刷新行政区划数据（调用时机由页面控制）
   * 仅在缓存过期或首次 JSON 加载后由 Home 页调用
   */
  async function refreshFromApi(): Promise<void> {
    // 未初始化或缓存未过期 → 跳过
    if (!initialized.value) return
    if (!isCacheStale()) {
      console.log('缓存未过期（30天内），跳过 API 刷新')
      return
    }

    console.log('后台刷新行政区划数据（API）...')
    await backgroundRefreshFromApi()
  }

  /**
   * 在已加载的行政区划数据中搜索
   * 后端已处理直辖市伪区划合并，前端仅做文本匹配
   * @param query - 搜索关键词
   * @returns 扁平化的搜索结果数组
   */
  function searchDistricts(query: string): DistrictSearchResult[] {
    const trimmed = query.trim()
    if (!trimmed || !provinces.value.length) return []

    const results: DistrictSearchResult[] = []

    for (const p of provinces.value) {
      if (SKIP_PROVINCES.has(p.provinces)) continue

      const isMunicipality = MUNICIPALITIES.has(p.provinces)

      // 搜索省份名
      // 直辖市：省份即城市，省份匹配 = 市级匹配，展开所有下辖区县
      // 普通省份：展开该省所有城市供用户选择（不展开区县）
      if (p.provinces.includes(trimmed)) {
        if (isMunicipality) {
          // 城市级入口（"北京市"本身）
          const cityCoords = p.city[0] ? { longitude: p.city[0].longitude, latitude: p.city[0].latitude } : { longitude: 0, latitude: 0 }
          results.push({
            adcode: p.city[0]?.adcode ?? p.adcode,
            name: p.provinces,
            parentName: '',
            provinceName: p.provinces,
            level: 'city',
            ...cityCoords,
          })
          // 下辖区县
          for (const c of p.city) {
            for (const co of c.county) {
              results.push({
                adcode: co.adcode,
                name: co.countyorstreets,
                parentName: p.provinces,
                provinceName: p.provinces,
                level: 'county',
                longitude: co.longitude,
                latitude: co.latitude,
              })
            }
          }
        } else {
          for (const c of p.city) {
            if (c.city.includes(trimmed)) continue
            results.push({
              adcode: c.adcode,
              name: c.city,
              parentName: c.parent,
              provinceName: p.provinces,
              level: 'city',
              longitude: c.longitude,
              latitude: c.latitude,
            })
          }
        }
      }

      for (const c of p.city) {
        // 搜索城市名
        // 普通城市匹配时，同时展开其下辖区县
        if (!isMunicipality && c.city.includes(trimmed)) {
          results.push({
            adcode: c.adcode,
            name: c.city,
            parentName: c.parent,
            provinceName: p.provinces,
            level: 'city',
            longitude: c.longitude,
            latitude: c.latitude,
          })
          // 显示该城市下所有区县（跳过已被区县名直接匹配的，避免重复）
          for (const co of c.county) {
            if (co.countyorstreets.includes(trimmed)) continue
            results.push({
              adcode: co.adcode,
              name: co.countyorstreets,
              parentName: co.parent,
              provinceName: p.provinces,
              level: 'county',
              longitude: co.longitude,
              latitude: co.latitude,
            })
          }
        }

        // 搜索区县/街道名
        for (const co of c.county) {
          if (co.countyorstreets.includes(trimmed)) {
            results.push({
              adcode: co.adcode,
              name: co.countyorstreets,
              parentName: isMunicipality ? p.provinces : co.parent,
              provinceName: p.provinces,
              level: 'county',
              longitude: co.longitude,
              latitude: co.latitude,
            })
          }
        }
      }
    }

    return results
  }

  /**
   * 根据 adcode 查找坐标
   * 优先匹配 City，其次 County
   */
  function getCoordinatesByAdcode(adcode: string): { latitude: number; longitude: number } | null {
    const loc = getLocationByAdcode(adcode)
    if (!loc) return null
    return { latitude: loc.latitude, longitude: loc.longitude }
  }

  /**
   * 根据 adcode 查找完整的 LocationInfo 对象（address.json 原始格式）。
   * 搜索优先级：province → city → county。
   */
  function getLocationByAdcode(adcode: string): LocationInfo | null {
    for (const p of provinces.value) {
      if (p.adcode === adcode) {
        return { adcode: p.adcode, name: p.provinces, level: 'province' as const, parent: '', province: p.provinces, longitude: 0, latitude: 0 }
      }
      for (const c of p.city) {
        if (c.adcode === adcode) {
          return { adcode: c.adcode, name: c.city, level: 'city' as const, parent: p.provinces, province: p.provinces, longitude: c.longitude, latitude: c.latitude }
        }
        for (const co of c.county) {
          if (co.adcode === adcode) {
            return { adcode: co.adcode, name: co.countyorstreets, level: 'county' as const, parent: c.city, province: p.provinces, longitude: co.longitude, latitude: co.latitude }
          }
        }
      }
    }
    return null
  }

  // ---- localStorage 操作 ----

  /** 缓存数据结构：数据 + 写入时间戳 + 版本号 */
  interface CachePayload {
    data: Province[]
    timestamp: number
    version: number
  }

  function loadFromStorage(): Province[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const payload: CachePayload = JSON.parse(raw)
      // 版本不匹配 → 缓存失效
      if (payload.version !== CACHE_VERSION) return null
      if (!payload.data || !Array.isArray(payload.data) || payload.data.length === 0) return null
      return payload.data as Province[]
    } catch {
      return null
    }
  }

  function saveToStorage(data: Province[]): void {
    try {
      const payload: CachePayload = { data, timestamp: Date.now(), version: CACHE_VERSION }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      console.error('localStorage 写入失败（可能配额已满）:', err)
    }
  }

  /** 检查缓存是否过期（超过 30 天或版本不匹配） */
  function isCacheStale(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return true
      const payload: CachePayload = JSON.parse(raw)
      if (payload.version !== CACHE_VERSION) return true
      if (!payload.timestamp) return true
      return (Date.now() - payload.timestamp) > CACHE_TTL
    } catch {
      return true
    }
  }

  return {
    // state
    provinces,
    initialized,
    loading,
    error,
    // getters
    isReady,
    // actions
    initDistricts,
    refreshFromApi,
    searchDistricts,
    getCoordinatesByAdcode,
    getLocationByAdcode,
  }
})
