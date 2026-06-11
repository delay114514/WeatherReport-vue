<!--
  WeatherAlertModal.vue — 天气预警详情弹窗
  暗色背景 + 半透明遮罩，点击遮罩或关闭按钮退出
-->
<template>
  <div v-if="visible" class="alert-modal-overlay" @click.self="$emit('close')">
    <div class="alert-modal">
      <button class="alert-modal-close" @click="$emit('close')" title="关闭">✕</button>
      <div class="alert-modal-header">
        <span class="alert-modal-severity" :style="{ background: severityColor }">
          {{ alert.severity }}
        </span>
        <span class="alert-modal-time">
          {{ formattedTime }}
        </span>
      </div>
      <h2 class="alert-modal-title">{{ alert.headline }}</h2>
      <p class="alert-modal-desc">{{ alert.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeatherAlert } from '@/types/weather'

const props = defineProps<{
  visible: boolean
  alert: WeatherAlert
}>()

defineEmits<{ close: [] }>()

const severityColor = computed(() => {
  const c = props.alert.color
  return `rgba(${c.red},${c.green},${c.blue},${c.alpha})`
})

const formattedTime = computed(() => {
  try {
    const d = new Date(props.alert.issuedTime)
    return d.toLocaleString('zh-CN')
  } catch {
    return props.alert.issuedTime
  }
})
</script>

<style scoped lang="less">
.alert-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.alert-modal {
  position: relative;
  background: #1e1e2e;
  border-radius: @border_radius_lg;
  max-width: 640px;
  width: 100%;
  padding: 2rem 1.5rem 1.5rem;
  color: #e0e0e0;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.alert-modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;
  transition: color 0.15s;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }
}

.alert-modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.alert-modal-severity {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 3px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
}

.alert-modal-time {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.alert-modal-title {
  font-size: 1.2rem;
  margin: 0 0 1rem;
  color: #fff;
  font-weight: 700;
}

.alert-modal-desc {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
  white-space: pre-wrap;
  margin: 0;
}
</style>
