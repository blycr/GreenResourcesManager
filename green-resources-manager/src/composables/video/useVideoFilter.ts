/**
 * 视频筛选和排序 Composable
 * 负责搜索、排序、标签、演员、系列筛选逻辑
 */
import { ref, computed, type Ref } from 'vue'
import type { Video, VideoFolder, VideoSortBy, FilterItem, CombinedVideoItem } from '../../types/video'

/**
 * 视频筛选 Composable
 * @param videos - 视频列表的响应式引用
 * @param folders - 文件夹列表的响应式引用
 */
export function useVideoFilter(
  videos: Ref<Video[]>,
  folders: Ref<VideoFolder[]>
) {
  // 筛选状态
  const searchQuery = ref('')
  const sortBy = ref<VideoSortBy>('name')
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])
  const selectedActors = ref<string[]>([])
  const excludedActors = ref<string[]>([])
  const selectedSeries = ref<string | null>(null)
  const excludedSeries = ref<string | null>(null)

  /**
   * 合并视频和文件夹，并添加类型标识
   */
  const allItems = computed<CombinedVideoItem[]>(() => {
    const videoItems = videos.value.map(video => ({ ...video, type: 'video' as const }))
    const folderItems = folders.value.map(folder => ({ 
      ...folder, 
      type: 'folder' as const,
      videoCount: folder.folderVideos ? folder.folderVideos.length : 0
    }))
    return [...videoItems, ...folderItems]
  })

  /**
   * 提取所有标签（带统计）
   */
  const allTags = computed<FilterItem[]>(() => {
    const tagCount: Record<string, number> = {}
    
    const allItems = [...videos.value, ...folders.value]
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })
    
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 提取所有演员（带统计）
   */
  const allActors = computed<FilterItem[]>(() => {
    const actorCount: Record<string, number> = {}
    
    const allItems = [...videos.value, ...folders.value]
    allItems.forEach(item => {
      if (item.actors && Array.isArray(item.actors)) {
        item.actors.forEach(actor => {
          actorCount[actor] = (actorCount[actor] || 0) + 1
        })
      }
    })
    
    return Object.entries(actorCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 提取所有系列（带统计）
   */
  const allSeries = computed<FilterItem[]>(() => {
    const seriesCount: Record<string, number> = {}
    
    const allItems = [...videos.value, ...folders.value]
    allItems.forEach(item => {
      if (item.series) {
        seriesCount[item.series] = (seriesCount[item.series] || 0) + 1
      }
    })
    
    return Object.entries(seriesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 筛选后的视频和文件夹列表
   */
  const filteredVideos = computed<CombinedVideoItem[]>(() => {
    let filtered = allItems.value.filter(item => {
      // 搜索筛选
      const matchesSearch = !searchQuery.value || (
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
        (item.series && item.series.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
        (item.actors && item.actors.some(actor => actor.toLowerCase().includes(searchQuery.value.toLowerCase()))) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.value.toLowerCase())))
      )
      
      // 标签筛选 - 必须包含所有选中的标签（AND逻辑）
      const matchesTag = selectedTags.value.length === 0 || (item.tags && selectedTags.value.every(tag => item.tags!.includes(tag)))
      const notExcludedTag = excludedTags.value.length === 0 || !(item.tags && excludedTags.value.some(tag => item.tags!.includes(tag)))
      
      // 演员筛选 - 演员是"或"逻辑（一个项目可以有多个演员）
      const matchesActor = selectedActors.value.length === 0 || (item.actors && selectedActors.value.some(actor => item.actors!.includes(actor)))
      const notExcludedActor = excludedActors.value.length === 0 || !(item.actors && excludedActors.value.some(actor => item.actors!.includes(actor)))
      
      // 系列筛选
      const matchesSeries = !selectedSeries.value || item.series === selectedSeries.value
      const notExcludedSeries = !excludedSeries.value || item.series !== excludedSeries.value
      
      return matchesSearch && matchesTag && notExcludedTag && matchesActor && notExcludedActor && matchesSeries && notExcludedSeries
    })

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'lastWatched':
          return new Date(b.lastWatched || 0).getTime() - new Date(a.lastWatched || 0).getTime()
        case 'watchCount':
          return (b.watchCount || 0) - (a.watchCount || 0)
        case 'added':
          return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime()
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
      selectedTags.value = selectedTags.value.filter(tag => tag !== tagName)
    } else if (excludedTags.value.includes(tagName)) {
      excludedTags.value = excludedTags.value.filter(tag => tag !== tagName)
      selectedTags.value = [...selectedTags.value, tagName]
    } else {
      selectedTags.value = [...selectedTags.value, tagName]
    }
  }

  /**
   * 排除标签筛选
   */
  function excludeByTag(tagName: string) {
    if (excludedTags.value.includes(tagName)) {
      excludedTags.value = excludedTags.value.filter(tag => tag !== tagName)
    } else if (selectedTags.value.includes(tagName)) {
      selectedTags.value = selectedTags.value.filter(tag => tag !== tagName)
      excludedTags.value = [...excludedTags.value, tagName]
    } else {
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
   * 演员筛选方法
   */
  function filterByActor(actorName: string) {
    if (selectedActors.value.includes(actorName)) {
      selectedActors.value = selectedActors.value.filter(actor => actor !== actorName)
    } else if (excludedActors.value.includes(actorName)) {
      excludedActors.value = excludedActors.value.filter(actor => actor !== actorName)
      selectedActors.value = [...selectedActors.value, actorName]
    } else {
      selectedActors.value = [...selectedActors.value, actorName]
    }
  }

  /**
   * 排除演员筛选
   */
  function excludeByActor(actorName: string) {
    if (excludedActors.value.includes(actorName)) {
      excludedActors.value = excludedActors.value.filter(actor => actor !== actorName)
    } else if (selectedActors.value.includes(actorName)) {
      selectedActors.value = selectedActors.value.filter(actor => actor !== actorName)
      excludedActors.value = [...excludedActors.value, actorName]
    } else {
      excludedActors.value = [...excludedActors.value, actorName]
    }
  }

  /**
   * 清除演员筛选
   */
  function clearActorFilter() {
    selectedActors.value = []
    excludedActors.value = []
  }

  /**
   * 系列筛选方法
   */
  function filterBySeries(seriesName: string) {
    if (selectedSeries.value === seriesName) {
      selectedSeries.value = null
    } else if (excludedSeries.value === seriesName) {
      excludedSeries.value = null
      selectedSeries.value = seriesName
    } else {
      selectedSeries.value = seriesName
    }
  }

  /**
   * 排除系列筛选
   */
  function excludeBySeries(seriesName: string) {
    if (excludedSeries.value === seriesName) {
      excludedSeries.value = null
    } else if (selectedSeries.value === seriesName) {
      selectedSeries.value = null
      excludedSeries.value = seriesName
    } else {
      excludedSeries.value = seriesName
    }
  }

  /**
   * 清除系列筛选
   */
  function clearSeriesFilter() {
    selectedSeries.value = null
    excludedSeries.value = null
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
          key: 'actors',
          title: '演员筛选',
          items: allActors.value,
          selected: selectedActors.value,
          excluded: excludedActors.value
        },
        {
          key: 'series',
          title: '系列筛选',
          items: allSeries.value,
          selected: selectedSeries.value,
          excluded: excludedSeries.value
        }
      ]
    }
  }

  /**
   * 加载排序设置
   */
  async function loadSortSetting() {
    try {
      const saveManager = await import('../../utils/SaveManager')
      const savedSortBy = await saveManager.default.getSortSetting('videos')
      if (savedSortBy && savedSortBy !== sortBy.value) {
        sortBy.value = savedSortBy as VideoSortBy
      }
    } catch (error) {
      console.warn('加载排序方式失败:', error)
    }
  }

  return {
    // 状态
    searchQuery,
    sortBy,
    selectedTags,
    excludedTags,
    selectedActors,
    excludedActors,
    selectedSeries,
    excludedSeries,
    
    // 计算属性
    allTags,
    allActors,
    allSeries,
    allItems,
    filteredVideos,
    
    // 方法
    filterByTag,
    excludeByTag,
    clearTagFilter,
    filterByActor,
    excludeByActor,
    clearActorFilter,
    filterBySeries,
    excludeBySeries,
    clearSeriesFilter,
    getFilterData,
    loadSortSetting
  }
}

