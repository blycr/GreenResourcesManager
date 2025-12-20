/**
 * 视频相关类型定义
 */

/**
 * 视频基本信息接口
 */
export interface Video {
  id: string
  name: string
  description?: string
  tags?: string[]
  actors?: string[]
  series?: string
  duration?: number
  filePath?: string
  thumbnail?: string
  watchCount?: number
  lastWatched?: string | null
  firstWatched?: string | null
  addedDate?: string
  watchProgress?: number
  fileExists?: boolean
  [key: string]: any
}

/**
 * 视频文件夹接口
 */
export interface VideoFolder {
  id: string
  name: string
  description?: string
  tags?: string[]
  actors?: string[]
  series?: string
  folderPath?: string
  thumbnail?: string
  addedDate?: string
  folderVideos?: FolderVideo[]
  [key: string]: any
}

/**
 * 文件夹中的视频信息
 */
export interface FolderVideo {
  name: string
  path: string
  size?: number
  thumbnail?: string | null
  isGeneratingThumbnail?: boolean
}

/**
 * 视频表单数据接口（用于添加/编辑）
 */
export interface VideoForm {
  name: string
  description?: string
  tags?: string[]
  actors?: string[]
  series?: string
  duration?: number
  filePath?: string
  thumbnail?: string
}

/**
 * 文件夹表单数据接口（用于添加/编辑）
 */
export interface FolderForm {
  name: string
  description?: string
  tags?: string[]
  actors?: string[]
  series?: string
  folderPath?: string
  thumbnail?: string
}

/**
 * 视频统计信息接口
 */
export interface VideoStats {
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
 * 视频排序方式
 */
export type VideoSortBy = 'name' | 'lastWatched' | 'watchCount' | 'added'

/**
 * 视频筛选选项接口
 */
export interface VideoFilterOptions {
  searchQuery: string
  sortBy: VideoSortBy
  selectedTags: string[]
  excludedTags: string[]
  selectedActors: string[]
  excludedActors: string[]
  selectedSeries: string | null
  excludedSeries: string | null
}

/**
 * 路径更新信息接口
 */
export interface PathUpdateInfo {
  existingVideo: Video | null
  newPath: string
  newFileName: string
}

/**
 * 视频筛选数据接口（用于筛选器组件）
 */
export interface VideoFilterData {
  allTags: FilterItem[]
  allActors: FilterItem[]
  allSeries: FilterItem[]
  selectedTags: string[]
  excludedTags: string[]
  selectedActors: string[]
  excludedActors: string[]
  selectedSeries: string | null
  excludedSeries: string | null
}

/**
 * 合并后的视频和文件夹项目（用于显示）
 */
export interface VideoItem extends Video {
  type: 'video'
}

export interface FolderItem extends VideoFolder {
  type: 'folder'
  videoCount?: number
}

export type CombinedVideoItem = VideoItem | FolderItem

