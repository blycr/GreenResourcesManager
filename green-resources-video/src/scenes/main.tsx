import {makeScene2D, Layout, Rect} from '@motion-canvas/2d';
import {createMouseRef, Mouse} from '../nodes/Mouse';
import {Subtitle} from '../utils/subtitle';
import {createMainSubtitles, getProgressSegments} from '../data/mainSubtitles';
import {ProgressBar} from '../nodes/ProgressBar';
import {all, createRef, finishScene} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  // 创建鼠标引用
  // const mouse = createMouseRef();
  // view.add(<Mouse refs={mouse} fill={'#000000'} x={200} y={-160} />);

  // 创建字幕数组（从数据文件导入，callback 在数据文件中定义）
  const subtitles = createMainSubtitles(view);

  // 获取进度条分段配置
  const progressSegments = getProgressSegments(subtitles);

  // 创建进度条组件
  const progressBarRef = createRef<ProgressBar>();
  view.add(
    <ProgressBar
      ref={progressBarRef}
      segments={progressSegments}
      totalItems={subtitles.length}
      position={() => [0, view.height() / 2 - 16]}
    />
  );

  // 创建字幕组件，传入进度条引用用于同步进度
  const subtitleRef = createRef<Subtitle>();
  view.add(
    <Subtitle
      ref={subtitleRef}
      texts={subtitles}
      progressBarRef={progressBarRef()}
    />
  );

  // 只执行字幕显示，进度条会通过字幕组件同步更新
  yield* subtitleRef().show();

  // 创建黑色遮罩，用于转场效果
  const fadeOutRect = createRef<Rect>();
  view.add(
    <Rect
      ref={fadeOutRect}
      size={view.size()}
      fill={'black'}
      opacity={0}
      zIndex={99999}
    />
  );

  // main 场景逐渐变黑（1秒）
  yield* fadeOutRect().opacity(1, 1);
  
  // 提前触发转场，让转场在变黑过程中进行
  finishScene();
});
