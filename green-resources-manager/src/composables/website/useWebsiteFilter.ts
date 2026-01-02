import { ref, computed, type Ref } from 'vue'

export interface FilterItem {
  name: string
  count: number
}

export type WebsiteSortBy = 'name' | 'visitCount' | 'addedDate' | 'lastVisited'

export interface Website {
  id: string
  name: string
  url: string
  description?: string
  tags: string[]
  visitCount?: number
  addedDate: string
  lastVisited?: string
  favicon?: string
  isBookmark?: boolean
  isPrivate?: boolean
  notes?: string
}

/**
 * 网站筛选和排序的 composable
 */
export function useWebsiteFilter(
  websites: Ref<Website[]>,
  searchQuery: Ref<string>,
  sortBy: Ref<WebsiteSortBy>
) {
  // 筛选状态
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])

  // 筛选选项
  const allTags = ref<FilterItem[]>([])

  /**
   * 从所有网站中提取标签
   */
  function extractAllTagsAndCategories() {
    const tagCount: Record<string, number> = {}

    websites.value.forEach(website => {
      // 提取标签
      if (website.tags && Array.isArray(website.tags)) {
        website.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })

    // 转换为数组并按名称排序
    allTags.value = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * 筛选后的网站列表
   */
  const filteredWebsites = computed(() => {
    let filtered = websites.value.filter(website => {
      // 搜索筛选
      if (searchQuery.value && searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        const matchesSearch =
          website.name.toLowerCase().includes(query) ||
          website.url.toLowerCase().includes(query) ||
          (website.description && website.description.toLowerCase().includes(query)) ||
          (website.tags && website.tags.some(tag => tag.toLowerCase().includes(query)))

        if (!matchesSearch) return false
      }

      // 标签筛选 - 必须包含所有选中的标签（AND逻辑）
      if (selectedTags.value.length > 0) {
        if (!website.tags || !selectedTags.value.every(tag => website.tags!.includes(tag))) {
          return false
        }
      }
      if (excludedTags.value.length > 0) {
        if (website.tags && excludedTags.value.some(tag => website.tags!.includes(tag))) {
          return false
        }
      }

      return true
    })

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'visitCount':
          return (b.visitCount || 0) - (a.visitCount || 0)
        case 'addedDate':
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
        case 'lastVisited':
          if (!a.lastVisited && !b.lastVisited) return 0
          if (!a.lastVisited) return 1
          if (!b.lastVisited) return -1
          return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
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
        }
      ]
    }
  }

  return {
    // 状态
    selectedTags,
    excludedTags,
    allTags,

    // 计算属性
    filteredWebsites,

    // 方法
    extractAllTagsAndCategories,
    filterByTag,
    excludeByTag,
    clearTagFilter,
    getFilterData
  }
}

