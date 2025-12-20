/**
 * 音频相关类型定义
 */

/**
 * 音频基本信息接口
 */
export interface Audio {
  id: string
  name: string
  artist?: string
  album?: string
  genre?: string
  duration?: number
  filePath?: string
  thumbnailPath?: string
  actors?: string[]
  tags?: string[]
  notes?: string
  playCount?: number
  addedDate?: string
  fileExists?: boolean
  [key: string]: any
}

/**
 * 音频表单数据接口（用于添加/编辑）
 */
export interface AudioForm {
  name: string
  artist?: string
  album?: string
  genre?: string
  duration?: number
  filePath?: string
  thumbnailPath?: string
  actors?: string[]
  tags?: string[]
  notes?: string
}

/**
 * 音频统计信息接口
 */
export interface AudioStats {
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
 * 音频排序方式
 */
export type AudioSortBy = 'name' | 'artist' | 'playCount' | 'addedDate'

/**
 * 音频筛选选项接口
 */
export interface AudioFilterOptions {
  searchQuery: string
  sortBy: AudioSortBy
  selectedTags: string[]
  excludedTags: string[]
  selectedArtists: string[]
  excludedArtists: string[]
}

/**
 * 路径更新信息接口
 */
export interface PathUpdateInfo {
  existingAudio: Audio | null
  newPath: string
  newFileName: string
}

/**
 * 音频筛选数据接口（用于筛选器组件）
 */
export interface AudioFilterData {
  allTags: FilterItem[]
  allArtists: FilterItem[]
  selectedTags: string[]
  excludedTags: string[]
  selectedArtists: string[]
  excludedArtists: string[]
}

