/**
 * 音频筛选 Composable
 * 负责搜索、排序、标签和艺术家筛选逻辑
 */
import { ref, computed, type Ref } from 'vue'
import type { Audio, AudioSortBy, FilterItem } from '../../types/audio'

export interface AudioFilterOptions {
  /**
   * 音频列表的响应式引用
   */
  audios: Ref<Audio[]>
  
  /**
   * 更新筛选器数据的回调函数（用于通知父组件）
   */
  onFilterDataUpdated?: (data: {
    filters: Array<{
      key: string
      title: string
      items: FilterItem[]
      selected: string[]
      excluded: string[]
    }>
  }) => void
}

/**
 * 音频筛选 Composable
 */
export function useAudioFilter(options: AudioFilterOptions) {
  const { audios } = options
  
  // 使用 ref 存储回调，以便动态更新
  const filterDataUpdatedCallback = ref(options.onFilterDataUpdated)

  // 筛选状态
  const searchQuery = ref('')
  const sortBy = ref<AudioSortBy>('name')
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])
  const selectedArtists = ref<string[]>([])
  const excludedArtists = ref<string[]>([])

  /**
   * 提取所有标签（带统计）
   */
  const allTags = computed<FilterItem[]>(() => {
    const tagCount: Record<string, number> = {}
    
    audios.value.forEach(audio => {
      if (audio.tags && Array.isArray(audio.tags)) {
        audio.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })
    
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 提取所有艺术家（带统计）
   */
  const allArtists = computed<FilterItem[]>(() => {
    const artistCount: Record<string, number> = {}
    
    audios.value.forEach(audio => {
      if (audio.artist) {
        artistCount[audio.artist] = (artistCount[audio.artist] || 0) + 1
      }
    })
    
    return Object.entries(artistCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 筛选后的音频列表
   */
  const filteredAudios = computed<Audio[]>(() => {
    let filtered = audios.value
    
    // 标签筛选 - 必须包含所有选中的标签（AND逻辑）
    if (selectedTags.value.length > 0) {
      filtered = filtered.filter(audio => 
        audio.tags && selectedTags.value.every(tag => audio.tags.includes(tag))
      )
    }
    
    // 排除标签
    if (excludedTags.value.length > 0) {
      filtered = filtered.filter(audio => 
        !(audio.tags && excludedTags.value.some(tag => audio.tags.includes(tag)))
      )
    }
    
    // 艺术家筛选
    if (selectedArtists.value.length > 0) {
      filtered = filtered.filter(audio => 
        selectedArtists.value.includes(audio.artist || '')
      )
    }
    
    // 排除艺术家
    if (excludedArtists.value.length > 0) {
      filtered = filtered.filter(audio => 
        !excludedArtists.value.includes(audio.artist || '')
      )
    }
    
    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(audio => 
        audio.name.toLowerCase().includes(query) ||
        (audio.artist && audio.artist.toLowerCase().includes(query)) ||
        (audio.album && audio.album.toLowerCase().includes(query)) ||
        (audio.genre && audio.genre.toLowerCase().includes(query))
      )
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'artist':
          return (a.artist || '').localeCompare(b.artist || '')
        case 'playCount':
          return (b.playCount || 0) - (a.playCount || 0)
        case 'addedDate':
          return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime()
        default:
          return 0
      }
    })
    
    return filtered
  })

  /**
   * 标签筛选方法
   * 支持三种状态切换：未选中 -> 选中 -> 排除 -> 未选中
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
    updateFilterData()
  }

  /**
   * 排除标签
   * 支持三种状态切换：未选中 -> 排除 -> 选中 -> 未选中
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
    updateFilterData()
  }

  /**
   * 清除标签筛选
   */
  function clearTagFilter() {
    selectedTags.value = []
    excludedTags.value = []
    updateFilterData()
  }

  /**
   * 艺术家筛选方法
   * 支持三种状态切换：未选中 -> 选中 -> 排除 -> 未选中
   */
  function filterByArtist(artistName: string) {
    if (selectedArtists.value.includes(artistName)) {
      // 如果当前是选中状态，则取消选择
      selectedArtists.value = selectedArtists.value.filter(artist => artist !== artistName)
    } else if (excludedArtists.value.includes(artistName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedArtists.value = excludedArtists.value.filter(artist => artist !== artistName)
      selectedArtists.value = [...selectedArtists.value, artistName]
    } else {
      // 否则直接设置为选中状态
      selectedArtists.value = [...selectedArtists.value, artistName]
    }
    updateFilterData()
  }

  /**
   * 排除艺术家
   * 支持三种状态切换：未选中 -> 排除 -> 选中 -> 未选中
   */
  function excludeByArtist(artistName: string) {
    if (excludedArtists.value.includes(artistName)) {
      // 如果已经是排除状态，则取消排除
      excludedArtists.value = excludedArtists.value.filter(artist => artist !== artistName)
    } else if (selectedArtists.value.includes(artistName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedArtists.value = selectedArtists.value.filter(artist => artist !== artistName)
      excludedArtists.value = [...excludedArtists.value, artistName]
    } else {
      // 否则直接设置为排除状态
      excludedArtists.value = [...excludedArtists.value, artistName]
    }
    updateFilterData()
  }

  /**
   * 清除艺术家筛选
   */
  function clearArtistFilter() {
    selectedArtists.value = []
    excludedArtists.value = []
    updateFilterData()
  }

  /**
   * 处理来自 App.vue 的筛选器事件
   * @param event - 事件类型：'filter-select' | 'filter-exclude' | 'filter-clear'
   * @param data - 事件数据
   */
  function handleFilterEvent(
    event: 'filter-select' | 'filter-exclude' | 'filter-clear',
    data: { filterKey?: string; itemName?: string } | string
  ) {
    switch (event) {
      case 'filter-select':
        if (typeof data === 'object' && data.filterKey) {
          if (data.filterKey === 'tags' && data.itemName) {
            filterByTag(data.itemName)
          } else if (data.filterKey === 'artists' && data.itemName) {
            filterByArtist(data.itemName)
          }
        }
        break
      case 'filter-exclude':
        if (typeof data === 'object' && data.filterKey) {
          if (data.filterKey === 'tags' && data.itemName) {
            excludeByTag(data.itemName)
          } else if (data.filterKey === 'artists' && data.itemName) {
            excludeByArtist(data.itemName)
          }
        }
        break
      case 'filter-clear':
        if (data === 'tags') {
          clearTagFilter()
        } else if (data === 'artists') {
          clearArtistFilter()
        }
        break
    }
  }

  /**
   * 更新筛选器数据（用于传递给父组件/FilterSidebar）
   */
  function updateFilterData() {
    if (filterDataUpdatedCallback.value) {
      filterDataUpdatedCallback.value({
        filters: [
          {
            key: 'tags',
            title: '标签筛选',
            items: allTags.value,
            selected: selectedTags.value,
            excluded: excludedTags.value
          },
          {
            key: 'artists',
            title: '艺术家筛选',
            items: allArtists.value,
            selected: selectedArtists.value,
            excluded: excludedArtists.value
          }
        ]
      })
    }
  }

  /**
   * 设置筛选器数据更新回调（用于 Options API 中动态设置）
   */
  function setFilterDataUpdatedCallback(callback: (data: {
    filters: Array<{
      key: string
      title: string
      items: FilterItem[]
      selected: string[]
      excluded: string[]
    }>
  }) => void) {
    filterDataUpdatedCallback.value = callback
  }

  return {
    // 状态
    searchQuery,
    sortBy,
    selectedTags,
    excludedTags,
    selectedArtists,
    excludedArtists,

    // 计算属性
    allTags,
    allArtists,
    filteredAudios,

    // 方法
    filterByTag,
    excludeByTag,
    clearTagFilter,
    filterByArtist,
    excludeByArtist,
    clearArtistFilter,
    handleFilterEvent,
    updateFilterData,
    setFilterDataUpdatedCallback
  }
}

