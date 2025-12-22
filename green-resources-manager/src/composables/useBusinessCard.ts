import { ref, computed } from 'vue'

/**
 * 名片翻转动画 composable
 */
export function useBusinessCard() {
  const isCardFlipped = ref(false)
  const rotateX = ref(0)
  const rotateY = ref(0)

  const cardTransformStyle = computed(() => {
    if (isCardFlipped.value) {
      // 翻转时保持翻转状态，但添加鼠标跟踪效果
      return {
        willChange: 'transform',
        transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${180 + rotateY.value}deg)`
      }
    } else {
      return {
        willChange: 'transform',
        transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`
      }
    }
  })

  function flipCard() {
    isCardFlipped.value = !isCardFlipped.value
  }

  function handleMouseMove(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement
    const rect = card.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // 计算鼠标相对于卡片中心的位置（-1 到 1）
    const mouseX = (event.clientX - centerX) / (rect.width / 2)
    const mouseY = (event.clientY - centerY) / (rect.height / 2)
    
    // 计算旋转角度（限制在合理范围内）
    rotateY.value = mouseX * 15 // 最大15度
    rotateX.value = -mouseY * 15 // 最大15度，负号是为了自然的方向
  }

  function handleMouseLeave() {
    // 鼠标离开时平滑回到初始状态
    rotateX.value = 0
    rotateY.value = 0
  }

  return {
    isCardFlipped,
    cardTransformStyle,
    flipCard,
    handleMouseMove,
    handleMouseLeave
  }
}

