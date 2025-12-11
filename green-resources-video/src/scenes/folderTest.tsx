import {makeScene2D, Txt, Layout} from '@motion-canvas/2d';
import {
  createRef,
  all,
  easeOutCubic,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {FolderComponent} from '../nodes/folder';

// 主题颜色配置
const theme = {
  bg: '#1a1a1a',
  bgDark: '#0d0d0d',
  text: '#ffffff',
};

export default makeScene2D(function* (view) {
  // 设置背景色
  view.fill(theme.bgDark);

  // 创建 FolderComponent 组件的引用
  const folderRef = createRef<FolderComponent>();

  // 创建第一个 FolderComponent 组件（默认样式）
  view.add(
    <FolderComponent
      ref={folderRef}
      folderColor="#FFD700"
      tabColor="#DAA520"
      width={120}
      height={160}
      x={0}
      y={0}
      opacity={0}
    >
      <Txt
        text="文件夹"
        fontSize={20}
        fill="#000000"
        fontFamily="Microsoft YaHei, sans-serif"
        fontWeight={600}
      />
    </FolderComponent>,
  );

  // 等待开始
  yield* waitUntil('start');

  // 文件夹淡入动画
  folderRef().opacity(0);
  folderRef().scale(0.8);
  yield* all(
    folderRef().opacity(1, 0.8, easeOutCubic),
    folderRef().scale(1, 0.8, easeOutCubic),
  );

  yield* waitFor(1.5);

  // 创建多个不同颜色的文件夹
  const folder2Ref = createRef<FolderComponent>();
  const folder3Ref = createRef<FolderComponent>();
  const folder4Ref = createRef<FolderComponent>();

  view.add(
    <FolderComponent
      ref={folder2Ref}
      folderColor="#4CAF50"
      tabColor="#2E7D32"
      width={120}
      height={160}
      x={-200}
      y={100}
      opacity={0}
    >
      <Txt
        text="绿色"
        fontSize={18}
        fill="#ffffff"
        fontFamily="Microsoft YaHei, sans-serif"
        fontWeight={600}
      />
    </FolderComponent>,
  );

  view.add(
    <FolderComponent
      ref={folder3Ref}
      folderColor="#2196F3"
      tabColor="#1565C0"
      width={120}
      height={160}
      x={0}
      y={100}
      opacity={0}
    >
      <Txt
        text="蓝色"
        fontSize={18}
        fill="#ffffff"
        fontFamily="Microsoft YaHei, sans-serif"
        fontWeight={600}
      />
    </FolderComponent>,
  );

  view.add(
    <FolderComponent
      ref={folder4Ref}
      folderColor="#FF9800"
      tabColor="#E65100"
      width={180}
      height={160}
      x={200}
      y={100}
      opacity={0}
    >
      <Txt
        text="橙色"
        fontSize={18}
        fill="#ffffff"
        fontFamily="Microsoft YaHei, sans-serif"
        fontWeight={600}
      />
    </FolderComponent>,
  );

  yield* waitFor(0.5);

  // 同时显示另外三个文件夹
  folder2Ref().scale(0.9);
  folder3Ref().scale(0.9);
  folder4Ref().scale(0.9);
  yield* all(
    folder2Ref().opacity(1, 0.6, easeOutCubic),
    folder2Ref().scale(1, 0.6, easeOutCubic),
    folder3Ref().opacity(1, 0.6, easeOutCubic),
    folder3Ref().scale(1, 0.6, easeOutCubic),
    folder4Ref().opacity(1, 0.6, easeOutCubic),
    folder4Ref().scale(1, 0.6, easeOutCubic),
  );

  yield* waitFor(1.5);

  // 创建不同尺寸的文件夹
  const largeFolderRef = createRef<FolderComponent>();
  const smallFolderRef = createRef<FolderComponent>();

  view.add(
    <FolderComponent
      ref={largeFolderRef}
      folderColor="#9C27B0"
      tabColor="#6A1B9A"
      width={180}
      height={240}
      x={-300}
      y={-150}
      opacity={0}
    >
      <Layout
        direction="column"
        alignItems="center"
        justifyContent="center"
        gap={10}
      >
        <Txt
          text="大文件夹"
          fontSize={24}
          fill="#ffffff"
          fontFamily="Microsoft YaHei, sans-serif"
          fontWeight={700}
        />
        <Txt
          text="更多内容"
          fontSize={16}
          fill="#ffffff"
          fontFamily="Microsoft YaHei, sans-serif"
          opacity={0.8}
        />
      </Layout>
    </FolderComponent>,
  );

  view.add(
    <FolderComponent
      ref={smallFolderRef}
      folderColor="#E91E63"
      tabColor="#AD1457"
      width={80}
      height={100}
      x={300}
      y={-150}
      opacity={0}
    >
      <Txt
        text="小"
        fontSize={14}
        fill="#ffffff"
        fontFamily="Microsoft YaHei, sans-serif"
        fontWeight={600}
      />
    </FolderComponent>,
  );

  yield* waitFor(0.5);

  // 显示不同尺寸的文件夹
  largeFolderRef().scale(0.9);
  smallFolderRef().scale(0.9);
  yield* all(
    largeFolderRef().opacity(1, 0.6, easeOutCubic),
    largeFolderRef().scale(1, 0.6, easeOutCubic),
    smallFolderRef().opacity(1, 0.6, easeOutCubic),
    smallFolderRef().scale(1, 0.6, easeOutCubic),
  );

  yield* waitFor(1.5);

  // 创建自定义标签页的文件夹
  const customTabFolderRef = createRef<FolderComponent>();

  view.add(
    <FolderComponent
      ref={customTabFolderRef}
      folderColor="#00BCD4"
      tabColor="#00838F"
      tabWidth={40}
      tabHeight={25}
      width={140}
      height={180}
      x={0}
      y={-250}
      opacity={0}
    >
      <Txt
        text="自定义标签"
        fontSize={20}
        fill="#ffffff"
        fontFamily="Microsoft YaHei, sans-serif"
        fontWeight={600}
      />
    </FolderComponent>,
  );

  yield* waitFor(0.5);

  // 显示自定义标签页的文件夹
  customTabFolderRef().scale(0.9);
  yield* all(
    customTabFolderRef().opacity(1, 0.6, easeOutCubic),
    customTabFolderRef().scale(1, 0.6, easeOutCubic),
  );

  yield* waitFor(2);

  yield* waitUntil('end');
});

