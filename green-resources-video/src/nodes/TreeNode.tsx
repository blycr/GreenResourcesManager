/**
 * 树形节点组件
 * 
 * 符合 Motion Canvas 规范的类组件，用于创建和操作树形节点结构。
 * 
 * ## 公有方法
 * 
 * - `showNode(nodeKey: string, options?): ThreadGenerator` - 显示指定节点（带动画）
 * - `changeNodeColor(nodeLabel: string, backgroundColor: string, strokeColor?: string, options?): ThreadGenerator` - 改变指定节点名称的所有节点的颜色（自动查找所有匹配的节点）
 * - `addNodeTo(nodeName: string, childLabel: string, options?): ThreadGenerator` - 给指定节点添加单个子节点并自动显示
 * - `addNodesTo(nodeName: string, childrenNodes: Array<{key?: string, label: string}>, options?): ThreadGenerator` - 批量给指定节点添加多个子节点并自动显示
 * - `hideAndRemoveNodeChildren(nodeName: string, options?): ThreadGenerator` - 隐藏并删除指定节点的所有子节点（带动画）
 * - `moveNode(nodeLabel: string, oldParentName: string, newParentName: string, options?): ThreadGenerator` - 将节点从一个父节点移动到另一个父节点（带动画）
 * - `removeNode(nodeKeyOrLabel: string, options?): ThreadGenerator` - 隐藏并删除指定节点（带动画）
 * - `removeTree(options?): ThreadGenerator` - 删除所有节点（包括根节点），递归隐藏所有节点后删除（带动画）
 */

import { 
	Rect, 
	RectProps, 
	Txt, 
	Line, 
	Layout,
	LayoutProps,
	initial,
	signal,
} from '@motion-canvas/2d';
import {
	makeRef,
	makeRefs,
	createRefMap,
	Vector2,
	SignalValue,
	SimpleSignal,
	createRef,
	ThreadGenerator,
	waitFor,
	all,
	easeOutCubic,
} from '@motion-canvas/core';

// 节点数据结构
export interface TreeNodeData {
	key: string;
	label: string;
	children?: TreeNodeData[];
	parent?: TreeNodeData;
}

// 主题配置
export interface TreeNodeTheme {
	bg?: string;
	stroke?: string;
	text?: string;
	radius?: number;
	fontSize?: number;
}

const defaultTheme: Required<TreeNodeTheme> = {
	bg: '#1a1a1a',
	stroke: '#4CAF50',
	text: '#ffffff',
	radius: 8,
	fontSize: 28,
};

// 布局配置
export interface TreeNodeLayout {
	rowSpacing?: number; // 行间距
	columnSpacing?: number; // 列间距
	horizontalSpacing?: number; // 横向排列时的间距
	verticalOffset?: number; // 垂直偏移
	horizontalLayout?: boolean; // 是否横向布局（子节点横向排列）
	rootPosition?: () => [number, number]; // 根节点位置
	childrenPosition?: (index: number, total: number) => [number, number]; // 子节点位置函数
}

const defaultLayout: Required<Omit<TreeNodeLayout, 'rootPosition' | 'childrenPosition'>> & {
	rootPosition?: () => [number, number];
	childrenPosition?: (index: number, total: number) => [number, number];
} = {
	rowSpacing: 200,
	columnSpacing: 180,
	horizontalSpacing: 180,
	verticalOffset: 0,
	horizontalLayout: false,
};

// 引用类型
export interface TreeNodeRefs {
	nodeRefs: ReturnType<typeof createRefMap<Rect>>;
	arrowRefs: ReturnType<typeof createRefMap<Line>>;
	nodes: TreeNodeData[];
}

/**
 * 创建树形节点引用
 */
export function createTreeNodeRefs() {
	return {
		nodeRefs: createRefMap<Rect>(),
		arrowRefs: createRefMap<Line>(),
		nodes: [] as TreeNodeData[],
	};
}

/**
 * 将嵌套对象结构转换为扁平数组结构
 */
export function convertToTreeNodes(
	root: {
		key?: string;
		label: string;
		children?: Record<string, any>;
	},
	parent?: TreeNodeData
): TreeNodeData[] {
	const nodes: TreeNodeData[] = [];
	const queue: any[] = [{ ...root, parent }];

	while (queue.length > 0) {
		const node = queue.shift();
		const treeNode: TreeNodeData = {
			key: node.key || node.label,
			label: node.label,
			parent: node.parent,
		};
		nodes.push(treeNode);

		if (node.children) {
			const children: TreeNodeData[] = [];
			if (Array.isArray(node.children)) {
				// 数组形式
				for (const child of node.children) {
					const childNode = {
						...child,
						key: child.key || child.label,
						parent: treeNode,
					};
					children.push(childNode);
					queue.push(childNode);
				}
			} else {
				// 对象形式
				for (const [key, value] of Object.entries(node.children)) {
					const childNode = {
						...(value as any),
						key: key,
						parent: treeNode,
					};
					children.push(childNode);
					queue.push(childNode);
				}
			}
			treeNode.children = children;
		}
	}

	return nodes;
}

/**
 * 树形数据接口
 */
export interface TreeNodeRoot {
	key?: string;
	label: string;
	children?: Record<string, any> | any[];
}

/**
 * TreeNode 组件属性
 */
export interface TreeNodeProps extends LayoutProps {
	/** 树形数据根节点数组（支持多个根节点） */
	roots: SignalValue<TreeNodeRoot[]>;
	/** 外部管理的引用（可选，如果不提供则内部创建） */
	refs?: SignalValue<TreeNodeRefs>;
	/** 主题配置 */
	theme?: SignalValue<TreeNodeTheme>;
	/** 布局配置（使用 treeLayout 避免与 Layout 的 layout 冲突） */
	treeLayout?: SignalValue<TreeNodeLayout>;
}

/**
 * 树形节点组件 - 符合 Motion Canvas 规范的类组件
 * 使用方式：<TreeNodeComponent roots={[treeData]} />
 */
export class TreeNodeComponent extends Layout {
	@signal()
	public declare readonly roots: SimpleSignal<TreeNodeRoot[], this>;

	@signal()
	public declare readonly refs: SimpleSignal<TreeNodeRefs | undefined, this>;

	@initial({})
	@signal()
	public declare readonly theme: SimpleSignal<TreeNodeTheme, this>;

	@initial({})
	@signal()
	public declare readonly treeLayout: SimpleSignal<TreeNodeLayout, this>;

	// 内部引用（如果外部没有提供）
	private internalRefs?: TreeNodeRefs;

	public constructor(props?: TreeNodeProps) {
		super({
			layout: false,
			...props,
		});

		// 初始化引用
		// 注意：props?.refs 可能是 SignalValue，需要获取实际值
		const externalRefs = props?.refs ? (typeof props.refs === 'function' ? props.refs() : props.refs) : undefined;
		if (externalRefs) {
			this.internalRefs = externalRefs;
		} else {
			this.internalRefs = createTreeNodeRefs();
		}

		// 构建树形结构
		this.buildTree();
	}

	/**
	 * 构建树形结构
	 */
	private buildTree() {
		const roots = this.roots();
		const finalTheme = { ...defaultTheme, ...this.theme() };
		const finalLayout: TreeNodeLayout = { ...defaultLayout, ...this.treeLayout() };
		const showArrows = true; // 始终显示箭头
		const refs = this.internalRefs!;

		// 检查根节点数组
		if (!roots || roots.length === 0) {
			console.warn('TreeNodeComponent: 未提供 roots 或 roots 为空');
			return;
		}

		// 转换所有根节点数据
		const allNodes: TreeNodeData[] = [];
		for (const rootNode of roots) {
			const nodes = convertToTreeNodes(rootNode);
			allNodes.push(...nodes);
		}
		refs.nodes = allNodes;

		// 使用广度优先遍历创建树形结构
		// 找到所有根节点（没有父节点的节点）
		const rootDataNodes = allNodes.filter(node => !node.parent);
		let queue: TreeNodeData[] = [...rootDataNodes];
		let row = 0;

		while (queue.length > 0) {
			const currentLevelNodes = queue;
			queue = [];
			let column = 0;

			for (const node of currentLevelNodes) {
				if (node.children && Array.isArray(node.children)) {
					queue.push(...node.children);
				}

				// 计算节点位置
				let x: number;
				let y: number;

				if (row === 0 && finalLayout.rootPosition) {
					// 根节点使用自定义位置
					const pos = finalLayout.rootPosition();
					x = pos[0];
					y = pos[1];
				} else if (row === 1 && finalLayout.horizontalLayout && finalLayout.childrenPosition && node.parent) {
					// 第二层子节点使用横向布局
					const children = node.parent.children || [];
					const index = children.findIndex(child => child.key === node.key);
					const pos = finalLayout.childrenPosition(index, children.length);
					x = pos[0];
					y = pos[1];
				} else if (row >= 2 && node.parent) {
					// 第三层及以下：基于父节点位置计算
					const siblings = node.parent.children || [];
					const siblingIndex = siblings.findIndex(child => child.key === node.key);
					const totalSiblings = siblings.length;
					const spacing = finalLayout.columnSpacing || 150;
					const totalWidth = (totalSiblings - 1) * spacing;
					const startX = -totalWidth / 2;
					const rowSpacing = finalLayout.rowSpacing || 200;

					// 使用函数形式计算位置，确保在渲染时动态获取父节点位置
					const parentRef = refs.nodeRefs[node.parent.key];

					// 创建节点时使用 position 函数
					this.add(
						<Rect
							ref={refs.nodeRefs[node.key]}
							position={() => {
								// 尝试获取父节点位置
								if (parentRef) {
									const parentNode = parentRef();
									if (parentNode) {
										const parentPos = parentNode.position();
										return [
											parentPos.x + startX + siblingIndex * spacing,
											parentPos.y + rowSpacing
										];
									}
								}
								// 回退到默认位置
								if (node.parent && node.parent.parent && node.parent.parent.key === 'root') {
									const secondLevelIndex = node.parent.parent.children?.findIndex(
										child => child.key === node.parent?.key
									) || 0;
									const secondLevelSpacing = 180;
									const secondLevelTotalWidth = ((node.parent.parent.children?.length || 1) - 1) * secondLevelSpacing;
									const secondLevelStartX = -secondLevelTotalWidth / 2;
									const secondLevelY = -this.height() / 2 + 350;

									return [
										secondLevelStartX + secondLevelIndex * secondLevelSpacing + startX + siblingIndex * spacing,
										secondLevelY + rowSpacing
									];
								}
								// 最终回退
								return [
									(siblingIndex - (totalSiblings - 1) / 2) * spacing,
									row * rowSpacing - this.height() / 2 + finalLayout.verticalOffset + 150
								];
							}}
							fill={finalTheme.bg}
							radius={finalTheme.radius}
							layout
							scale={0.9}
							opacity={0}
							strokeFirst
							stroke={finalTheme.stroke}
							lineWidth={2}
							direction="column"
							alignItems="center"
							justifyContent="center"
							padding={20}
						>
							<Txt
								text={node.label}
								fontSize={finalTheme.fontSize}
								fill={finalTheme.text}
								fontFamily="Microsoft YaHei, sans-serif"
								textAlign="center"
							/>
						</Rect>
					);

					// 创建连线
					if (showArrows && node.parent && parentRef) {
						const childRef = refs.nodeRefs[node.key];
						const offset = Math.min(60, rowSpacing * 0.3);

						this.add(
							<Line
								ref={refs.arrowRefs[node.key]}
								lineWidth={6}
								stroke="#000"
								radius={8}
								startOffset={10}
								endOffset={10}
								endArrow
								end={0}
								opacity={0}
								zIndex={-1}
								points={[
									() => {
										if (parentRef && parentRef()) {
											return parentRef().bottom();
										}
										return [0, 0];
									},
									() => {
										if (parentRef && parentRef()) {
											return parentRef().bottom().addY(offset);
										}
										return [0, offset];
									},
									() => {
										if (parentRef && parentRef() && childRef && childRef()) {
											return [childRef().top().x, parentRef().bottom().y + offset];
										}
										return [0, offset];
									},
									() => {
										if (childRef && childRef()) {
											return childRef().top();
										}
										return [0, 0];
									},
								]}
							/>
						);
					}

					// 跳过下面的通用创建逻辑
					column++;
					continue;
				} else {
					// 默认布局
					x = (column - (currentLevelNodes.length - 1) / 2) * finalLayout.columnSpacing;
					y = row * finalLayout.rowSpacing - this.height() / 2 + finalLayout.verticalOffset + 150;
				}

				// 创建节点
				this.add(
					<Rect
						ref={refs.nodeRefs[node.key]}
						x={x}
						y={y}
						fill={finalTheme.bg}
						radius={finalTheme.radius}
						layout
						scale={0.9}
						opacity={0}
						strokeFirst
						stroke={finalTheme.stroke}
						lineWidth={2}
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={20}
					>
						<Txt
							text={node.label}
							fontSize={finalTheme.fontSize}
							fill={finalTheme.text}
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
						/>
					</Rect>
				);

				// 如果有父节点，创建连线
				if (node.parent && showArrows) {
					const parentRef = refs.nodeRefs[node.parent.key];
					const childRef = refs.nodeRefs[node.key];

					// 计算连线偏移量（根据布局类型调整）
					let offset = 60;
					if (finalLayout.horizontalLayout && row === 1) {
						offset = 50;
					}

					this.add(
						<Line
							ref={refs.arrowRefs[node.key]}
							lineWidth={6}
							stroke="#000"
							radius={8}
							startOffset={10}
							endOffset={10}
							endArrow
							end={0}
							opacity={0}
							zIndex={-1}
							points={[
								() => parentRef().bottom(),
								() => parentRef().bottom().addY(offset),
								() => [childRef().top().x, parentRef().bottom().y + offset],
								() => childRef().top(),
							]}
						/>
					);
				}

				column++;
			}
			row++;
		}
	}

	/**
	 * 获取内部引用（用于外部访问）
	 */
	public getRefs(): TreeNodeRefs {
		return this.internalRefs!;
	}

	/**
	 * 显示指定节点（带动画）
	 * @param nodeKey 节点的key
	 * @param options 配置选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *showNode(
		nodeKey: string,
		options: {
			duration?: number; // 动画时长，默认0.5秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.5,
			easing = easeOutCubic,
		} = options;

		// 等待一帧，确保 refs 被正确赋值
		yield* waitFor(0);
		yield* this.showSingleNode(nodeKey, duration, easing);
	}

	/**
	 * 改变指定节点名称的所有节点的颜色（自动查找所有匹配的节点）
	 * @param nodeLabel 节点的label（会查找所有匹配此label的节点）
	 * @param backgroundColor 背景颜色
	 * @param strokeColor 边框颜色（可选，默认使用 backgroundColor）
	 * @param options 动画选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *changeNodeColor(
		nodeLabel: string,
		backgroundColor: string,
		strokeColor?: string,
		options: {
			duration?: number; // 动画时长，默认0.5秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.5,
			easing = easeOutCubic,
		} = options;

		const refs = this.internalRefs!;
		
		// 查找所有匹配此 label 的节点
		const targetNodes = refs.nodes.filter(
			node => node.label === nodeLabel
		);

		if (targetNodes.length === 0) {
			console.warn(`未找到 label 为 "${nodeLabel}" 的节点`);
			return;
		}

		// 为所有匹配的节点改变颜色
		const animations: ThreadGenerator[] = [];
		for (const node of targetNodes) {
			const nodeRef = refs.nodeRefs[node.key];
			if (nodeRef && nodeRef()) {
				animations.push(nodeRef().fill(backgroundColor, duration, easing));
				if (strokeColor) {
					animations.push(nodeRef().stroke(strokeColor, duration, easing));
				}
			}
		}

		if (animations.length > 0) {
			yield* all(...animations);
		}
	}

	/**
	 * 显示单个节点及其箭头（内部方法）
	 * @param nodeKey 节点key
	 * @param duration 动画时长
	 * @param easing 缓动函数
	 * @returns ThreadGenerator
	 */
	private *showSingleNode(
		nodeKey: string,
		duration: number,
		easing: (t: number) => number
	): ThreadGenerator {
		const refs = this.internalRefs!;
		const childRef = refs.nodeRefs[nodeKey];
		const arrowRef = refs.arrowRefs[nodeKey];
		
		if (childRef) {
			const childNode = childRef();
			if (childNode) {
				const animations: ThreadGenerator[] = [
					childNode.opacity(1, duration, easing),
					childNode.scale(1, duration, easing),
				];
				
				if (arrowRef) {
					const arrow = arrowRef();
					if (arrow) {
						animations.push(
							arrow.opacity(1, duration, easing),
							arrow.end(1, duration, easing)
						);
					}
				}
				
				yield* all(...animations);
			}
		}
	}

	/**
	 * 给指定节点添加单个子节点并自动显示（组件方法）
	 * @param nodeName 目标节点名称（key 或 label）
	 * @param childLabel 要添加的子节点标签
	 * @param options 显示选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *addNodeTo(
		nodeName: string,
		childLabel: string,
		options: {
			duration?: number; // 动画时长，默认0.5秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		// 直接调用 addNodesTo，传入单个节点
		yield* this.addNodesTo(nodeName, [childLabel], options);
	}

	/**
	 * 批量给指定节点添加多个子节点并自动显示（组件方法）
	 * @param nodeName 目标节点名称（key 或 label）
	 * @param childrenLabels 要添加的子节点标签数组（字符串数组）
	 * @param options 显示选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *addNodesTo(
		nodeName: string,
		childrenLabels: string[],
		options: {
			duration?: number; // 动画时长，默认0.5秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
			childSpacing?: number; // 子节点之间的水平间距（x轴方向），默认180
			childVerticalOffset?: number; // 子节点相对于父节点的垂直偏移（y轴方向），默认200
			childHorizontalOffset?: number; // 子节点相对于父节点的水平偏移（x轴方向），默认0（负数向左，正数向右）
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.5,
			easing = easeOutCubic,
			childSpacing, // 如果未指定，则从 treeLayout 获取
			childVerticalOffset, // 如果未指定，则从 treeLayout 获取
			childHorizontalOffset = 0, // 默认水平偏移（0表示以父节点为中心）
		} = options;

		// 从组件属性获取主题和布局配置
		const theme = this.theme();
		const finalTheme = { ...defaultTheme, ...theme };
		const treeLayout = this.treeLayout();
		const finalLayout = { ...defaultLayout, ...treeLayout };
		const showArrows = true; // 始终显示箭头

		// 如果未指定，使用 treeLayout 中的配置
		const finalChildSpacing = childSpacing ?? finalLayout.columnSpacing;
		const finalChildVerticalOffset = childVerticalOffset ?? finalLayout.rowSpacing;
		
		// 将字符串数组转换为对象数组（key 和 label 都使用字符串值）
		const childrenNodes = childrenLabels.map(label => ({
			label: label,
		}));
		
		// 添加节点
		const addedNodes = addNodesTo({
			refs: this.internalRefs!,
			nodeName,
			childrenNodes,
			view: this,
			theme: finalTheme,
			childSpacing: finalChildSpacing,
			childVerticalOffset: finalChildVerticalOffset,
			childHorizontalOffset,
			showArrows,
			zIndex: undefined,
		});

		// 等待一帧确保添加完成
		yield* waitFor(0);

		// 自动显示所有新添加的节点
		const animations: ThreadGenerator[] = [];
		for (const node of addedNodes) {
			if (node) {
				animations.push(this.showSingleNode(node.key, duration, easing));
			}
		}

		if (animations.length > 0) {
			yield* all(...animations);
		}
	}

	/**
	 * 隐藏并删除指定节点的所有子节点（带动画）
	 * @param nodeName 目标节点名称（key 或 label）
	 * @param options 动画选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *hideAndRemoveNodeChildren(
		nodeName: string,
		options: {
			duration?: number; // 动画时长，默认0.3秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.3,
			easing = easeOutCubic,
		} = options;

		const refs = this.internalRefs!;

		// 查找父节点
		const parentNode = refs.nodes.find(
			node => node.key === nodeName || node.label === nodeName
		);
		
		if (!parentNode || !parentNode.children) {
			return;
		}

		// 同时淡出所有子节点（并行执行）
		const animations: ThreadGenerator[] = [];
		for (const child of parentNode.children) {
			animations.push(this.hideNode(child.key, { duration, easing }));
		}
		
		// 并行执行所有淡出动画
		if (animations.length > 0) {
			yield* all(...animations);
		}
		
		// 等待动画完成后删除所有子节点
		yield* waitFor(0);
		removeNodeChildren(refs, nodeName);
	}

	/**
	 * 隐藏指定节点（内部方法）
	 * @param nodeKey 节点key
	 * @param options 动画选项
	 * @returns ThreadGenerator
	 */
	private *hideNode(
		nodeKey: string,
		options: {
			duration?: number;
			easing?: (t: number) => number;
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.3,
			easing = easeOutCubic,
		} = options;

		const refs = this.internalRefs!;
		const childRef = refs.nodeRefs[nodeKey];
		const arrowRef = refs.arrowRefs[nodeKey];
		
		if (childRef) {
			const childNode = childRef();
			if (childNode) {
				const animations: ThreadGenerator[] = [
					childNode.opacity(0, duration, easing),
					childNode.scale(0.9, duration, easing),
				];
				
				if (arrowRef) {
					const arrow = arrowRef();
					if (arrow) {
						animations.push(
							arrow.opacity(0, duration, easing),
							arrow.end(0, duration, easing)
						);
					}
				}
				
				yield* all(...animations);
			}
		}
	}

	/**
	 * 将节点从一个父节点移动到另一个父节点（带动画）
	 * @param nodeLabel 要移动的节点标签
	 * @param oldParentName 旧父节点名称（key 或 label）
	 * @param newParentName 新父节点名称（key 或 label）
	 * @param options 动画选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *moveNode(
		nodeLabel: string,
		oldParentName: string,
		newParentName: string,
		options: {
			hideDuration?: number; // 隐藏动画时长，默认0.3秒
			showDuration?: number; // 显示动画时长，默认0.5秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		const {
			hideDuration = 0.3,
			showDuration = 0.5,
			easing = easeOutCubic,
		} = options;

		const refs = this.internalRefs!;

		// 找到旧位置的节点
		const oldNode = refs.nodes.find(
			node => (node.parent?.key === oldParentName || node.parent?.label === oldParentName)
				&& node.label === nodeLabel
		);

		if (!oldNode) {
			console.warn(`节点 "${nodeLabel}" 在 "${oldParentName}" 下未找到`);
			return;
		}

		// 淡出旧位置的节点
		yield* this.hideNode(oldNode.key, { duration: hideDuration, easing });

		// 删除旧节点
		removeNode(refs, oldNode.key);

		// 等待一帧确保删除完成
		yield* waitFor(0);

		// 在新位置添加节点（使用组件方法）
		yield* this.addNodeTo(newParentName, nodeLabel, { duration: showDuration, easing });
	}

	/**
	 * 隐藏并删除指定节点（带动画）
	 * @param nodeKeyOrLabel 节点的key或label
	 * @param options 动画选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *removeNode(
		nodeKeyOrLabel: string,
		options: {
			duration?: number; // 动画时长，默认0.3秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.3,
			easing = easeOutCubic,
		} = options;

		const refs = this.internalRefs!;

		// 查找节点
		const targetNode = refs.nodes.find(
			node => node.key === nodeKeyOrLabel || node.label === nodeKeyOrLabel
		);

		if (!targetNode) {
			console.warn(`节点 "${nodeKeyOrLabel}" 未找到`);
			return;
		}

		// 先淡出节点
		yield* this.hideNode(targetNode.key, { duration, easing });

		// 删除节点
		removeNode(refs, targetNode.key);

		// 等待一帧确保删除完成
		yield* waitFor(0);
	}

	/**
	 * 删除所有节点（包括根节点），递归隐藏所有节点后删除（带动画）
	 * @param options 动画选项
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *removeTree(
		options: {
			duration?: number; // 动画时长，默认0.5秒
			easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
		} = {}
	): ThreadGenerator {
		const {
			duration = 0.5,
			easing = easeOutCubic,
		} = options;

		const refs = this.internalRefs!;

		// 如果没有节点，直接返回
		if (refs.nodes.length === 0) {
			return;
		}

		// 保存 this 引用
		const self = this;

		// 递归隐藏所有节点（从叶子节点到根节点）
		const hideAllNodes = function* (node: TreeNodeData): ThreadGenerator {
			// 先递归隐藏所有子节点
			if (node.children && node.children.length > 0) {
				const childAnimations: ThreadGenerator[] = [];
				for (const child of node.children) {
					childAnimations.push(hideAllNodes(child));
				}
				if (childAnimations.length > 0) {
					yield* all(...childAnimations);
				}
			}
			// 然后隐藏当前节点
			yield* self.hideNode(node.key, { duration, easing });
		};

		// 找到所有根节点（支持多个根节点）
		const rootNodes = refs.nodes.filter(n => !n.parent);
		if (rootNodes.length > 0) {
			// 并行隐藏所有根节点及其子树
			const rootAnimations: ThreadGenerator[] = [];
			for (const rootNode of rootNodes) {
				rootAnimations.push(hideAllNodes(rootNode));
			}
			if (rootAnimations.length > 0) {
				yield* all(...rootAnimations);
			}
			
			// 等待动画完成后删除所有根节点（removeNode 会递归删除所有子节点）
			yield* waitFor(0.1);
			for (const rootNode of rootNodes) {
				removeNode(refs, rootNode.key);
			}
		}
	}
}

/**
 * 树形节点组件（函数形式，向后兼容）
 * @deprecated 请使用 <TreeNode /> 组件代替
 */
export function TreeNodeFunction({
	refs,
	root,
	view,
	theme = {},
	layout,
	showArrows = true,
	zIndex,
}: {
	refs: TreeNodeRefs;
	root: {
		key?: string;
		label: string;
		children?: Record<string, any> | any[];
	};
	view: Layout;
	theme?: TreeNodeTheme;
	layout?: TreeNodeLayout;
	showArrows?: boolean;
	zIndex?: number;
}): null {
	const finalTheme = { ...defaultTheme, ...theme };
	const finalLayout: TreeNodeLayout = { ...defaultLayout, ...(layout || {}) };

	// 转换节点数据
	const nodes = convertToTreeNodes(root);
	refs.nodes = nodes;

	// 使用广度优先遍历创建树形结构
	let queue: TreeNodeData[] = [nodes[0]];
	let row = 0;

	while (queue.length > 0) {
		const currentLevelNodes = queue;
		queue = [];
		let column = 0;

		for (const node of currentLevelNodes) {
			if (node.children && Array.isArray(node.children)) {
				queue.push(...node.children);
			}

			// 计算节点位置
			let x: number;
			let y: number;

			if (row === 0 && finalLayout.rootPosition) {
				const pos = finalLayout.rootPosition();
				x = pos[0];
				y = pos[1];
			} else if (row === 1 && finalLayout.horizontalLayout && finalLayout.childrenPosition && node.parent) {
				const children = node.parent.children || [];
				const index = children.findIndex(child => child.key === node.key);
				const pos = finalLayout.childrenPosition(index, children.length);
				x = pos[0];
				y = pos[1];
			} else if (row >= 2 && node.parent) {
				const siblings = node.parent.children || [];
				const siblingIndex = siblings.findIndex(child => child.key === node.key);
				const totalSiblings = siblings.length;
				const spacing = finalLayout.columnSpacing || 150;
				const totalWidth = (totalSiblings - 1) * spacing;
				const startX = -totalWidth / 2;
				const rowSpacing = finalLayout.rowSpacing || 200;

				const parentRef = refs.nodeRefs[node.parent.key];

				view.add(
					<Rect
						ref={refs.nodeRefs[node.key]}
						position={() => {
							if (parentRef) {
								const parentNode = parentRef();
								if (parentNode) {
									const parentPos = parentNode.position();
									return [
										parentPos.x + startX + siblingIndex * spacing,
										parentPos.y + rowSpacing
									];
								}
							}
							if (node.parent && node.parent.parent && node.parent.parent.key === 'root') {
								const secondLevelIndex = node.parent.parent.children?.findIndex(
									child => child.key === node.parent?.key
								) || 0;
								const secondLevelSpacing = 180;
								const secondLevelTotalWidth = ((node.parent.parent.children?.length || 1) - 1) * secondLevelSpacing;
								const secondLevelStartX = -secondLevelTotalWidth / 2;
								const secondLevelY = -view.height() / 2 + 350;

								return [
									secondLevelStartX + secondLevelIndex * secondLevelSpacing + startX + siblingIndex * spacing,
									secondLevelY + rowSpacing
								];
							}
							return [
								(siblingIndex - (totalSiblings - 1) / 2) * spacing,
								row * rowSpacing - view.height() / 2 + finalLayout.verticalOffset + 150
							];
						}}
						fill={finalTheme.bg}
						radius={finalTheme.radius}
						layout
						scale={0.9}
						opacity={0}
						strokeFirst
						stroke={finalTheme.stroke}
						lineWidth={2}
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={20}
						zIndex={zIndex}
					>
						<Txt
							text={node.label}
							fontSize={finalTheme.fontSize}
							fill={finalTheme.text}
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
						/>
					</Rect>
				);

				if (showArrows && node.parent && parentRef) {
					const childRef = refs.nodeRefs[node.key];
					const offset = Math.min(60, rowSpacing * 0.3);

					view.add(
						<Line
							ref={refs.arrowRefs[node.key]}
							lineWidth={6}
							stroke="#000"
							radius={8}
							startOffset={10}
							endOffset={10}
							endArrow
							end={0}
							opacity={0}
							zIndex={(zIndex || 0) - 1}
							points={[
								() => {
									if (parentRef && parentRef()) {
										return parentRef().bottom();
									}
									return [0, 0];
								},
								() => {
									if (parentRef && parentRef()) {
										return parentRef().bottom().addY(offset);
									}
									return [0, offset];
								},
								() => {
									if (parentRef && parentRef() && childRef && childRef()) {
										return [childRef().top().x, parentRef().bottom().y + offset];
									}
									return [0, offset];
								},
								() => {
									if (childRef && childRef()) {
										return childRef().top();
									}
									return [0, 0];
								},
							]}
						/>
					);
				}

				column++;
				continue;
			} else {
				x = (column - (currentLevelNodes.length - 1) / 2) * finalLayout.columnSpacing;
				y = row * finalLayout.rowSpacing - view.height() / 2 + finalLayout.verticalOffset + 150;
			}

			view.add(
				<Rect
					ref={refs.nodeRefs[node.key]}
					x={x}
					y={y}
					fill={finalTheme.bg}
					radius={finalTheme.radius}
					layout
					scale={0.9}
					opacity={0}
					strokeFirst
					stroke={finalTheme.stroke}
					lineWidth={2}
					direction="column"
					alignItems="center"
					justifyContent="center"
					padding={20}
					zIndex={zIndex}
				>
					<Txt
						text={node.label}
						fontSize={finalTheme.fontSize}
						fill={finalTheme.text}
						fontFamily="Microsoft YaHei, sans-serif"
						textAlign="center"
					/>
				</Rect>
			);

			if (node.parent && showArrows) {
				const parentRef = refs.nodeRefs[node.parent.key];
				const childRef = refs.nodeRefs[node.key];

				let offset = 60;
				if (finalLayout.horizontalLayout && row === 1) {
					offset = 50;
				}

				view.add(
					<Line
						ref={refs.arrowRefs[node.key]}
						lineWidth={6}
						stroke="#000"
						radius={8}
						startOffset={10}
						endOffset={10}
						endArrow
						end={0}
						opacity={0}
						zIndex={(zIndex || 0) - 1}
						points={[
							() => parentRef().bottom(),
							() => parentRef().bottom().addY(offset),
							() => [childRef().top().x, parentRef().bottom().y + offset],
							() => childRef().top(),
						]}
					/>
				);
			}

			column++;
		}
		row++;
	}

	return null;
}

/**
 * 树形节点组件（函数形式，向后兼容）
 * @deprecated 请使用 <TreeNodeComponent /> 组件代替
 * 使用方式：TreeNode({ refs, root, view, theme, layout, showArrows, zIndex })
 */
export function TreeNode(
	props: {
		refs: TreeNodeRefs;
		root: {
			key?: string;
			label: string;
			children?: Record<string, any> | any[];
		};
		view: Layout;
		theme?: TreeNodeTheme;
		layout?: TreeNodeLayout;
		showArrows?: boolean;
		zIndex?: number;
	}
): null {
	return TreeNodeFunction(props);
}

/**
 * 给指定节点添加新的子节点
 * @param refs 树形节点引用
 * @param nodeName 目标节点名称（key 或 label）
 * @param childNode 要添加的子节点数据
 * @param view 场景视图引用
 * @param theme 主题配置
 * @param childSpacing 子节点之间的间距（默认 180）
 * @param childVerticalOffset 子节点相对于父节点的垂直偏移（默认 200）
 * @param showArrows 是否显示连线
 * @param zIndex zIndex
 */
export function addNodeTo({
	refs,
	nodeName,
	childNode,
	view,
	theme = {},
	childSpacing = 180,
	childVerticalOffset = 200,
	childHorizontalOffset = 0,
	showArrows = true,
	zIndex,
}: {
	refs: TreeNodeRefs;
	nodeName: string;
	childNode: {
		key?: string;
		label: string;
	};
	view: Layout;
	theme?: TreeNodeTheme;
	childSpacing?: number;
	childVerticalOffset?: number;
	childHorizontalOffset?: number;
	showArrows?: boolean;
	zIndex?: number;
}): TreeNodeData | null {
	const finalTheme = { ...defaultTheme, ...theme };

	// 查找目标节点（通过 key 或 label）
	const targetNode = refs.nodes.find(
		node => node.key === nodeName || node.label === nodeName
	);

	if (!targetNode) {
		console.warn(`节点 "${nodeName}" 未找到`);
		return null;
	}

	// 获取父节点的引用
	const parentRef = refs.nodeRefs[targetNode.key];
	if (!parentRef || !parentRef()) {
		console.warn(`节点 "${nodeName}" 的引用未找到`);
		return null;
	}

	// 创建新的子节点
	// 如果没有提供 key，使用 label 作为 key（确保唯一性）
	const newChildKey = childNode.key || childNode.label;
	const newChild: TreeNodeData = {
		key: newChildKey,
		label: childNode.label,
		parent: targetNode,
	};

	// 添加到目标节点的子节点列表
	if (!targetNode.children) {
		targetNode.children = [];
	}

	// 新节点追加到最后，保持添加顺序
	targetNode.children.push(newChild);

	// 添加到节点数组
	refs.nodes.push(newChild);

	// 重新布局所有子节点，使它们平均分布并居中
	const children = targetNode.children;
	const totalChildren = children.length;

	// 获取父节点位置
	const parentPos = parentRef().position();

	// 计算所有子节点的位置：横向居中排列
	const totalWidth = (totalChildren - 1) * childSpacing;
	const startX = -totalWidth / 2 + childHorizontalOffset; // 添加水平偏移
	const y = parentPos.y + childVerticalOffset;

	// 更新所有子节点的位置（包括新添加的），按顺序从左到右排列并居中
	children.forEach((child, index) => {
		const x = parentPos.x + startX + index * childSpacing;
		const childRef = refs.nodeRefs[child.key];

		if (childRef && childRef()) {
			// 如果节点已存在，更新位置（重新居中排列）
			childRef().x(x);
			childRef().y(y);
		} else if (child.key === newChildKey) {
			// 如果是新节点，创建它
			view.add(
				<Rect
					ref={refs.nodeRefs[newChildKey]}
					x={x}
					y={y}
					fill={finalTheme.bg}
					radius={finalTheme.radius}
					layout
					scale={0.9}
					opacity={0}
					strokeFirst
					stroke={finalTheme.stroke}
					lineWidth={2}
					direction="column"
					alignItems="center"
					justifyContent="center"
					padding={20}
					zIndex={zIndex}
				>
					<Txt
						text={newChild.label}
						fontSize={finalTheme.fontSize}
						fill={finalTheme.text}
						fontFamily="Microsoft YaHei, sans-serif"
						textAlign="center"
					/>
				</Rect>
			);

			// 创建连线
			if (showArrows) {
				const childRef = refs.nodeRefs[newChildKey];

				// 计算连线偏移量（根据垂直偏移调整）
				const offset = Math.min(60, childVerticalOffset * 0.3);

				view.add(
					<Line
						ref={refs.arrowRefs[newChildKey]}
						lineWidth={6}
						stroke="#000"
						radius={8}
						startOffset={10}
						endOffset={10}
						endArrow
						end={0}
						opacity={0}
						zIndex={(zIndex || 0) - 1}
						points={[
							() => parentRef().bottom(),
							() => parentRef().bottom().addY(offset),
							() => [childRef().top().x, parentRef().bottom().y + offset],
							() => childRef().top(),
						]}
					/>
				);
			}
		}
	});

	return newChild;
}

/**
 * 批量给指定节点添加多个子节点
 * @param refs 树形节点引用
 * @param nodeName 目标节点名称（key 或 label）
 * @param childrenNodes 要添加的子节点数据数组
 * @param view 场景视图引用
 * @param theme 主题配置
 * @param childSpacing 子节点之间的间距（默认 180）
 * @param childVerticalOffset 子节点相对于父节点的垂直偏移（默认 200）
 * @param showArrows 是否显示连线
 * @param zIndex zIndex
 * @returns 添加的子节点数组
 */
export function addNodesTo({
	refs,
	nodeName,
	childrenNodes,
	view,
	theme = {},
	childSpacing = 180,
	childVerticalOffset = 200,
	childHorizontalOffset = 0,
	showArrows = true,
	zIndex,
}: {
	refs: TreeNodeRefs;
	nodeName: string;
	childrenNodes: Array<{
		key?: string;
		label: string;
	}>;
	view: Layout;
	theme?: TreeNodeTheme;
	childSpacing?: number;
	childVerticalOffset?: number;
	childHorizontalOffset?: number;
	showArrows?: boolean;
	zIndex?: number;
}): TreeNodeData[] {
	return childrenNodes.map(childNode =>
		addNodeTo({
			refs,
			nodeName,
			childNode,
			view,
			theme,
			childSpacing,
			childVerticalOffset,
			childHorizontalOffset,
			showArrows,
			zIndex,
		})
	).filter(node => node !== null) as TreeNodeData[];
}

/**
 * 删除指定节点（包括其所有子节点）
 * @param refs 树形节点引用
 * @param nodeKeyOrLabel 要删除的节点的key或label
 * @returns 是否成功删除
 */
export function removeNode(
	refs: TreeNodeRefs,
	nodeKeyOrLabel: string
): boolean {
	// 查找要删除的节点
	const targetNode = refs.nodes.find(
		node => node.key === nodeKeyOrLabel || node.label === nodeKeyOrLabel
	);

	if (!targetNode) {
		console.warn(`节点 "${nodeKeyOrLabel}" 未找到`);
		return false;
	}

	// 递归删除所有子节点
	if (targetNode.children) {
		// 复制子节点数组，避免在遍历时修改原数组
		const childrenCopy = [...targetNode.children];
		for (const child of childrenCopy) {
			removeNode(refs, child.key);
		}
	}

	// 从父节点的子节点列表中移除
	if (targetNode.parent && targetNode.parent.children) {
		const index = targetNode.parent.children.findIndex(
			child => child.key === targetNode.key
		);
		if (index !== -1) {
			targetNode.parent.children.splice(index, 1);
		}
	}

	// 从节点数组中移除
	const nodeIndex = refs.nodes.findIndex(node => node.key === targetNode.key);
	if (nodeIndex !== -1) {
		refs.nodes.splice(nodeIndex, 1);
	}

	// 从场景中移除节点和连线
	const nodeRef = refs.nodeRefs[targetNode.key];
	const arrowRef = refs.arrowRefs[targetNode.key];

	if (nodeRef && nodeRef()) {
		nodeRef().remove();
	}

	if (arrowRef && arrowRef()) {
		arrowRef().remove();
	}

	// 清除引用
	delete refs.nodeRefs[targetNode.key];
	delete refs.arrowRefs[targetNode.key];

	return true;
}

/**
 * 删除指定节点的所有子节点
 * @param refs 树形节点引用
 * @param parentKeyOrLabel 父节点的key或label
 * @returns 删除的子节点数量
 */
export function removeNodeChildren(
	refs: TreeNodeRefs,
	parentKeyOrLabel: string
): number {
	// 查找父节点
	const parentNode = refs.nodes.find(
		node => node.key === parentKeyOrLabel || node.label === parentKeyOrLabel
	);

	if (!parentNode || !parentNode.children) {
		console.warn(`节点 "${parentKeyOrLabel}" 未找到或没有子节点`);
		return 0;
	}

	// 复制子节点数组，避免在遍历时修改原数组
	const childrenCopy = [...parentNode.children];
	let count = 0;

	for (const child of childrenCopy) {
		if (removeNode(refs, child.key)) {
			count++;
		}
	}

	return count;
}
