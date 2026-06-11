<!--
  ForecastGrid.vue — 四日天气预报网格
  移动端：单行横向滚动；平板/桌面：4 列网格
-->
<template>
  <div class="all-box">
    <p class="title2">多日预报</p>
    <div class="forecast-scroll">
      <ForecastCard
        v-for="(day, index) in displayDays"
        :key="index"
        :day="day"
        :is-placeholder="index >= forecast.length"
        class="forecast-card"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ForecastDayData } from '@/types/weather'
import ForecastCard from './ForecastCard.vue'

const props = defineProps<{
  forecast: ForecastDayData[]
}>()

const displayDays = computed<ForecastDayData[]>(() => {
  const placeholder: ForecastDayData = {
    date: '--', week: '--',
    dayweather: '加载中...', nightweather: '--',
    weatherImage: '',
    daytemp: '--', nighttemp: '--',
    daywind: '--', nightwind: '--',
    daypower: '--', nightpower: '--',
    label: props.forecast.length === 0 ? '加载中' : '--',
  }
  const LABELS = ['今天', '明天', '后天', '大后天']
  const result: ForecastDayData[] = []
  for (let i = 0; i < 4; i++) {
    result.push(i < props.forecast.length
      ? props.forecast[i]
      : { ...placeholder, label: LABELS[i] })
  }
  return result
})
</script>

<style scoped lang="less">
.all-box {
  width: 100%;
  max-width: 1150px;

  .title2 {
    font-size: clamp(1.5rem, 4vw, 3rem);
    margin-top: 0;
    margin-bottom: 0.5rem;
    text-align: center;
  }
}

.forecast-scroll {
  display: flex;
  gap: 2%;
  width: 100%;
  padding-bottom: 0.5rem;

  // Mobile: single row, horizontal scroll
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;

  // Hide scrollbar (optional, keep functional on touch)
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.45);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.65);
  }

  .forecast-card {
    flex-shrink: 0;
    width: calc(50% - 2%); // ~2 cards visible, hinting at more
    min-width: 10rem;
    scroll-snap-align: start;
  }

  // Tablet: 4-column grid, no scroll
  @media (min-width: @breakpoint_tablet) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2%;
    overflow-x: visible;

    .forecast-card {
      width: auto;
      min-width: 0;
    }
  }

  // Desktop: slightly wider cards via container
  @media (min-width: @breakpoint_desktop) {
    gap: 2%;
  }
}
</style>
