<!--
  CurrentWeather.vue — 实时天气卡片
  显示当前温度、湿度、风向风力、预报时间等
-->
<template>
  <div class="base-box">
    <p class="reporttime">
      当前预报时间: {{ reporttime }}
    </p>
    <div class="weather-box-main">
      <h1>{{ currentWeather.temperature }}℃</h1>
      <h2>{{ currentWeather.daytemp }}℃ / {{ currentWeather.nighttemp }}℃</h2>
      <h2>{{ currentWeather.weather }} 湿度{{ currentWeather.humidity }}%</h2>
      <h2>风向：{{ currentWeather.winddirection }}</h2>
      <h2>风力：{{ currentWeather.windpower }}</h2>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CurrentWeatherData } from '@/types/weather'

defineProps<{
  currentWeather: CurrentWeatherData
  reporttime: string
}>()
</script>

<style scoped lang="less">
.base-box {
  width: 100%;
  max-width: 1150px;
  .weather-box();
  min-height: 30rem;
  text-align: center;
  padding: 2rem 1rem;

  .reporttime {
    .weather-font(1rem);
    margin: 0 auto 1rem;
    text-align: center;
  }

  .weather-box-main {
    margin-top: 0;

    h1 {
      .weather-font(clamp(3rem, 7vw, 5rem));
      margin: 0.5rem auto;
    }

    h2 {
      .weather-font(clamp(1.5rem, 3.5vw, 2.5rem));
      margin: 0.5rem auto;
    }
  }

  @media (max-width: (@breakpoint_tablet - 1px)) {
    width: 95%;
    min-height: auto;
    padding: 1.5rem 0.5rem;
  }
}
</style>
