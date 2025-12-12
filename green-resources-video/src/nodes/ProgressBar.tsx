import { 
	Layout, 
	LayoutProps, 
	Rect, 
	Txt,
	initial,
	signal,
} from '@motion-canvas/2d';
import { 
	createRef, 
	ThreadGenerator, 
	tween, 
	linear,
	SignalValue,
	SimpleSignal,
	waitFor,
} from '@motion-canvas/core';

/**
 * 我期望实现的效果是：
 * 不同区块的进度条底色
 * 真正的进度条随着时间推移，从左向右0%到100%
 * 文本始终浮在各个区块最上方
 * 
 */

export interface ProgressSegment {
	title: string;
	startIndex: number;
	endIndex: number;
	color?: string;
}

export interface ProgressBarProps extends LayoutProps {
	segments: SignalValue<ProgressSegment[]>;      // 分段色块
	totalItems: SignalValue<number>;               // 总项数
	barHeight?: SignalValue<number>;                // 底部色块高度
	barPadding?: SignalValue<number>;               // 容器内边距
	titleFontSize?: SignalValue<number>;         // 标题字体大小
	titleColor?: SignalValue<string>;             // 标题字体颜色
}

/**
 * 进度条组件 - 创建一个"分区色块 + 顶部进度条"的进度组件
 * 使用方式：<ProgressBar segments={segments} totalItems={100} />
 */
export class ProgressBar extends Layout {
	@signal()
	public declare readonly segments: SimpleSignal<ProgressSegment[], this>;

	@signal()
	public declare readonly totalItems: SimpleSignal<number, this>;

	@initial(35)
	@signal()
	public declare readonly barHeight: SimpleSignal<number, this>;

	@initial(16)
	@signal()
	public declare readonly barPadding: SimpleSignal<number, this>;

	@initial(18)
	@signal()
	public declare readonly titleFontSize: SimpleSignal<number, this>;

	@initial('#ffffff')
	@signal()
	public declare readonly titleColor: SimpleSignal<string, this>;

	// 分段区域Layout引用：包含所有分段色块，用于获取宽度和位置信息，确保进度条与分段区域对齐
	private readonly segmentsLayoutRef = createRef<Layout>();
	
	// 进度条前景引用：显示当前进度的矩形，宽度会随着进度更新而从左到右增长
	private readonly progressRef = createRef<Rect>();
	
	// 标题文本引用数组：每个分段对应一个文本引用，用于动态更新分段标题
	private readonly titleRefs: ReturnType<typeof createRef<Txt>>[] = [];
	
	// 当前进度百分比（0-100）：存储当前进度百分比，用于计算进度条宽度和位置
	private progressPercent = 0;

	public constructor(props?: ProgressBarProps) {
		super({
			layout: false,
			width: '100%',
			zIndex: 200,
			...props,
		});

		const segments = this.segments();
		const totalItems = this.totalItems();
		const barHeight = this.barHeight();
		const barPadding = this.barPadding();
		const titleFontSize = this.titleFontSize();
		const titleColor = this.titleColor();

		// 初始化标题文本引用数组
		for (let i = 0; i < segments.length; i++) {
			this.titleRefs.push(createRef<Txt>());
		}

		// 设置容器的 padding
		this.padding(barPadding);

		// 分段区域Layout - 作为参考宽度
		this.add(
			<Layout 
				key="ProgressBarSegments"
				ref={this.segmentsLayoutRef}
				layout 
				direction="row" 
				width="100%" 
				height={barHeight}
				position={() => [0, 0]}
			>
				{segments.map((seg, idx) => {
					const spanPercent = ((seg.endIndex - seg.startIndex + 1) / totalItems) * 100;
					return (
						<Rect
							key={`ProgressBarSegment-${idx}-${seg.title}`}
							fill={seg.color ?? '#666'}
							width={`${spanPercent}%`}
							height="100%"
							radius={8}
							layout
							alignItems="center"
							justifyContent="center"
						>
							<Txt
								key={`ProgressBarSegmentTitle-${idx}-${seg.title}`}
								ref={this.titleRefs[idx]}
								text={seg.title}
								fontSize={titleFontSize}
								fill={titleColor}
								fontFamily="Microsoft YaHei, sans-serif"
								textAlign="center"
								zIndex={300}
							/>
						</Rect>
					);
				})}
			</Layout>
		);
		
		// 进度条前景 - 位置和高度与色块一样，从左到右增长
		this.add(
			<Rect
				key="ProgressBarForeground"
				ref={this.progressRef}
				fill="#000000"
				opacity={0.5}
				width={0}
				height={barHeight}
				radius={8}
				position={[0, 0]}
				zIndex={160}
			/>
		);

		// 初始化进度条位置（进度为0）
		this.initProgressBar();
	}

	/**
	 * 初始化进度条位置（进度为0）- 不带动画，直接设置
	 */
	private initProgressBar() {
		this.progressPercent = 0;
		const barPadding = this.barPadding();
		const segmentsWidth = this.segmentsLayoutRef().width() || (this.width() - barPadding * 2);
		const segmentsX = this.segmentsLayoutRef().position.x();
		const segmentsY = this.segmentsLayoutRef().position.y();
		const leftEdge = segmentsX - segmentsWidth / 2;
		this.progressRef().width(0);
		this.progressRef().position([leftEdge, segmentsY]);
	}

	/**
	 * 让进度条在整个动画过程中持续平滑增长
	 * @param totalDuration 整个动画的总时长（秒）
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *animateProgress(totalDuration: number): ThreadGenerator {
		// 使用 tween 让进度条在整个时长内从0%平滑增长到100%
		// 每一帧都会更新进度条的宽度和位置，实现平滑的持续增长
		yield* tween(totalDuration, (value) => {
			// value 从 0 到 1，表示进度从 0% 到 100%
			const barPadding = this.barPadding();
			// 获取分段Layout的宽度和位置
			const segmentsWidth = this.segmentsLayoutRef().width() || (this.width() - barPadding * 2);
			const segmentsX = this.segmentsLayoutRef().position.x();
			const segmentsY = this.segmentsLayoutRef().position.y();
			
			// 计算当前进度条的宽度（从0到完整宽度）
			const currentProgressWidth = segmentsWidth * value;
			
			// 计算进度条位置
			// 进度条左边缘对齐到分段Layout的左边缘
			const leftEdge = segmentsX - segmentsWidth / 2;
			// 进度条中心位置 = 左边缘 + 当前宽度的一半
			const progressCenterX = leftEdge + currentProgressWidth / 2;
			
			// 更新进度条的宽度和位置
			this.progressRef().width(currentProgressWidth);
			this.progressRef().position([progressCenterX, segmentsY]);
			
			// 更新进度百分比
			this.progressPercent = value * 100;
		}, linear);
	}

	/**
	 * 更新某个分区的标题文本
	 */
	public setSegmentTitle(segIndex: number, newTitle: string) {
		if (this.titleRefs[segIndex]) {
			this.titleRefs[segIndex]().text(newTitle);
		}
	}

	/**
	 * 根据字幕索引设置进度条位置（平滑动画）
	 * @param index 当前字幕索引（从0开始）
	 * @param total 总字幕数量
	 * @param duration 动画时长（秒），默认0.3秒
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *setProgressByIndex(index: number, total: number, duration: number = 0.3): ThreadGenerator {
		if (total <= 0) return;
		
		// 计算目标进度百分比（使用 (index + 0.5) / total 让进度条在字幕中间位置）
		const targetProgress = (index + 0.5) / total;
		const startProgress = this.progressPercent / 100;
		
		// 如果目标进度小于等于当前进度，直接设置（避免倒退）
		if (targetProgress <= startProgress) {
			return;
		}
		
		// 平滑过渡到目标进度
		yield* tween(duration, (value) => {
			const progress = startProgress + (targetProgress - startProgress) * value;
			
			const barPadding = this.barPadding();
			const segmentsWidth = this.segmentsLayoutRef().width() || (this.width() - barPadding * 2);
			const segmentsX = this.segmentsLayoutRef().position.x();
			const segmentsY = this.segmentsLayoutRef().position.y();
			
			// 计算当前进度条的宽度
			const currentProgressWidth = segmentsWidth * progress;
			
			// 计算进度条位置
			const leftEdge = segmentsX - segmentsWidth / 2;
			const progressCenterX = leftEdge + currentProgressWidth / 2;
			
			// 更新进度条的宽度和位置
			this.progressRef().width(currentProgressWidth);
			this.progressRef().position([progressCenterX, segmentsY]);
			
			// 更新进度百分比
			this.progressPercent = progress * 100;
		}, linear);
	}
}
