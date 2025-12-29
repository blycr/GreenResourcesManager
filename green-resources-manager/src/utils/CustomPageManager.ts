import { PageConfig, ResourceType, RESOURCE_TYPES } from '../types/page';
import saveManager from './SaveManager';

/**
 * 自定义页面管理器
 * 负责管理页面配置的增删改查、持久化存储以及默认页面初始化
 */
class CustomPageManager {
  private pages: PageConfig[] = [];
  private initialized = false;
  // 有效的 ResourceType 值（从类型定义中导入，确保一致性）
  private readonly validResourceTypes: readonly ResourceType[] = RESOURCE_TYPES;

  constructor() {
  }

  /**
   * 生成唯一的页面 ID
   * 使用时间戳和随机数的组合确保唯一性
   * @returns 唯一的页面 ID
   */
  private generatePageId(): string {
    const timestamp = Date.now();
    // 生成 8 位随机十六进制字符串，提供足够的随机性
    const randomPart = Math.random().toString(16).substring(2, 10).padEnd(8, '0');
    return `custom-${timestamp}-${randomPart}`;
  }

  /**
   * 获取页面配置文件路径
   */
  private get pagesFilePath(): string {
    return `${saveManager.dataDirectories.settings}/pages.json`;
  }

  /**
   * 验证并规范化 ResourceType
   * @param type 原始类型值
   * @returns 有效的 ResourceType，如果无效则返回 null
   */
  private validateResourceType(type: any): ResourceType | null {
    if (typeof type !== 'string') {
      return null;
    }
    // 检查是否为有效的 ResourceType
    if (this.validResourceTypes.includes(type as ResourceType)) {
      return type as ResourceType;
    }
    return null;
  }

  /**
   * 初始化页面管理器
   * 加载页面配置，如果不存在则创建默认配置
   */
  async init() {
    if (this.initialized) return;

    try {
      const loadedPages = await saveManager.readJsonFile(this.pagesFilePath);
      if (loadedPages && Array.isArray(loadedPages) && loadedPages.length > 0) {
        this.pages = loadedPages.map((page: any) => {
          const validType = this.validateResourceType(page.type);
          if (!validType) {
            console.warn(`[CustomPageManager] 无效的页面类型: "${page.type}", 已跳过页面: ${page.id}`);
            return null;
          }
          return {
            ...page,
            type: validType
          };
        }).filter((page): page is PageConfig => page !== null);
        
        // 检查并添加缺失的默认页面
        const defaultPages = this.getDefaultPages();
        const existingPageIds = new Set(this.pages.map(p => p.id));
        let hasNewPages = false;
        
        for (const defaultPage of defaultPages) {
          if (!existingPageIds.has(defaultPage.id)) {
            // 找到缺失的默认页面，添加它
            console.log(`[CustomPageManager] 检测到缺失的默认页面: ${defaultPage.id}，正在添加...`);
            this.pages.push(defaultPage);
            hasNewPages = true;
          }
        }
        
        // 如果有页面因类型无效而被过滤掉，或者添加了新的默认页面，需要保存更新后的列表
        if (this.pages.length !== loadedPages.length || hasNewPages) {
          await this.savePages();
        }
      } else {
        this.pages = this.getDefaultPages();
        await this.savePages();
      }
    } catch (error) {
      console.error('加载页面配置失败，使用默认配置:', error);
      this.pages = this.getDefaultPages();
      // 如果加载失败则尝试保存默认配置（可能是文件不存在）
      await this.savePages();
    }

    this.initialized = true;
  }

  /**
   * 获取默认页面配置
   * @returns 默认页面配置数组
   */
  getDefaultPages(): PageConfig[] {
    const now = Date.now();
    return [
      { id: 'games', name: '游戏', icon: '🎮', type: 'Game', description: '可以管理游戏、应用等exe文件', isDefault: true, order: 1, createdAt: now, updatedAt: now },
      { id: 'software', name: '软件', icon: '💾', type: 'Software', description: '可以管理软件、应用等exe文件', isDefault: true, order: 2, createdAt: now, updatedAt: now },
      { id: 'images', name: '漫画', icon: '🖼️', type: 'Image', description: '可以管理图片文件夹，暂不支持单一图片的管理', isDefault: true, order: 3, createdAt: now, updatedAt: now },
      { id: 'single-image', name: '单图', icon: '🖼️', type: 'SingleImage', description: '可以管理单一图片文件', isDefault: true, order: 4, createdAt: now, updatedAt: now },
      { id: 'videos', name: '电影', icon: '🎬', type: 'Video', description: '可以管理单一视频', isDefault: true, order: 5, createdAt: now, updatedAt: now },
      { id: 'anime-series', name: '番剧', icon: '📺', type: 'Anime', description: '可以管理番剧和电视剧', isDefault: true, order: 6, createdAt: now, updatedAt: now },
      { id: 'novels', name: '小说', icon: '📚', type: 'Novel', description: '可以管理txt文件，暂不支持其余格式', isDefault: true, order: 7, createdAt: now, updatedAt: now },
      { id: 'websites', name: '网站', icon: '🌐', type: 'Website', description: '需要手动传入网址', isDefault: true, order: 8, createdAt: now, updatedAt: now },
      { id: 'audio', name: '声音', icon: '🎵', type: 'Audio', description: '可以管理mp3、wav等常见音频文件', isDefault: true, order: 9, createdAt: now, updatedAt: now },
    ];
  }

  /**
   * 获取所有页面配置（按顺序排序）
   * @returns 页面配置数组
   */
  getPages(): PageConfig[] {
    return [...this.pages].sort((a, b) => a.order - b.order);
  }

  /**
   * 获取可见页面配置（过滤掉隐藏的页面）
   * @returns 可见页面配置数组
   */
  getVisiblePages(): PageConfig[] {
    return this.getPages().filter(p => !p.isHidden);
  }

  /**
   * 根据ID获取页面配置
   * @param id 页面ID
   * @returns 页面配置或undefined
   */
  getPage(id: string): PageConfig | undefined {
    return this.pages.find(p => p.id === id);
  }

  /**
   * 添加新页面
   * @param page 页面配置（不包含id、order、createdAt、updatedAt）
   * @returns 新创建的页面配置
   */
  async addPage(page: Omit<PageConfig, 'id' | 'order' | 'createdAt' | 'updatedAt'>): Promise<PageConfig> {
    const now = Date.now();
    const newPage: PageConfig = {
      ...page,
      id: this.generatePageId(),
      order: this.pages.length + 1,
      createdAt: now,
      updatedAt: now
    };
    this.pages.push(newPage);
    await this.savePages();
    return newPage;
  }

  /**
   * 更新页面配置
   * @param id 页面ID
   * @param updates 要更新的字段
   * @throws 如果尝试修改受保护的字段（id、type、isDefault）则抛出错误
   */
  async updatePage(id: string, updates: Partial<PageConfig>) {
    const index = this.pages.findIndex(p => p.id === id);
    if (index !== -1) {
      const page = this.pages[index];

      // 验证受保护字段
      const protectedFields: (keyof PageConfig)[] = ['id', 'type', 'isDefault'];
      const attemptedProtectedChanges = protectedFields.filter(
        field => field in updates && updates[field] !== page[field]
      );

      if (attemptedProtectedChanges.length > 0) {
        throw new Error(
          `无法修改受保护的字段: ${attemptedProtectedChanges.join(', ')}。` +
          `这些字段在页面创建后不能被更改。`
        );
      }

      // 过滤出可以修改的字段
      const allowedUpdates = Object.entries(updates)
        .filter(([key]) => !protectedFields.includes(key as keyof PageConfig))
        .reduce((acc, [key, value]) => {
          (acc as any)[key] = value;
          return acc;
        }, {} as Partial<PageConfig>);

      this.pages[index] = {
        ...page,
        ...allowedUpdates,
        updatedAt: Date.now(),
        // 确保受保护字段保持不变
        id: page.id,
        type: page.type,
        isDefault: page.isDefault
      };
      await this.savePages();
    }
  }

  /**
   * 删除页面
   * @param id 页面ID
   * @throws 如果尝试删除默认页面则抛出错误
   */
  async deletePage(id: string) {
    const page = this.pages.find(p => p.id === id);
    if (!page) return;

    if (page.isDefault) {
      throw new Error('无法删除默认页面');
    }

    this.pages = this.pages.filter(p => p.id !== id);
    await this.savePages();

    // 删除该页面的数据目录
    await saveManager.deletePageData(id);
  }

  /**
   * 重新排序页面
   * @param newOrderIds 新的页面ID顺序数组，必须包含所有现有页面的ID
   * @throws 如果 newOrderIds 与现有页面的ID不匹配则抛出错误
   */
  async reorderPages(newOrderIds: string[]) {
    // 验证 newOrderIds 包含的 ID 集合与现有页面 ID 集合一致
    const existingIds = new Set(this.pages.map(p => p.id));
    const providedIds = new Set(newOrderIds);

    // 检查是否存在不存在的 ID
    const nonexistentIds = newOrderIds.filter(id => !existingIds.has(id));
    if (nonexistentIds.length > 0) {
      throw new Error(
        `无法重新排序页面：包含不存在的页面ID: ${nonexistentIds.join(', ')}`
      );
    }

    // 检查是否有页面未被包含在 newOrderIds 中
    const missingIds = Array.from(existingIds).filter(id => !providedIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(
        `无法重新排序页面：缺少必要的页面ID: ${missingIds.join(', ')}。` +
        `必须为所有页面提供顺序。`
      );
    }

    // 创建顺序映射
    const orderMap = new Map(newOrderIds.map((id, index) => [id, index + 1]));

    let changed = false;
    this.pages.forEach(page => {
      const newOrder = orderMap.get(page.id);
      if (newOrder !== undefined && page.order !== newOrder) {
        page.order = newOrder;
        changed = true;
      }
    });

    if (changed) {
      await this.savePages();
    }
  }

  /**
   * 保存页面配置到文件
   */
  private async savePages() {
    await saveManager.writeJsonFile(this.pagesFilePath, this.pages);
  }
}

// 创建单例实例
export const customPageManager = new CustomPageManager();
export default customPageManager;
