// ============================================
// Agent 对话 Store / Agent Chat Store
// ============================================
// 管理 AI 助手聊天消息、流式状态、上下文组装。
// 遵循 api → store → view 架构：ChatView 只负责渲染，
// 所有业务逻辑（发消息、组装上下文、回调处理）集中在 store。

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWeatherStore } from './weather'
import { streamAgentChat } from '@/utils/streamRequest'
import { normalizeIconKeyword } from '@/utils/weather'
import type { ChatMessage, ChatRequest, WeatherDataEvent } from '@/types/agent'
import type { CurrentWeatherData, ForecastDayData } from '@/types/weather'

/** 历史记录轮次上限（发给后端的上下文条数） */
const MAX_HISTORY_TURNS = 20

export const useAgentStore = defineStore('agent', () => {
  // ---- State ----

  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const streamingMsgId = ref('')

  let msgIdCounter = 0
  function nextMsgId(): string {
    return `msg-${++msgIdCounter}-${Date.now()}`
  }

  // ---- 内部工具 ----

  /** 将消息列表格式化为发给后端的 history 字符串 */
  function buildHistory(): string {
    if (messages.value.length === 0) return ''

    // 只取最近 N 对 user+assistant 完整轮次
    const turns: string[] = []
    const recent = messages.value.slice(-MAX_HISTORY_TURNS * 2)

    for (const msg of recent) {
      if (msg.role === 'user') {
        turns.push(`用户: ${msg.content}`)
      } else if (msg.role === 'assistant') {
        turns.push(`助手: ${msg.content}`)
      }
    }
    return turns.join('; ')
  }

  /** 组装发送请求的完整上下文 */
  async function buildContext(message: string): Promise<ChatRequest> {
    const weatherStore = useWeatherStore()
    const loc = weatherStore.currentLocation

    // 检查并刷新过期缓存
    if (weatherStore.isCurrentCacheStale) {
      await weatherStore.refreshCurrentLocation()
    }

    const req: ChatRequest = {
      message,
      stream: true,
      history: buildHistory() || null,
    }

    // 位置信息
    if (loc) {
      req.user_adcode = loc.adcode || null
      req.user_city = loc.name || null
      req.user_district = null
      req.user_lat = loc.latitude || null
      req.user_lon = loc.longitude || null
    }

    // 天气摘要
    const cw = weatherStore.currentWeather
    if (cw) {
      req.current_weather = {
        temperature: cw.temperature,
        humidity: cw.humidity,
        weather: cw.weather,
        daytemp: cw.daytemp,
        nighttemp: cw.nighttemp,
        winddirection: cw.winddirection,
        windpower: cw.windpower,
      }
    }

    const fc = weatherStore.forecast
    if (fc && fc.length > 0) {
      req.current_forecast = fc.slice(0, 4).map((d) => ({
        label: d.label,
        date: d.date,
        dayweather: d.dayweather,
        nighttemp: d.nighttemp,
        daytemp: d.daytemp,
      }))
    }

    return req
  }

  // ---- Actions ----

  /** 发送用户消息，发起 SSE 流式请求 */
  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || isStreaming.value) return

    // 1. 推送用户消息
    messages.value.push({
      id: nextMsgId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    })

    // 2. 创建空的 assistant 消息
    const assistantId = nextMsgId()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      weatherData: [],
      timestamp: Date.now(),
    }
    messages.value.push(assistantMsg)
    streamingMsgId.value = assistantId
    isStreaming.value = true

    // 3. 组装上下文并请求
    const request = await buildContext(trimmed)

    streamAgentChat(request, {
      onToken(text: string) {
        const msg = messages.value.find((m) => m.id === assistantId)
        if (msg) msg.content += text
      },
      onToolCall(_tool: string, _args: Record<string, unknown>) {},
      onToolResult(_tool: string, _output: string) {},
      onWeatherData(data: WeatherDataEvent) {
        const msg = messages.value.find((m) => m.id === assistantId)
        if (!msg) return
        if (!msg.weatherData) msg.weatherData = []

        const weatherStore = useWeatherStore()
        const enriched: WeatherDataEvent = {
          ...data,
          data: {
            current: {
              ...data.data.current,
              weatherImage: `/images/icon/${normalizeIconKeyword(data.data.current.weather)}.jpg`,
            } as CurrentWeatherData,
            forecast: data.data.forecast.map((d) => ({
              ...d,
              weatherImage: `/images/icon/${normalizeIconKeyword(d.dayweather)}.jpg`,
            })) as ForecastDayData[],
          },
        }
        msg.weatherData.push(enriched)

        weatherStore.setExternalWeather(
          data.adcode,
          enriched.data.current as CurrentWeatherData,
          enriched.data.forecast as ForecastDayData[]
        )
      },
      onDone(_summary) {
        isStreaming.value = false
        streamingMsgId.value = ''
      },
      onError(message: string) {
        const msg = messages.value.find((m) => m.id === assistantId)
        if (msg) msg.content += `\n\n❌ ${message}`
        isStreaming.value = false
        streamingMsgId.value = ''
      },
    })
  }

  /** 清空历史 */
  function clearHistory(): void {
    messages.value = []
    isStreaming.value = false
    streamingMsgId.value = ''
  }

  return {
    // state
    messages,
    isStreaming,
    streamingMsgId,
    // actions
    sendMessage,
    clearHistory,
  }
})
