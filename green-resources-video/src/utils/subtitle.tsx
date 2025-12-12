import { 
	Txt, 
	Layout, 
	LayoutProps,
	Rect,
	initial,
	signal,
} from '@motion-canvas/2d';
import { 
	createRef, 
	ThreadGenerator, 
	all, 
	waitUntil,
	SignalValue,
	SimpleSignal,
} from '@motion-canvas/core';
import { VideoScript } from '../interface/VideoScript';
import ProgressSegmentConfig from '../interface/ProgressSegmentConfig';
import { ProgressSegment } from '../nodes/ProgressBar';

export type SubtitleItem = string | VideoScript;

export interface SubtitleProps extends LayoutProps {
	texts: SignalValue<SubtitleItem[]>;      // 字幕数组
	fontSize?: SignalValue<number>;
	fill?: SignalValue<string>;
	fontFamily?: SignalValue<string>;
	fadeInDuration?: SignalValue<number>;
	fadeOutDuration?: SignalValue<number>;
	minDisplayDuration?: SignalValue<number>;
	charsPerSecond?: SignalValue<number>;
	subtitlePadding?: SignalValue<number>;  // 使用 subtitlePadding 避免与 Layout 的 padding 冲突
	subtitlePosition?: SignalValue<'bottom' | 'center' | 'top'>;  // 使用 subtitlePosition 避免与 Layout 的 position 冲突
	backgroundColor?: SignalValue<string>;
	backgroundOpacity?: SignalValue<number>;
	borderRadius?: SignalValue<number>;
	progressBarRef?: { setProgressByIndex: (index: number, total: number, duration?: number) => ThreadGenerator };  // 进度条引用，用于同步进度
}

/**
 * 字幕组件 - 用于显示字幕序列
 * 使用方式：<Subtitle texts={subtitles} />
 */
export class Subtitle extends Layout {
	@signal()
	public declare readonly texts: SimpleSignal<SubtitleItem[], this>;

	@initial(48)
	@signal()
	public declare readonly fontSize: SimpleSignal<number, this>;

	@initial('#ffffff')
	@signal()
	public declare readonly fill: SimpleSignal<string, this>;

	@initial('Microsoft YaHei, sans-serif')
	@signal()
	public declare readonly fontFamily: SimpleSignal<string, this>;

	@initial(0.5)
	@signal()
	public declare readonly fadeInDuration: SimpleSignal<number, this>;

	@initial(0.5)
	@signal()
	public declare readonly fadeOutDuration: SimpleSignal<number, this>;

	@initial(2)
	@signal()
	public declare readonly minDisplayDuration: SimpleSignal<number, this>;

	@initial(0.1)
	@signal()
	public declare readonly charsPerSecond: SimpleSignal<number, this>;

	@initial(40)
	@signal()
	public declare readonly subtitlePadding: SimpleSignal<number, this>;

	@initial('bottom')
	@signal()
	public declare readonly subtitlePosition: SimpleSignal<'bottom' | 'center' | 'top', this>;

	@initial('#000000')
	@signal()
	public declare readonly backgroundColor: SimpleSignal<string, this>;

	@initial(0.6)
	@signal()
	public declare readonly backgroundOpacity: SimpleSignal<number, this>;

	@initial(8)
	@signal()
	public declare readonly borderRadius: SimpleSignal<number, this>;

	// 字幕文本引用
	private readonly subtitleRef = createRef<Txt>();
	// 背景引用
	private readonly backgroundRef = createRef<Rect>();
	// 容器引用
	private readonly containerRef = createRef<Layout>();
	// 进度条引用（可选，用于同步进度）
	private progressBarRef?: { setProgressByIndex: (index: number, total: number, duration?: number) => ThreadGenerator };

	public constructor(props?: SubtitleProps) {
		super({
			layout: true,
			direction: 'column',
			width: '100%',
			height: '100%',
			zIndex: 10000,
			composite: true,
			...props,
		});

		// 保存进度条引用
		if (props?.progressBarRef) {
			this.progressBarRef = props.progressBarRef;
		}

		const subtitlePosition = this.subtitlePosition();
		const subtitlePadding = this.subtitlePadding();
		const fontSize = this.fontSize();
		const fill = this.fill();
		const fontFamily = this.fontFamily();
		const backgroundColor = this.backgroundColor();
		const backgroundOpacity = this.backgroundOpacity();
		const borderRadius = this.borderRadius();

		// 创建字幕容器
		const subtitleContainer = (
			<Layout
				key="SubtitleContainer"
				ref={this.containerRef}
				layout
				alignItems="center"
				justifyContent="center"
				opacity={0}
				padding={subtitlePadding}
				zIndex={9999}
				composite={true}
			>
				<Rect
					key="SubtitleBackground"
					ref={this.backgroundRef}
					fill={backgroundColor}
					opacity={backgroundOpacity}
					radius={borderRadius}
					padding={subtitlePadding}
					layout
				>
					<Txt
						key="SubtitleText"
						ref={this.subtitleRef}
						text=""
						fontSize={fontSize}
						fill={fill}
						fontFamily={fontFamily}
						textAlign="center"
						layout
					/>
				</Rect>
			</Layout>
		);

		// 根据位置设置布局
		if (subtitlePosition === 'bottom') {
			this.add(
				<Layout key="SubtitleSpacerTop" grow={1} />
			);
			this.add(subtitleContainer);
		} else if (subtitlePosition === 'top') {
			this.add(subtitleContainer);
			this.add(
				<Layout key="SubtitleSpacerBottom" grow={1} />
			);
		} else {
			// center
			this.alignItems('center');
			this.justifyContent('center');
			this.add(subtitleContainer);
		}
	}

	/**
	 * 显示字幕序列
	 * @returns ThreadGenerator 可以 yield* 来等待字幕显示完成
	 */
	public *show(): ThreadGenerator {
		const texts = this.texts();
		const fadeInDuration = this.fadeInDuration();
		const fadeOutDuration = this.fadeOutDuration();
		const minDisplayDuration = this.minDisplayDuration();
		const charsPerSecond = this.charsPerSecond();

		// 字幕显示循环
		for (let index = 0; index < texts.length; index++) {
			const item = texts[index];
			// 处理 VideoScript 或字符串
			const script: VideoScript = typeof item === 'string' 
				? { text: item } 
				: item;
			
			// 设置字幕文本
			this.subtitleRef().text(script.text);
			
			// 等待时间事件（用于与音频对齐）- 使用字幕文本的前7个字作为事件名称
			const eventName = script.text.substring(0, 7);
			yield* waitUntil(eventName);
			
			// 并行执行回调动画（如果有）、字幕淡入和进度条更新
			const animations: ThreadGenerator[] = [
				this.containerRef().opacity(1, fadeInDuration)
			];
			
			// 添加进度条更新动画
			if (this.progressBarRef) {
				animations.push(this.progressBarRef.setProgressByIndex(index, texts.length, fadeInDuration));
			}
			
			// 添加回调动画（如果有）
			if (script.callback) {
				const result = script.callback();
				if (result && typeof result[Symbol.iterator] === 'function') {
					animations.push(result as ThreadGenerator);
				}
			}
			
			// 执行字幕淡入和回调动画
			if (animations.length > 1) {
				yield* all(...animations);
			} else {
				yield* animations[0];
			}

			// 显示持续时间（根据文本长度调整）
			const duration = Math.max(minDisplayDuration, script.text.length * charsPerSecond);
			yield* this.containerRef().opacity(1, duration);

			// 淡出
			yield* this.containerRef().opacity(0, fadeOutDuration);
		}
	}
}

/**
 * 进度条分段配置转换器
 * 负责将基于文本的分段配置转换为基于索引的分段配置
 */
export class ProgressSegmentConverter {
	/**
	 * 通过文本查找字幕索引
	 * @param subtitles 字幕数组
	 * @param text 要查找的文本
	 * @returns 找到的索引，如果未找到返回 -1
	 */
	private static findIndexByText(subtitles: VideoScript[], text: string): number {
		for (let i = 0; i < subtitles.length; i++) {
			const item = subtitles[i];
			const itemText = typeof item === 'string' ? item : item.text;
			if (itemText.includes(text)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * 将基于文本的分段配置转换为基于索引的分段配置
	 * @param configs 基于文本的分段配置数组
	 * @param subtitles 字幕数组
	 * @returns 基于索引的分段配置数组
	 */
	public static convert(
		configs: ProgressSegmentConfig[],
		subtitles: VideoScript[]
	): ProgressSegment[] {
		return configs.map((config, index) => {
			const startIndex = this.findIndexByText(subtitles, config.startText);
			let endIndex: number;

			if (config.endText) {
				endIndex = this.findIndexByText(subtitles, config.endText);
				// 如果找到结束文本，使用它之前的索引
				if (endIndex >= 0) {
					endIndex = endIndex - 1;
				} else {
					// 如果找不到结束文本，使用下一个分段的开始索引
					const nextConfig = configs[index + 1];
					if (nextConfig) {
						const nextStartIndex = this.findIndexByText(subtitles, nextConfig.startText);
						endIndex = nextStartIndex >= 0 ? nextStartIndex - 1 : subtitles.length - 1;
					} else {
						endIndex = subtitles.length - 1;
					}
				}
			} else {
				// 最后一个分段，使用字幕数组的最后一个索引
				endIndex = subtitles.length - 1;
			}

			// 确保索引有效
			if (startIndex < 0) {
				console.warn(`无法找到分段 "${config.title}" 的起始文本: "${config.startText}"`);
				return {
					title: config.title,
					startIndex: 0,
					endIndex: subtitles.length - 1,
					color: config.color
				};
			}

			if (endIndex < startIndex) {
				endIndex = startIndex;
			}

			return {
				title: config.title,
				startIndex,
				endIndex,
				color: config.color
			};
		});
	}
}

