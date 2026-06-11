<!--
  MiniForecastRow.vue — 微缩版预报行
  用于嵌入 ChatView 聊天消息内部，横向展示多日预报
-->
<template>
  <div class="mini-forecast">
    <div class="mini-forecast-title">📅 未来预报</div>
    <div class="mini-forecast-scroll">
      <div
        v-for="(day, index) in forecast"
        :key="index"
        class="mini-forecast-day"
      >
        <div class="mini-forecast-label">{{ day.label }}</div>
        <img
          v-if="day.weatherImage"
          :src="day.weatherImage"
          :alt="day.dayweather"
          class="mini-forecast-icon"
          @error="onImgError"
        />
        <div class="mini-forecast-weather">{{ day.dayweather }}</div>
        <div class="mini-forecast-temp">{{ day.nighttemp }}~{{ day.daytemp }}°C</div>
        <div class="mini-forecast-wind">{{ day.daywind }}风 {{ day.daypower }}级</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForecastDayData } from '@/types/weather'

defineProps<{
  forecast: ForecastDayData[]
}>()

function onImgError(event: Event): void {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped lang="less">
.mini-forecast {
  padding: 0.65rem 0.85rem;
  border-radius: @border_radius_lg;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  max-width: 380px;
  margin-top: 0.6rem;

  &-title {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.4rem;
  }

  &-scroll {
    display: flex;
    gap: 0.6rem;
    overflow-x: auto;
    padding-bottom: 0.3rem;

    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
  }

  &-day {
    flex-shrink: 0;
    width: 80px;
    text-align: center;
  }

  &-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: @font_color;
    margin-bottom: 0.3rem;
  }

  &-icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: @border_radius_comset;
    object-fit: cover;
  }

  &-weather {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 0.2rem;
    white-space: nowrap;
  }

  &-temp {
    font-size: 0.75rem;
    font-weight: 600;
    color: @font_color;
    margin-top: 0.1rem;
  }

  &-wind {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 0.1rem;
  }

  @media (max-width: (@breakpoint_tablet - 1px)) {
    max-width: 100%;
    padding: 0.5rem 0.65rem;

    .mini-forecast-day {
      width: 70px;
    }

    .mini-forecast-icon {
      width: 1.8rem;
      height: 1.8rem;
    }
  }
}
</style>
