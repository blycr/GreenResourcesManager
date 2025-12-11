import {Rect, RectProps, Layout, LayoutProps, initial, signal} from '@motion-canvas/2d';
import {createRef, SignalValue, SimpleSignal} from '@motion-canvas/core';

export interface FolderProps extends LayoutProps {
  folderColor?: SignalValue<string>;
  tabColor?: SignalValue<string>;
  tabWidth?: SignalValue<number>;
  tabHeight?: SignalValue<number>;
  width?: SignalValue<number>;
  height?: SignalValue<number>;
  children?: any;
}

export class FolderComponent extends Layout {
  @initial('#FFD700')
  @signal()
  public declare readonly folderColor: SimpleSignal<string, this>;

  @initial('#DAA520')
  @signal()
  public declare readonly tabColor: SimpleSignal<string, this>;

  @initial(60)
  @signal()
  public declare readonly tabWidth: SimpleSignal<number, this>;

  @initial(20)
  @signal()
  public declare readonly tabHeight: SimpleSignal<number, this>;

  @initial(120)
  @signal()
  public declare readonly folderWidth: SimpleSignal<number, this>;

  @initial(160)
  @signal()
  public declare readonly folderHeight: SimpleSignal<number, this>;

  private folderBodyRef = createRef<Rect>();
  private folderTabRef = createRef<Rect>();
  private innerDocRef = createRef<Rect>();
  private titleLayoutRef = createRef<Layout>();

  public constructor(props?: FolderProps) {
    super({
      layout: false,
      ...props,
    });

    // 设置属性
    if (props?.folderColor !== undefined) {
      this.folderColor(props.folderColor);
    }
    if (props?.tabColor !== undefined) {
      this.tabColor(props.tabColor);
    }
    if (props?.tabWidth !== undefined) {
      this.tabWidth(props.tabWidth);
    }
    if (props?.tabHeight !== undefined) {
      this.tabHeight(props.tabHeight);
    }
    if (props?.width !== undefined) {
      this.folderWidth(props.width);
    }
    if (props?.height !== undefined) {
      this.folderHeight(props.height);
    }

    this.buildFolder();
    
    // 如果有 children，添加到标题区域
    if (props?.children) {
      // 将 children 添加到标题区域
      // 注意：children 可能是单个元素或数组
      const childrenArray = Array.isArray(props.children) ? props.children : [props.children];
      childrenArray.forEach(child => {
        if (child && this.titleLayoutRef()) {
          this.titleLayoutRef().add(child);
        }
      });
    }
  }

  private buildFolder() {
    // 文件夹主体
    this.add(
      <Rect
        ref={this.folderBodyRef}
        fill={this.folderColor}
        radius={4}
        layout={false}
        width={this.folderWidth}
        height={this.folderHeight}
        position={() => {
          const h = this.folderBodyRef().height();
          return [0, h * 0.05];
        }}
      />
    );
    
    // 文件夹标签页（左上角）
    this.add(
      <Rect
        ref={this.folderTabRef}
        fill={this.tabColor}
        radius={[4, 4, 0, 0]}
        layout={false}
        width={this.tabWidth}
        height={this.tabHeight}
        position={() => {
          const bodySize = this.folderBodyRef().size();
          return [
            -bodySize.width / 2 + this.tabWidth() / 2,
            -bodySize.height / 2 - this.tabHeight() / 2 + bodySize.height * 0.05
          ];
        }}
      />
    );
    
    // 标题区域（显示在黄色文件夹主体区域的上方）
    this.add(
      <Layout
        ref={this.titleLayoutRef}
        layout
        direction="column"
        alignItems="center"
        justifyContent="center"
        width={this.folderWidth}
        height={() => {
          const bodySize = this.folderBodyRef().size();
          return bodySize.height * 0.25; // 标题区域占文件夹高度的25%
        }}
        position={() => {
          const bodySize = this.folderBodyRef().size();
          // 位置在黄色文件夹主体的上方部分（考虑文件夹主体的偏移）
          return [0, -bodySize.height * 0.375 + bodySize.height * 0.05];
        }}
        zIndex={10}
      />
    );
    
    // 内部文档（白色矩形，表示文件夹里有文件）
    this.add(
      <Rect
        ref={this.innerDocRef}
        fill="#ffffff"
        radius={[2, 2, 0, 0]}
        layout={false}
        width={() => {
          const bodySize = this.folderBodyRef().size();
          return bodySize.width * 0.85;
        }}
        height={() => {
          const bodySize = this.folderBodyRef().size();
          return bodySize.height * 0.6;
        }}
        position={() => {
          const bodySize = this.folderBodyRef().size();
          return [0, bodySize.height * 0.2];
        }}
      />
    );
    
    // 文件内容区域（用于放置文件，在白色文档区域内）
    this.add(
      <Layout
        layout
        direction="column"
        alignItems="center"
        justifyContent="center"
        width={() => {
          const bodySize = this.folderBodyRef().size();
          return bodySize.width * 0.85;
        }}
        height={() => {
          const bodySize = this.folderBodyRef().size();
          return bodySize.height * 0.6;
        }}
        position={() => {
          const bodySize = this.folderBodyRef().size();
          return [0, bodySize.height * 0.2];
        }}
        zIndex={5}
      />
    );
  }

  /**
   * 获取文件夹内容区（白色文档区域）的中心位置
   * @returns 内容区的中心位置 [x, y]
   */
  public contentPosition(): [number, number] {
    const folderPosition = this.position();
    const folderHeight = this.folderHeight();
    // 文件夹主体相对于 Layout 的偏移：folderHeight * 0.05
    // 白色文档区域相对于文件夹主体的位置：folderHeight * 0.2
    // 白色文档区域的高度：folderHeight * 0.6
    // 白色文档区域的中心相对于文件夹主体：folderHeight * 0.2 + folderHeight * 0.6 / 2 = folderHeight * 0.5
    // 白色文档区域的中心相对于 Layout：folderHeight * 0.05 + folderHeight * 0.5 = folderHeight * 0.55
    const contentY = folderPosition.y + folderHeight * 0.15;
    return [folderPosition.x, contentY];
  }
}
