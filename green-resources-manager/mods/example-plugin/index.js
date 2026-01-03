/**
 * 日期管理插件
 * 
 * 功能：
 * 1. 在左侧导航栏添加日期管理入口
 * 2. 提供简单的日程表功能
 * 3. 支持添加、编辑、删除日程事件
 * 4. 数据本地存储
 */

export default {
  // 插件配置
  config: {
    enabled: true,
    storageKey: 'calendar-events' // 存储键名
  },

  // 当前选中的日期
  currentDate: new Date(),
  
  // 日程事件数据
  events: [],

  // 插件加载时调用
  async onLoad(api) {
    console.log('[日期管理插件] 插件已加载')
    
    // 加载存储的日程数据
    await this.loadEvents(api)
    
    // 注册导航项（在左侧筛选栏添加日期管理导航）
    this.registerNavigation(api)
    
    // 初始化日程表UI
    this.initializeCalendar(api)
    
    api.ui.showNotification('日期管理插件已加载', 'success', {
      duration: 2000
    })
  },

  // 插件卸载时调用
  async onUnload(api) {
    console.log('[日期管理插件] 插件正在卸载')
    
    // 保存日程数据
    await this.saveEvents(api)
    
    // 清理导航项
    this.unregisterNavigation(api)
    
    // 清理UI
    this.cleanupCalendar(api)
    
    api.ui.showNotification('日期管理插件已卸载', 'info')
  },

  // 加载日程事件
  async loadEvents(api) {
    try {
      const stored = await api.storage.get(this.config.storageKey)
      if (stored && Array.isArray(stored)) {
        this.events = stored
        console.log(`[日期管理插件] 已加载 ${this.events.length} 个日程事件`)
      } else {
        this.events = []
      }
    } catch (error) {
      console.error('[日期管理插件] 加载日程数据失败:', error)
      this.events = []
    }
  },

  // 保存日程事件
  async saveEvents(api) {
    try {
      await api.storage.set(this.config.storageKey, this.events)
      console.log('[日期管理插件] 日程数据已保存')
    } catch (error) {
      console.error('[日期管理插件] 保存日程数据失败:', error)
    }
  },

  // 注册导航项
  registerNavigation(api) {
    // 通过API注册新的导航项到左侧筛选栏
    api.navigation.register({
      id: 'calendar-manager',
      name: '日期管理',
      icon: '📅',
      position: 'filter-sidebar', // 在筛选栏显示
      onClick: () => {
        this.showCalendarView(api)
      }
    })
  },

  // 取消注册导航项
  unregisterNavigation(api) {
    api.navigation.unregister('calendar-manager')
  },

  // 显示日程表视图
  showCalendarView(api) {
    // 创建或显示日程表UI
    const calendarHTML = this.generateCalendarHTML()
    
    // 通过API显示自定义视图
    api.ui.showCustomView({
      title: '日程表',
      content: calendarHTML,
      onMount: (container) => {
        this.attachCalendarEvents(container, api)
      }
    })
  },

  // 生成日历HTML
  generateCalendarHTML() {
    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    let html = `
      <div class="calendar-container">
        <div class="calendar-header">
          <button class="calendar-nav-btn" data-action="prev-month">◀</button>
          <h3 class="calendar-title">${year}年 ${month + 1}月</h3>
          <button class="calendar-nav-btn" data-action="next-month">▶</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-weekdays">
            <div class="calendar-weekday">日</div>
            <div class="calendar-weekday">一</div>
            <div class="calendar-weekday">二</div>
            <div class="calendar-weekday">三</div>
            <div class="calendar-weekday">四</div>
            <div class="calendar-weekday">五</div>
            <div class="calendar-weekday">六</div>
          </div>
          <div class="calendar-days">
    `

    // 添加空白单元格（月初之前）
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>'
    }

    // 添加日期单元格
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(year, month, day)
      const dayEvents = this.getEventsForDate(dateStr)
      const hasEvents = dayEvents.length > 0
      
      html += `
        <div class="calendar-day ${hasEvents ? 'has-events' : ''}" data-date="${dateStr}">
          <div class="day-number">${day}</div>
          ${hasEvents ? `<div class="event-indicator">${dayEvents.length}</div>` : ''}
        </div>
      `
    }

    html += `
          </div>
        </div>
        <div class="calendar-events-panel">
          <div class="events-header">
            <h4>日程事件</h4>
            <button class="btn-add-event" data-action="add-event">+ 添加事件</button>
          </div>
          <div class="events-list" id="events-list">
            <!-- 事件列表将在这里动态生成 -->
          </div>
        </div>
      </div>
      <style>
        .calendar-container {
          padding: 20px;
          background: var(--bg-primary, #fff);
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .calendar-nav-btn {
          background: var(--bg-secondary, #f5f5f5);
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
        }
        .calendar-nav-btn:hover {
          background: var(--accent-color, #007bff);
          color: white;
        }
        .calendar-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .calendar-grid {
          border: 1px solid var(--border-color, #ddd);
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: var(--bg-secondary, #f5f5f5);
        }
        .calendar-weekday {
          padding: 12px;
          text-align: center;
          font-weight: 600;
          border-right: 1px solid var(--border-color, #ddd);
        }
        .calendar-weekday:last-child {
          border-right: none;
        }
        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        .calendar-day {
          min-height: 80px;
          padding: 8px;
          border-right: 1px solid var(--border-color, #ddd);
          border-bottom: 1px solid var(--border-color, #ddd);
          cursor: pointer;
          position: relative;
        }
        .calendar-day:nth-child(7n) {
          border-right: none;
        }
        .calendar-day.empty {
          background: var(--bg-tertiary, #fafafa);
          cursor: default;
        }
        .calendar-day:hover:not(.empty) {
          background: var(--bg-secondary, #f0f0f0);
        }
        .calendar-day.has-events {
          background: var(--accent-light, #e3f2fd);
        }
        .day-number {
          font-weight: 500;
        }
        .event-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          background: var(--accent-color, #007bff);
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }
        .calendar-events-panel {
          margin-top: 20px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 8px;
          padding: 16px;
        }
        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .events-header h4 {
          margin: 0;
        }
        .btn-add-event {
          background: var(--accent-color, #007bff);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
        }
        .btn-add-event:hover {
          background: var(--accent-hover, #0056b3);
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .event-item {
          padding: 12px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 4px;
          border-left: 3px solid var(--accent-color, #007bff);
        }
        .event-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .event-title {
          font-weight: 600;
        }
        .event-date {
          font-size: 12px;
          color: var(--text-secondary, #666);
        }
        .event-description {
          font-size: 14px;
          color: var(--text-secondary, #666);
          margin-top: 4px;
        }
        .event-actions {
          display: flex;
          gap: 8px;
        }
        .btn-event-action {
          background: transparent;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-event-action:hover {
          background: var(--bg-tertiary, #e9e9e9);
        }
      </style>
    `

    return html
  },

  // 绑定日历事件
  attachCalendarEvents(container, api) {
    const calendarContainer = container.querySelector('.calendar-container')
    if (!calendarContainer) return

    // 月份导航
    calendarContainer.querySelectorAll('.calendar-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action')
        if (action === 'prev-month') {
          this.currentDate.setMonth(this.currentDate.getMonth() - 1)
        } else if (action === 'next-month') {
          this.currentDate.setMonth(this.currentDate.getMonth() + 1)
        }
        this.refreshCalendar(container, api)
      })
    })

    // 日期点击
    calendarContainer.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
      day.addEventListener('click', (e) => {
        const dateStr = e.currentTarget.getAttribute('data-date')
        this.showDayEvents(dateStr, container, api)
      })
    })

    // 添加事件按钮
    const addBtn = calendarContainer.querySelector('.btn-add-event')
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showAddEventDialog(api)
      })
    }

    // 初始化显示当前日期的事件
    const today = this.formatDate(new Date())
    this.showDayEvents(today, container, api)
  },

  // 刷新日历
  refreshCalendar(container, api) {
    const calendarHTML = this.generateCalendarHTML()
    const oldContainer = container.querySelector('.calendar-container')
    if (oldContainer) {
      oldContainer.outerHTML = calendarHTML
      this.attachCalendarEvents(container, api)
    }
  },

  // 显示某一天的事件
  showDayEvents(dateStr, container, api) {
    const eventsList = container.querySelector('#events-list')
    if (!eventsList) return

    const dayEvents = this.getEventsForDate(dateStr)
    
    if (dayEvents.length === 0) {
      eventsList.innerHTML = '<div style="text-align: center; color: var(--text-secondary, #666); padding: 20px;">这一天没有日程事件</div>'
      return
    }

    eventsList.innerHTML = dayEvents.map(event => `
      <div class="event-item">
        <div class="event-item-header">
          <div>
            <div class="event-title">${this.escapeHtml(event.title)}</div>
            <div class="event-date">${event.time || '全天'}</div>
          </div>
          <div class="event-actions">
            <button class="btn-event-action" data-action="edit" data-id="${event.id}">编辑</button>
            <button class="btn-event-action" data-action="delete" data-id="${event.id}">删除</button>
          </div>
        </div>
        ${event.description ? `<div class="event-description">${this.escapeHtml(event.description)}</div>` : ''}
      </div>
    `).join('')

    // 绑定事件操作
    eventsList.querySelectorAll('.btn-event-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action')
        const eventId = e.target.getAttribute('data-id')
        if (action === 'edit') {
          this.editEvent(eventId, api)
        } else if (action === 'delete') {
          this.deleteEvent(eventId, api)
        }
      })
    })
  },

  // 显示添加事件对话框
  async showAddEventDialog(api) {
    const title = await api.ui.prompt('添加日程事件', '请输入事件标题:')
    if (!title) return

    const description = await api.ui.prompt('事件描述', '请输入事件描述（可选）:', { required: false })
    
    const time = await api.ui.prompt('事件时间', '请输入事件时间（格式：HH:mm，留空表示全天）:', { required: false })

    const dateStr = await api.ui.prompt('事件日期', '请输入日期（格式：YYYY-MM-DD，留空表示今天）:', { required: false }) || this.formatDate(new Date())

    // 创建新事件
    const newEvent = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description ? description.trim() : '',
      date: dateStr,
      time: time ? time.trim() : '',
      createdAt: Date.now()
    }

    this.events.push(newEvent)
    await this.saveEvents(api)
    
    api.ui.showNotification('事件已添加', 'success')
    
    // 刷新日历显示
    this.refreshCalendarView(api)
  },

  // 编辑事件
  async editEvent(eventId, api) {
    const event = this.events.find(e => e.id === eventId)
    if (!event) return

    const title = await api.ui.prompt('编辑事件标题', '请输入新标题:', { default: event.title })
    if (!title) return

    const description = await api.ui.prompt('编辑事件描述', '请输入新描述:', { default: event.description, required: false })
    const time = await api.ui.prompt('编辑事件时间', '请输入新时间:', { default: event.time, required: false })

    event.title = title.trim()
    event.description = description ? description.trim() : ''
    event.time = time ? time.trim() : ''
    event.updatedAt = Date.now()

    await this.saveEvents(api)
    api.ui.showNotification('事件已更新', 'success')
    
    this.refreshCalendarView(api)
  },

  // 删除事件
  async deleteEvent(eventId, api) {
    const confirmed = await api.ui.confirm('确认删除', '确定要删除这个事件吗？')
    if (!confirmed) return

    this.events = this.events.filter(e => e.id !== eventId)
    await this.saveEvents(api)
    
    api.ui.showNotification('事件已删除', 'success')
    
    this.refreshCalendarView(api)
  },

  // 刷新日历视图
  refreshCalendarView(api) {
    // 通过事件通知主应用刷新视图
    window.dispatchEvent(new CustomEvent('calendar-refresh'))
  },

  // 初始化日历
  initializeCalendar(api) {
    // 监听刷新事件
    window.addEventListener('calendar-refresh', () => {
      // 刷新逻辑
    })
  },

  // 清理日历
  cleanupCalendar(api) {
    window.removeEventListener('calendar-refresh', () => {})
  },

  // 获取指定日期的事件
  getEventsForDate(dateStr) {
    return this.events.filter(event => event.date === dateStr)
  },

  // 格式化日期
  formatDate(year, month, day) {
    if (year instanceof Date) {
      const d = year
      year = d.getFullYear()
      month = d.getMonth()
      day = d.getDate()
    }
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  },

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}