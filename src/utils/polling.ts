// ============================================
// 轮询工具函数 / Polling Utility
// 从 F:\WEBSITE\vue3-market\src\utils\polling.js 移用并适配
// ============================================

import { ref, onUnmounted, type Ref } from 'vue'

interface PollingOptions {
  immediate?: boolean
  args?: unknown[]
}

interface PollingReturn {
  timerId: Ref<ReturnType<typeof setTimeout> | null>
  isActive: Ref<boolean>
  start: (...dynamicArgs: unknown[]) => void
  stop: () => void
  restart: (...dynamicArgs: unknown[]) => void
  updateArgs: (...newArgs: unknown[]) => void
}

/**
 * 轮询钩子函数
 * @param fn - 要执行的函数（可以是带参数的函数）
 * @param interval - 轮询间隔（毫秒）
 * @param options - 配置选项
 * @param options.immediate - 是否立即执行第一次
 * @param options.args - 传递给函数的参数数组
 * @returns 轮询控制对象
 */
export function usePolling(
  fn: (...args: unknown[]) => Promise<void>,
  interval: number,
  options: PollingOptions = {}
): PollingReturn {
  const { immediate = true, args = [] } = options

  const timerId: Ref<ReturnType<typeof setTimeout> | null> = ref(null)
  const isActive = ref(false)

  const poll = async () => {
    if (!isActive.value) return

    try {
      await fn(...args)
    } catch (error) {
      console.error('轮询执行错误:', error)
    }

    if (isActive.value) {
      timerId.value = setTimeout(poll, interval)
    }
  }

  /**
   * 启动轮询
   * @param dynamicArgs - 动态参数，会覆盖初始化时传入的 args
   */
  const start = (...dynamicArgs: unknown[]) => {
    if (isActive.value) return
    isActive.value = true

    // 如果传入了动态参数，使用动态参数；否则使用初始化时的 args
    const executeArgs = dynamicArgs.length > 0 ? dynamicArgs : args

    if (immediate) {
      const pollWithArgs = async () => {
        if (!isActive.value) return
        try {
          await fn(...executeArgs)
        } catch (error) {
          console.error('轮询执行错误:', error)
        }
        if (isActive.value) {
          timerId.value = setTimeout(pollWithArgs, interval)
        }
      }
      pollWithArgs()
    } else {
      timerId.value = setTimeout(() => {
        if (isActive.value) {
          fn(...executeArgs)
            .catch((error: Error) => console.error('轮询执行错误:', error))
            .then(() => {
              if (isActive.value) {
                timerId.value = setTimeout(poll, interval)
              }
            })
        }
      }, interval)
    }
  }

  /**
   * 停止轮询
   */
  const stop = () => {
    isActive.value = false
    if (timerId.value) {
      clearTimeout(timerId.value)
      timerId.value = null
    }
  }

  /**
   * 重启轮询
   * @param dynamicArgs - 动态参数
   */
  const restart = (...dynamicArgs: unknown[]) => {
    stop()
    start(...dynamicArgs)
  }

  /**
   * 更新轮询参数
   * @param newArgs - 新的参数
   */
  const updateArgs = (...newArgs: unknown[]) => {
    options.args = newArgs
  }

  onUnmounted(() => {
    stop()
  })

  return {
    timerId,
    isActive,
    start,
    stop,
    restart,
    updateArgs,
  }
}
