<!--
  ForecastCard.vue — 单日天气预报卡片
  展示日期、温度范围、天气图标、风向等
-->
<template>
  <div class="weather-box" :class="{ 'weather-box--placeholder': isPlaceholder }">
    <div class="weather-box-secondary">
      <h3>{{ day.label }}</h3>
      <h3>{{ day.date }}</h3>
      <h2>{{ day.nighttemp }}-{{ day.daytemp }}℃</h2>
      <img
        v-if="day.weatherImage"
        class="weather-picture"
        :src="day.weatherImage"
        :alt="day.dayweather"
        @error="handleImageError"
      />
      <div v-else class="weather-picture weather-picture--empty" />
      <h3>{{ day.dayweather }}</h3>
      <h3>风向：{{ day.daywind }}</h3>
      <h3 v-if="day.daypower">风力：{{ day.daypower }}级</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForecastDayData } from '@/types/weather'

defineProps<{
  day: ForecastDayData
  isPlaceholder?: boolean
}>()

function handleImageError(event: Event): void {
  const img = event.target as HTMLImageElement
  img.src = '/images/Chinamap.JPG'
}
</script>

<style scoped lang="less">
.weather-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  text-align: center;
  .weather-box();
  padding: 1rem 0.5rem;

  &--placeholder {
    opacity: 0.6;
  }

  .weather-box-secondary {
    margin-top: 10%;
    width: 100%;

    .weather-picture {
      margin: 5%;
      display: block;
      margin-left: auto;
      margin-right: auto;
      width: 8rem;
      height: 8rem;
      max-width: 100%;
      border-radius: 10%;
      object-fit: cover;

      &--empty {
        background: rgba(255, 255, 255, 0.15);
        border: 2px dashed rgba(255, 255, 255, 0.3);
      }
    }

    h2 {
      .weather-font(1.4rem);
      margin: 8% auto;
    }

    h3 {
      .weather-font(1.1rem);
      margin: 4% auto;
    }
  }
}
</style>
