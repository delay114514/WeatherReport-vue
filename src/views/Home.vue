<!--
  Home.vue — 主天气页面
  负责：初始化定位 → 获取天气 → 绑定搜索事件 → 布局所有组件
-->
<template>
  <div class="home">
    <!-- 标题 -->
    <h1 class="title">天气预报</h1>

    <!-- 搜索框（居中） -->
    <SearchBox @select="onSearchSelect" />

    <!-- 定位图标 + 当前城市名 -->
    <div class="location">
      <img
        class="location-img"
        src="/images/Location.png"
        alt="位置"
      />
      <p class="location-p">{{ weatherStore.currentLocationName }}</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="weatherStore.error" class="error-banner">
      {{ weatherStore.error }}
      <button @click="weatherStore.error = null">✕</button>
    </div>

    <!-- 天气预警卡片 -->
    <WeatherAlertCard v-if="alertStore.alerts.length > 0" />

    <!-- 实时天气 -->
    <CurrentWeather
      v-if="weatherStore.currentWeather"
      :current-weather="weatherStore.currentWeather"
      :reporttime="weatherStore.currentWeather.reporttime"
    />

    <!-- 四日预报（始终显示卡片轮廓，无数据时展示占位） -->
    <ForecastGrid
      :forecast="weatherStore.forecast"
    />

    <!-- AI 助手入口：桌面端 → 右侧固定浮栏，移动端 → 功能栏 -->
    <AgentEntry />

    <!-- 加载提示 -->
    <LoadingOverlay
      :visible="isInitializing || weatherStore.loading || districtStore.loading"
      :loading-text="loadingText"
    />

    <!-- 定位失败提示 -->
    <LocationUnavailable
      :visible="locationFailed"
      @retry="retryLocation"
      @use-default="useDefaultLocation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWeatherStore, useDistrictStore, useSearchStore, useWeatherAlertStore } from '@/stores'
import { useBackgroundImage } from '@/composables/useBackgroundImage'
import { watch } from 'vue'
import {
  getLocationByAPI,
  getGeolocation,
  getIPInfo,
  getAddressLocation,
} from '@/api/location.api'
import { DEFAULT_ADCODE } from '@/utils/constants'

import SearchBox from '@/components/SearchBox.vue'
import WeatherAlertCard from '@/components/WeatherAlertCard.vue'
import CurrentWeather from '@/components/CurrentWeather.vue'
import ForecastGrid from '@/components/ForecastGrid.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import LocationUnavailable from '@/components/LocationUnavailable.vue'
import AgentEntry from '@/components/AgentEntry.vue'
import type { LocationInfo } from '@/types/district'

const weatherStore = useWeatherStore()
const districtStore = useDistrictStore()
const searchStore = useSearchStore()
const alertStore = useWeatherAlertStore()
const { setBackground } = useBackgroundImage()

const isInitializing = ref(true)
const loadingText = ref('正在获取位置信息...')
const locationFailed = ref(false)

// ---- 辅助：从 address.json 缓存中查找 LocationInfo ----
function getLocationInfo(adcode: string): LocationInfo | null {
  return districtStore.getLocationByAdcode(adcode) ?? null
}

// ---- 监听天气变化 → 更新背景图 ----
watch(
  () => weatherStore.currentWeather?.weather,
  (newWeather) => {
    if (newWeather) {
      setBackground(newWeather)
    }
  }
)

// ---- 搜索选中事件处理 ----
function onSearchSelect(adcode: string, _name: string, _parentName: string, _provinceName: string, _level: string): void {
  const location = getLocationInfo(adcode)
  if (!location) {
    console.warn(`未在缓存中找到 adcode=${adcode} 的位置信息`)
    return
  }
  weatherStore.fetchWeather(location)

  // 获取天气预警
  if (location.longitude && location.latitude) {
    alertStore.fetchAlerts(adcode, location.latitude, location.longitude)
  }
}

// ---- 初始化流程 ----

/**
 * 两阶段定位：HTML5 Geolocation → IP 定位。
 * 返回 LocationInfo 或 null（两种方式均失败时）。
 */
async function resolveLocation(): Promise<LocationInfo | null> {
  // Tier 1：HTML5 Geolocation
  try {
    loadingText.value = '正在获取位置信息...'
    const geodata = await getLocationByAPI()
    const regeoResult = await getGeolocation(geodata.longitude, geodata.latitude)

    if (regeoResult.status === '1' && regeoResult.regeocode?.addressComponent?.adcode) {
      const adcode = regeoResult.regeocode.addressComponent.adcode
      const location = getLocationInfo(adcode)
      if (location) return location
    }
  } catch {
    console.warn('浏览器定位失败或被拒绝，尝试IP定位...')
  }

  // Tier 2：IP 定位
  try {
    const ipInfo = await getIPInfo()
    if (ipInfo.city) {
      const locStr = ipInfo.city + (ipInfo.region ?? '')
      const adcode = await getAddressLocation(locStr)
      if (adcode) {
        const location = getLocationInfo(adcode)
        if (location) return location
      }
    }
  } catch {
    console.error('IP定位失败')
  }

  return null
}

async function initApp(): Promise<void> {
  // 1. 并行：初始化行政区划数据 + 加载搜索历史
  const districtPromise = districtStore.initDistricts().catch((err) => {
    console.error('初始化行政区划数据失败:', err)
  })
  searchStore.loadHistory()

  // 2. 获取地理位置
  const location = await resolveLocation()

  if (!location) {
    // 所有定位方式均失败 → 显示不可用页面
    await districtPromise
    locationFailed.value = true
    return
  }

  weatherStore.setLocation(location)

  // 3. 获取天气数据
  loadingText.value = '正在获取天气数据...'
  await weatherStore.fetchWeather(location)
  loadingText.value = '数据准备完毕'

  // 获取天气预警
  if (location.longitude && location.latitude) {
    alertStore.fetchAlerts(location.adcode, location.latitude, location.longitude)
  }

  // 4. 后台静默刷新地址 API（低优先级）
  setTimeout(() => {
    districtStore.refreshFromApi()
  }, 0)
}

/** 重新尝试完整定位流程 */
async function retryLocation(): Promise<void> {
  locationFailed.value = false
  isInitializing.value = true
  await initApp()
  isInitializing.value = false
}

/** 使用默认位置（北京东城）作为最终兜底 */
async function useDefaultLocation(): Promise<void> {
  locationFailed.value = false
  isInitializing.value = true

  if (!districtStore.initialized) {
    await districtStore.initDistricts()
  }

  const location = getLocationInfo(DEFAULT_ADCODE)
  if (location) {
    weatherStore.setLocation(location)
    loadingText.value = '正在获取天气数据...'
    await weatherStore.fetchWeather(location)
    loadingText.value = '数据准备完毕'

    if (location.longitude && location.latitude) {
      alertStore.fetchAlerts(location.adcode, location.latitude, location.longitude)
    }
  }

  isInitializing.value = false

  setTimeout(() => {
    districtStore.refreshFromApi()
  }, 0)
}

onMounted(async () => {
  await initApp()
  isInitializing.value = false
})
</script>

<style scoped lang="less">
.home {
  position: relative;
  z-index: 2; // 确保内容在背景层之上
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1rem;

  @media (min-width: @breakpoint_tablet) {
    padding: 0 2rem;
  }

  @media (min-width: @breakpoint_desktop) {
    max-width: @breakpoint_wide;
    margin: 0 auto;
    padding: 0 2rem;
  }
}

// Location display
.location {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.5rem auto 1rem;
  gap: 0.5rem;
  z-index: 3;

  .location-img {
    height: 2em;
    display: inline-block;
  }

  .location-p {
    display: inline-block;
    text-align: left;
    font-size: clamp(1.15rem, 2.75vw, 1.75rem);
    color: @font_color;
    margin: 0;
  }
}

// Error banner
.error-banner {
  background: rgba(231, 76, 60, 0.8);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: @border_radius_lg;
  max-width: 600px;
  margin: 0 auto 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0 0.25rem;
  }
}

// Title override for responsive
h1.title {
  @media (max-width: (@breakpoint_tablet - 1px)) {
    padding: 1rem 0 0.25rem;
  }
}
</style>
