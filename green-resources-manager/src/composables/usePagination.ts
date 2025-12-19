import { ref, computed, watch, type Ref } from 'vue'
import saveManager from '../utils/SaveManager'

export interface PaginationConfig {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  itemType: string
}

/**
 * 通用分页逻辑 composable
 * @param filteredItems - 筛选后的项目列表
 * @param defaultPageSize - 默认每页显示数量
 * @param itemType - 项目类型（用于配置显示）
 */
export function usePagination<T>(
  filteredItems: Ref<T[]>,
  defaultPageSize = 20,
  itemType = '项目'
) {
  // 分页状态
  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)
  const totalPages = ref(0)

  /**
   * 分页显示的项目列表
   */
  const paginatedItems = computed(() => {
    if (!filteredItems.value || filteredItems.value.length === 0) return []
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredItems.value.slice(start, end)
  })

  /**
   * 当前页的起始索引
   */
  const currentPageStartIndex = computed(() => {
    return (currentPage.value - 1) * pageSize.value
  })

  /**
   * 分页配置（用于 PaginationNav 组件）
   */
  const paginationConfig = computed<PaginationConfig>(() => {
    return {
      currentPage: currentPage.value,
      totalPages: totalPages.value,
      pageSize: pageSize.value,
      totalItems: filteredItems.value.length,
      itemType
    }
  })

  /**
   * 更新分页信息
   */
  function updatePagination() {
    totalPages.value = Math.ceil(filteredItems.value.length / pageSize.value)
    // 确保当前页不超过总页数
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value
    }
    // 如果当前页为0且没有数据，重置为1
    if (currentPage.value === 0 && filteredItems.value.length > 0) {
      currentPage.value = 1
    }
  }

  /**
   * 处理分页变化
   */
  function handlePageChange(pageNum: number) {
    currentPage.value = pageNum
  }

  /**
   * 重置到第一页
   */
  function resetToFirstPage() {
    currentPage.value = 1
  }

  /**
   * 从设置中加载分页配置
   * @param pageType - 页面类型（如 'games', 'images'）
   */
  async function loadPaginationSettings(pageType: string) {
    try {
      const settings = await saveManager.loadSettings()

      if (settings && settings[pageType]) {
        const newPageSize = parseInt(settings[pageType].listPageSize) || defaultPageSize

        // 更新分页大小
        if (pageSize.value !== newPageSize) {
          pageSize.value = newPageSize

          // 重新计算分页
          updatePagination()

          console.log(`${itemType}列表分页设置已更新:`, {
            listPageSize: pageSize.value,
            totalPages: totalPages.value,
            currentPage: currentPage.value
          })
        }
      }
    } catch (error) {
      console.error(`加载${itemType}分页设置失败:`, error)
      // 使用默认值
      pageSize.value = defaultPageSize
    }
  }

  // 监听筛选结果变化，更新分页信息
  watch(
    filteredItems,
    () => {
      updatePagination()
    },
    { immediate: false }
  )

  // 初始化时更新分页
  updatePagination()

  return {
    // 状态
    currentPage,
    pageSize,
    totalPages,
    
    // 计算属性
    paginatedItems,
    currentPageStartIndex,
    paginationConfig,
    
    // 方法
    updatePagination,
    handlePageChange,
    resetToFirstPage,
    loadPaginationSettings
  }
}

