// ============================================
// SSE 流式请求工具 / SSE Stream Request Utility
// ============================================
// 使用 fetch + ReadableStream 解析 SSE (Server-Sent Events)，
// 将后端 agent 的流式响应分派到回调函数。

import { BACKEND_BASE_URL } from '@/utils/constants'
import type { ChatRequest, WeatherDataEvent, DoneEvent } from '@/types/agent'

export interface StreamCallbacks {
  onToken: (text: string) => void
  onToolCall: (tool: string, args: Record<string, unknown>) => void
  onToolResult: (tool: string, output: string) => void
  onWeatherData: (data: WeatherDataEvent) => void
  onDone: (summary: DoneEvent) => void
  onError: (message: string) => void
}

/**
 * 发起 SSE 流式请求到 agent 聊天接口。
 *
 * @param request  - 聊天请求体（包含消息、位置上下文、天气摘要等）
 * @param callbacks - 事件回调
 * @returns AbortController，调用 .abort() 可取消请求
 */
export function streamAgentChat(
  request: ChatRequest,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController()
  const { signal } = controller

  const url = `${BACKEND_BASE_URL}/api/agent/chat/stream`

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        callbacks.onError(`请求失败 (${response.status})`)
        return
      }
      if (!response.body) {
        callbacks.onError('浏览器不支持流式响应')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 按 SSE 双换行分隔事件
          const parts = buffer.split('\n\n')
          // 最后一段可能不完整，保留到下次
          buffer = parts.pop() || ''

          for (const part of parts) {
            const trimmed = part.trim()
            if (!trimmed) continue

            // 提取 data: 行
            const dataLine = trimmed
              .split('\n')
              .find((line) => line.startsWith('data: '))

            if (!dataLine) continue

            const jsonStr = dataLine.slice(6) // 去掉 "data: "
            try {
              const data = JSON.parse(jsonStr)
              dispatch(data, callbacks)
            } catch {
              // 忽略解析失败的 JSON 片段
            }
          }
        }

        // 处理最后残留的 buffer
        if (buffer.trim()) {
          const dataLine = buffer
            .trim()
            .split('\n')
            .find((line) => line.startsWith('data: '))
          if (dataLine) {
            const jsonStr = dataLine.slice(6)
            try {
              const data = JSON.parse(jsonStr)
              dispatch(data, callbacks)
            } catch {
              // ignore
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return // 用户主动取消，不报错
        }
        callbacks.onError(
          err instanceof Error ? err.message : '流式连接中断'
        )
      }
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return // 用户主动取消
      }
      callbacks.onError(
        err instanceof Error ? err.message : '网络请求失败'
      )
    })

  return controller
}

/** 按 SSE 事件 type 分派到对应回调 */
function dispatch(
  data: Record<string, unknown>,
  callbacks: StreamCallbacks
): void {
  switch (data.type) {
    case 'token':
      if (typeof data.content === 'string') {
        callbacks.onToken(data.content)
      }
      break
    case 'tool_call':
      callbacks.onToolCall(
        (data.tool as string) || 'unknown',
        (data.args as Record<string, unknown>) || {}
      )
      break
    case 'tool_result':
      callbacks.onToolResult(
        (data.tool as string) || 'unknown',
        (data.output as string) || ''
      )
      break
    case 'weather_data':
      callbacks.onWeatherData(data as unknown as WeatherDataEvent)
      break
    case 'done':
      callbacks.onDone(data as unknown as DoneEvent)
      break
    case 'error':
      callbacks.onError((data.message as string) || '未知错误')
      break
    // 'log' 类型忽略（仅后端调试用）
  }
}
