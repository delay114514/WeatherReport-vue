<!--
  ChatView.vue — AI 天气助手聊天页面
  全宽聊天区，无侧边栏。
  核心功能：SSE 流式消息 + 微缩天气卡片 + 上下文自动注入
-->
<template>
  <div
    class="chat-page"
    :style="{ backgroundColor: timeColors.bg }"
  >
    <!-- 主聊天区 -->
    <div class="chat-main">
      <header class="chat-header">
        <button class="chat-back" @click.stop="goBack" title="返回首页">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 class="chat-title">AI 天气助手</h2>
      </header>

      <!-- 消息列表 -->
      <div ref="bodyRef" class="chat-body">
        <div v-if="agentStore.messages.length === 0" class="chat-placeholder">
          <div class="placeholder-icon">💬</div>
          <p class="placeholder-title">AI 天气助手</p>
          <p class="placeholder-desc">
            向我询问天气建议、出行规划、穿衣指数等问题
          </p>
          <div class="example-list">
            <p class="example-label">试试这样问我：</p>
            <button
              v-for="example in examples"
              :key="example"
              class="example-item"
              :style="{ background: timeColors.cardBg, borderColor: timeColors.cardBorder }"
              :disabled="agentStore.isStreaming"
              @click="sendMessage(example)"
            >{{ example }}</button>
          </div>
        </div>

        <div v-else class="chat-messages">
          <div
            v-for="msg in agentStore.messages"
            :key="msg.id"
            class="chat-bubble"
            :class="{
              'chat-bubble--user': msg.role === 'user',
              'chat-bubble--assistant': msg.role === 'assistant',
            }"
          >
            <div class="chat-bubble-avatar">
              {{ msg.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="chat-bubble-content">
              <!-- assistant 消息渲染 markdown；user 消息纯文本 -->
              <div
                v-if="msg.role === 'assistant'"
                class="chat-bubble-text chat-bubble-text--md"
                v-html="renderMarkdown(msg.content)"
              ></div>
              <div v-else class="chat-bubble-text">{{ msg.content }}</div>
              <span v-if="msg.role === 'assistant' && agentStore.isStreaming && msg.id === agentStore.streamingMsgId" class="chat-cursor">▊</span>

              <!-- 微缩天气卡片（仅 assistant 消息） -->
              <template v-if="msg.role === 'assistant' && msg.weatherData">
                <MiniWeatherCard
                  v-for="(wd, wi) in msg.weatherData"
                  :key="`weather-${wi}`"
                  :weather="wd.data.current as any"
                  class="chat-weather-card"
                />
                <template v-for="(wd, wi) in msg.weatherData" :key="`fc-${wi}`">
                  <MiniForecastRow
                    v-if="wd.data.forecast && wd.data.forecast.length > 0"
                    :forecast="wd.data.forecast as any"
                    class="chat-weather-card"
                  />
                </template>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <footer class="chat-footer">
        <div class="chat-input-wrapper">
          <input
            ref="inputRef"
            v-model="inputText"
            type="text"
            class="chat-input"
            placeholder="输入你的问题..."
            :disabled="agentStore.isStreaming"
            @keyup.enter="sendMessage(inputText)"
          />
          <button
            class="chat-send"
            :disabled="!inputText.trim() || agentStore.isStreaming"
            @click="sendMessage(inputText)"
          >发送</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAgentStore } from '@/stores/agent'
import { isMorning, isAfternoon } from '@/utils/weather'
import { marked } from 'marked'
import MiniWeatherCard from '@/components/MiniWeatherCard.vue'
import MiniForecastRow from '@/components/MiniForecastRow.vue'

// ---- 常量 ----

const examples = [
  '今天适合出门吗？',
  '未来几天有雨吗？',
  '当前天气适合运动吗？',
  '明天穿什么合适？',
]

/** 将 AI 返回的 markdown 文本转换为 HTML */
function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}

// ---- Store ----

const router = useRouter()
const agentStore = useAgentStore()

// ---- UI 状态 ----

const bodyRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const inputText = ref('')

// ---- 计算属性 ----

interface TimeColors {
  bg: string
  cardBg: string
  cardBorder: string
}

const timeColors = computed<TimeColors>(() => {
  const hour = new Date().getHours()
  if (isMorning(hour)) {
    return {
      bg: '#e8a550',
      cardBg: 'rgba(0, 0, 0, 0.06)',
      cardBorder: 'rgba(0, 0, 0, 0.1)',
    }
  }
  if (isAfternoon(hour)) {
    return {
      bg: '#3b7dd8',
      cardBg: 'rgba(255, 255, 255, 0.13)',
      cardBorder: 'rgba(255, 255, 255, 0.18)',
    }
  }
  return {
    bg: '#1e2746',
    cardBg: 'rgba(255, 255, 255, 0.1)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
  }
})

// ---- 导航 ----

function goBack(): void {
  router.push('/')
}

// ---- 滚动 ----

function scrollToBottom(): void {
  nextTick(() => {
    const el = bodyRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// 监听消息变化 → 自动滚动
watch(
  () => agentStore.messages.length,
  () => scrollToBottom()
)

// ---- 发送消息 ----

function sendMessage(text: string): void {
  if (!text.trim() || agentStore.isStreaming) return
  inputText.value = ''
  agentStore.sendMessage(text.trim())
  scrollToBottom()
}
</script>

<style scoped lang="less">
// ---- 页面容器 ----
.chat-page {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  overflow: hidden;
}

// ---- 主聊天区 ----
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0 1rem;

  @media (min-width: @breakpoint_tablet) {
    padding: 0 2rem;
  }

  @media (min-width: @breakpoint_wide) {
    padding: 0 4rem;
  }
}

// ---- 顶部导航 ----
.chat-header {
  display: flex;
  align-items: center;
  padding: 1rem 0;
  gap: 0.75rem;
  flex-shrink: 0;

  .chat-back {
    @media (min-width: @breakpoint_tablet) {
      display: none;
    }

    .flex-center();
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    cursor: pointer;
    color: @font_color;
    flex-shrink: 0;
    transition: background-color 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  }

  .chat-title {
    color: @font_color;
    font-size: clamp(1.2rem, 3vw, 1.6rem);
    margin: 0;
    flex: 1;
    text-align: center;

    @media (min-width: @breakpoint_tablet) {
      text-align: left;
      flex: none;
    }
  }
}

// ---- 内容区 ----
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

// ---- 占位欢迎页 ----
.chat-placeholder {
  text-align: center;
  max-width: 480px;
  margin: 0 auto;
  padding: 2rem 0;

  @media (min-width: @breakpoint_desktop) {
    max-width: 560px;
  }

  .placeholder-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
  }

  .placeholder-title {
    .weather-font(clamp(1.2rem, 3vw, 1.5rem));
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .placeholder-desc {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }
}

.example-list {
  text-align: left;

  .example-label {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .example-item {
    display: block;
    width: 100%;
    border: 1px solid;
    border-radius: @border_radius_lg;
    padding: 0.6rem 1rem;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.95rem;
    text-align: left;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// ---- 消息列表 ----
.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: @breakpoint_desktop) {
    max-width: 900px;
  }

  @media (min-width: @breakpoint_wide) {
    max-width: 1000px;
  }
}

// ---- 聊天气泡 ----
.chat-bubble {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;

  &--user {
    flex-direction: row-reverse;

    .chat-bubble-content {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.22);
    }

    .chat-bubble-text {
      color: #fff;
    }
  }

  &--assistant {
    .chat-bubble-content {
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .chat-bubble-text {
      color: rgba(255, 255, 255, 0.95);
    }
  }

  &-avatar {
    flex-shrink: 0;
    width: 2.2rem;
    height: 2.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  &-content {
    flex: 1;
    min-width: 0;
    padding: 0.75rem 1rem;
    border-radius: @border_radius_lg;
    line-height: 1.5;
  }

  &-text {
    font-size: 0.95rem;
    white-space: pre-wrap;
    word-break: break-word;

    // markdown 渲染内容（assistant 消息）
    &--md {
      :deep(p) {
        margin: 0.35em 0;
        &:first-child { margin-top: 0; }
        &:last-child { margin-bottom: 0; }
      }
      :deep(strong) {
        font-weight: 700;
        color: @font_color;
      }
      :deep(em) { font-style: italic; }
      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 0.5em 0;
        font-size: 0.9rem;
      }
      :deep(th),
      :deep(td) {
        padding: 0.35rem 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
        text-align: left;
      }
      :deep(th) {
        background: rgba(255, 255, 255, 0.08);
        font-weight: 600;
      }
      :deep(tr:nth-child(even) td) {
        background: rgba(255, 255, 255, 0.03);
      }
      :deep(ul),
      :deep(ol) {
        padding-left: 1.25rem;
        margin: 0.35em 0;
      }
      :deep(li) { margin: 0.15em 0; }
      :deep(code) {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.1em 0.35em;
        border-radius: 4px;
        font-size: 0.9em;
      }
      :deep(pre) {
        background: rgba(0, 0, 0, 0.2);
        padding: 0.6rem 0.8rem;
        border-radius: @border_radius_comset;
        overflow-x: auto;
        margin: 0.5em 0;
      }
      :deep(pre code) {
        background: none;
        padding: 0;
      }
      :deep(blockquote) {
        border-left: 3px solid rgba(255, 255, 255, 0.3);
        padding-left: 0.75rem;
        margin: 0.5em 0;
        color: rgba(255, 255, 255, 0.7);
      }
      :deep(hr) {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        margin: 0.75em 0;
      }
      :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
        margin: 0.5em 0 0.25em;
        font-weight: 600;
        color: @font_color;
      }
      :deep(h1) { font-size: 1.2rem; }
      :deep(h2) { font-size: 1.1rem; }
      :deep(h3) { font-size: 1rem; }
    }
  }
}

// 流式输出光标动画
.chat-cursor {
  display: inline-block;
  color: @font_color;
  font-size: 0.95rem;
  animation: cursor-blink 0.7s infinite;
  vertical-align: baseline;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// 迷你天气卡片在气泡内缩进
.chat-weather-card {
  margin-top: 0.5rem;
}

// ---- 底部输入栏 ----
.chat-footer {
  padding: 1rem 0 1.5rem;
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: @border_radius_lg;
  padding: 0.5rem;
  max-width: 700px;
  margin: 0 auto;

  @media (min-width: @breakpoint_desktop) {
    max-width: 900px;
  }

  @media (min-width: @breakpoint_wide) {
    max-width: 1000px;
  }

  .chat-input {
    flex: 1;
    background: transparent;
    border: none;
    color: @font_color;
    font-size: 0.95rem;
    padding: 0.5rem 0.75rem;
    outline: none;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  .chat-send {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: @border_radius_comset;
    color: @font_color;
    padding: 0.5rem 1.25rem;
    font-size: 0.95rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}
</style>
