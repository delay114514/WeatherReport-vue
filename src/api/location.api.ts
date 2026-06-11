// ============================================
// 定位 API / Location API
// ============================================

import { api } from './request'
import { BACKEND_BASE_URL } from '@/utils/constants'
import type { AmapRegeoResponse, GeoCoordinates, IPInfoResponse } from '@/types/location'

/**
 * 根据经纬度逆向地理编码，获取 adcode
 */
export async function getGeolocation(longitude: number, latitude: number): Promise<AmapRegeoResponse> {
  const url = `${BACKEND_BASE_URL}/api/geocode/regeo?lon=${longitude}&lat=${latitude}`
  return api.get(url) as Promise<AmapRegeoResponse>
}

/**
 * IP 定位（备用方案）
 */
export async function getIPInfo(): Promise<IPInfoResponse> {
  return api.get(`${BACKEND_BASE_URL}/api/ip/lookup`) as Promise<IPInfoResponse>
}

/**
 * 根据地址文字正向地理编码，获取 adcode
 * @param address - 地址字符串（如 "北京市海淀区"）
 * @returns adcode 或 null
 */
export async function getAddressLocation(address: string): Promise<string | null> {
  const url = `${BACKEND_BASE_URL}/api/geocode/geo?address=${encodeURIComponent(address)}`
  const data = await api.get(url) as { geocodes?: Array<{ adcode: string }> }
  return data.geocodes?.[0]?.adcode ?? null
}

/**
 * HTML5 Geolocation API Promise 封装
 */
export function getLocationByAPI(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理定位'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.error(`错误代码 ${error.code}: ${error.message}`)
        reject(error)
      }
    )
  })
}
