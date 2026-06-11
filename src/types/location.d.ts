// ============================================
// 定位相关类型 / Location Types
// ============================================

/** HTML5 Geolocation 坐标 */
export interface GeoCoordinates {
  latitude: number
  longitude: number
}

/** 高德逆地理编码响应 */
export interface AmapRegeoResponse {
  status: '0' | '1'
  regeocode: {
    addressComponent: {
      adcode: string
      district: string
      city: string
      province: string
    }
  }
}

/** IP 定位响应（后端已归一化 ip-api.com 响应） */
export interface IPInfoResponse {
  city: string
  region: string
  country: string
}
