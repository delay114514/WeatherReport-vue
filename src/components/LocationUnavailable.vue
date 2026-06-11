<!--
  LocationUnavailable.vue — 定位失败全屏提示
  当浏览器定位和 IP 定位均失败时显示，提供重试和默认位置选项
-->
<template>
  <Transition name="fade">
    <div v-if="visible" class="location-unavailable-overlay">
      <div class="unavailable-card">
        <div class="unavailable-icon">&#9888;&#65039;</div>
        <h2 class="unavailable-title">位置获取失败</h2>
        <p class="unavailable-desc">无法通过浏览器定位或 IP 获取您的位置，请尝试以下操作</p>
        <div class="unavailable-actions">
          <button class="btn-retry" @click="$emit('retry')">
            <span class="btn-icon">&#10227;</span> 重新尝试定位
          </button>
          <button class="btn-default" @click="$emit('use-default')">
            <span class="btn-icon">&#127747;</span> 使用默认位置(北京)
          </button>
        </div>
        <p class="unavailable-hint">您也可以使用顶部搜索框手动选择城市</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible?: boolean
}>()

defineEmits<{
  retry: []
  'use-default': []
}>()
</script>

<style scoped lang="less">
.location-unavailable-overlay {
  position: fixed;
  inset: 0;
  z-index: 998;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(40, 52, 69, 0.95);
}

.unavailable-card {
  .frosted-glass(@frosted_bg, @frosted_blur);
  border: 1px solid @frosted_border;
  border-radius: @border_radius_xl;
  box-shadow: @shadow_frosted;
  padding: 2.5rem 2rem;
  text-align: center;
  max-width: 420px;
  width: 85%;
}

.unavailable-icon {
  font-size: 3.5rem;
  line-height: 1;
  margin-bottom: 1rem;
}

.unavailable-title {
  color: @font_color;
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  margin: 0 0 0.75rem;
  font-weight: 600;
}

.unavailable-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.unavailable-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  @media (min-width: @breakpoint_tablet) {
    flex-direction: row;
    justify-content: center;
  }
}

.btn-retry,
.btn-default {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 1px solid @frosted_border;
  border-radius: @border_radius_lg;
  background-color: @frosted_bg;
  color: @font_color;
  font-size: 1rem;
  cursor: pointer;
  transition: @transition_hover;
  white-space: nowrap;

  &:hover {
    background-color: @frosted_hover;
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-icon {
  font-size: 1.15rem;
}

.unavailable-hint {
  margin: 1.25rem 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

// 进入/离开过渡（匹配 LoadingOverlay）
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
