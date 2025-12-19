/**
 * 图片专辑筛选 Composable
 * 负责搜索、排序、标签和作者筛选逻辑
 */
import { ref, computed, type Ref } from 'vue'
import type { Album, AlbumSortBy } from '../../types/image'

export interface FilterItem {
  name: string
  count: number
}

/**
 * 图片专辑筛选 Composable
 * @param albums - 专辑列表的响应式引用
 */
export function useImageFilter(albums: Ref<Album[]>) {
  // 筛选状态
  const searchQuery = ref('')
  const sortBy = ref<AlbumSortBy>('name')
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])
  const selectedAuthors = ref<string[]>([])
  const excludedAuthors = ref<string[]>([])

  /**
   * 提取所有标签（带统计）
   */
  const allTags = computed<FilterItem[]>(() => {
    const tagCount: Record<string, number> = {}
    
    albums.value.forEach(album => {
      if (album.tags && Array.isArray(album.tags)) {
        album.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })
    
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 提取所有作者（带统计）
   */
  const allAuthors = computed<FilterItem[]>(() => {
    const authorCount: Record<string, number> = {}
    
    albums.value.forEach(album => {
      if (album.author) {
        authorCount[album.author] = (authorCount[album.author] || 0) + 1
      }
    })
    
    return Object.entries(authorCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 筛选后的专辑列表
   */
  const filteredAlbums = computed<Album[]>(() => {
    let filtered = albums.value.filter(album => {
      // 搜索筛选 - 搜索名称、作者、路径
      const matchesSearch = searchQuery.value === '' || 
        (album.name || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (album.author || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (album.folderPath || '').toLowerCase().includes(searchQuery.value.toLowerCase())
      
      // 标签筛选 - 必须包含所有选中的标签（AND逻辑）
      const matchesTag = selectedTags.value.length === 0 || 
        (album.tags && selectedTags.value.every(tag => album.tags.includes(tag)))
      
      // 排除标签
      const notExcludedTag = excludedTags.value.length === 0 || 
        !(album.tags && excludedTags.value.some(tag => album.tags.includes(tag)))
      
      // 作者筛选 - 作者是"或"逻辑（一个相册只能有一个作者）
      const matchesAuthor = selectedAuthors.value.length === 0 || 
        selectedAuthors.value.includes(album.author)
      
      // 排除作者
      const notExcludedAuthor = excludedAuthors.value.length === 0 || 
        !excludedAuthors.value.includes(album.author)
      
      return matchesSearch && matchesTag && notExcludedTag && matchesAuthor && notExcludedAuthor
    })
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'count':
          return (b.pagesCount || 0) - (a.pagesCount || 0)
        case 'added':
          return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime()
        case 'lastViewed':
          return new Date(b.lastViewed || 0).getTime() - new Date(a.lastViewed || 0).getTime()
        case 'author':
          return (a.author || '').localeCompare(b.author || '')
        case 'viewCount':
          return (b.viewCount || 0) - (a.viewCount || 0)
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
  }

  /**
   * 清除标签筛选
   */
  function clearTagFilter() {
    selectedTags.value = []
    excludedTags.value = []
  }

  /**
   * 作者筛选方法
   * 支持三种状态切换：未选中 -> 选中 -> 排除 -> 未选中
   */
  function filterByAuthor(authorName: string) {
    if (selectedAuthors.value.includes(authorName)) {
      // 如果当前是选中状态，则取消选择
      selectedAuthors.value = selectedAuthors.value.filter(author => author !== authorName)
    } else if (excludedAuthors.value.includes(authorName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedAuthors.value = excludedAuthors.value.filter(author => author !== authorName)
      selectedAuthors.value = [...selectedAuthors.value, authorName]
    } else {
      // 否则直接设置为选中状态
      selectedAuthors.value = [...selectedAuthors.value, authorName]
    }
  }

  /**
   * 排除作者
   * 支持三种状态切换：未选中 -> 排除 -> 选中 -> 未选中
   */
  function excludeByAuthor(authorName: string) {
    if (excludedAuthors.value.includes(authorName)) {
      // 如果已经是排除状态，则取消排除
      excludedAuthors.value = excludedAuthors.value.filter(author => author !== authorName)
    } else if (selectedAuthors.value.includes(authorName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedAuthors.value = selectedAuthors.value.filter(author => author !== authorName)
      excludedAuthors.value = [...excludedAuthors.value, authorName]
    } else {
      // 否则直接设置为排除状态
      excludedAuthors.value = [...excludedAuthors.value, authorName]
    }
  }

  /**
   * 清除作者筛选
   */
  function clearAuthorFilter() {
    selectedAuthors.value = []
    excludedAuthors.value = []
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
          } else if (data.filterKey === 'authors' && data.itemName) {
            filterByAuthor(data.itemName)
          }
        }
        break
      case 'filter-exclude':
        if (typeof data === 'object' && data.filterKey) {
          if (data.filterKey === 'tags' && data.itemName) {
            excludeByTag(data.itemName)
          } else if (data.filterKey === 'authors' && data.itemName) {
            excludeByAuthor(data.itemName)
          }
        }
        break
      case 'filter-clear':
        if (data === 'tags') {
          clearTagFilter()
        } else if (data === 'authors') {
          clearAuthorFilter()
        }
        break
    }
  }

  /**
   * 获取筛选器数据（用于传递给父组件/FilterSidebar）
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
          key: 'authors',
          title: '作者筛选',
          items: allAuthors.value,
          selected: selectedAuthors.value,
          excluded: excludedAuthors.value
        }
      ]
    }
  }

  return {
    // 状态
    searchQuery,
    sortBy,
    selectedTags,
    excludedTags,
    selectedAuthors,
    excludedAuthors,

    // 计算属性
    allTags,
    allAuthors,
    filteredAlbums,

    // 方法
    filterByTag,
    excludeByTag,
    clearTagFilter,
    filterByAuthor,
    excludeByAuthor,
    clearAuthorFilter,
    handleFilterEvent,
    getFilterData
  }
}

