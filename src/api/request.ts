// ============================================
// Fetch 封装 / Fetch Wrapper (JSON-only)
// ============================================

/**
 * 基础 fetch 请求
 * - 所有响应体统一解析为 JSON
 * - 非 OK 响应抛出包含状态码的错误
 */
async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  const config: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    ...options,
  }

  let response: Response
  try {
    response = await fetch(url, config)
  } catch (error) {
    console.error('网络请求失败:', error)
    throw new Error('网络错误，请检查网络连接')
  }

  if (!response.ok) {
    console.error(`HTTP 错误! 状态码: ${response.status}`)
    throw new Error(`请求失败 (${response.status})`)
  }

  try {
    return await response.json()
  } catch (error) {
    console.error('JSON 解析失败:', error)
    throw new Error('响应数据解析失败')
  }
}

/**
 * API 请求方法集合
 * 直接使用原生 fetch，所有方法返回 Promise<any>
 */
export const api = {
  /**
   * GET 请求
   */
  get(url: string): Promise<unknown> {
    return request(url, { method: 'GET' })
  },
}
