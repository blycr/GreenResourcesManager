/**
 * 桌宠数据管理 Composable
 * 负责管理桌宠的属性数据（好感度、食欲、睡眠欲、性欲）的加载和保存
 */

import { ref, computed } from 'vue'
import { usePetAffection } from './usePetAffection'

export interface PetData {
  affection: number // 保持向后兼容，存储总经验值
  affectionLevel?: number // 可选：等级（用于兼容）
  affectionExp?: number // 可选：经验值（用于兼容）
  appetite: number
  sleepiness: number
  libido: number
  coins?: number
  lastEarningsTime?: string | null
}

export function usePetData() {
  // 使用好感度等级系统
  const affectionSystem = usePetAffection()
  
  const appetite = ref(0)
  const sleepiness = ref(0)
  const libido = ref(0)
  const coins = ref(1000)
  const lastEarningsTime = ref<string | null>(null)
  
  // 向后兼容：提供一个数值形式的好感度（用于显示，实际是总经验值）
  const affection = computed(() => affectionSystem.getTotalExp())

  // 加载桌宠数据
  async function loadPetData() {
    if (window.electronAPI && window.electronAPI.getPetData) {
      try {
        const result = await window.electronAPI.getPetData()
        if (result && result.success !== false) {
          // 加载好感度：优先使用等级和经验值，否则使用总经验值
          if (result.affectionLevel !== undefined && result.affectionExp !== undefined) {
            affectionSystem.setAffectionData(result.affectionLevel, result.affectionExp)
          } else {
            // 向后兼容：如果只有总经验值，使用它
            affectionSystem.setTotalExp(result.affection || 0)
          }
          
          appetite.value = result.appetite || 0
          sleepiness.value = result.sleepiness || 0
          libido.value = result.libido || 0
          coins.value = result.coins !== undefined ? result.coins : 1000
          lastEarningsTime.value = result.lastEarningsTime || null
        }
      } catch (error) {
        console.error('加载桌宠数据失败:', error)
      }
    }
  }

  // 保存桌宠数据
  async function savePetData() {
    if (window.electronAPI && window.electronAPI.savePetData) {
      try {
        await window.electronAPI.savePetData({
          affection: affectionSystem.getTotalExp(), // 保存总经验值（向后兼容）
          affectionLevel: affectionSystem.level.value, // 保存等级
          affectionExp: affectionSystem.exp.value, // 保存经验值
          appetite: appetite.value,
          sleepiness: sleepiness.value,
          libido: libido.value,
          coins: coins.value,
          lastEarningsTime: lastEarningsTime.value
        })
      } catch (error) {
        console.error('保存桌宠数据失败:', error)
      }
    }
  }

  // 增加好感度（增加经验值）
  async function increaseAffection(amount = 1) {
    affectionSystem.addExp(amount)
    await savePetData()
  }

  // 更新属性值（带范围限制）
  function updateAttribute(
    attribute: 'affection' | 'appetite' | 'sleepiness' | 'libido',
    value: number
  ) {
    switch (attribute) {
      case 'affection':
        // 好感度使用经验值系统，直接设置总经验值
        affectionSystem.setTotalExp(Math.max(0, value))
        break
      case 'appetite':
        appetite.value = Math.max(0, Math.min(100, value))
        break
      case 'sleepiness':
        sleepiness.value = Math.max(0, Math.min(100, value))
        break
      case 'libido':
        libido.value = Math.max(0, Math.min(100, value))
        break
    }
    savePetData()
  }

  return {
    affection, // 向后兼容：返回总经验值
    affectionSystem, // 好感度等级系统
    appetite,
    sleepiness,
    libido,
    coins,
    lastEarningsTime,
    loadPetData,
    savePetData,
    increaseAffection,
    updateAttribute
  }
}

