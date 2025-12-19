import { VideoScript } from '../interface/VideoScript';
import { Layout, Rect, Txt, Line, Video } from '@motion-canvas/2d';
import { all, easeOutCubic, waitFor, ThreadGenerator, createRef } from '@motion-canvas/core';
import { fadeInNodes, moveAndShow, blackHoleEffect, showTreeNodesByLevel, showNodeChildren, showNode, hideNode, showCircleImages, fallAndDisappearCircleImages, hideAndRemove } from '../utils/animationsUtil';
import ProgressSegmentConfig from '../interface/ProgressSegmentConfig';
import { ProgressSegment } from '../nodes/ProgressBar';
import { ProgressSegmentConverter } from '../utils/subtitle';
import VideoPostion from '../utils/VideoPostion';
import { createImage, createTexts, createCircleImages } from '../utils/creatorUtil';
import { TreeNodeComponent, createTreeNodeRefs, addNodeTo, addNodesTo, removeNode, NodeRenderer } from '../nodes/TreeNode';
import { FolderComponent } from '../nodes/folder';
import { Paper } from '../nodes/Paper';
import { PersistentKeywords } from '../nodes/PersistentKeywords';
import { MyImg } from '../nodes/MyImg';
import { SequentialImageGallery } from '../nodes/SequentialImageGallery';
import { TitleText } from '../nodes/TitleText';

/**
 * 创建主场景字幕数据
 * @param view 场景视图引用
 * @returns 完整的字幕数组，包含 callback
 */
export function createMainSubtitles(
	view: Layout
): VideoScript[] {
	// 运行时长演示视频引用
	const 运行时长视频Ref = createRef<Video>();

	// Unity示例视频引用
	const unity视频Ref = createRef<Video>();

	// 注册游戏演示视频引用
	const 注册游戏视频Ref = createRef<Video>();

	// 拖拽添加游戏演示视频引用
	const 拖拽添加游戏视频Ref = createRef<Video>();

	// tag添加演示视频引用
	const tag添加视频Ref = createRef<Video>();

	// 截图演示视频引用
	const 截图视频Ref = createRef<Video>();

	// 安全键演示视频引用
	const 安全键视频Ref = createRef<Video>();

	// 音频播放器演示视频引用
	const 音频播放器视频Ref = createRef<Video>();

	// 创建图片（初始在屏幕下方，透明）
	const imgRef = createImage(view, '/imgs/project-icon.png', {
		scale: 0.5,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});
	const 大厦 = createImage(view, '/imgs/大厦.png', {
		scale: 0.5,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	const 乌云 = createImage(view, '/imgs/大厦的乌云.png', {
		scale: 0.5,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建顺序图片展示组件（管理4个硬盘图片）
	const 硬盘GalleryRef = createRef<SequentialImageGallery>();
	const 硬盘Gallery = (
		<SequentialImageGallery
			ref={硬盘GalleryRef}
			imagePaths={['/imgs/4t硬盘.png', '/imgs/16t硬盘2.png', '/imgs/32t硬盘.png', '/imgs/72t硬盘.png']}
			view={view}	
			initialScale={0.7}
			finalScale={0.3}
			topOffset={170}
			duration={1}
			zIndex={300}
		/>
	);
	view.add(硬盘Gallery);

	// 创建单一tag筛选图片
	const 单一tag筛选Img = createImage(view, '/imgs/单一tag筛选标记.png', {
		scale: 0.7,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建多tag筛选图片
	const 多tag筛选Img = createImage(view, '/imgs/多tag筛选.png', {
		scale: 0.7,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建图片浏览器图片
	const 图片浏览器Img = createImage(view, '/imgs/图片浏览器.png', {
		scale: 0.6,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建图片浏览器2图片
	const 图片浏览器2Img = createImage(view, '/imgs/图片浏览器2.png', {
		scale: 0.6,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});


	// 创建小说阅读器图片
	const 小说阅读器Img = createImage(view, '/imgs/小说播放器.png', {
		scale: 1,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建小说阅读器2图片
	const 小说阅读器2Img = createImage(view, '/imgs/小说播放器2.png', {
		scale: 1,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});
	// 创建截图键位修改图片
	const 截图键位修改Img = createImage(view, '/imgs/截图键位修改.png', {
		scale: 0.7,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建排序方式图片
	const 排序方式Img = createImage(view, '/imgs/排序方式.png', {
		scale: 2.5,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	const 完IMGRef = createRef<MyImg>();
	const 完IMG = (
		<MyImg
			ref={完IMGRef}
			src="/imgs/完.png"
			scale={1.5}
			initialPosition={() => VideoPostion.bottomCenter(view)}
			initialOpacity={0}
		/>
	);
	view.add(完IMG);


	const 粽子精IMGRef = createRef<MyImg>();
	const 粽子精IMG = (
		<MyImg
			ref={粽子精IMGRef}
			src="/imgs/粽子精.png"
			scale={1.5}
			initialPosition={() => VideoPostion.bottomCenter(view)}
			initialOpacity={0}
		/>
	);
	view.add(粽子精IMG);

	// 创建魔男的夜宴图片引用
	const 魔男的夜宴IMGRef = createRef<MyImg>();
	const 魔男的夜宴IMG = (
		<MyImg
			ref={魔男的夜宴IMGRef}
			src="/imgs/魔男的夜宴.png"
			scale={0.5}
			initialPosition={() => VideoPostion.center(view)}
			initialOpacity={0}
		/>
	);

	// 创建魔女的侵袭图片引用
	const 魔女的侵袭IMGRef = createRef<MyImg>();
	const 魔女的侵袭IMG = (
		<MyImg
			ref={魔女的侵袭IMGRef}
			src="/imgs/魔女的侵袭.png"
			scale={1.5}
			initialPosition={() => VideoPostion.center(view)}
			initialOpacity={0}
		/>
	);

	// 创建游戏统计问题文本
	const 游戏统计问题文本Refs = createTexts(view, ['是否浏览过？', '我玩过几次？', '总时长多少？'], {
		centerPosition: () => VideoPostion.center(view),
		fontSize: 48,
		color: '#000000',
		spacing: 60,
		direction: 'column',
	});

	// 创建功能列表文本
	const 功能列表文本Refs = createTexts(view, ['数据刮削', '自动解压', '云存档', '自动转区', '游戏报错分析', '自动翻译'], {
		centerPosition: () => VideoPostion.center(view),
		fontSize: 48, 
		color: '#000000',
		spacing: 60,
		direction: 'column',
	});

	// 创建圆形排列的松子图片（20个松子，循环使用5张图片）
	const 松子圆形 = createCircleImages(view, '/imgs/松子/${index}.png', {
		count: 10,
		scale: 0.3,
		radius: Math.min(view.width(), view.height()) * 0.25,
		center: [0, 0], // 屏幕中心
	});

	// 创建右侧文本列表（在外部创建，引用传递给动画函数）
	const rightTextsRefs = createTexts(view, ['🎮游戏', '🖼️漫画', '🎬电影', '📚小说', '🎵音声', "🌐网站"], {
		centerPosition: () => VideoPostion.innerRightCenter(view),
		fontSize: 76,
		color: '#000000',
		spacing: 70,
		direction: 'column',
	});

	// 创建要点文本引用（用于后续清除）
	const 要点文本Refs = createTexts(view, ['1.高频资源要能一键直达', '2.低频资源要能按内容、类型快速检索'], {
		centerPosition: () => VideoPostion.center(view),
		fontSize: 48,
		color: '#000000',
		spacing: 80,
		direction: 'column',
	});



	const 伪装模式Img = createImage(view, '/imgs/伪装模式.png', {
		scale: 1,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});
	view.add(伪装模式Img);

	const 伪装模式展示Img = createImage(view, '/imgs/伪装模式展示.png', {
		scale: 0.7,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});
	view.add(伪装模式展示Img);

	const 伪装模式自由修改Img = createImage(view, '/imgs/伪装模式自由修改.png', {
		scale: 1.4,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});
	view.add(伪装模式自由修改Img);

	const 伪装模式_戒色吧Img = createImage(view, '/imgs/伪装模式_戒色吧.png', {
		scale: 0.7,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});
	view.add(伪装模式_戒色吧Img);

	// 创建多存档图片
	const 多存档Img = createImage(view, '/imgs/多存档.png', {
		scale: 0.8,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 创建文件夹树形结构引用
	const folderTreeRefs = createTreeNodeRefs();

	// 创建 TreeNode 组件引用
	const folderTreeRef = createRef<TreeNodeComponent>();

	// 创建文件夹管理树（用于管理5个文件夹）
	const 文件夹管理树Refs = createTreeNodeRefs();
	const 文件夹管理树Ref = createRef<TreeNodeComponent>();

	// 创建开发商树形结构引用（用于袖子社示例）
	const developerTreeRefs = createTreeNodeRefs();
	const developerTreeRef = createRef<TreeNodeComponent>();

	// 创建持久关键词组件
	const persistentKeywordsRef = createRef<PersistentKeywords>();
	view.add(
		<PersistentKeywords
			ref={persistentKeywordsRef}
			position={() => VideoPostion.center(view)}
			direction="column"

		/>
	);

	// 创建归类法标题文本引用
	const 归类法标题文本Ref = createRef<TitleText>();
	const 归类法标题文本 = (
		<TitleText
			ref={归类法标题文本Ref}
			text="基于频度的分布式归类法"
			view={view}
			fontSize={56}
			color="#000000"
		/>
	);
	view.add(归类法标题文本);

	// 创建"资源管理的两朵乌云"标题文本引用
	const 乌云标题文本Ref = createRef<TitleText>();
	const 乌云标题文本 = (
		<TitleText
			ref={乌云标题文本Ref}
			text="资源管理的两朵乌云"
			view={view}
			fontSize={56}
			color="#000000"
		/>
	);
	view.add(乌云标题文本);


	// 创建安全键和成就图片的引用（用于后续清除）
	let 安全键Img: ReturnType<typeof createRef<any>> | null = null;
	let 成就Img: ReturnType<typeof createRef<any>> | null = null;
	let 统计页面Img: ReturnType<typeof createRef<any>> | null = null;
	let 帮助页Img: ReturnType<typeof createRef<any>> | null = null;
	let 绿色资源管理器Img: ReturnType<typeof createRef<any>> | null = null;
	let qq群Img: ReturnType<typeof createRef<any>> | null = null;
	let 声明文本: ReturnType<typeof createTexts> | null = null;

	// 创建快捷方式失效图片的引用
	const 快捷方式失效Img = createImage(view, '/imgs/快捷方式失效.png', {
		scale: 2,
		initialPosition: () => VideoPostion.bottomCenter(view),
	});

	// 文件夹列表（用于创建树）
	const 文件夹列表 = ['待整理', '低频文件夹', '中频文件夹', '高频文件夹', '典藏区'];

	// 创建"新游戏"Paper的引用
	const 新游戏PaperRef = createRef<Rect>();

	// 创建"快捷方式"Paper的引用
	const 快捷方式PaperRefs: ReturnType<typeof createRef<Rect>>[] = [];
	for (let i = 0; i < 2; i++) {
		快捷方式PaperRefs.push(createRef<Rect>());
	}

	// 创建高频文件夹快捷方式的引用
	const 高频快捷方式PaperRef = createRef<Rect>();

	// 创建典藏区副本Paper的引用
	const 典藏区副本PaperRef = createRef<Rect>();

	// 创建运行时长演示视频（初始隐藏，在需要时淡入播放）
	const 运行时长视频 = (
		<Video
			key="RuntimeDurationVideo"
			ref={运行时长视频Ref}
			src={'/videos/时长记录.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(运行时长视频);

	// 创建Unity示例视频（初始隐藏，在需要时淡入播放）
	const unity视频 = (
		<Video
			key="UnityExampleVideo"
			ref={unity视频Ref}
			src={'/videos/unity示例.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(unity视频);

	// 创建注册游戏演示视频（初始隐藏，在需要时淡入播放）
	const 注册游戏视频 = (
		<Video
			key="RegisterGameVideo"
			ref={注册游戏视频Ref}
			src={'/videos/用按钮添加游戏.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(注册游戏视频);

	// 创建拖拽添加游戏演示视频（初始隐藏，在需要时淡入播放）
	const 拖拽添加游戏视频 = (
		<Video
			key="DragAddGameVideo"
			ref={拖拽添加游戏视频Ref}
			src={'/videos/拖拽添加游戏.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(拖拽添加游戏视频);

	// 创建tag添加演示视频（初始隐藏，在需要时淡入播放）
	const tag添加视频 = (
		<Video
			key="TagAddVideo"
			ref={tag添加视频Ref}
			src={'/videos/tag添加.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(tag添加视频);

	// 创建截图演示视频（初始隐藏，在需要时淡入播放）
	const 截图视频 = (
		<Video
			key="ScreenshotVideo"
			ref={截图视频Ref}
			src={'/videos/截图.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(截图视频);

	// 创建安全键演示视频（初始隐藏，在需要时淡入播放）
	const 安全键视频 = (
		<Video
			key="SafeKeyVideo"
			ref={安全键视频Ref}
			src={'/videos/安全键.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(安全键视频);

	// 创建音频播放器演示视频（初始隐藏，在需要时淡入播放）
	const 音频播放器视频 = (
		<Video
			key="AudioPlayerVideo"
			ref={音频播放器视频Ref}
			src={'/videos/音频播放器演示.mp4'}
			position={() => VideoPostion.center(view)}
			scale={0.7}
			opacity={0}
			zIndex={60}
		/>
	);
	view.add(音频播放器视频);

	// 类型文件夹和标签文件夹现在通过TreeNodeComponent的getNodeRef获取，不再需要单独的ref

	// 类型子文件夹和标签子文件夹现在通过TreeNodeComponent的getNodeRef获取，不再需要单独的ref


	const subtitles: VideoScript[] = [
		{
			//////////////////1.引子///////////////////////////
			text: '我是一只仓鼠',
			callback: function* () {
				yield* moveAndShow(imgRef, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '多年来，我一直保持着仓鼠的优良传统' },
		{
			text: '————收集种子',
			callback: function* () {
				// 使用封装好的函数显示圆形排列的松子
				yield* showCircleImages(松子圆形.imageRefs, 松子圆形.positions, view, {
					duration: 0.1,
					finalScale: 0.1,
				});
			}
		},
		{
			text: '只不过，我喜欢的"种子"，并不是从树上长出来的',
			callback: function* () {

			}
		},
		{
			text: '游戏、漫画、电影、小说、音声……',
			callback: function* () {
				// 让所有松子掉落并消失

				yield* all(
					fallAndDisappearCircleImages(松子圆形.imageRefs, view, {
						duration: 2.0,
						fallDistance: view.height() * 1.5,
					}),
					imgRef().position(VideoPostion.innerLeftCenter(view), 1),
					fadeInNodes(rightTextsRefs.textRefs)
				);
			}
		},
		{
			text: '无论任何类型的资源都会被我收入囊中',
			callback: function* () {
				yield* blackHoleEffect(rightTextsRefs.textRefs, imgRef, 4, 3);
			}
		},
		{
			text: '从4TB移动硬盘开始……',
			callback: function* () {
				yield* all(
					imgRef().position(VideoPostion.leftCenter(view), 1),
					imgRef().opacity(0, 1)
				);
				// 显示第一个图片
				yield* 硬盘GalleryRef().showNext();
			}
		},
		{
			text: '到16TB企业级硬盘+硬盘盒……',
			callback: function* () {
				// 显示第二个图片（第一个会自动缩小并移动到左上角）
				yield* 硬盘GalleryRef().showNext();
			}
		},
		{
			text: "再到36TB的raid硬盘柜……",
			callback: function* () {
				// 显示第三个图片（第二个会自动缩小并移动到左上角）
				yield* 硬盘GalleryRef().showNext();
			}
		},
		{
			text: '最后是72TB的nas',
			callback: function* () {
				// 显示第四个图片（第三个会自动缩小并移动到左上角）
				yield* 硬盘GalleryRef().showNext();
			}
		},
		{
			text: "我已经历许多",
			callback: function* () {
				// 将最后一个图片也缩小并移动到左上角
				yield* 硬盘GalleryRef().finalize();
			}
		},
		{ text: '而令人遗憾的是' },
		{
			text: '资源收集的大厦虽已经落成',
			callback: function* () {
				// 将所有硬盘向上移动并淡出
				yield* all(
					硬盘GalleryRef().hideAll(400, 1),
					moveAndShow(大厦, view, VideoPostion.center(view), 1)
				);
			}
		},
		{
			text: '但是上面仍有两朵乌云',
			callback: function* () {
				const 大厦Pos = 大厦().absolutePosition();
				yield* 乌云().absolutePosition(大厦Pos, 0);
				yield* all(
					大厦().opacity(0, 1), // 大厦淡出
					乌云().opacity(1, 1) // 乌云淡入
				);
			}
		},
		{
			text: '第一，数据索引问题',
			callback: function* () {
				// 先设置标题位置到顶部（不带动画）
				const topPos = VideoPostion.topCenter(view);
				乌云标题文本Ref().position(topPos);

				yield* all(
					乌云().opacity(0, 1),
					persistentKeywordsRef().addTitle('1. 数据索引问题'),
					乌云标题文本Ref().opacity(1, 0.6)  // 只淡入，不移动
				);
			}
		},

		{
			text: "当资源量极其庞大的时候，如何快速索引所需的资源？",
			callback: function* () {
				yield* persistentKeywordsRef().addContent('1. 数据索引问题', '当资源量极其庞大的时候，如何快速索引所需的资源？\n或者说如何建立合理的分类系统？');
			}
		},
		{
			text: '或者说如何建立合理的分类系统？',
		},
		{
			text: '第二，数据统计问题',
			callback: function* () {
				yield* persistentKeywordsRef().addTitle('2. 数据统计问题');
			}
		},

		{
			text: '当资源量过大时，如何判断自己是否浏览过该资源？',
			callback: function* () {
				yield* persistentKeywordsRef().addContent('2. 数据统计问题', '当资源量过大时，如何判断自己是否浏览过该资源？以及如何判断自己的浏览时长、浏览次数？');
			}
		},
		{
			text: '以及如何判断自己的浏览时长、浏览次数？',
		},


		//////////////////2.用单一文件夹管理资源的缺陷///////////////////////////
		{
			text: '起初，我单纯使用Windows文件夹进行管理',
			callback: function* () {
				// 清除所有持久关键词
				yield* persistentKeywordsRef().clear();

				// 创建根节点"文件夹"（只创建根节点，不创建子节点）
				const rootOnlyData = {
					key: 'root',
					label: '文件夹',
				};

				// 使用 TreeNodeComponent 组件
				view.add(
					<TreeNodeComponent
						ref={folderTreeRef}
						refs={folderTreeRefs}
						roots={[rootOnlyData]}
						theme={{
							fontSize: 32,
						}}
						treeLayout={{
							rootPosition: () => [0, VideoPostion.innerTopCenter(view)[1]],
						}}
						zIndex={100}
					/>
				);

				// 显示根节点（使用组件方法）
				yield* folderTreeRef().showNode('root', { duration: 0.6 });
			}
		},
		{
			text: '以游戏为例，我按游戏类型分为GalGame、JRPG、SLG、SIM、ACT等文件夹',
			callback: function* () {
				// 使用组件方法动态添加子节点到根节点（自动显示）
				yield* folderTreeRef().addNodesTo(
					'root',
					['GalGame', 'JRPG', 'SLG', 'SIM', 'ACT'],
					{
						childSpacing: 180,  // 子节点之间的水平间距
						childVerticalOffset: 200,  // 子节点相对于父节点的垂直偏移
					}
				);
			}
		},
		{
			text: '并且对已通关的游戏前加上"完"，表明这个游戏已经玩完了',
			callback: function* () {
				// 显示图片（设置 zIndex 使其显示在树的上方，树的 zIndex 是 100）
				yield* 完IMGRef().show({
					position: VideoPostion.center(view),
					duration: 1,
					zIndex: 150,
				});
			}
		},
		{ text: '看似好用，但是很快，我就发现这种方法有两个致命缺陷' },
		{ text: '1. 这种RPG、SLG什么的只能对机制分类，没法对题材分类' },
		{
			text: "2. 访问频率高的资源找起来太慢",
		},
		{
			text: '例如JRPG和ACT的女主都可能是巫女、魔法少女和女骑士',
			callback: function* () {
				// 隐藏"完"图片（淡出）
				yield* 完IMGRef().hide({ duration: 0.5 });

				// 使用组件方法批量给 JRPG 节点添加子节点（自动显示）
				yield* folderTreeRef().addNodesTo('JRPG', [
					'巫女',
					'魔法少女',
					'女骑士',
				]);

				// 使用组件方法批量给 ACT 节点添加子节点（自动显示）
				yield* folderTreeRef().addNodesTo('ACT', [
					'巫女',
					'魔法少女',
					'女骑士',
				]);
			}
		},
		{
			text: '那么就会导致相似的题材被分散到不同的文件夹中',
			callback: function* () {
				// 同时改变所有匹配节点名称的颜色
				yield* all(
					folderTreeRef().changeNodeColor('巫女', '#FF6B6B', '#FF4444'),
					folderTreeRef().changeNodeColor('魔法少女', '#FFD93D', '#FFC107'),
					folderTreeRef().changeNodeColor('女骑士', '#6BCBFF', '#4DB8FF')
				);
			}
		},
		{
			text: "从而给资源查找带来极大的不便",
		},
		{
			text: '假如我要找一个以绿色头发的高龄的',
			callback: function* () {
				// 删除 JRPG 和 ACT 的所有子节点（带动画）
				yield* all(
					folderTreeRef().hideAndRemoveNodeChildren('JRPG'),
					folderTreeRef().hideAndRemoveNodeChildren('ACT')
				);
			}
		},
		{
			text: "喜欢玩氪金游戏的粽子精为女主角的游戏",
			callback: function* () {
				yield* 粽子精IMGRef().show({
					position: VideoPostion.center(view),
					duration: 1,
					zIndex: 150
				});
			}
		},
		{
			text: "因为游戏内容有战斗的情节，所以可能导致误记为ACT游戏",
			callback: function* () {

				yield* 粽子精IMGRef().hide()
				// 给 ACT 节点添加《粽子精模拟器》游戏节点并显示（使用组件方法）
				yield* folderTreeRef().addNodeTo('ACT', '粽子精模拟器');
			}
		},
		{
			text: "然而实际上这个游戏是Galgame",
			callback: function* () {
				// 将《粽子精模拟器》从ACT移动到NV（带动画，使用组件方法）
				yield* folderTreeRef().moveNode('粽子精模拟器', 'ACT', 'GalGame');
			}
		},
		{
			text: "折磨的事情还不止于此",
		},

		{
			text: 'GalGame属于非常庞大的分类',
			callback: function* () {
				// 删除《粽子精模拟器》节点（使用组件方法）
				yield* folderTreeRef().removeNode('粽子精模拟器');

				// 给GalGame添加多个游戏节点（使用组件方法）
				yield* folderTreeRef().addNodesTo('GalGame', [
					'游戏1',
					'粽子精',
					'…………',
					'游戏999',
				]);
			}
		},
		{ text: "里面可能有数百个游戏" },
		{ text: "通过游戏名的方式找游戏极其繁琐" },
		{
			text: "更糟的是，如果《粽子精模拟器》是我经常游玩的游戏",
		},
		{
			text: "那么每次想玩的时候，都得从这上百个游戏中去查找",
		},
		{ text: '这种方式不仅会导致查找效率低下' },
		{ text: "还会导致管理者不得不记忆每个游戏的路径和文件名" },
		{
			text: "常常导致本来想找《魔男的夜宴》，最后却只能找到《魔女的侵袭》",
			callback: function* () {
				// 将魔男的夜宴图片添加到view
				view.add(魔男的夜宴IMG);
				
				// 显示魔男的夜宴图片
				yield* 魔男的夜宴IMGRef().show({
					position: VideoPostion.center(view),
					duration: 0.5,
					zIndex: 150
				});
				
				// 等待2秒
				yield* waitFor(2);
				
				// 隐藏并删除魔男的夜宴图片
				yield* 魔男的夜宴IMGRef().hide({
					duration: 0.5
				});
				
				// 将魔女的侵袭图片添加到view
				view.add(魔女的侵袭IMG);
				
				// 显示魔女的侵袭图片
				yield* 魔女的侵袭IMGRef().show({
					position: VideoPostion.center(view),
					duration: 0.5,
					zIndex: 150
				});
			}
		},
		{
			text: '于是某一天，我突然冷静了下来，开始仔细思考这个问题的本质',
			callback: function* () {
				// 删除魔女的侵袭图片
		
				yield* 魔女的侵袭IMGRef().hide({ duration: 0.5 });
				
				
				// 清除整个树（隐藏并删除所有节点，使用组件方法）
				yield* folderTreeRef().removeTree();
			}
		},
		{
			text: '1.高频资源要能一键直达',
			callback: function* () {
				// 显示要点文本（两个要点同时显示）
				yield* fadeInNodes(要点文本Refs.textRefs);
			}
		},
		{ text: '2.低频资源要能按内容、类型快速检索' },
		{
			text: '于是，我发明了一种基于频度的分布式归类法',
			callback: function* () {
				// 删除"资源管理的两朵乌云"标题
				if (乌云标题文本Ref && 乌云标题文本Ref()) {
					yield* 乌云标题文本Ref().opacity(0, 0.5);
					yield* waitFor(0.1);
					乌云标题文本Ref().remove();
				}

				// 清除之前的要点文本
				yield* all(
					...要点文本Refs.textRefs.map(textRef =>
						textRef().opacity(0, 0.5, easeOutCubic)
					)
				);

				// 等待淡出动画完成
				yield* waitFor(0.1);

				// 在中心显示标题
				yield* 归类法标题文本Ref().showOnCenter();
			}
		},
		//////////////////3.基于频度的分布式归类法///////////////////////////
		{
			text: '整体算法类似操作系统的LFU和C#的GC',
			callback: function* () {
				// 将标题移动到顶部
				yield* 归类法标题文本Ref().moveToTopPosition();
			}
		},
		{
			text: '我将文件夹分5个大类，待整理、低频文件夹、中频文件夹、高频文件夹、典藏区',
			callback: function* () {
				const folderSpacing = 270;
				const totalWidth = (文件夹列表.length - 1) * folderSpacing;
				const startX = -totalWidth / 2;
				// 创建文件夹树，使用自定义渲染函数返回 FolderComponent
				const folderRoots = 文件夹列表.map((文件夹名, index) => ({
					key: `folder_${index}`,
					label: 文件夹名,
					render: (node: any, theme: any, position: [number, number] | (() => [number, number]), ref: any) => {
						const x = startX + index * folderSpacing;
						return (
							<FolderComponent
								ref={ref}
								folderColor="#FFD700"
								tabColor="#DAA520"
								width={170}
								height={150}
								tabWidth={80}
								tabHeight={30}

								position={[x, VideoPostion.innerTopCenter(view)[1]]}
								opacity={0}
							>
								<Txt
									text={文件夹名}
									fontSize={24}
									fill="#000000"
									fontFamily="Microsoft YaHei, sans-serif"
									textAlign="center"
									fontWeight={600}
								/>
							</FolderComponent>
						);
					}
				}));

				view.add(
					<TreeNodeComponent
						ref={文件夹管理树Ref}
						refs={文件夹管理树Refs}
						roots={folderRoots}
						treeLayout={{
							rootPosition: () => [0, 0], // 位置由 render 函数控制
							columnSpacing: folderSpacing,
						}}
						zIndex={100}
					/>
				);

				// 等待创建完成
				yield* waitFor(0);

				// 依次淡入所有文件夹
				for (let i = 0; i < 文件夹列表.length; i++) {
					const nodeKey = `folder_${i}`;
					const folderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>(nodeKey);
					if (folderRef && folderRef()) {
						yield* waitFor(i * 0.1);
						yield* (folderRef() as FolderComponent).opacity(1, 0.5, easeOutCubic);
					}
				}
			}
		},
		{
			text: '新创建的游戏，默认进入待整理文件夹',
			callback: function* () {
				// 创建"新游戏"Paper，放在待整理文件夹内部
				const 待整理FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_0');
				if (!待整理FolderRef || !待整理FolderRef()) return;
				// 使用 contentPosition 获取文件夹内容区中心位置
				const contentPos = (待整理FolderRef() as FolderComponent).contentPosition();

				view.add(
					<Paper
						ref={新游戏PaperRef}
						fill="#bbbbbb"
						width={100}
						height={100}
						position={contentPos}
						opacity={0}
						layout
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={8}
						zIndex={209}
					>
						<Txt
							text="新游戏"
							fontSize={16}
							fill="#000000"
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={600}
						/>
					</Paper>
				);

				// 等待 Paper 创建完成
				yield* waitFor(0);

				// 淡入"新游戏"Paper
				yield* 新游戏PaperRef().opacity(1, 0.6, easeOutCubic);
			}
		},
		{
			text: '经过1次访问的，移动到低频文件夹',
			callback: function* () {
				// 移动到低频文件夹内部（索引1）
				const 低频FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_1');
				if (!低频FolderRef || !低频FolderRef()) return;
				// 使用 contentPosition 获取文件夹内容区中心位置
				const contentPos = (低频FolderRef() as FolderComponent).contentPosition();
				yield* 新游戏PaperRef().position(contentPos, 0.8, easeOutCubic);
			}
		},
		{
			text: '2~3次访问的，移动到中频文件夹。',
			callback: function* () {
				// 移动到中频文件夹内部（索引2）
				const 中频FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_2');
				if (!中频FolderRef || !中频FolderRef()) return;
				// 使用 contentPosition 获取文件夹内容区中心位置
				const contentPos = (中频FolderRef() as FolderComponent).contentPosition();
				yield* 新游戏PaperRef().position(contentPos, 0.8, easeOutCubic);
			}
		},
		{
			text: '中频文件夹内，包含类型文件夹和标签文件夹',
			callback: function* () {
				// 使用组件方法动态添加子节点到中频文件夹（folder_2）
				const childrenNodes: Array<{ key?: string, label: string, render?: NodeRenderer }> = [
					{
						key: 'folder_2_类型文件夹',
						label: '类型文件夹',
						render: (node: any, theme: any, position: [number, number] | (() => [number, number]), ref: any) => {
							return (
								<FolderComponent
									ref={ref}
									folderColor="#4CAF50"
									tabColor="#2E7D32"
									width={180}
									height={150}
									tabWidth={80}
									tabHeight={25}
									position={typeof position === 'function' ? position() : position}
									opacity={0}
								>
									<Txt
										text="类型文件夹"
										fontSize={20}
										fill="#000000"
										fontFamily="Microsoft YaHei, sans-serif"
										textAlign="center"
										fontWeight={600}
									/>
								</FolderComponent>
							);
						}
					},
					{
						key: 'folder_2_标签文件夹',
						label: '标签文件夹',
						render: (node: any, theme: any, position: [number, number] | (() => [number, number]), ref: any) => {
							return (
								<FolderComponent
									ref={ref}
									folderColor="#2196F3"
									tabColor="#1565C0"
									width={180}
									height={150}
									tabWidth={80}
									tabHeight={25}
									position={typeof position === 'function' ? position() : position}
									opacity={0}
								>
									<Txt
										text="标签文件夹"
										fontSize={20}
										fill="#000000"
										fontFamily="Microsoft YaHei, sans-serif"
										textAlign="center"
										fontWeight={600}
									/>
								</FolderComponent>
							);
						}
					}
				];
				yield* 文件夹管理树Ref().addNodesTo(
					'folder_2',
					childrenNodes,
					{
						childSpacing: 600,  // 子节点之间的水平间距
						childVerticalOffset: 300,  // 子节点相对于父节点的垂直偏移
					}
				);
			}
		},
		{
			text: '类型就是上文所提到的游戏类型，例如JRPG、SLG、ACT等',
			callback: function* () {
				// 使用组件方法动态添加子节点到类型文件夹
				const 类型子文件夹列表 = ['JRPG', 'SLG', 'ACT'];
				const childrenNodes: Array<{ key?: string, label: string, render?: NodeRenderer }> = 类型子文件夹列表.map((文件夹名) => ({
					key: `folder_2_类型文件夹_${文件夹名}`,
					label: 文件夹名,
					render: (node: any, theme: any, position: [number, number] | (() => [number, number]), ref: any) => {
						return (
							<FolderComponent
								ref={ref}
								folderColor="#81C784"
								tabColor="#66BB6A"
								width={120}
								height={120}
								tabWidth={60}
								tabHeight={20}
								position={typeof position === 'function' ? position() : position}
								opacity={0}
							>
								<Txt
									text={文件夹名}
									fontSize={18}
									fill="#000000"
									fontFamily="Microsoft YaHei, sans-serif"
									textAlign="center"
									fontWeight={600}
								/>
							</FolderComponent>
						);
					}
				}));

				yield* 文件夹管理树Ref().addNodesTo(
					'folder_2_类型文件夹',
					childrenNodes,
					{
						childSpacing: 150,  // 子节点之间的水平间距
						childVerticalOffset: 250,  // 子节点相对于父节点的垂直偏移
						childHorizontalOffset: 0,  // 水平偏移，使子节点左对齐
					}
				);
			}
		},
		{
			text: '标签文件夹则是根据游戏题材、主角、风格等分类的文件夹',
			callback: function* () {
				// 使用组件方法动态添加子节点到标签文件夹
				const 标签子文件夹列表 = ['巫女', '天使', '3D', '像素'];
				const childrenNodes: Array<{ key?: string, label: string, render?: NodeRenderer }> = 标签子文件夹列表.map((文件夹名) => ({
					key: `folder_2_标签文件夹_${文件夹名}`,
					label: 文件夹名,
					render: (node: any, theme: any, position: [number, number] | (() => [number, number]), ref: any) => {
						return (
							<FolderComponent
								ref={ref}
								folderColor="#64B5F6"
								tabColor="#42A5F5"
								width={100}
								height={120}
								tabWidth={50}
								tabHeight={20}
								position={typeof position === 'function' ? position() : position}
								opacity={0}
							>
								<Txt
									text={文件夹名}
									fontSize={16}
									fill="#000000"
									fontFamily="Microsoft YaHei, sans-serif"
									textAlign="center"
									fontWeight={600}
								/>
							</FolderComponent>
						);
					}
				}));

				yield* 文件夹管理树Ref().addNodesTo(
					'folder_2_标签文件夹',
					childrenNodes,
					{
						childSpacing: 120,  // 子节点之间的水平间距
						childVerticalOffset: 250,  // 子节点相对于父节点的垂直偏移
					}
				);
			}
		},
		{ text: '例如巫女、天使、3D、像素等' },
		{
			text: "之后就可以将资源移动到对应的类型文件夹中",
			callback: function* () {
				// 移动到JRPG文件夹内部
				const JRPGFolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_2_类型文件夹_JRPG');
				if (!JRPGFolderRef || !JRPGFolderRef()) return;
				// 使用 contentPosition 获取文件夹内容区中心位置
				const contentPos = (JRPGFolderRef() as FolderComponent).contentPosition();
				yield* 新游戏PaperRef().position(contentPos, 0.8, easeOutCubic);
			}
		},
		{
			text: "同时将资源的快捷方式保存到标签文件夹中",
			callback: function* () {
				// 获取"新游戏"Paper的当前位置作为初始位置
				const 新游戏Position = 新游戏PaperRef().position();

				// 获取目标文件夹位置
				const 巫女FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_2_标签文件夹_巫女');
				const 天使FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_2_标签文件夹_天使');
				if (!巫女FolderRef || !巫女FolderRef() || !天使FolderRef || !天使FolderRef()) return;

				const 巫女Position = (巫女FolderRef() as FolderComponent).contentPosition();
				const 天使Position = (天使FolderRef() as FolderComponent).contentPosition();

				// 创建巫女的快捷方式Paper（初始位置在"新游戏"Paper上）
				view.add(
					<Paper
						ref={快捷方式PaperRefs[0]}
						fill="#bbbbbb"
						width={100}
						height={80}
						position={[新游戏Position.x, 新游戏Position.y]}
						opacity={0}
						layout
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={8}
						zIndex={200}
					>
						<Txt
							text="快捷方式"
							fontSize={16}
							fill="#000000"
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={600}
						/>
					</Paper>
				);

				// 创建天使的快捷方式Paper（初始位置在"新游戏"Paper上）
				view.add(
					<Paper
						ref={快捷方式PaperRefs[1]}
						fill="#bbbbbb"
						width={100}
						height={80}
						position={[新游戏Position.x, 新游戏Position.y]}
						opacity={0}
						layout
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={8}
						zIndex={200}
					>
						<Txt
							text="快捷方式"
							fontSize={16}
							fill="#000000"
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={600}
						/>
					</Paper>
				);

				// 等待Paper创建完成
				yield* waitFor(0);

				// 同时淡入两个快捷方式Paper，然后移动到目标文件夹
				yield* all(
					快捷方式PaperRefs[0]().opacity(1, 0.6, easeOutCubic),
					快捷方式PaperRefs[1]().opacity(1, 0.6, easeOutCubic)
				);

				// 移动到目标文件夹
				yield* all(
					快捷方式PaperRefs[0]().position(巫女Position, 0.8, easeOutCubic),
					快捷方式PaperRefs[1]().position(天使Position, 0.8, easeOutCubic)
				);
			}
		},
		{
			text: '3次以上访问的，可以把快捷方式移动到高频文件夹',
			callback: function* () {
				// 获取"新游戏"Paper的当前位置作为初始位置
				const 新游戏Position = 新游戏PaperRef().position();

				// 获取高频文件夹位置
				const 高频FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_3');
				if (!高频FolderRef || !高频FolderRef()) return;
				const 高频Position = (高频FolderRef() as FolderComponent).contentPosition();

				// 创建高频文件夹的快捷方式Paper（初始位置在"新游戏"Paper上）
				view.add(
					<Paper
						ref={高频快捷方式PaperRef}
						fill="#bbbbbb"
						width={100}
						height={80}
						position={[新游戏Position.x, 新游戏Position.y]}
						opacity={0}
						layout
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={8}
						zIndex={200}
					>
						<Txt
							text="快捷方式"
							fontSize={16}
							fill="#000000"
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={600}
						/>
					</Paper>
				);

				// 等待Paper创建完成
				yield* waitFor(0);

				// 淡入快捷方式Paper，然后移动到高频文件夹
				yield* 高频快捷方式PaperRef().opacity(1, 0.6, easeOutCubic);
				yield* 高频快捷方式PaperRef().position(高频Position, 0.8, easeOutCubic);
			}
		},
		{
			text: '如果资源质量极其优秀，可以直接再复制一份到典藏区，永不降级',
			callback: function* () {
				// 获取"新游戏"Paper的当前位置作为初始位置
				const 新游戏Position = 新游戏PaperRef().position();

				// 获取典藏区文件夹位置
				const 典藏区FolderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_4');
				if (!典藏区FolderRef || !典藏区FolderRef()) return;
				const 典藏区Position = (典藏区FolderRef() as FolderComponent).contentPosition();

				// 创建典藏区的副本Paper（初始位置在"新游戏"Paper上）
				view.add(
					<Paper
						ref={典藏区副本PaperRef}
						fill="#bbbbbb"
						width={100}
						height={100}
						position={[新游戏Position.x, 新游戏Position.y]}
						opacity={0}
						layout
						direction="column"
						alignItems="center"
						justifyContent="center"
						padding={8}
						zIndex={209}
					>
						<Txt
							text="新游戏"
							fontSize={16}
							fill="#000000"
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={600}
						/>
					</Paper>
				);

				// 等待Paper创建完成
				yield* waitFor(0);

				// 淡入副本Paper，然后移动到典藏区
				yield* 典藏区副本PaperRef().opacity(1, 0.6, easeOutCubic);
				yield* 典藏区副本PaperRef().position(典藏区Position, 0.8, easeOutCubic);
			}
		},


		{ text: '通过这种方式，不仅可以完成常见的资源分类' },

		{ text: '还可以为典藏区提供额外的备份' },
		{ text: '并标记没玩过的游戏和可能不好玩的低频资源，方便后续删除' },

		{ text: '但是，这种方法仍然不够完美' },
		{
			text: '这两个模式其实蕴含了2个前提',
			callback: function* () {
				// 删除所有文件夹、连线、Paper等树结构
				// 1. 淡出并删除5个主要文件夹
				const 文件夹淡出动画: ThreadGenerator[] = [];
				for (let i = 0; i < 文件夹列表.length; i++) {
					const folderRef = 文件夹管理树Ref().getNodeRef<FolderComponent>(`folder_${i}`);
					if (folderRef && folderRef()) {
						文件夹淡出动画.push((folderRef() as FolderComponent).opacity(0, 0.5, easeOutCubic));
					}
				}

				// 2. 淡出并删除类型文件夹和标签文件夹
				const 类型标签淡出动画: ThreadGenerator[] = [];
				const 类型文件夹Ref = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_2_类型文件夹');
				const 标签文件夹Ref = 文件夹管理树Ref().getNodeRef<FolderComponent>('folder_2_标签文件夹');
				if (类型文件夹Ref && 类型文件夹Ref()) {
					类型标签淡出动画.push((类型文件夹Ref() as FolderComponent).opacity(0, 0.5, easeOutCubic));
				}
				if (标签文件夹Ref && 标签文件夹Ref()) {
					类型标签淡出动画.push((标签文件夹Ref() as FolderComponent).opacity(0, 0.5, easeOutCubic));
				}

				// 3. 类型子文件夹和标签子文件夹由TreeNodeComponent管理，会在removeTree时自动删除

				// 4. 连线由TreeNodeComponent自动管理，会在removeTree时自动删除
				const 连线淡出动画: ThreadGenerator[] = [];

				// 6. 淡出并删除新游戏Paper和快捷方式Paper
				const paper淡出动画: ThreadGenerator[] = [];
				if (新游戏PaperRef()) {
					paper淡出动画.push(新游戏PaperRef().opacity(0, 0.5, easeOutCubic));
				}
				for (let i = 0; i < 快捷方式PaperRefs.length; i++) {
					if (快捷方式PaperRefs[i]()) {
						paper淡出动画.push(快捷方式PaperRefs[i]().opacity(0, 0.5, easeOutCubic));
					}
				}
				if (高频快捷方式PaperRef()) {
					paper淡出动画.push(高频快捷方式PaperRef().opacity(0, 0.5, easeOutCubic));
				}
				if (典藏区副本PaperRef()) {
					paper淡出动画.push(典藏区副本PaperRef().opacity(0, 0.5, easeOutCubic));
				}

				// 同时执行所有淡出动画
				yield* all(
					...文件夹淡出动画,
					...类型标签淡出动画,
					...连线淡出动画,
					...paper淡出动画
				);

				// 等待动画完成后删除所有元素
				yield* waitFor(0.1);

				// 删除文件夹管理树
				if (文件夹管理树Ref()) {
					yield* 文件夹管理树Ref().removeTree();
				}

				// 类型文件夹、标签文件夹、类型子文件夹、标签子文件夹和所有连线都由TreeNodeComponent管理，会在removeTree时自动删除

				// 删除Paper
				if (新游戏PaperRef()) {
					新游戏PaperRef().remove();
				}
				for (let i = 0; i < 快捷方式PaperRefs.length; i++) {
					if (快捷方式PaperRefs[i]()) {
						快捷方式PaperRefs[i]().remove();
					}
				}
				if (高频快捷方式PaperRef()) {
					高频快捷方式PaperRef().remove();
				}
				if (典藏区副本PaperRef()) {
					典藏区副本PaperRef().remove();
				}
			}
		},
		{
			text: '第一，管理者得不偷懒而且不犯错地执行规则',
			callback: function* () {
				yield* persistentKeywordsRef().addTitle('第一，管理者得不偷懒而且不犯错地执行规则');
			}
		},
		{
			text: '第二，所有的游戏都是孤立的系统',
			callback: function* () {
				yield* persistentKeywordsRef().addTitle('第二，所有的游戏都是孤立的系统');
			}
		},
		{ text: '第一点很好理解，这种方式的管理成本其实很高' },
		{ text: '复制快捷方式到每个标签文件夹，非常费时费力' },
		{ text: '而且想要新加标签极其极其困难，' },
		{ text: '因为你不知道当前资源的快捷方式被哪些文件夹引用了' },
		{
			text: '其次，你的归类必须完美无措，', callback: function* () {
				yield* persistentKeywordsRef().clear();
			}
		},
		{
			text: '一旦想要重新移动某个资源的位置，就会导致所有的快捷方式全部失效，极其折磨',
			callback: function* () {
				yield* moveAndShow(快捷方式失效Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '而孤立系统的问题更麻烦。' },
		{ text: '所谓的孤立系统指的是所有资源不能有系列、合集' },
		{
			text: '比如说有一个开发商叫做袖子社，他们开发了3部游戏',
			callback: function* () {
				// 删除快捷方式失效Img
				if (快捷方式失效Img && 快捷方式失效Img()) {
					yield* 快捷方式失效Img().opacity(0, 0.5);
					yield* waitFor(0.1);
					快捷方式失效Img().remove();
				}

				// 创建新的树，根节点是"袖子社"
				const rootData = {
					key: 'root',
					label: '文件夹',
				};

				view.add(
					<TreeNodeComponent
						ref={developerTreeRef}
						refs={developerTreeRefs}
						roots={[rootData]}
						theme={{
							fontSize: 32,
						}}
						treeLayout={{
							rootPosition: () => VideoPostion.innerTopCenter(view),
							columnSpacing: 230, // 子节点之间的水平间距（x轴方向）
							rowSpacing: 200,    // 行间距（y轴方向）

						}}
						zIndex={100}
					/>
				);

				// 显示根节点
				yield* developerTreeRef().showNode('root', { duration: 0.6 });
			}
		},
		{
			text: '分别是《千万莲华》、《亚特兰斯》、《瑟尔达传说》',
			callback: function* () {
				// 先添加"柚子社"节点到根节点
				yield* developerTreeRef().addNodeTo('root', '柚子社');

				// 然后把三个游戏节点添加到"柚子社"节点下
				yield* developerTreeRef().addNodesTo('柚子社', [
					'千万莲华',
					'亚特兰斯',
					'瑟尔达传说',
				]);
			}
		},
		{ text: '那么按照思维惯性，这些游戏应该归类到“袖子社”这个文件夹中' },
		{ text: '但是非常不巧，这些游戏每一部的类型都不一样，' },
		{
			text: '那么按照算法，我需要把它归类到各自的类型中',
			callback: function* () {
				// 添加三个类型节点（NV、SRPG、ARPG）到根节点
				yield* developerTreeRef().addNodesTo('root', [
					'NV',
					'SRPG',
					'ARPG',
				], {
					childSpacing: 200,
				});
			}
		},
		{
			text: '这就导致了同一个系列的游戏会被分散到不同的文件夹',
			callback: function* () {
				// 移动游戏节点到对应的类型节点下
				yield* all(
					developerTreeRef().moveNode('千万莲华', '柚子社', 'NV'),
					developerTreeRef().moveNode('亚特兰斯', '柚子社', 'SRPG'),
					developerTreeRef().moveNode('瑟尔达传说', '柚子社', 'ARPG')
				);
			}
		},
		{
			text: '要想为袖子社建立合集，还得一个个手动地复制快捷方式，烦不胜烦',
			callback: function* () {
				// 为"柚子社"节点添加三个游戏的快捷方式
				yield* developerTreeRef().addNodesTo('柚子社', [
					'千万莲华\n快捷方式',
					'亚特兰斯\n快捷方式',
					'瑟尔达传说\n快捷方式',
				], {
					childHorizontalOffset: -220,
					childSpacing: 200,
				});
			}
		},
		{ text: '最后就会变成既要手动进行类型归类' },
		{
			text: '又要为每一个制作组、画师、发行等信息都单独建立标签文件夹',
			callback: function* () {
				// 给根节点添加两个文件夹节点
				yield* developerTreeRef().addNodesTo('root', [
					'四姐小牛',
					'custom_undo',
				]);
			}
		},
		{ text: '这种方式，不仅比打黑工做人工标注都累，还会导致根目录越来越庞大' },
		{
			text: '因此，我意识到windows本地的文件夹是不适合做标签管理和数据记录的',
			callback: function* () {
				// 清空所有页面元素

				// 1. 清除前提文本（使用 PersistentKeywords 组件）
				yield* persistentKeywordsRef().clear();

				// 2. 清除归类法标题文本
				if (归类法标题文本Ref && 归类法标题文本Ref()) {
					yield* 归类法标题文本Ref().opacity(0, 0.5, easeOutCubic);
					yield* waitFor(0.1);
					归类法标题文本Ref().remove();
				}

				// 3. 清除要点文本
				if (要点文本Refs && 要点文本Refs.textRefs && 要点文本Refs.textRefs.length > 0) {
					yield* all(
						...要点文本Refs.textRefs.map(textRef =>
							textRef().opacity(0, 0.5, easeOutCubic)
						)
					);
					yield* waitFor(0.1);
					// 删除要点文本
					要点文本Refs.textRefs.forEach(textRef => {
						if (textRef()) {
							textRef().remove();
						}
					});
				}

				// 4. 清除开发商树	
				yield* developerTreeRef().removeTree();
			}
		},
		{
			text: "所以，在一次冷静的思考后，我制作了\"绿色资源管理器\"",
			callback: function* () {
				// 创建"绿色资源管理器"图片并移动到屏幕中心
				绿色资源管理器Img = createImage(view, '/imgs/绿色资源管理器.png', {
					scale: 2,
					initialPosition: () => VideoPostion.bottomCenter(view),
				});
				yield* moveAndShow(绿色资源管理器Img, view, VideoPostion.center(view), 0.8);
			}

		},

		//////////////////4.绿色资源管理器介绍///////////////////////////
		{ text: '绿色管理器是基于本地文件索引的资源管理应用' },
		{
			text: "采用tag分类法组织和管理资源",
		},
		{
			text: "用人话说就是资源还是存到本地文件夹的",
		},
		{
			text: "但是tag索引和数据记录由我帮你完成",
		},
		{
			text: "你只用随意把资源放到本地，做最低限度的管理即可",
		},
		{
			text: "所有的复杂步骤都由管理器帮你完成",
		},

		{
			text: '我们以《unity》这个游戏为例',
			callback: function* () {
				// 隐藏"绿色资源管理器"图片
				if (绿色资源管理器Img && 绿色资源管理器Img()) {
					yield* 绿色资源管理器Img().opacity(0, 0.8);
					绿色资源管理器Img().remove();
					绿色资源管理器Img = null;
				}
			}

		},
		{
			text: '你既可以直接点击添加游戏的按钮，手动选择游戏文件来注册游戏',
			callback: function* () {
				// 显示并播放注册游戏演示视频
				const video = 注册游戏视频Ref();

				// 先显示视频（淡入）
				yield* video.opacity(1, 0.5);

				// 等待一小段时间确保视频元素已准备好
				yield* waitFor(0.1);

				// 播放视频
				video.play();
			}
		},
		{
			text: '也可以选择拖拽exe文件到页面内，自动注册游戏',
			callback: function* () {
				// 淡出并删除之前的注册游戏视频
				const oldVideo = 注册游戏视频Ref();
				if (oldVideo && oldVideo.opacity() > 0) {
					yield* oldVideo.opacity(0, 0.5);
					yield* waitFor(0.1);
					oldVideo.remove();
				}

				// 显示并播放拖拽添加游戏演示视频
				const newVideo = 拖拽添加游戏视频Ref();

				// 先显示视频（淡入）
				yield* newVideo.opacity(1, 0.5);

				// 等待一小段时间确保视频元素已准备好
				yield* waitFor(0.1);

				// 播放视频
				newVideo.play();
			}
		},
		{
			text: '注册成功后，单击游戏卡的封面图进入游戏详情面板',
			callback: function* () {
				// 淡出并删除之前的拖拽添加游戏视频
				const oldVideo = 拖拽添加游戏视频Ref();
				if (oldVideo && oldVideo.opacity() > 0) {
					yield* oldVideo.opacity(0, 0.5);
					yield* waitFor(0.1);
					oldVideo.remove();
				}

				// 显示并播放tag添加演示视频
				const newVideo = tag添加视频Ref();

				// 先显示视频（淡入）
				yield* newVideo.opacity(1, 0.5);

				// 等待一小段时间确保视频元素已准备好
				yield* waitFor(0.1);

				// 播放视频
				newVideo.play();
			}
		},
		{
			text: '在面板中就可以编辑tag了',

		},
		{ text: '例如unity的tag可以是游戏引擎、心理恐怖和开放世界' },
		{ text: '要注意，输入完成后需要回车来添加tag' },
		{
			text: "添加完成后，点击保存修改以完成编辑"
		},
		{
			text: '之后查找《unity》这个游戏，便只需点击"心理恐怖"tag即可查找到',
			callback: function* () {

				yield* tag添加视频Ref().opacity(0, 0.5);
				yield* waitFor(0.1);
				tag添加视频Ref().remove();

				// 显示单一tag筛选图片
				yield* moveAndShow(单一tag筛选Img, view, VideoPostion.center(view), 1);
			}
		},
		{
			text: "不过同时你也会发现，有心理恐怖的游戏不止有unity",

		},
		{ text: '因此随着资源越来越多，如果只支持一个tag的索引' },
		{
			text: "还是可能导致资源过多，查找困难",
		},
		{
			text: '因此我设计了多选功能，你同时选择多个tag来逐步缩小查找范围',
			callback: function* () {
				// 淡出并删除之前的单一tag筛选图片
				if (单一tag筛选Img && 单一tag筛选Img().opacity() > 0) {
					yield* 单一tag筛选Img().opacity(0, 0.5);
					yield* waitFor(0.1);
					单一tag筛选Img().remove();
				}

				// 显示多tag筛选图片
				yield* moveAndShow(多tag筛选Img, view, VideoPostion.center(view), 1);
			}

		},
		{ text: '尤其是在你拥有超大量资源而信息比较模糊时，多个tag索引可以大大提高查找效率' },
		{ text: '通过这种方式就可以彻底解放本地文件的组织方式了' },
		{
			text: "本地文件不管怎么样乱放，都不影响管理器的检索和查找",

		},
		{ text: '比如我现在的管理方式，' },
		{
			text: "我将高频访问的游戏，以及大型游戏放到了固态硬盘",
		},
		{
			text: "将中频访问的游戏放到了大容量机械硬盘",
		},
		{
			text: "将低频访问的游戏放到了nas，进行冷备份",
		},
		{ text: '不过我完全不用担心找不到这些资源' },
		{
			text: "使用了绿色资源管理器后，所有的资源都可以统一管理",
		},
		{ text: '大大降低了文件整理和归类的复杂度' },
		{ text: '这样就解决了第一朵乌云——数据索引问题' },
		//////////////////5.游戏时长统计和截图功能///////////////////////////
		{ text: '接下来我们将解决第二朵乌云——数据统计问题' },
		{
			text: '我作为资深的仓鼠党，我非常需要知道这个游戏我是否浏览过？',
			callback: function* () {
				// 淡出并删除之前的多tag筛选图片
				if (多tag筛选Img && 多tag筛选Img().opacity() > 0) {
					yield* 多tag筛选Img().opacity(0, 0.5);
					yield* waitFor(0.1);
					多tag筛选Img().remove();
				}

				// 显示游戏统计问题文本
				yield* fadeInNodes(游戏统计问题文本Refs.textRefs, 1);
			}
		},
		{
			text: '我玩过几次？玩了多长时间？',
		},
		{
			text: '于是，我实现了一套类似于steam的运行机制',
		},

		{
			text: '你可以直接在详情面板中启动游戏',
			callback: function* () {
				// 淡出并删除之前的游戏统计问题文本
				for (const textRef of 游戏统计问题文本Refs.textRefs) {
					if (textRef && textRef().opacity() > 0) {
						yield* textRef().opacity(0, 0.5);
						yield* waitFor(0.1);
						textRef().remove();
					}
				}

				// 显示并播放运行时长演示视频
				const video = 运行时长视频Ref();
				video.play();
				yield* video.opacity(1, 0.5);
			},
		},
		{
			text: "也可以直接点击游戏卡启动游戏"
		},

		{
			text: "在你享受游戏的时候"
		},

		{
			text: "管理器会实时记录运行时长"
		},
		{ text: '同时浏览次数、第一次运行时长、第一次入库时间、总时长等信息都会被额外记录' },
		{
			text: '而既然要抄steam，那么当然要贯彻到底',
			callback: function* () {
				// 清除运行时长演示视频
				const video = 运行时长视频Ref();
				if (video) {
					// 淡出视频
					yield* video.opacity(0, 0.5, easeOutCubic);
					// 等待节点准备好
					yield* waitFor(0.1);
					// 直接移除，remove() 会自动停止播放
					try {
						video.remove();
					} catch (e) {
						// 如果节点还未准备好，忽略错误
					}
				}
			}
		},
		{
			text: '本管理器还顺便实现了动态截图功能',
			callback: function* () {
				// 淡出并删除之前的运行时长视频

				yield* 运行时长视频Ref().opacity(0, 0.5);
				yield* waitFor(0.1);
				运行时长视频Ref().remove();



				yield* 截图视频Ref().opacity(1, 0.5);
				yield* waitFor(0.1);
				截图视频Ref().play();
			}
		},
		{ text: '在游戏运行时，按下ctrl+f12就可以快速截图，' },
		{
			text: "之后右键该游戏卡，就可以打开截图文件夹了"
		},
		{ text: '再也不用担心丢失游戏的精彩瞬间！' },
		{ text: '什么！你说很多galgame的ctrl是快进键？！会造成冲突？' },
		{ text: '当然了，作为资深的仓鼠，我早已预料到这个情况' },
		{
			text: '因此，你可以随时在设置中更改快捷键。将其改为你顺手的键位',
			callback: function* () {

				yield* 截图视频Ref().opacity(0, 0.5);
				yield* waitFor(0.1);
				截图视频Ref().remove();


				// 显示截图键位修改图片
				yield* moveAndShow(截图键位修改Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '同时，你也可以使用游戏内的截图快速作为游戏的封面' },

		{ text: '还记得我刚才说的高频文件夹、中频文件夹吗？' },
		{
			text: '没错，我参考之前的设计，加入了排序功能',
			callback: function* () {
				// 隐藏并删除截图键位修改图片
				if (截图键位修改Img()) {
					yield* 截图键位修改Img().opacity(0, 0.5, easeOutCubic);
					yield* waitFor(0.1);
					截图键位修改Img().remove();
				}

				// 显示排序方式图片
				yield* moveAndShow(排序方式Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '可以按照运行时间、最后游玩顺序、游玩次数、添加时间等信息进行排序' },
		{ text: '这样既可以快速找到你常玩的游戏，也可以找到最近添加的游戏进行管理' },

		{
			text: '然而这些只是管理器的冰山一角，更有趣的功能还在后面',
			callback: function* () {
				// 删除截图键位修改图片（如果还存在）

				排序方式Img().remove();

			}
		},
		{ text: '想必此时，各位早已看到左侧的列表了' },
		{ text: '是的，绿色资源管理器不仅可以管理应用' },
		{
			text: '也可以管理图片、视频、小说、网站、音频等资源'
		},
		{
			text: '而且为了方便起见，我为所有的资源都实现了内部播放器',
			callback: function* () {

				yield* moveAndShow(图片浏览器Img, view, VideoPostion.center(view), 1)


			}
		},
		{
			text: '再也不用被某某看图王、某某图片查看器折磨了',
			callback: function* () {
				// 删除图片浏览器图片
				yield* 图片浏览器Img().opacity(0, 0.5);
				yield* waitFor(0.1);
				图片浏览器Img().remove();
				yield* moveAndShow(图片浏览器2Img, view, VideoPostion.center(view), 1);
			}
		},
		{
			text: '管理器内没有任何广告！没有任何收费项！全程不联网！',
			callback: function* () {
				// 删除图片浏览器图片
				yield* hideAndRemove(图片浏览器2Img);
				yield* moveAndShow(小说阅读器Img, view, VideoPostion.center(view), 1);
			}
		},
		{
			text: '而且我还为小说的阅读器增加了配置项，各位不妨自定义成自己喜欢的形状',
			callback: function* () {
				// 删除小说阅读器图片
				if (小说阅读器Img()) {
					yield* 小说阅读器Img().opacity(0, 0.5, easeOutCubic);
					yield* waitFor(0.1);
					小说阅读器Img().remove();
				}

				// 显示小说阅读器2图片
				yield* moveAndShow(小说阅读器2Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '而音频播放器则是重量级的重量级' },
		{
			text: '不知道各位是否和我一样，在看小说和漫画的时候喜欢听一些音声',
			callback: function* () {
				// 删除小说阅读器2图片

				yield* 小说阅读器2Img().opacity(0, 0.5, easeOutCubic);
				yield* waitFor(0.1);
				小说阅读器2Img().remove();

			}
		},
		{
			text: '没错，音频播放器可以挂到后台播放，你可以自定义播放列表',
			callback: function* () {
				// 显示并播放音频播放器演示视频
				const video = 音频播放器视频Ref();

				// 先显示视频（淡入）
				yield* video.opacity(1, 0.5);

				// 等待一小段时间确保视频元素已准备好
				yield* waitFor(0.1);

				// 播放视频
				video.play();
			}
		},
		{ text: '在阅读的时候享受视觉和听觉的双重体验！' },
		//////////////////6.伪装模式、安全键、多存档机制///////////////////////////
		{ text: '这时恐怕有人要问了，"哎呀，你这个软件搞个这么大的封面，很容易社死的"' },
		{
			text: '当然，作为资深的仓鼠，我早已预料到了这种情况',
			callback: function* () {
				// 清除音频播放器视频
				const video = 音频播放器视频Ref();
				if (video) {
					// 淡出视频
					yield* video.opacity(0, 0.5, easeOutCubic);
					yield* waitFor(0.1);
					// 直接移除，remove() 会自动停止播放
					try {
						video.remove();
					} catch (e) {
						// 如果节点还未准备好，忽略错误
					}
				}
			}
		},
		{
			text: '你可以随时在设置中开启伪装模式',
			callback: function* () {
				// 显示伪装模式图片
				yield* moveAndShow(伪装模式Img, view, VideoPostion.center(view), 1);
			}

		},
		{
			text: '开启后，软件内所有的资源封面图都会变成各个大学课程的截图',
			callback: function* () {
				// 隐藏并删除伪装模式图片
				yield* hideAndRemove(伪装模式Img);
				// 显示伪装模式展示图片
				yield* moveAndShow(伪装模式展示Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '而名称和tag都会变成专业课的名称' },
		{
			text: '当然，这些截图和名称支持自定义，',
			callback: function* () {
				// 隐藏并删除伪装模式展示图片
				yield* hideAndRemove(伪装模式展示Img);
				// 显示伪装模式自由修改图片
				yield* moveAndShow(伪装模式自由修改Img, view, VideoPostion.center(view), 1);
			}
		},
		{
			text: '你可以在根目录的disguise文件夹自由修改成你的形状',
		},
		{
			text: '比如这样：',
			callback: function* () {
				// 隐藏并删除伪装模式自由修改图片
				yield* hideAndRemove(伪装模式自由修改Img);
				// 显示伪装模式_戒色吧图片
				yield* moveAndShow(伪装模式_戒色吧Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '时刻提醒自己再勤劳的机长也有需要休息的一天' },
		{ text: "同时，考虑到各位打游戏的时候，可能不想被同居的青梅竹马小萝莉看到" },
		{
			text: '因此绿色资源管理器还提供了安全键',
			callback: function* () {
				// 创建并显示"安全键"图片

				yield* hideAndRemove(伪装模式_戒色吧Img);
				安全键Img = createImage(view, '/imgs/安全键.png', {
					scale: 0.8,
					initialPosition: () => VideoPostion.bottomCenter(view),
				});
				yield* moveAndShow(安全键Img, view, VideoPostion.center(view), 1);
			}
		},
		{
			text: '运行游戏时，只要按下ESC，管理器和运行的游戏会立刻最小化',
			callback: function* () {
				// 隐藏之前的安全键Img
				if (安全键Img && 安全键Img()) {
					yield* 安全键Img().opacity(0, 0.5);
					yield* waitFor(0.1);
					安全键Img().remove();
					安全键Img = null;
				}

				// 显示并播放安全键演示视频
				const video = 安全键视频Ref();

				// 先显示视频（淡入）
				yield* video.opacity(1, 0.5);

				// 等待一小段时间确保视频元素已准备好
				yield* waitFor(0.1);

				// 播放视频
				video.play();
			}
		},
		{ text: '并打开丘维声教授的高等代数课程，' },
		{
			text: "放心，我已经帮你跳转到07:46"
		},
		{ text: '可以更好地伪装自己已经看了一半的感觉' },
		{ text: '另外，考虑到各位有很多人白天要上学上班，半夜还要忙着拯救世界' },
		{
			text: '因此我为有着多重身份的各位开发了多存档机制',
			callback: function* () {
				// 清除安全键视频
				const video = 安全键视频Ref();
				if (video) {
					// 淡出视频
					yield* video.opacity(0, 0.5, easeOutCubic);
					yield* waitFor(0.1);
					// 直接移除，remove() 会自动停止播放
					try {
						video.remove();
					} catch (e) {
						// 如果节点还未准备好，忽略错误
					}
				}

				// 显示多存档图片
				yield* moveAndShow(多存档Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: '只需要在设置中自定义存档目录就可以切换存档' },
		{ text: '各个存档完全独立，可以防止你心之怪盗团的身份被泄露出去' },



		//////////////////7.成就功能和统计功能///////////////////////////
		{
			text: '最后，为了让各位的仓鼠之路加一些仪式感，'
		},
		{  
			text: "我还开发了成就功能和统计功能",
			callback: function* () {

				yield* hideAndRemove(多存档Img);
				// 创建并显示"成就"图片
				成就Img = createImage(view, '/imgs/成就.png', {
					scale: 0.7,
					initialPosition: () => VideoPostion.bottomCenter(view),
				});
				yield* moveAndShow(成就Img, view, VideoPostion.center(view), 1);
			}


		},

		{
			text: '你可以在用户界面找到成就页，查看当前的进度',
			callback: function* () {
				// 确保成就图片可见（如果已经创建）
				if (成就Img && 成就Img()) {
					// 如果图片已经显示，确保它可见
					if (成就Img().opacity() < 1) {
						yield* 成就Img().opacity(1, 0.5);
					}
				} else {
					// 如果图片还未创建，创建并显示
					成就Img = createImage(view, '/imgs/成就.png', {
						scale: 0.8,
						initialPosition: () => VideoPostion.bottomCenter(view),
					});
					yield* moveAndShow(成就Img, view, VideoPostion.center(view), 1);
				}
			}
		},
		{ text: '成就在未来预计会不断更新' },
		{ text: '顺带一提，我还设计了一些隐藏成就' },
		{ text: '需要各位探索管理器才能解锁' },

		{
			text: "而统计功能不仅可以统计管理器的运行时长，登录时间等数据",
			callback: function* () {
				// 删除成就图片
				if (成就Img && 成就Img()) {
					yield* hideAndRemove(成就Img);
					成就Img = null;
				}

				// 创建并显示统计页面图片
				统计页面Img = createImage(view, '/imgs/统计页面.png', {
					scale: 0.7,
					initialPosition: () => VideoPostion.bottomCenter(view),
				});
				yield* moveAndShow(统计页面Img, view, VideoPostion.center(view), 1);
			}
		},
		{ text: "还可以生成月报、年报等数据" },
		{ text: '让你的每一寸时光都有意义，有价值' },
		{
			text: '再说下去各位不免厌烦，其余的神秘功能，各位可以在帮助页自行查询',
			callback: function* () {
				// 删除统计页面图片

				yield* hideAndRemove(统计页面Img);


				// 创建并显示帮助页图片
				帮助页Img = createImage(view, '/imgs/帮助页.png', {
					scale: 1.1,
					initialPosition: () => VideoPostion.bottomCenter(view),
				});
				yield* moveAndShow(帮助页Img, view, VideoPostion.center(view), 1);
			}
		},

		{
			text: '最后我需要声明',
			callback: function* () {

				// 隐藏帮助页图片
				yield* hideAndRemove(帮助页Img);


			}
		},
		{
			text: '本绿色资源管理器完全免费、安全、开源', callback: function* () {
				// 显示文字："完全免费、安全、开源、无任何广告、全程不需要互联网"
				声明文本 = createTexts(view, ['完全免费、安全、开源、无任何广告、全程不需要互联网'], {
					centerPosition: () => VideoPostion.center(view),
					fontSize: 56,
					color: '#000000',
					spacing: 0,
					direction: 'column',
				});
				yield* fadeInNodes(声明文本.textRefs);
			}
		},
		{ text: "无任何广告、全程不需要互联网，是真正的绿色资源管理器" },
		{ text: '如果各位喜欢这个管理器，不妨为我的视频点个赞、转发一下' },
		{ text: '但是无需三连，现在的管理器仍处于半成品' },
		{
			text: "我深知管理器还有很多重要功能仍不齐全", callback: function* () {
				// 隐藏并删除声明文本
				if (声明文本 && 声明文本.textRefs) {
					yield* all(
						...声明文本.textRefs.map(textRef =>
							textRef().opacity(0, 0.5, easeOutCubic)
						)
					);
					yield* waitFor(0.1);
					声明文本.textRefs.forEach(textRef => {
						if (textRef()) {
							textRef().remove();
						}
					});
					声明文本 = null;
				}
			}
		},
		{
			text: "比如数据刮削、自动解压、云存档",
			callback: function* () {
				// 依次显示功能列表文本（前三个）
				for (let i = 0; i < 3; i++) {
					yield* 功能列表文本Refs.textRefs[i]().opacity(1, 0.5);
					yield* waitFor(0.3);
				}
			}
		},
		{
			text: "自动转区、游戏报错分析、自动翻译等无数功能仍需开发",
			callback: function* () {
				// 依次显示功能列表文本（后三个）
				for (let i = 3; i < 6; i++) {
					yield* 功能列表文本Refs.textRefs[i]().opacity(1, 0.5);
					yield* waitFor(0.3);
				}
			}
		},
		{ text: "但是请各位稍安勿躁" },
		{
			text: "在它成为各位心中完美的资源管理器之前，我会不断更新的",
			callback: function* () {
				// 隐藏功能列表文本Refs
				yield* all(
					...功能列表文本Refs.textRefs.map(textRef =>
						textRef().opacity(0, 0.5, easeOutCubic)
					)
				);
				// 隐藏帮助页图片
				yield* hideAndRemove(帮助页Img);
				// 创建并显示QQ群图片
				qq群Img = createImage(view, '/imgs/qq群图片.jpg', {
					scale: 0.5,
					initialPosition: () => VideoPostion.bottomCenter(view),
				});
				yield* moveAndShow(qq群Img, view, VideoPostion.center(view), 1);
			}
		},
		{
			text: '这个是本管理器的qq群，如果有什么意见和建议，欢迎进群讨论！'
		},
		{
			text: '那么，各位，我们下次再见'
		}
	];

	return subtitles;
}


/**
 * 进度条分段配置（基于文本匹配）
 */
export const segmentConfigs: ProgressSegmentConfig[] = [
	{ title: '问题提出', startText: '我是一只仓鼠', endText: '而令人遗憾的是', color: '#4CAF50' },
	{ title: '传统方法', startText: '而令人遗憾的是', endText: '于是某一天，我突然冷静了下来', color: '#FF9800' },
	{ title: '解决方案', startText: '于是某一天，我突然冷静了下来', endText: '这两个模式其实蕴含了2个前提', color: '#2196F3' },
	{ title: '方案缺陷', startText: '这两个模式其实蕴含了2个前提', endText: '所以，在一次冷静的思考后，我制作了"绿色资源管理器"', color: '#9C27B0' },
	{ title: '绿色管理器的核心功能', startText: '所以，在一次冷静的思考后，我制作了"绿色资源管理器"', endText: '接下来我们将解决第二朵乌云——数据统计问题', color: '#4CAF50' },
	{ title: '数据统计功能', startText: '接下来我们将解决第二朵乌云——数据统计问题', endText: '然而这些只是管理器的冰山一角，更有趣的功能还在后面', color: '#00BCD4' },
	{ title: '其他功能', startText: '然而这些只是管理器的冰山一角，更有趣的功能还在后面', endText: '最后我需要声明', color: '#795548' },
	{ title: '结尾', startText: '最后我需要声明', color: '#607D8B' }
];

/**
 * 获取进度条分段配置
 * @param subtitles 字幕数组
 * @returns 进度条分段配置数组（包含计算后的索引）
 */
export function getProgressSegments(subtitles: VideoScript[]): ProgressSegment[] {
	return ProgressSegmentConverter.convert(segmentConfigs, subtitles);
}

