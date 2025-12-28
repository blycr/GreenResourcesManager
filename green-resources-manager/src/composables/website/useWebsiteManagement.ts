/**
 * 网站管理 Composable
 * 负责网站的 CRUD 操作和数据持久化
 */
import { ref, type Ref } from 'vue'
import { WebsiteManager } from '../../utils/WebsiteManager'
import notify from '../../utils/NotificationService'

export function useWebsiteManagement(pageId: string = 'websites') {
  const websites = ref<any[]>([])
  const isLoading = ref(false)
  const websiteManager = new WebsiteManager(pageId)

  /**
   * 加载所有网站
   */
  const loadWebsites = async (): Promise<void> => {
    try {
      isLoading.value = true
      websites.value = await websiteManager.loadWebsites()
      console.log('网站数据加载完成:', websites.value.length, '个网站')
    } catch (error: any) {
      console.error('加载网站数据失败:', error)
      notify.toast('error', '加载失败', '无法加载网站列表')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存所有网站
   */
  const saveWebsites = async (): Promise<void> => {
    try {
      await websiteManager.saveWebsites()
    } catch (error) {
      console.error('保存网站失败:', error)
      throw error
    }
  }

  /**
   * 添加网站
   */
  const addWebsite = async (websiteData: any): Promise<any | null> => {
    try {
      const newWebsite = await websiteManager.addWebsite(websiteData)
      if (newWebsite) {
        websites.value = [...websiteManager.websites]
        notify.toast('success', '添加成功', `已添加网站 "${newWebsite.name}"`)
        return newWebsite
      }
      return null
    } catch (error: any) {
      console.error('添加网站失败:', error)
      notify.toast('error', '添加失败', error.message || '无法添加网站')
      return null
    }
  }

  /**
   * 更新网站
   */
  const updateWebsite = async (id: string, updateData: any): Promise<any | null> => {
    try {
      const updatedWebsite = await websiteManager.updateWebsite(id, updateData)
      if (updatedWebsite) {
        websites.value = [...websiteManager.websites]
        notify.toast('success', '更新成功', `已更新网站 "${updatedWebsite.name}"`)
        return updatedWebsite
      }
      return null
    } catch (error: any) {
      console.error('更新网站失败:', error)
      notify.toast('error', '更新失败', error.message || '无法更新网站')
      return null
    }
  }

  /**
   * 删除网站
   */
  const deleteWebsite = async (id: string): Promise<boolean> => {
    try {
      const success = await websiteManager.deleteWebsite(id)
      if (success) {
        websites.value = [...websiteManager.websites]
        notify.toast('success', '删除成功', '网站已删除')
        return true
      }
      return false
    } catch (error: any) {
      console.error('删除网站失败:', error)
      notify.toast('error', '删除失败', error.message || '无法删除网站')
      return false
    }
  }

  /**
   * 增加访问次数
   */
  const incrementVisitCount = async (id: string): Promise<void> => {
    try {
      await websiteManager.incrementVisitCount(id)
      websites.value = [...websiteManager.websites]
    } catch (error) {
      console.error('更新访问次数失败:', error)
    }
  }

  /**
   * 搜索网站
   */
  const searchWebsites = (query: string) => {
    return websiteManager.searchWebsites(query)
  }

  /**
   * 获取最佳 Favicon
   */
  const getBestFaviconUrl = async (url: string) => {
    return await websiteManager.getBestFaviconUrl(url)
  }

  /**
   * 检查网站状态
   */
  const checkWebsiteStatus = async (url: string) => {
    return await websiteManager.checkWebsiteStatus(url)
  }

  return {
    websites,
    isLoading,
    loadWebsites,
    saveWebsites,
    addWebsite,
    updateWebsite,
    deleteWebsite,
    incrementVisitCount,
    searchWebsites,
    getBestFaviconUrl,
    checkWebsiteStatus,
    websiteManager
  }
}
