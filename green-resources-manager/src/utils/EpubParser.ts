/**
 * EPUB 解析工具类 - epubjs 0.3.x 兼容版本
 */
// 注意：epubjs 0.3.x 的 API
declare global {
	interface Window {
	  ePub: any;
	}
  }
  
  import ePub from 'epubjs';
  
  export interface EpubMetadata {
	title?: string;
	author?: string;
	description?: string;
	publisher?: string;
	publishDate?: string;
	language?: string;
	cover?: string;
	totalChapters?: number;
	totalWords?: number;
  }
  
  export interface EpubChapter {
	id: string;
	href: string;
	label: string;
	order: number;
	cfi?: string;
  }
  
  export class EpubParser {
	private book: any = null; // epubjs 0.3.x 的 Book 类型
	private filePath: string = '';
	private isReady: boolean = false;
  
	/**
	 * 加载 EPUB 文件 - 0.3.x 版本
	 * 注意：只能 open 一次，不能重复 open
	 * 在 Electron 环境中，使用 ArrayBuffer 方式加载以避免路径问题
	 */
	async loadEpub(filePath: string): Promise<void> {
	  try {
		this.filePath = filePath;
		
		console.log('开始加载 EPUB 文件:', filePath);
		
		// 在 Electron 环境中，尝试多种方式加载 EPUB 文件
		// 根据 epubjs 文档，可以接受 URL 或 ArrayBuffer
		let epubSource: string | ArrayBuffer = filePath;
		let useArrayBuffer = false;
		
		// 检查是否在 Electron 环境中
		if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
		  try {
			console.log('尝试使用 ArrayBuffer 方式加载 EPUB');
			
			// 方法1: 尝试使用 fetch 读取文件为 ArrayBuffer
			const fileUrl = filePath.startsWith('file://') 
			  ? filePath 
			  : `file:///${filePath.replace(/\\/g, '/')}`;
			
			try {
			  const response = await fetch(fileUrl);
			  if (response.ok) {
				const arrayBuffer = await response.arrayBuffer();
				// 验证 ArrayBuffer 是否是有效的 EPUB 文件（EPUB 文件是 ZIP 格式，前4个字节应该是 PK\x03\x04）
				const view = new Uint8Array(arrayBuffer.slice(0, 4));
				const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
				if (isValidEpub) {
				  epubSource = arrayBuffer;
				  useArrayBuffer = true;
				  console.log('成功使用 fetch 读取为 ArrayBuffer，文件大小:', arrayBuffer.byteLength, 'bytes');
				} else {
				  throw new Error('文件不是有效的 EPUB 格式（不是 ZIP 文件）');
				}
			  } else {
				throw new Error(`fetch 失败: ${response.status} ${response.statusText}`);
			  }
			} catch (fetchError) {
			  console.warn('fetch 方法失败，尝试使用 Data URL 转换:', fetchError);
			  
			  // 方法2: 使用 Data URL 转换为 ArrayBuffer
			  const dataUrl = await window.electronAPI.readFileAsDataUrl(filePath);
			  if (dataUrl) {
				// 将 Data URL 转换为 ArrayBuffer
				const response = await fetch(dataUrl);
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				// 验证 EPUB 文件格式
				const view = new Uint8Array(arrayBuffer.slice(0, 4));
				const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
				if (isValidEpub) {
				  epubSource = arrayBuffer;
				  useArrayBuffer = true;
				  console.log('成功使用 Data URL 转换为 ArrayBuffer，文件大小:', arrayBuffer.byteLength, 'bytes');
				} else {
				  throw new Error('文件不是有效的 EPUB 格式（不是 ZIP 文件）');
				}
			  }
			}
		  } catch (dataUrlError) {
			console.warn('ArrayBuffer 方法失败，将使用 file:// URL 方式:', dataUrlError);
			// 如果都失败，使用文件路径转换为 file:// URL
			useArrayBuffer = false;
		  }
		}
		
		// 根据 epubjs 文档，0.3.x 版本可以直接使用 ArrayBuffer 或 URL
		// 如果使用 ArrayBuffer，直接使用；否则转换为 file:// URL
		if (!useArrayBuffer) {
		  // 如果是文件路径，转换为 file:// URL 格式
		  if (!epubSource.toString().startsWith('file://') && !epubSource.toString().startsWith('http://') && !epubSource.toString().startsWith('https://')) {
			// Windows 路径转换为 file:// URL（注意：需要正确的格式）
			const normalizedPath = filePath.replace(/\\/g, '/');
			// Windows 路径格式：file:///C:/path/to/file.epub
			if (normalizedPath.match(/^[A-Za-z]:/)) {
			  epubSource = `file:///${normalizedPath}`;
			} else {
			  epubSource = `file://${normalizedPath}`;
			}
			console.log('转换文件路径为 file:// URL:', epubSource);
		  }
		}
		
		// 正确方式：根据 epubjs 文档，可以直接传入 URL 或 ArrayBuffer 创建实例
		// 但为了避免路径重复问题，我们使用无参构造函数，然后调用 open
		if (window && window.ePub) {
		  // 使用全局的 ePub
		  this.book = window.ePub();
		} else {
		  // 使用导入的 ePub
		  this.book = ePub();
		}
		
		// epubjs 0.3.x 使用 ready 事件
		await new Promise<void>((resolve, reject) => {
		  const timeout = setTimeout(() => {
			reject(new Error('EPUB 加载超时（30秒）'));
		  }, 30000); // 30秒超时
		  
		  // 监听 ready 事件
		  const readyHandler = () => {
			clearTimeout(timeout);
			this.isReady = true;
			console.log('EPUB 准备就绪');
			// 清理事件监听器
			this.book.off('ready', readyHandler);
			this.book.off('error', errorHandler);
			resolve();
		  };
		  
		  // 监听 error 事件
		  const errorHandler = (error: any) => {
			clearTimeout(timeout);
			console.error('EPUB 加载错误:', error);
			// 清理事件监听器
			this.book.off('ready', readyHandler);
			this.book.off('error', errorHandler);
			reject(new Error(`EPUB 加载错误: ${error.message || error}`));
		  };
		  
		  this.book.on('ready', readyHandler);
		  this.book.on('error', errorHandler);
		  
		  // 只 open 一次
		  console.log('调用 book.open，源类型:', epubSource instanceof ArrayBuffer ? 'ArrayBuffer' : typeof epubSource);
		  try {
			this.book.open(epubSource);
		  } catch (openError) {
			clearTimeout(timeout);
			this.book.off('ready', readyHandler);
			this.book.off('error', errorHandler);
			reject(new Error(`打开 EPUB 文件失败: ${openError.message || openError}`));
		  }
		});
		
		console.log('EPUB 文件加载成功:', filePath);
	  } catch (error: any) {
		console.error('加载 EPUB 文件失败:', error);
		throw new Error(`无法加载 EPUB 文件: ${error.message}`);
	  }
	}
  
	/**
	 * 获取 EPUB 元数据 - 0.3.x 版本
	 */
	async getMetadata(): Promise<EpubMetadata> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		// epubjs 0.3.x 的元数据在 packaging.metadata
		const metadata = this.book.packaging?.metadata || {};
		console.log('元数据:', metadata);
		
		const cover = await this.getCover();
		
		// 获取章节数量（从 navigation）
		const navigation = this.book.navigation;
		const totalChapters = navigation?.toc?.length || 0;
		
		// 计算总字数
		const totalWords = await this.calculateTotalWords();
  
		// 处理创作者信息（epubjs 0.3.x 可能是字符串或数组）
		let author = '';
		if (metadata.creator) {
		  if (Array.isArray(metadata.creator)) {
			author = metadata.creator.map((c: any) => c.name || c).join(', ');
		  } else if (typeof metadata.creator === 'string') {
			author = metadata.creator;
		  } else if (metadata.creator.name) {
			author = metadata.creator.name;
		  }
		}
  
		return {
		  title: metadata.title || '',
		  author: author,
		  description: metadata.description || '',
		  publisher: metadata.publisher || '',
		  publishDate: metadata.date || metadata.pubdate || '',
		  language: metadata.language || 'zh',
		  cover: cover || '',
		  totalChapters,
		  totalWords
		};
	  } catch (error) {
		console.error('获取 EPUB 元数据失败:', error);
		throw error;
	  }
	}
  
	/**
	 * 获取章节列表 - 0.3.x 版本
	 */
	async getChapters(): Promise<EpubChapter[]> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		const navigation = this.book.navigation;
		const chapters: EpubChapter[] = [];
  
		if (navigation && navigation.toc && Array.isArray(navigation.toc)) {
		  // 递归处理目录项
		  const processToc = (items: any[], startOrder: number = 0): number => {
			let order = startOrder;
			
			for (const item of items) {
			  if (item.href) {
				chapters.push({
				  id: item.id || `chapter-${order}`,
				  href: item.href,
				  label: item.label || `章节 ${order + 1}`,
				  order: order
				});
				order++;
			  }
			  
			  // 处理子项
			  if (item.subitems && item.subitems.length > 0) {
				order = processToc(item.subitems, order);
			  }
			}
			
			return order;
		  };
  
		  processToc(navigation.toc);
		} else {
		  // 如果没有目录，使用 spine
		  const spine = this.book.spine;
		  if (spine && spine.contents) {
			spine.contents.forEach((item: any, index: number) => {
			  chapters.push({
				id: item.id || `spine-${index}`,
				href: item.href,
				label: `章节 ${index + 1}`,
				order: index
			  });
			});
		  }
		}
  
		return chapters.sort((a, b) => a.order - b.order);
	  } catch (error) {
		console.error('获取章节列表失败:', error);
		throw error;
	  }
	}
  
	/**
	 * 获取章节内容 - 0.3.x 版本的正确方法
	 */
	async getChapterContent(chapterHref: string): Promise<string> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		console.log('获取章节内容:', chapterHref);
		
		// 方法1：使用 spine 的 get 方法
		const spine = this.book.spine;
		if (spine && spine.get) {
		  const item = spine.get(chapterHref);
		  if (item) {
			console.log('找到 spine 项:', item);
			
			// 加载章节
			const section = await item.load(this.book.load.bind(this.book));
			if (section && section.document) {
			  console.log('章节文档:', section.document);
			  
			  // 获取 HTML 内容
			  let html = '';
			  if (section.document.body) {
				html = section.document.body.innerHTML;
			  } else if (section.document.documentElement) {
				html = section.document.documentElement.innerHTML;
			  }
			  
			  if (html) {
				console.log('成功获取章节内容，长度:', html.length);
				return html;
			  }
			}
		  }
		}
		
		// 方法2：直接使用 book 的 load 方法
		console.log('尝试直接使用 book.load');
		const section = await this.book.load(chapterHref);
		if (section) {
		  console.log('直接加载的 section:', section);
		  
		  if (section.document) {
			const html = section.document.body 
			  ? section.document.body.innerHTML 
			  : section.document.innerHTML;
			
			if (html) {
			  console.log('直接加载成功');
			  return html;
			}
		  }
		}
		
		// 方法3：使用 iframe 渲染然后获取内容
		console.log('尝试使用 iframe 渲染');
		return await this.getChapterContentViaRender(chapterHref);
		
	  } catch (error) {
		console.error('获取章节内容失败:', error);
		throw new Error(`无法获取章节内容: ${error.message}`);
	  }
	}
  
	/**
	 * 通过渲染获取章节内容 - 备用方法
	 */
	private async getChapterContentViaRender(chapterHref: string): Promise<string> {
	  return new Promise((resolve, reject) => {
		// 创建隐藏的 iframe 来渲染章节
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		document.body.appendChild(iframe);
		
		// 创建新的 book 实例（不传参数，避免隐式 open）
		const tempBook = ePub();
		
		const timeout = setTimeout(() => {
		  if (document.body.contains(iframe)) {
			document.body.removeChild(iframe);
		  }
		  reject(new Error('渲染超时'));
		}, 30000);
		
		tempBook.on('ready', () => {
		  try {
			// 渲染到 iframe
			const rendition = tempBook.renderTo(iframe, {
			  width: '100%',
			  height: '100%'
			});
			
			rendition.on('displayed', () => {
			  try {
				// 获取渲染后的内容
				const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
				if (iframeDoc) {
				  const html = iframeDoc.body.innerHTML;
				  if (html) {
					clearTimeout(timeout);
					// 清理
					if (document.body.contains(iframe)) {
					  document.body.removeChild(iframe);
					}
					resolve(html);
					return;
				  }
				}
			  } catch (e) {
				console.warn('iframe 内容获取失败:', e);
			  }
			  
			  // 如果失败，尝试其他方法
			  clearTimeout(timeout);
			  if (document.body.contains(iframe)) {
				document.body.removeChild(iframe);
			  }
			  reject(new Error('无法通过渲染获取章节内容'));
			});
			
			// 显示指定章节
			rendition.display(chapterHref);
		  } catch (renderError) {
			clearTimeout(timeout);
			if (document.body.contains(iframe)) {
			  document.body.removeChild(iframe);
			}
			reject(new Error(`渲染失败: ${renderError.message || renderError}`));
		  }
		});
		
		tempBook.on('error', (error: any) => {
		  clearTimeout(timeout);
		  if (document.body.contains(iframe)) {
			document.body.removeChild(iframe);
		  }
		  reject(new Error(`渲染失败: ${error.message || error}`));
		});
		
		// 只 open 一次
		tempBook.open(this.filePath);
	  });
	}
  
	/**
	 * 获取封面图片
	 */
	async getCover(): Promise<string | null> {
	  if (!this.book || !this.isReady) {
		return null;
	  }
  
	  try {
		// epubjs 0.3.x 获取封面的方法
		const coverUrl = await this.book.coverUrl();
		if (coverUrl) {
		  // 转换为 base64
		  const response = await fetch(coverUrl);
		  if (response.ok) {
			const blob = await response.blob();
			return new Promise((resolve, reject) => {
			  const reader = new FileReader();
			  reader.onloadend = () => resolve(reader.result as string);
			  reader.onerror = reject;
			  reader.readAsDataURL(blob);
			});
		  }
		}
		return null;
	  } catch (error) {
		console.warn('获取封面失败:', error);
		return null;
	  }
	}
  
	/**
	 * 获取指定章节索引的内容
	 */
	async getChapterByIndex(index: number): Promise<string> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		// 先获取所有章节
		const chapters = await this.getChapters();
		if (index < 0 || index >= chapters.length) {
		  throw new Error('章节索引超出范围');
		}
		
		return await this.getChapterContent(chapters[index].href);
	  } catch (error) {
		console.error('获取指定章节失败:', error);
		throw error;
	  }
	}
  
	/**
	 * 计算总字数
	 */
	async calculateTotalWords(): Promise<number> {
	  if (!this.book || !this.isReady) {
		return 0;
	  }
  
	  try {
		const chapters = await this.getChapters();
		let totalWords = 0;
		const maxChapters = Math.min(chapters.length, 5); // 只检查前5章提高性能
		
		for (let i = 0; i < maxChapters; i++) {
		  try {
			const content = await this.getChapterContent(chapters[i].href);
			const text = this.extractTextFromHtml(content);
			totalWords += this.countWords(text);
		  } catch (error) {
			console.warn(`统计第 ${i + 1} 章字数失败:`, error);
		  }
		}
		
		// 估算总字数
		if (chapters.length === 0) return 0;
		const avgWordsPerChapter = totalWords / maxChapters;
		return Math.round(avgWordsPerChapter * chapters.length);
	  } catch (error) {
		console.error('计算总字数失败:', error);
		return 0;
	  }
	}
  
	/**
	 * 从 HTML 中提取纯文本
	 */
	private extractTextFromHtml(html: string): string {
	  const div = document.createElement('div');
	  div.innerHTML = html;
	  
	  // 移除脚本和样式
	  const scripts = div.getElementsByTagName('script');
	  const styles = div.getElementsByTagName('style');
	  
	  Array.from(scripts).forEach(script => script.remove());
	  Array.from(styles).forEach(style => style.remove());
	  
	  return div.textContent || div.innerText || '';
	}
  
	/**
	 * 统计中文字数
	 */
	private countWords(text: string): number {
	  // 中文字符统计
	  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
	  const chineseCount = chineseChars ? chineseChars.length : 0;
	  
	  // 英文单词统计（按空格分割）
	  const englishWords = text.match(/[a-zA-Z]+/g);
	  const englishCount = englishWords ? englishWords.length : 0;
	  
	  return chineseCount + englishCount;
	}
  
	/**
	 * 释放资源
	 */
	destroy(): void {
	  if (this.book) {
		// epubjs 0.3.x 可能没有明确的销毁方法
		// 可以尝试调用相关方法
		if (typeof this.book.destroy === 'function') {
		  this.book.destroy();
		}
		this.book = null;
	  }
	  this.isReady = false;
	  this.filePath = '';
	}
  }