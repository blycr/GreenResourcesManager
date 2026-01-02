/**
 * 游戏相关类型定义
 */

/**
 * 游戏基本信息接口
 */
export interface Game {
  id: string
  name: string
  developer?: string
  publisher?: string
  description?: string
  tags?: string[]
  executablePath?: string
  image?: string
  folderSize?: number
  playTime?: number
  playCount?: number
  lastPlayed?: string | null
  firstPlayed?: string | null
  addedDate?: string
  fileExists?: boolean
  [key: string]: any
}

/**
 * 游戏表单数据接口（用于添加/编辑）
 */
export interface GameForm {
  name: string
  developer?: string
  publisher?: string
  description?: string
  tags?: string[]
  executablePath?: string
  image?: string
}

/**
 * 游戏统计信息接口
 */
export interface GameStats {
  label: string
  value: string | number
}

/**
 * 筛选项接口
 */
export interface FilterItem {
  name: string
  count: number
}

/**
 * 游戏排序方式
 */
export type GameSortBy = 'name' | 'lastPlayed' | 'playTime' | 'added'

/**
 * 游戏筛选选项接口
 */
export interface GameFilterOptions {
  searchQuery: string
  sortBy: GameSortBy
  selectedTags: string[]
  excludedTags: string[]
  selectedDevelopers: string[]
  excludedDevelopers: string[]
  selectedPublishers: string[]
  excludedPublishers: string[]
  selectedOthers: string[]
  excludedOthers: string[]
}

/**
 * 路径更新信息接口
 */
export interface PathUpdateInfo {
  existingGame: Game
  newPath: string
  newFileName: string
}

/**
 * 游戏拖拽选项接口
 */
export interface GameDragDropOptions {
  /**
   * 游戏列表（响应式）
   */
  games: import('vue').Ref<Game[]> | Game[]
  
  /**
   * 添加游戏的回调函数
   */
  onAddGame: (game: Game) => Promise<void>
  
  /**
   * 显示路径更新对话框的回调函数
   */
  onShowPathUpdateDialog: (info: PathUpdateInfo) => void
  
  /**
   * 是否为 Electron 环境
   */
  isElectronEnvironment: boolean
}

/**
 * 游戏筛选数据接口（用于筛选器组件）
 */
export interface GameFilterData {
  allTags: FilterItem[]
  allDevelopers: FilterItem[]
  allPublishers: FilterItem[]
  allOthers: FilterItem[]
  selectedTags: string[]
  excludedTags: string[]
  selectedDevelopers: string[]
  excludedDevelopers: string[]
  selectedPublishers: string[]
  excludedPublishers: string[]
  selectedOthers: string[]
  excludedOthers: string[]
}

