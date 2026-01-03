# 日期管理插件 (Calendar Manager Plugin)

一个简单的日程表管理插件，提供日期管理和日程安排功能。

## 功能说明

这个插件提供了以下功能：

1. **日程表视图**
   - 月份视图日历
   - 日期导航（上个月/下个月）
   - 日程事件标记

2. **日程事件管理**
   - 添加日程事件（标题、描述、时间、日期）
   - 编辑日程事件
   - 删除日程事件
   - 查看指定日期的事件列表

3. **数据存储**
   - 本地存储日程数据
   - 自动保存和加载

4. **导航集成**
   - 在左侧筛选栏添加"日期管理"导航项
   - 点击后显示日程表界面

## 插件结构

```
calendar-manager/
├── manifest.json    # 插件元信息（必需）
├── index.js         # 主脚本文件（必需）
└── README.md        # 说明文档（可选）
```

## manifest.json 字段说明

- `id`: 插件唯一标识符 (`calendar-manager`)
- `name`: 插件显示名称 (`日期管理`)
- `version`: 插件版本号
- `description`: 插件描述
- `author`: 作者名称
- `entry`: 入口文件路径（默认: index.js）
- `tags`: 插件标签
- `icon`: 插件图标（emoji: 📅）

## 使用方法

### 添加日程事件

1. 点击日历上的日期，或点击"添加事件"按钮
2. 输入事件标题（必填）
3. 输入事件描述（可选）
4. 输入事件时间（格式：HH:mm，可选，留空表示全天）
5. 输入事件日期（格式：YYYY-MM-DD，可选，留空表示今天）
6. 点击确认添加

### 查看日程

- 在日历上，有事件的日期会显示标记（带数字的小圆点）
- 点击日期可以查看该日期的所有事件
- 事件列表显示在日历下方的面板中

### 编辑事件

1. 在事件列表中点击"编辑"按钮
2. 修改事件信息
3. 确认保存

### 删除事件

1. 在事件列表中点击"删除"按钮
2. 确认删除

### 导航月份

- 点击日历顶部的"◀"按钮切换到上个月
- 点击日历顶部的"▶"按钮切换到下个月

## 数据格式

日程事件数据格式：

```javascript
{
  id: "事件ID（时间戳）",
  title: "事件标题",
  description: "事件描述（可选）",
  date: "YYYY-MM-DD",
  time: "HH:mm（可选，空字符串表示全天）",
  createdAt: 创建时间戳,
  updatedAt: 更新时间戳（可选）
}
```

## 开发说明

### 插件生命周期

- `onLoad(api)`: 插件加载时调用，初始化数据、注册导航、创建UI
- `onUnload(api)`: 插件卸载时调用，保存数据、清理资源

### 主要功能

- `loadEvents(api)`: 从存储加载日程数据
- `saveEvents(api)`: 保存日程数据到存储
- `registerNavigation(api)`: 注册导航项到左侧筛选栏
- `generateCalendarHTML()`: 生成日历HTML
- `showDayEvents(dateStr, container, api)`: 显示指定日期的事件
- `showAddEventDialog(api)`: 显示添加事件对话框
- `editEvent(eventId, api)`: 编辑事件
- `deleteEvent(eventId, api)`: 删除事件

### API 需求

这个插件需要以下 API 支持：

- `api.storage.get(key)`: 获取存储数据
- `api.storage.set(key, value)`: 设置存储数据
- `api.navigation.register(config)`: 注册导航项
- `api.navigation.unregister(id)`: 取消注册导航项
- `api.ui.showNotification(title, type, options)`: 显示通知
- `api.ui.showCustomView(config)`: 显示自定义视图
- `api.ui.prompt(title, message, options)`: 显示输入对话框
- `api.ui.confirm(title, message)`: 显示确认对话框

## 安装和使用

1. 将插件文件夹放置在 `mods` 目录下
2. 在创意工坊页面中启用插件
3. 插件加载后，左侧筛选栏会出现"日期管理"导航项
4. 点击导航项即可使用日程表功能

## 注意事项

- 日程数据存储在本地，卸载插件前请确保数据已保存
- 日期格式：YYYY-MM-DD（例如：2024-01-15）
- 时间格式：HH:mm（例如：14:30）
- 插件需要在支持相应API的环境中运行

## 更新日志

### v1.0.0
- 初始版本
- 基本的日程表功能
- 事件的增删改查
- 月份导航
- 本地数据存储