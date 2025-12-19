/**
 * 图片/漫画专辑相关类型定义
 */

export interface Album {
  id: string
  name: string
  author: string
  description: string
  tags: string[]
  folderPath: string
  cover: string
  pagesCount: number
  lastViewed: string | null
  viewCount: number
  addedDate: string
  fileExists?: boolean
}

export interface AlbumForm {
  name: string
  author: string
  description: string
  tags: string[]
  folderPath: string
  cover: string
}

export interface AlbumStats {
  label: string
  value: string | number
}

export interface FolderInfo {
  path: string
  name: string
  files: File[]
}

export interface ProcessResult {
  success: boolean
  folderName: string
  error?: string
  folderPath?: string
  album?: Album
  existingAlbumId?: string
  originalError?: string
}

export interface PathUpdateInfo {
  existingAlbum: Album | null
  newPath: string
  newFolderName: string
}

export type AlbumSortBy = 'name' | 'count' | 'added' | 'lastViewed' | 'author' | 'viewCount'

export interface AlbumFilterOptions {
  searchQuery: string
  sortBy: AlbumSortBy
  selectedTags: string[]
  excludedTags: string[]
  selectedAuthors: string[]
  excludedAuthors: string[]
}

