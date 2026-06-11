<!--
  App.vue — 根组件
  - 双层背景实现淡入淡出过渡
  - 管理轮询生命周期
-->
<template>
  <div class="app-wrapper">
    <!-- 底层背景（始终显示当前已确认的背景图，无图时纯色） -->
    <div
      class="bg-layer bg-current"
      :style="currentImage ? { backgroundImage: `url(${currentImage})` } : {}"
    />
    <!-- 上层背景（新图片淡入，过渡完成后提升为底层） -->
    <div
      v-if="nextImage"
      class="bg-layer bg-next"
      :class="{ 'bg-next--visible': fadeIn }"
      :style="{ backgroundImage: `url(${nextImage})` }"
    />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useBackgroundImage } from '@/composables/useBackgroundImage'
import { usePolling } from '@/utils/polling'
import { useWeatherStore } from '@/stores'
import { watch } from 'vue'

const { currentImage, nextImage, fadeIn, setBackground, resetBackground } = useBackgroundImage()
const weatherStore = useWeatherStore()

// ---- 监听天气变化 → 背景图切换 ----
watch(
  () => weatherStore.currentWeather?.weather,
  (newWeather) => {
    if (newWeather) {
      setBackground(newWeather)
    }
  }
)

// ---- 轮询：每 30 分钟刷新当前地址天气 ----
const { start, stop } = usePolling(
  () => weatherStore.refreshCurrentLocation(),
  30 * 60 * 1000,
  {
    immediate: false,
    args: [],
  }
)

function handleBeforeUnload(): void {
  stop()
}

onMounted(() => {
  resetBackground()

  // 数据加载完成后启动轮询
  const unwatch = watch(
    () => weatherStore.hasData,
    (hasData) => {
      if (hasData) {
        start()
        unwatch()
      }
    }
  )

  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style lang="less">
@import '@assets/less/global.less';
</style>

<style scoped lang="less">
.app-wrapper {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

// 双层背景共享样式
.bg-layer {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #283445; // 暗蓝灰兜底（略亮于纯黑，确保定位图标可见）
}

// 底层：始终可见
.bg-current {
  z-index: 0;
}

// 上层：初始透明，过渡时淡入
.bg-next {
  z-index: 1;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
}

.bg-next--visible {
  opacity: 1;
}
</style>
