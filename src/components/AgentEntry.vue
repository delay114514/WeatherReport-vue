<!--
  AgentEntry.vue — AI 天气助手入口
  - 桌面端 (≥768px)：右侧固定浮栏，不参与文档流，不侵占居中布局
  - 移动端 (<768px)：预报卡片下方功能栏
-->
<template>
  <div class="agent-entry" @click="goChat">
    <span class="agent-icon">🤖</span>
    <span class="agent-label">AI 助手</span>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goChat(): void {
  router.push('/chat')
}
</script>

<style scoped lang="less">
.agent-entry {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  .frosted-glass();
  border: 1px solid @frosted_border;
  transition: background-color 0.2s, transform 0.15s;

  .agent-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .agent-label {
    color: @font_color;
    font-size: 0.85rem;
    font-weight: 500;
  }

  // ---- 桌面端：固定右侧浮栏 ----
  @media (min-width: @breakpoint_tablet) {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    flex-direction: column;
    gap: 0.35rem;
    width: 64px;
    padding: 0.75rem 0.5rem;
    border-radius: @border_radius_comset 0 0 @border_radius_comset;
    border-right: none;

    .agent-icon {
      font-size: 1.4rem;
    }

    .agent-label {
      font-size: 0.7rem;
      writing-mode: vertical-rl;
      letter-spacing: 0.15em;
    }

    &:hover {
      background-color: @frosted_hover;
      transform: translateY(-50%) scale(1.05);
    }
  }

  // ---- 移动端：功能栏 ----
  @media (max-width: (@breakpoint_tablet - 1px)) {
    width: 90%;
    max-width: 600px;
    flex-direction: row;
    gap: 0.6rem;
    border-radius: @border_radius_lg;
    padding: 0.75rem 1.25rem;
    margin: 1rem auto 1.5rem;

    .agent-label {
      font-size: 0.95rem;
    }

    &:active {
      background-color: @frosted_hover;
    }
  }
}
</style>
