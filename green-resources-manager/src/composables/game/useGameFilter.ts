import { ref, computed, type Ref } from 'vue'
import type { Game, FilterItem, GameSortBy } from '../../types/game'

/**
 * 游戏筛选和排序的 composable
 */
export function useGameFilter(games: Ref<Game[]>, searchQuery: Ref<string>, sortBy: Ref<GameSortBy>) {
  // 筛选状态
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])
  const selectedDevelopers = ref<string[]>([])
  const excludedDevelopers = ref<string[]>([])
  const selectedPublishers = ref<string[]>([])
  const excludedPublishers = ref<string[]>([])
  const selectedOthers = ref<string[]>([])
  const excludedOthers = ref<string[]>([])

  // 筛选选项
  const allTags = ref<FilterItem[]>([])
  const allDevelopers = ref<FilterItem[]>([])
  const allPublishers = ref<FilterItem[]>([])
  const allOthers = ref<FilterItem[]>([])

  /**
   * 从所有游戏中提取标签、开发商和发行商
   */
  function extractAllTags() {
    const tagCount: Record<string, number> = {}
    const developerCount: Record<string, number> = {}
    const publisherCount: Record<string, number> = {}
    let missingResourcesCount = 0

    games.value.forEach(game => {
      // 提取标签
      if (game.tags && Array.isArray(game.tags)) {
        game.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }

      // 提取开发商
      if (game.developer) {
        developerCount[game.developer] = (developerCount[game.developer] || 0) + 1
      }

      // 提取发行商
      if (game.publisher) {
        publisherCount[game.publisher] = (publisherCount[game.publisher] || 0) + 1
      }

      // 统计丢失的资源
      if (game.fileExists === false) {
        missingResourcesCount++
      }
    })

    // 转换为数组并按名称排序
    allTags.value = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))

    allDevelopers.value = Object.entries(developerCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))

    allPublishers.value = Object.entries(publisherCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // 其他筛选选项
    allOthers.value = []
    if (missingResourcesCount > 0) {
      allOthers.value.push({
        name: '丢失的资源',
        count: missingResourcesCount
      })
    }
  }

  /**
   * 筛选后的游戏列表
   */
  const filteredGames = computed(() => {
    let filtered = games.value.filter(game => {
      // 搜索筛选
      const matchesSearch = game.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (game.developer && game.developer.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
        (game.publisher && game.publisher.toLowerCase().includes(searchQuery.value.toLowerCase()))

      // 标签筛选 - 必须包含所有选中的标签（AND逻辑）
      const matchesTag = selectedTags.value.length === 0 || 
        (game.tags && selectedTags.value.every(tag => game.tags!.includes(tag)))
      const notExcludedTag = excludedTags.value.length === 0 || 
        !(game.tags && excludedTags.value.some(tag => game.tags!.includes(tag)))

      // 开发商筛选 - 开发商是"或"逻辑（一个游戏只能有一个开发商）
      const matchesDeveloper = selectedDevelopers.value.length === 0 || 
        selectedDevelopers.value.includes(game.developer || '')
      const notExcludedDeveloper = excludedDevelopers.value.length === 0 || 
        !excludedDevelopers.value.includes(game.developer || '')

      // 发行商筛选 - 发行商是"或"逻辑（一个游戏只能有一个发行商）
      const matchesPublisher = selectedPublishers.value.length === 0 || 
        selectedPublishers.value.includes(game.publisher || '')
      const notExcludedPublisher = excludedPublishers.value.length === 0 || 
        !excludedPublishers.value.includes(game.publisher || '')

      // 其他筛选
      let matchesOther = true
      if (selectedOthers.value.length > 0) {
        matchesOther = selectedOthers.value.some(other => {
          if (other === '丢失的资源') {
            return game.fileExists === false
          }
          return false
        })
      }
      const notExcludedOther = excludedOthers.value.length === 0 || 
        !excludedOthers.value.some(other => {
          if (other === '丢失的资源') {
            return game.fileExists === false
          }
          return false
        })

      return matchesSearch && matchesTag && notExcludedTag && matchesDeveloper && notExcludedDeveloper && matchesPublisher && notExcludedPublisher && matchesOther && notExcludedOther
    })

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'lastPlayed':
          const aTime = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
          const bTime = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
          return bTime - aTime
        case 'playTime':
          return (b.playTime || 0) - (a.playTime || 0)
        case 'added':
          const aAdded = a.addedDate ? new Date(a.addedDate).getTime() : 0
          const bAdded = b.addedDate ? new Date(b.addedDate).getTime() : 0
          return bAdded - aAdded
        default:
          return 0
      }
    })

    return filtered
  })

  /**
   * 标签筛选方法
   */
  function filterByTag(tagName: string) {
    if (selectedTags.value.includes(tagName)) {
      // 如果当前是选中状态，则取消选择
      selectedTags.value = selectedTags.value.filter(tag => tag !== tagName)
    } else if (excludedTags.value.includes(tagName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedTags.value = excludedTags.value.filter(tag => tag !== tagName)
      selectedTags.value = [...selectedTags.value, tagName]
    } else {
      // 否则直接设置为选中状态
      selectedTags.value = [...selectedTags.value, tagName]
    }
  }

  /**
   * 排除标签
   */
  function excludeByTag(tagName: string) {
    if (excludedTags.value.includes(tagName)) {
      // 如果已经是排除状态，则取消排除
      excludedTags.value = excludedTags.value.filter(tag => tag !== tagName)
    } else if (selectedTags.value.includes(tagName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedTags.value = selectedTags.value.filter(tag => tag !== tagName)
      excludedTags.value = [...excludedTags.value, tagName]
    } else {
      // 否则直接设置为排除状态
      excludedTags.value = [...excludedTags.value, tagName]
    }
  }

  /**
   * 清除标签筛选
   */
  function clearTagFilter() {
    selectedTags.value = []
    excludedTags.value = []
  }

  /**
   * 开发商筛选方法
   */
  function filterByDeveloper(developerName: string) {
    if (selectedDevelopers.value.includes(developerName)) {
      // 如果当前是选中状态，则取消选择
      selectedDevelopers.value = selectedDevelopers.value.filter(dev => dev !== developerName)
    } else if (excludedDevelopers.value.includes(developerName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedDevelopers.value = excludedDevelopers.value.filter(dev => dev !== developerName)
      selectedDevelopers.value = [...selectedDevelopers.value, developerName]
    } else {
      // 否则直接设置为选中状态
      selectedDevelopers.value = [...selectedDevelopers.value, developerName]
    }
  }

  /**
   * 排除开发商
   */
  function excludeByDeveloper(developerName: string) {
    if (excludedDevelopers.value.includes(developerName)) {
      // 如果已经是排除状态，则取消排除
      excludedDevelopers.value = excludedDevelopers.value.filter(dev => dev !== developerName)
    } else if (selectedDevelopers.value.includes(developerName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedDevelopers.value = selectedDevelopers.value.filter(dev => dev !== developerName)
      excludedDevelopers.value = [...excludedDevelopers.value, developerName]
    } else {
      // 否则直接设置为排除状态
      excludedDevelopers.value = [...excludedDevelopers.value, developerName]
    }
  }

  /**
   * 清除开发商筛选
   */
  function clearDeveloperFilter() {
    selectedDevelopers.value = []
    excludedDevelopers.value = []
  }

  /**
   * 发行商筛选方法
   */
  function filterByPublisher(publisherName: string) {
    if (selectedPublishers.value.includes(publisherName)) {
      // 如果当前是选中状态，则取消选择
      selectedPublishers.value = selectedPublishers.value.filter(pub => pub !== publisherName)
    } else if (excludedPublishers.value.includes(publisherName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedPublishers.value = excludedPublishers.value.filter(pub => pub !== publisherName)
      selectedPublishers.value = [...selectedPublishers.value, publisherName]
    } else {
      // 否则直接设置为选中状态
      selectedPublishers.value = [...selectedPublishers.value, publisherName]
    }
  }

  /**
   * 排除发行商
   */
  function excludeByPublisher(publisherName: string) {
    if (excludedPublishers.value.includes(publisherName)) {
      // 如果已经是排除状态，则取消排除
      excludedPublishers.value = excludedPublishers.value.filter(pub => pub !== publisherName)
    } else if (selectedPublishers.value.includes(publisherName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedPublishers.value = selectedPublishers.value.filter(pub => pub !== publisherName)
      excludedPublishers.value = [...excludedPublishers.value, publisherName]
    } else {
      // 否则直接设置为排除状态
      excludedPublishers.value = [...excludedPublishers.value, publisherName]
    }
  }

  /**
   * 清除发行商筛选
   */
  function clearPublisherFilter() {
    selectedPublishers.value = []
    excludedPublishers.value = []
  }

  /**
   * 其他筛选方法
   */
  function filterByOther(otherName: string) {
    if (selectedOthers.value.includes(otherName)) {
      // 如果当前是选中状态，则取消选择
      selectedOthers.value = selectedOthers.value.filter(other => other !== otherName)
    } else if (excludedOthers.value.includes(otherName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedOthers.value = excludedOthers.value.filter(other => other !== otherName)
      selectedOthers.value = [...selectedOthers.value, otherName]
    } else {
      // 否则直接设置为选中状态
      selectedOthers.value = [...selectedOthers.value, otherName]
    }
  }

  /**
   * 排除其他筛选
   */
  function excludeByOther(otherName: string) {
    if (excludedOthers.value.includes(otherName)) {
      // 如果已经是排除状态，则取消排除
      excludedOthers.value = excludedOthers.value.filter(other => other !== otherName)
    } else if (selectedOthers.value.includes(otherName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedOthers.value = selectedOthers.value.filter(other => other !== otherName)
      excludedOthers.value = [...excludedOthers.value, otherName]
    } else {
      // 否则直接设置为排除状态
      excludedOthers.value = [...excludedOthers.value, otherName]
    }
  }

  /**
   * 清除其他筛选
   */
  function clearOtherFilter() {
    selectedOthers.value = []
    excludedOthers.value = []
  }

  /**
   * 获取筛选器数据（用于 FilterSidebar）
   */
  function getFilterData() {
    return {
      filters: [
        {
          key: 'tags',
          title: '标签筛选',
          items: allTags.value,
          selected: selectedTags.value,
          excluded: excludedTags.value
        },
        {
          key: 'developers',
          title: '开发商筛选',
          items: allDevelopers.value,
          selected: selectedDevelopers.value,
          excluded: excludedDevelopers.value
        },
        {
          key: 'publishers',
          title: '发行商筛选',
          items: allPublishers.value,
          selected: selectedPublishers.value,
          excluded: excludedPublishers.value
        },
        {
          key: 'others',
          title: '其他筛选',
          items: allOthers.value,
          selected: selectedOthers.value,
          excluded: excludedOthers.value
        }
      ]
    }
  }

  return {
    // 状态
    selectedTags,
    excludedTags,
    selectedDevelopers,
    excludedDevelopers,
    selectedPublishers,
    excludedPublishers,
    selectedOthers,
    excludedOthers,
    allTags,
    allDevelopers,
    allPublishers,
    allOthers,
    
    // 计算属性
    filteredGames,
    
    // 方法
    extractAllTags,
    filterByTag,
    excludeByTag,
    clearTagFilter,
    filterByDeveloper,
    excludeByDeveloper,
    clearDeveloperFilter,
    filterByPublisher,
    excludeByPublisher,
    clearPublisherFilter,
    filterByOther,
    excludeByOther,
    clearOtherFilter,
    getFilterData
  }
}

