/**
 * 进度条分段配置
 * @interface ProgressSegmentConfig
 */
 export default interface ProgressSegmentConfig {
	/** 分段标题 */
	title: string;
	/** 起始文本（用于匹配字幕） */
	startText: string;
	/** 结束文本（用于匹配字幕），如果为空则匹配到下一个分段的开始 */
	endText?: string;
	/** 颜色值 */
	color: string;
}