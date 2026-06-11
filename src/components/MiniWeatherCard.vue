<!--
  MiniWeatherCard.vue — 微缩版实时天气卡片
  用于嵌入 ChatView 聊天消息内部，展示关键天气信息
-->
<template>
  <div class="mini-weather">
    <div class="mini-weather-icon">
      <img
        v-if="weather.weatherImage"
        :src="weather.weatherImage"
        :alt="weather.weather"
        class="mini-weather-img"
        @error="onImgError"
      />
    </div>
    <div class="mini-weather-info">
      <div class="mini-weather-temp">{{ weather.temperature }}°C</div>
      <div class="mini-weather-desc">{{ weather.weather }}</div>
      <div class="mini-weather-meta">
        <span>湿度 {{ weather.humidity }}%</span>
        <span class="mini-weather-sep">|</span>
        <span>{{ weather.winddirection }}风 {{ weather.windpower }}级</span>
      </div>
      <div class="mini-weather-range">{{ weather.nighttemp }}°C ~ {{ weather.daytemp }}°C</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CurrentWeatherData } from '@/types/weather'

defineProps<{
  weather: CurrentWeatherData
}>()

function onImgError(event: Event): void {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped lang="less">
.mini-weather {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: @border_radius_lg;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  max-width: 320px;
  margin-top: 0.6rem;

  &-icon {
    flex-shrink: 0;
    width: 3.5rem;
    height: 3.5rem;
  }

  &-img {
    width: 100%;
    height: 100%;
    border-radius: @border_radius_comset;
    object-fit: cover;
  }

  &-info {
    flex: 1;
    min-width: 0;
  }

  &-temp {
    font-size: 1.5rem;
    font-weight: 700;
    color: @font_color;
    line-height: 1.2;
  }

  &-desc {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 0.15rem;
  }

  &-meta {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.25rem;
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  &-sep {
    opacity: 0.4;
  }

  &-range {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 0.15rem;
  }

  @media (max-width: (@breakpoint_tablet - 1px)) {
    max-width: 100%;
    padding: 0.5rem 0.65rem;
    gap: 0.5rem;

    .mini-weather-icon {
      width: 2.8rem;
      height: 2.8rem;
    }

    .mini-weather-temp {
      font-size: 1.3rem;
    }

    .mini-weather-desc {
      font-size: 0.8rem;
    }
  }
}
</style>
