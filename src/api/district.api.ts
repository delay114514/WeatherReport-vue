// ============================================
// 行政区划 API / District API
// ============================================

import { api } from './request'
import { BACKEND_BASE_URL } from '@/utils/constants'
import type { Province } from '@/types/district'

/**
 * 获取全国完整行政区划数据（省/市/区县，含经纬度）
 * 后端已完成直辖市重组、坐标解析，返回前端可直接使用的 Province[]
 */
export async function fetchAllDistricts(): Promise<{ provinces: Province[] }> {
  const url = `${BACKEND_BASE_URL}/api/district/all`
  return api.get(url) as Promise<{ provinces: Province[] }>
}
