// ============================================
// 行政区划数据类型 / District Data Types
// ============================================

/** 区县级 */
export interface County {
  adcode: string
  countyorstreets: string
  level: 'county'
  parent: string             // 所属城市名
  longitude: number
  latitude: number
}

/** 城市级 */
export interface City {
  adcode: string
  city: string
  county: County[]
  level: 'city'
  parent: string             // 所属省份名
  longitude: number
  latitude: number
}

/** 省级 */
export interface Province {
  adcode: string
  provinces: string
  city: City[]
  level: 'province'
}

/** 搜索返回的扁平结果 */
export interface DistrictSearchResult {
  adcode: string
  name: string               // 城市名或区县/街道名
  parentName: string         // 上级行政区划名
  provinceName: string       // 所属省份名（用于完整层级展示）
  level: 'city' | 'county'
  longitude: number
  latitude: number
}

/**
 * 当前定位信息 — 归一化的地址对象。
 * 来自 address.json 的原始条目，字段名统一为 name。
 * 无论省/市/区县哪一级，结构一致。
 */
export interface LocationInfo {
  adcode: string
  name: string               // 省份名 / 城市名 / 区县名
  level: 'province' | 'city' | 'county'
  parent: string              // 直接上级区划名（county→city名, city→province名, province→""）
  province: string            // 所属省份名（直辖市=自身名，用于显示拼接和 municipality 判断）
  longitude: number
  latitude: number
}

// ---- 高德行政区划 API 响应 ----

export interface AmapDistrictItem {
  adcode: string
  name: string
  level: string
  center?: string             // 高德格式: "longitude,latitude"
  districts: AmapDistrictItem[]
}

export interface AmapDistrictResponse {
  status: '0' | '1'
  info: string
  infocode: string
  count: string
  suggestion: {
    keywords: unknown[]
    cities: unknown[]
  }
  districts: AmapDistrictItem[]
}
