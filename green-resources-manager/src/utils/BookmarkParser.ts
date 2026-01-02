/**
 * 书签解析工具
 * 用于解析浏览器导出的HTML格式书签文件
 */

export interface ParsedBookmark {
  name: string
  url: string
  tags?: string[]  // 父级文件夹作为标签
  addDate?: string
}

/**
 * 解析HTML格式的书签文件
 * 支持Chrome、Firefox、Edge等主流浏览器的书签格式
 */
export function parseBookmarkFile(htmlContent: string): ParsedBookmark[] {
  const bookmarks: ParsedBookmark[] = []
  
  try {
    // 创建临时DOM来解析HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    
    // 查找所有书签链接
    // 浏览器书签格式通常是: <DT><A HREF="url" ADD_DATE="timestamp">名称</A></DT>
    const links = doc.querySelectorAll('a[href]')
    
    links.forEach((link) => {
      const href = link.getAttribute('href')
      const name = link.textContent?.trim() || (link as HTMLElement).innerText?.trim() || ''
      const addDate = link.getAttribute('add_date') || link.getAttribute('ADD_DATE') || ''
      
      // 验证URL有效性
      if (href && isValidUrl(href) && name) {
        // 收集所有父级文件夹作为标签
        const tags: string[] = []
        
        // 方法1: 向上查找所有H3标签（文件夹名称）
        let currentElement: Element | null = link.parentElement
        while (currentElement) {
          // 查找同级的H3标签（当前文件夹）
          const h3Element = currentElement.previousElementSibling
          if (h3Element && h3Element.tagName === 'H3') {
            const folderName = h3Element.textContent?.trim()
            // 排除"书签栏"等系统文件夹
            if (folderName && 
                folderName !== '' && 
                folderName !== '书签栏' && 
                !h3Element.getAttribute('PERSONAL_TOOLBAR_FOLDER')) {
              tags.unshift(folderName) // 从前面插入，保持层级顺序
            }
          }
          
          // 向上查找父级文件夹
          if (currentElement.tagName === 'DL') {
            currentElement = currentElement.parentElement
          } else {
            break
          }
        }
        
        // 方法2: 如果方法1没找到，尝试从最近的DT元素查找
        if (tags.length === 0) {
          const dtElement = link.closest('dt')
          if (dtElement) {
            let parentDl = dtElement.parentElement
            while (parentDl) {
              const h3Element = parentDl.previousElementSibling
              if (h3Element && h3Element.tagName === 'H3') {
                const folderName = h3Element.textContent?.trim()
                if (folderName && 
                    folderName !== '' && 
                    folderName !== '书签栏' &&
                    !h3Element.getAttribute('PERSONAL_TOOLBAR_FOLDER')) {
                  tags.unshift(folderName)
                }
              }
              parentDl = parentDl.parentElement?.closest('dl') || null
            }
          }
        }
        
        bookmarks.push({
          name,
          url: href,
          tags: tags.length > 0 ? tags : undefined,
          addDate
        })
      }
    })
    
    // 如果没有通过标准方式找到，尝试正则表达式解析（兼容性处理）
    if (bookmarks.length === 0) {
      const regex = /<DT><A[^>]*HREF="([^"]*)"[^>]*>([^<]*)<\/A>/gi
      let match
      
      while ((match = regex.exec(htmlContent)) !== null) {
        const url = match[1]
        const name = match[2].trim()
        
        if (url && isValidUrl(url) && name) {
          // 尝试提取父级文件夹作为标签
          const beforeMatch = htmlContent.substring(0, match.index)
          const h3Matches = beforeMatch.match(/<H3[^>]*>([^<]*)<\/H3>/gi)
          const tags: string[] = []
          
          if (h3Matches) {
            // 提取所有H3标签的文本，排除系统文件夹
            h3Matches.forEach(h3Tag => {
              const textMatch = h3Tag.match(/<H3[^>]*>([^<]*)<\/H3>/i)
              if (textMatch) {
                const folderName = textMatch[1].trim()
                if (folderName && 
                    folderName !== '' && 
                    folderName !== '书签栏' &&
                    !h3Tag.includes('PERSONAL_TOOLBAR_FOLDER')) {
                  tags.push(folderName)
                }
              }
            })
          }
          
          bookmarks.push({
            name,
            url,
            tags: tags.length > 0 ? tags : undefined
          })
        }
      }
    }
    
    console.log(`✅ 书签解析完成，共找到 ${bookmarks.length} 个书签`)
    return bookmarks
  } catch (error) {
    console.error('❌ 解析书签文件失败:', error)
    throw new Error(`解析书签文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 验证URL是否有效
 */
function isValidUrl(url: string): boolean {
  try {
    // 排除javascript:、data:等非HTTP协议
    if (url.startsWith('javascript:') || 
        url.startsWith('data:') || 
        url.startsWith('file:') ||
        url.startsWith('chrome:') ||
        url.startsWith('about:')) {
      return false
    }
    
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 从文件读取并解析书签
 */
export async function parseBookmarkFromFile(file: File): Promise<ParsedBookmark[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        if (!content) {
          reject(new Error('文件内容为空'))
          return
        }
        
        const bookmarks = parseBookmarkFile(content)
        resolve(bookmarks)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }
    
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * 去重书签（基于URL）
 */
export function deduplicateBookmarks(bookmarks: ParsedBookmark[]): ParsedBookmark[] {
  const seen = new Set<string>()
  const unique: ParsedBookmark[] = []
  
  for (const bookmark of bookmarks) {
    // 标准化URL用于比较（移除末尾斜杠、转换为小写等）
    const normalizedUrl = normalizeUrl(bookmark.url)
    
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl)
      unique.push(bookmark)
    }
  }
  
  return unique
}

/**
 * 标准化URL用于比较
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // 移除末尾斜杠，转换为小写
    let normalized = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`
    normalized = normalized.toLowerCase()
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return url.toLowerCase()
  }
}

