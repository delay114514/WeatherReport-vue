// ============================================
// sessionStorage 缓存工具 / Session Cache Utils
// ============================================

/**
 * 从 sessionStorage 读取并校验缓存
 * @returns 有效数据或 null
 */
export function loadFromSession<T>(key: string, ttl: number): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const payload: { data: T; timestamp: number } = JSON.parse(raw)
    if (!payload.timestamp || (Date.now() - payload.timestamp) > ttl) {
      sessionStorage.removeItem(key)
      return null
    }
    return payload.data
  } catch {
    return null
  }
}

/**
 * 写入 sessionStorage
 */
export function saveToSession<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // 配额满或隐私模式下静默失败
  }
}
