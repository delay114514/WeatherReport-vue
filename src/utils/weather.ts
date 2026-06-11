// ============================================
// 天气工具函数 / Weather Utility Functions
// ============================================

import { BG_KEYWORDS, ICON_KEYWORDS } from '@/utils/constants'

/**
 * 根据天气文字提取背景图关键词（中文文件名）
 * 例如 "多云转晴" → "多云"（匹配第一个关键词）
 */
export function normalizeBgKeyword(weatherText: string): string {
  const lowerText = weatherText.toLowerCase()
  for (const [key, value] of Object.entries(BG_KEYWORDS)) {
    if (lowerText.includes(key)) {
      return value
    }
  }
  return '晴' // 兜底：晴.jpg 始终存在
}

/**
 * 根据天气文字提取图标关键词（英文文件名）
 * 例如 "多云" → "cloudy"
 */
export function normalizeIconKeyword(weatherText: string): string {
  const lowerText = weatherText.toLowerCase()
  for (const [key, value] of Object.entries(ICON_KEYWORDS)) {
    if (lowerText.includes(key)) {
      return value
    }
  }
  return 'sunny' // 兜底：sunny.jpg 始终存在
}

/**
 * @deprecated 请使用 normalizeBgKeyword 或 normalizeIconKeyword
 */
export function normalizeWeatherKeyword(weatherText: string): string {
  return normalizeBgKeyword(weatherText)
}

/**
 * 获取背景图路径
 */
export function getBgImagePath(weatherText: string): string {
  const keyword = normalizeBgKeyword(weatherText)
  return `/images/bg/${keyword}.jpg`
}

/**
 * 获取图标路径
 */
export function getIconImagePath(weatherText: string): string {
  const keyword = normalizeIconKeyword(weatherText)
  return `/images/icon/${keyword}.jpg`
}

/**
 * 判断是否夜间
 */
export function isNight(hour: number): boolean {
  return hour < 8 || hour > 18
}

/**
 * 判断是否早上
 */
export function isMorning(hour: number): boolean {
  return hour >= 8 && hour < 11
}

/**
 * 判断是否下午
 */
export function isAfternoon(hour: number): boolean {
  return hour >= 11 && hour < 18
}
