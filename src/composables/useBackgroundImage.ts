// ============================================
// 背景图片淡入淡出 Composable
// ============================================

import { ref, nextTick } from 'vue'
import { normalizeBgKeyword } from '@/utils/weather'

/**
 * 背景图片管理
 * - 双层图片叠加实现真正的淡入淡出（CSS background-image 不支持 transition）
 * - 预加载图片确保有效性
 */
export function useBackgroundImage() {
  const currentImage = ref('')
  const nextImage = ref<string | null>(null)
  const fadeIn = ref(false)
  const isTransitioning = ref(false)

  /**
   * 预加载图片
   * @returns 加载成功返回原路径，失败返回 null
   */
  function preloadImage(src: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(src)
      img.onerror = () => {
        console.error(`背景图片加载失败: ${src}`)
        resolve(null)
      }
      img.src = src
    })
  }

  /**
   * 根据天气文字设置背景图片（带淡入淡出过渡）
   */
  async function setBackground(weatherText: string): Promise<void> {
    const keyword = normalizeBgKeyword(weatherText)
    const imagePath = `/images/bg/${keyword}.jpg`

    // 同一个图，无需切换
    if (imagePath === currentImage.value && !isTransitioning.value) return

    const loaded = await preloadImage(imagePath)
    if (!loaded || loaded === currentImage.value) {
      return
    }

    crossfadeTo(loaded)
  }

  /**
   * 执行淡入淡出过渡
   * 1. 设置 nextImage → Vue 渲染新图层（opacity: 0）
   * 2. nextTick 后 → 设置 fadeIn = true → CSS transition opacity 0→1
   * 3. 过渡完成后 → 提升 next 为 current，清理 next 层
   */
  async function crossfadeTo(targetSrc: string): Promise<void> {
    isTransitioning.value = true

    // 如果已有进行中的过渡，立即完成它（提升当前 next 为 current）
    if (nextImage.value) {
      currentImage.value = nextImage.value
    }

    // 设置新图层（此时 opacity 为 0）
    nextImage.value = targetSrc
    fadeIn.value = false

    // 等浏览器渲染新图层后，再触发 fadeIn
    await nextTick()
    requestAnimationFrame(() => {
      fadeIn.value = true

      // 过渡完成后：提升 next → current，清理 next 层
      setTimeout(() => {
        currentImage.value = targetSrc
        nextImage.value = null
        fadeIn.value = false
        isTransitioning.value = false
      }, 850) // 与 CSS transition-duration 一致
    })
  }

  /**
   * 直接设置背景（无过渡）
   */
  function setBackgroundPath(path: string): void {
    nextImage.value = null
    fadeIn.value = false
    isTransitioning.value = false
    currentImage.value = path
  }

  /**
   * 重置为默认背景
   */
  function resetBackground(): void {
    setBackgroundPath('')
  }

  return {
    currentImage,
    nextImage,
    fadeIn,
    isTransitioning,
    setBackground,
    setBackgroundPath,
    resetBackground,
  }
}
