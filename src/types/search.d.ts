// ============================================
// 搜索与历史记录类型 / Search & History Types
// ============================================

import type { DistrictSearchResult } from './district'

/** 搜索历史单条记录 */
export interface SearchHistoryEntry {
  adcode: string
  name: string               // 行政区划名
  parentName: string         // 上级区划名（展示用）
  provinceName?: string      // 所属省份名
  level?: string             // 'city' | 'county'
  timestamp: number          // Date.now() 添加时间
}

/** Search Store 状态 */
export interface SearchState {
  query: string
  results: DistrictSearchResult[]
  isOpen: boolean
  isLoading: boolean
  history: SearchHistoryEntry[]
}
