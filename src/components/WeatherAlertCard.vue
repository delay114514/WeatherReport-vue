<!--
  WeatherAlertCard.vue — 天气预警轮播卡片
  参考 Carousel.vue 的克隆式无限循环方案：
  extended = [last, ...alerts, first]
  currentIndex 初始为 1，滑到克隆边界时静默跳转
  移动端：手指实时跟随，松手超过半宽则切换
-->
<template>
  <div v-if="alerts.length > 0" class="alert-carousel-wrapper">
    <div
      class="alert-viewport"
      ref="viewportRef"
    >
      <div
        class="alert-slide-track"
        :style="trackStyle"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          v-for="(alert, i) in extendedAlerts"
          :key="i"
          class="alert-card"
          @click="openModal(i)"
        >
          <span class="alert-time">{{ formatTime(alert.issuedTime) }}</span>
          <h3 class="alert-headline">{{ alert.headline }}</h3>
          <p class="alert-preview">{{ truncate(alert.description) }}</p>
        </div>
      </div>

      <!-- 桌面端左右切换按钮 -->
      <button
        v-if="alerts.length > 1"
        class="carousel-btn carousel-btn--left"
        @click.stop="prev"
      >&lt;</button>
      <button
        v-if="alerts.length > 1"
        class="carousel-btn carousel-btn--right"
        @click.stop="next"
      >&gt;</button>

      <!-- 圆点（卡片内部） -->
      <div
        v-if="alerts.length > 1"
        class="alert-dots"
      >
        <button
          v-for="(_, i) in alerts"
          :key="i"
          class="alert-dot-btn"
          :class="{ active: i === realIndex }"
          :aria-label="`第${i + 1}条预警`"
          @click.stop="goTo(i)"
        ></button>
      </div>
    </div>

    <WeatherAlertModal
      :visible="modalOpen"
      :alert="selectedAlert!"
      @close="modalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWeatherAlertStore } from '@/stores'
import type { WeatherAlert } from '@/types/weather'
import WeatherAlertModal from './WeatherAlertModal.vue'

const PREVIEW_MAX = 70

const alertStore = useWeatherAlertStore()
const viewportRef = ref<HTMLElement | null>(null)

// ---- 克隆式无限循环 ----
const alerts = computed(() => alertStore.alerts)

const extendedAlerts = computed(() => {
  const list = alerts.value
  if (list.length === 0) return []
  if (list.length === 1) return list
  return [list[list.length - 1], ...list, list[0]]
})

const currentIndex = ref(1) // extended 中的索引，从 1（第一条真实数据）开始
const transitionEnabled = ref(true)
const dragOffset = ref(0) // 拖动偏移（百分比）

const realIndex = computed(() => {
  const len = alerts.value.length
  if (len === 0) return 0
  if (currentIndex.value === 0) return len - 1
  if (currentIndex.value === extendedAlerts.value.length - 1) return 0
  return currentIndex.value - 1
})

const trackStyle = computed(() => {
  const base = -(currentIndex.value * 100) + dragOffset.value
  return {
    transform: `translateX(${base}%)`,
    transition: transitionEnabled.value ? 'transform 0.35s ease' : 'none',
  }
})

watch(alerts, () => {
  currentIndex.value = alerts.value.length > 0 ? 1 : 0
})

// ---- 移动端拖动 ----
let startX = 0
let cardWidth = 0

function onTouchStart(e: TouchEvent): void {
  if (alerts.value.length <= 1) return
  transitionEnabled.value = false
  dragOffset.value = 0
  startX = e.touches[0].clientX
  cardWidth = viewportRef.value?.clientWidth ?? 300
}

function onTouchMove(e: TouchEvent): void {
  if (alerts.value.length <= 1) return
  const currentX = e.touches[0].clientX
  const delta = currentX - startX
  dragOffset.value = (delta / cardWidth) * 100
}

function onTouchEnd(): void {
  if (alerts.value.length <= 1) return
  transitionEnabled.value = true

  const absOffset = Math.abs(dragOffset.value)
  if (absOffset > 50) {
    if (dragOffset.value > 0) {
      currentIndex.value-- // 右滑 → 上一条
    } else {
      currentIndex.value++ // 左滑 → 下一条
    }
  }
  dragOffset.value = 0

  // 克隆边界静默跳转
  checkBoundary()
}

function checkBoundary(): void {
  const len = extendedAlerts.value.length
  if (currentIndex.value === 0) {
    setTimeout(() => {
      transitionEnabled.value = false
      currentIndex.value = len - 2
      setTimeout(() => { transitionEnabled.value = true }, 50)
    }, 350)
  } else if (currentIndex.value === len - 1) {
    setTimeout(() => {
      transitionEnabled.value = false
      currentIndex.value = 1
      setTimeout(() => { transitionEnabled.value = true }, 50)
    }, 350)
  }
}

function goTo(i: number): void {
  currentIndex.value = i + 1
}

function prev(): void {
  if (alerts.value.length <= 1) return
  currentIndex.value--
  checkBoundary()
}

function next(): void {
  if (alerts.value.length <= 1) return
  currentIndex.value++
  checkBoundary()
}

// ---- 文本 ----
function truncate(text: string): string {
  return text.length > PREVIEW_MAX ? text.slice(0, PREVIEW_MAX) + '...' : text
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('zh-CN')
  } catch {
    return isoStr
  }
}

// ---- 详情弹窗 ----
const modalOpen = ref(false)
const selectedAlert = ref<WeatherAlert | null>(null)

function openModal(i: number): void {
  // 根据 extended index → real index → 实际 alert
  const len = extendedAlerts.value.length
  if (len === 0) return
  let real: number
  if (i === 0) real = alerts.value.length - 1
  else if (i === len - 1) real = 0
  else real = i - 1
  selectedAlert.value = alerts.value[real]
  modalOpen.value = true
}
</script>

<style scoped lang="less">
.alert-carousel-wrapper {
  width: 100%;
  max-width: 800px;
  margin-bottom: 0.75rem;

  @media (max-width: (@breakpoint_tablet - 1px)) {
    width: 95%;
  }
}

.alert-viewport {
  .weather-box();
  width: 100%;
  overflow: hidden;
  position: relative;
  padding-bottom: 2rem; // 为底部圆点留空间
}

.alert-slide-track {
  display: flex;
  width: 100%;
}

.alert-card {
  flex-shrink: 0;
  width: 100%;
  padding: 1.5rem 1.25rem 1.25rem;
  text-align: center;
  cursor: pointer;
  user-select: none;
  touch-action: pan-y;
}

.alert-time {
  display: inline-block;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.75rem;
}

.alert-headline {
  .weather-font(1.3rem);
  margin: 0 0 0.75rem;
  font-weight: 700;
  line-height: 1.4;
}

.alert-preview {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0 auto;
  max-width: 500px;
  text-align: left;
}

// 圆点（卡片内部底部）
.alert-dots {
  position: absolute;
  bottom: 0.5rem;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.alert-dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.7);
  }

  &.active {
    background: rgba(255, 255, 255, 0.9);
    border-color: transparent;
  }
}

// 桌面端左右切换按钮
.carousel-btn {
  display: none; // 移动端隐藏
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 5;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.45);
  }

  &--left { left: 0.5rem; }
  &--right { right: 0.5rem; }

  @media (min-width: @breakpoint_tablet) {
    display: block;
  }
}
</style>
