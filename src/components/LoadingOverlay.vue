<!--
  LoadingOverlay.vue — 全屏加载动画遮罩
  带天气图标脉冲动画 + 状态文字提示
-->
<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="loading-overlay"
      :style="{ backgroundColor: overlayColor }"
    >
      <div class="loading-content">
        <!-- 天气图标（组件创建时确定，挂载前锁定） -->
        <div class="weather-icon-pulse">
          <span>{{ icon }}</span>
        </div>
        <p class="loading-text">{{ loadingText }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible?: boolean
  loadingText?: string
}>(), {
  visible: false,
  loadingText: '正在获取数据，请稍后',
})

// 组件创建时一次性确定（挂载前锁定，不随渲染变动）
const hour = new Date().getHours()

const icon = hour < 6 || hour >= 20 ? '🌙' : hour >= 17 ? '🌅' : '☀️'

// 按时段的不透明遮罩颜色
const overlayColor: string =
  hour >= 6 && hour < 11  ? '#f0a050'  // 早上：明亮橙黄
  : hour >= 11 && hour < 17 ? '#d4784c' // 下午：暗橙
  : hour >= 17 && hour < 20 ? '#3d2b1f' // 傍晚：深暗橙褐
  : '#121626'                           // 夜间：灰黑蓝
</script>

<style scoped lang="less">
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-content {
  text-align: center;
}

// 天气图标脉冲动画
.weather-icon-pulse {
  font-size: 5rem;
  line-height: 1;
  animation: icon-pulse 2s ease-in-out infinite;

  span {
    display: inline-block;
  }
}

@keyframes icon-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

// 状态文字
.loading-text {
  margin-top: 1.5rem;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.05em;
}

// 进入/离开过渡
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
