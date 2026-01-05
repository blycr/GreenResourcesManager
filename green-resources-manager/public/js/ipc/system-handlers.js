/**
 * @module SystemHandlers
 * @description 管理应用程序的系统信息和外部操作相关的 IPC 处理器。
 *
 * 主要功能:
 * 1. 获取应用版本信息。
 * 2. 获取系统信息（平台、架构、版本等）。
 * 3. 获取磁盘信息（Windows 平台）。
 * 4. 显示系统通知。
 * 5. 打开外部链接或文件。
 * 6. 注册与系统信息相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, app, windowsUtils, shell, getMainWindow)`: 注册 IPC 处理器。
 *
 * IPC 处理器:
 * - `get-app-version`: 获取应用版本。
 * - `get-system-info`: 获取系统信息。
 * - `get-disk-info`: 获取所有物理磁盘信息（Windows）。
 * - `get-disk-type-by-path`: 根据文件路径获取磁盘类型（Windows）。
 * - `show-notification`: 显示系统通知。
 * - `open-external`: 打开外部链接或文件。
 */

const { spawn } = require('child_process')
const { Notification } = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * 注册与系统信息相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Object} app - Electron 的 app 对象。
 * @param {Object} windowsUtils - windows-utils 模块。
 * @param {Object} shell - Electron 的 shell 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 */
function registerIpcHandlers(ipcMain, app, windowsUtils, shell, getMainWindow) {
  // 获取应用版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // 获取系统信息
  ipcMain.handle('get-system-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron
    }
  })

  // 列出逻辑磁盘（盘符）
  ipcMain.handle('list-logical-drives', async () => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, error: '此功能仅在 Windows 系统上可用' }
      }
      return new Promise((resolve) => {
        const powershell = spawn('powershell', [
          '-Command',
          'Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root | ConvertTo-Json -Depth 10'
        ])
        let output = ''
        let errorOutput = ''
        powershell.stdout.on('data', (data) => { output += data.toString() })
        powershell.stderr.on('data', (data) => { errorOutput += data.toString() })
        powershell.on('close', (code) => {
          if (code !== 0) {
            resolve({ success: false, error: errorOutput || '获取逻辑磁盘失败' })
            return
          }
          try {
            const roots = JSON.parse(output.trim())
            const arr = Array.isArray(roots) ? roots : [roots]
            const drives = arr
              .map(r => (typeof r === 'string' ? r : '').trim())
              .filter(r => /^[A-Za-z]:\\$/.test(r))
              .map(r => r.replace(/\\$/,'').toUpperCase())
            resolve({ success: true, drives })
          } catch (e) {
            resolve({ success: false, error: '解析逻辑磁盘失败: ' + e.message })
          }
        })
      })
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 获取所有物理磁盘信息（包括类型：SSD/HDD）
  ipcMain.handle('get-disk-info', async () => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, error: '此功能仅在 Windows 系统上可用' }
      }

      return new Promise((resolve) => {
        // 使用 PowerShell 命令获取磁盘信息
        const powershell = spawn('powershell', [
          '-Command',
          'Get-PhysicalDisk | Select-Object DeviceID, FriendlyName, MediaType, Size, BusType | ConvertTo-Json -Depth 10'
        ])

        let output = ''
        let errorOutput = ''

        powershell.stdout.on('data', (data) => {
          output += data.toString()
        })

        powershell.stderr.on('data', (data) => {
          errorOutput += data.toString()
        })

        powershell.on('close', (code) => {
          if (code !== 0) {
            console.error('获取磁盘信息失败:', errorOutput)
            resolve({ success: false, error: errorOutput || '获取磁盘信息失败' })
            return
          }

          try {
            // 解析 PowerShell 输出的 JSON
            const disks = JSON.parse(output.trim())
            // 如果是单个对象，转换为数组
            const diskArray = Array.isArray(disks) ? disks : [disks]

            // 格式化磁盘信息
            const formattedDisks = diskArray.map(disk => ({
              deviceId: disk.DeviceID,
              friendlyName: disk.FriendlyName || '未知磁盘',
              mediaType: disk.MediaType || 'Unknown', // SSD, HDD, 或其他
              size: disk.Size || 0,
              busType: disk.BusType || 'Unknown',
              sizeGB: disk.Size ? Math.round(disk.Size / (1024 * 1024 * 1024)) : 0
            }))

            resolve({ success: true, disks: formattedDisks })
          } catch (parseError) {
            console.error('解析磁盘信息失败:', parseError, '原始输出:', output)
            resolve({ success: false, error: '解析磁盘信息失败: ' + parseError.message })
          }
        })
      })
    } catch (error) {
      console.error('获取磁盘信息异常:', error)
      return { success: false, error: error.message }
    }
  })

  // 压缩文件或文件夹
  ipcMain.handle('compress-file', async (event, sourcePath, archivePath) => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, error: '此功能仅在 Windows 系统上可用' }
      }

      const fs = require('fs')
      const path = require('path')
      const { spawn } = require('child_process')

      // 检查源文件/文件夹是否存在
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '源文件或文件夹不存在' }
      }

      // 检测 WinRAR
      const winrarResult = await new Promise((resolve) => {
        const possiblePaths = [
          'C:\\Program Files\\WinRAR\\WinRAR.exe',
          'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'WinRAR.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'WinRAR.exe')
        ]

        for (const winrarPath of possiblePaths) {
          if (fs.existsSync(winrarPath)) {
            resolve({ found: true, path: winrarPath })
            return
          }
        }

        // 尝试通过注册表查找
        try {
          const { execSync } = require('child_process')
          const regQuery = 'reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe64" 2>nul || reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe32" 2>nul'
          const result = execSync(regQuery, { encoding: 'utf-8', timeout: 3000 })
          const pathMatch = result.match(/REG_SZ\s+(.+)/i)
          if (pathMatch && pathMatch[1]) {
            const regPath = pathMatch[1].trim()
            if (fs.existsSync(regPath)) {
              resolve({ found: true, path: regPath })
              return
            }
          }
        } catch (regError) {
          // 注册表查询失败，继续
        }

        resolve({ found: false })
      })

      // 检测 7-Zip
      const sevenZipResult = await new Promise((resolve) => {
        const possiblePaths = [
          'C:\\Program Files\\7-Zip\\7z.exe',
          'C:\\Program Files (x86)\\7-Zip\\7z.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', '7-Zip', '7z.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', '7-Zip', '7z.exe')
        ]

        for (const sevenZipPath of possiblePaths) {
          if (fs.existsSync(sevenZipPath)) {
            resolve({ found: true, path: sevenZipPath })
            return
          }
        }

        resolve({ found: false })
      })

      // 选择压缩工具（优先 WinRAR，其次 7-Zip）
      let compressTool = null
      let command = null
      let args = []

      if (winrarResult.found) {
        compressTool = winrarResult.path
        command = compressTool
        // WinRAR 压缩命令: WinRAR a -r -ep1 "archive.zip" "source\"
        // a = 添加文件到压缩包
        // -r = 递归处理子文件夹
        // -ep1 = 从路径中排除基本文件夹
        args = ['a', '-r', '-ep1', archivePath, sourcePath]
      } else if (sevenZipResult.found) {
        compressTool = sevenZipResult.path
        command = compressTool
        // 7-Zip 压缩命令: 7z a "archive.zip" "source\" -r
        args = ['a', archivePath, sourcePath, '-r']
      } else {
        return { success: false, error: '未找到 WinRAR 或 7-Zip，请先安装压缩工具' }
      }

      console.log('使用压缩工具:', command)
      console.log('压缩参数:', args)
      console.log('源路径:', sourcePath)
      console.log('压缩包路径:', archivePath)

      // 执行压缩命令
      return new Promise((resolve) => {
        const childProcess = spawn(command, args, {
          cwd: path.dirname(command),
          shell: false,
          windowsVerbatimArguments: false
        })

        let stdout = ''
        let stderr = ''

        childProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        childProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        childProcess.on('close', (code) => {
          if (code === 0 || code === null) {
            console.log('✅ 压缩成功')
            resolve({
              success: true,
              archivePath: archivePath,
              message: '压缩成功'
            })
          } else {
            console.error('❌ 压缩失败，退出码:', code)
            console.error('stdout:', stdout)
            console.error('stderr:', stderr)
            resolve({
              success: false,
              error: `压缩失败 (退出码: ${code}): ${stderr || stdout || '未知错误'}`
            })
          }
        })

        childProcess.on('error', (error) => {
          console.error('❌ 压缩进程错误:', error)
          resolve({
            success: false,
            error: `压缩进程错误: ${error.message}`
          })
        })
      })
    } catch (error) {
      console.error('压缩文件异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // 根据文件路径获取所在磁盘的类型（SSD/HDD）
  ipcMain.handle('get-disk-type-by-path', async (event, filePath) => {
    try {
      return await windowsUtils.getDiskType(filePath)
    } catch (error) {
      console.error('获取磁盘类型失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 显示系统通知
  ipcMain.handle('show-notification', (event, title, body) => {
    try {
      if (Notification.isSupported()) {
        const mainWindow = getMainWindow()
        const iconPath = path.join(__dirname, '../../butter-icon.ico')
        
        const notification = new Notification({
          title: title,
          body: body,
          icon: iconPath,
          silent: false
        })

        notification.show()

        // 可选：点击通知时的处理
        notification.on('click', () => {
          console.log('通知被点击')
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show()
            mainWindow.focus()
          }
        })

        console.log('系统通知已显示:', title, body)
      } else {
        console.log('系统不支持通知:', title, body)
      }
    } catch (error) {
      console.error('显示通知失败:', error)
      console.log('通知内容:', title, body)
    }
  })

  // 打开外部链接或文件（使用系统默认程序）
  ipcMain.handle('open-external', async (event, urlOrPath) => {
    try {
      console.log('=== Electron: 开始打开外部链接/文件 ===')
      console.log('URL/路径:', urlOrPath)

      if (!urlOrPath) {
        console.log('❌ URL/路径为空')
        return { success: false, error: '无效的URL或路径' }
      }

      // 检查是否是URL（以http://或https://开头）
      if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
        console.log('✅ 检测到URL，正在调用 shell.openExternal...')
        await shell.openExternal(urlOrPath)
        console.log('✅ URL打开成功')
        return { success: true }
      }

      // 对于本地文件路径，检查文件是否存在
      const fs = require('fs')
      if (!fs.existsSync(urlOrPath)) {
        console.log('❌ 文件不存在:', urlOrPath)
        return { success: false, error: '文件不存在' }
      }

      console.log('✅ 文件存在，正在调用 shell.openPath...')
      const result = await shell.openPath(urlOrPath)
      console.log('shell.openPath 返回结果:', result)

      if (result) {
        // openPath 返回非空字符串表示错误信息
        console.log('❌ 打开文件失败，错误信息:', result)
        return { success: false, error: result }
      }

      console.log('✅ 文件打开成功')
      return { success: true }
    } catch (error) {
      console.error('❌ 打开外部文件失败:', error)
      console.error('错误堆栈:', error.stack)
      return { success: false, error: error.message }
    }
  })

  // 检测 WinRAR 是否已安装
  ipcMain.handle('check-winrar-installed', async () => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, installed: false, error: '此功能仅在 Windows 系统上可用' }
      }

      const fs = require('fs')
      const path = require('path')

      // WinRAR 常见的安装路径
      const possiblePaths = [
        'C:\\Program Files\\WinRAR\\WinRAR.exe',
        'C:\\Program Files\\WinRAR\\unrar.exe',
        'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
        'C:\\Program Files (x86)\\WinRAR\\unrar.exe',
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'WinRAR.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'WinRAR.exe'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'unrar.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'unrar.exe')
      ]

      // 检查每个可能的路径
      for (const winrarPath of possiblePaths) {
        if (fs.existsSync(winrarPath)) {
          console.log('✅ 找到 WinRAR:', winrarPath)
          return {
            success: true,
            installed: true,
            path: winrarPath,
            executable: path.basename(winrarPath) // WinRAR.exe 或 unrar.exe
          }
        }
      }

      // 如果常见路径都没找到，尝试通过注册表查找（Windows）
      try {
        const { execSync } = require('child_process')
        // 查询注册表中 WinRAR 的安装路径
        const regQuery = 'reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe64" 2>nul || reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe32" 2>nul'
        const result = execSync(regQuery, { encoding: 'utf-8', timeout: 3000 })
        
        // 解析注册表输出，查找路径
        const pathMatch = result.match(/REG_SZ\s+(.+)/i)
        if (pathMatch && pathMatch[1]) {
          const regPath = pathMatch[1].trim()
          if (fs.existsSync(regPath)) {
            console.log('✅ 通过注册表找到 WinRAR:', regPath)
            return {
              success: true,
              installed: true,
              path: regPath,
              executable: path.basename(regPath)
            }
          }
        }
      } catch (regError) {
        // 注册表查询失败，继续使用文件系统检测结果
        console.log('注册表查询失败（可能未安装）:', regError.message)
      }

      console.log('❌ 未找到 WinRAR')
      return {
        success: true,
        installed: false,
        path: null,
        executable: null
      }
    } catch (error) {
      console.error('检测 WinRAR 安装状态失败:', error)
      return {
        success: false,
        installed: false,
        error: error.message
      }
    }
  })

  // 解压压缩包文件
  ipcMain.handle('extract-archive', async (event, archivePath, outputDir, password) => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, error: '此功能仅在 Windows 系统上可用' }
      }

      const fs = require('fs')
      const path = require('path')
      const { spawn } = require('child_process')

      // 检查压缩包文件是否存在
      if (!fs.existsSync(archivePath)) {
        return { success: false, error: '压缩包文件不存在' }
      }

      // 检查输出目录是否存在，不存在则创建
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // 检测 WinRAR（优先查找 unrar.exe，因为它是纯命令行工具，不会弹出 GUI）
      const winrarResult = await new Promise((resolve) => {
        // 优先查找 unrar.exe（纯命令行工具，不会弹出 GUI）
        const unrarPaths = [
          'C:\\Program Files\\WinRAR\\unrar.exe',
          'C:\\Program Files (x86)\\WinRAR\\unrar.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'unrar.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'unrar.exe')
        ]

        for (const unrarPath of unrarPaths) {
          if (fs.existsSync(unrarPath)) {
            resolve({ found: true, path: unrarPath, isUnrar: true })
            return
          }
        }

        // 如果找不到 unrar.exe，再查找 WinRAR.exe
        const winrarPaths = [
          'C:\\Program Files\\WinRAR\\WinRAR.exe',
          'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'WinRAR.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'WinRAR.exe')
        ]

        for (const winrarPath of winrarPaths) {
          if (fs.existsSync(winrarPath)) {
            resolve({ found: true, path: winrarPath, isUnrar: false })
            return
          }
        }

        // 尝试通过注册表查找
        try {
          const { execSync } = require('child_process')
          const regQuery = 'reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe64" 2>nul || reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe32" 2>nul'
          const result = execSync(regQuery, { encoding: 'utf-8', timeout: 3000 })
          const pathMatch = result.match(/REG_SZ\s+(.+)/i)
          if (pathMatch && pathMatch[1]) {
            const regPath = pathMatch[1].trim()
            if (fs.existsSync(regPath)) {
              // 检查注册表路径是否是 unrar.exe
              const isUnrar = path.basename(regPath).toLowerCase() === 'unrar.exe'
              resolve({ found: true, path: regPath, isUnrar: isUnrar })
              return
            }
          }
        } catch (regError) {
          // 注册表查询失败，继续
        }

        resolve({ found: false })
      })

      // 检测 7-Zip
      const sevenZipResult = await new Promise((resolve) => {
        const possiblePaths = [
          'C:\\Program Files\\7-Zip\\7z.exe',
          'C:\\Program Files (x86)\\7-Zip\\7z.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', '7-Zip', '7z.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', '7-Zip', '7z.exe')
        ]

        for (const sevenZipPath of possiblePaths) {
          if (fs.existsSync(sevenZipPath)) {
            resolve({ found: true, path: sevenZipPath })
            return
          }
        }

        resolve({ found: false })
      })

      // 选择解压工具（优先 WinRAR，其次 7-Zip）
      let extractTool = null
      let extractCommand = null
      let extractArgs = []

      if (winrarResult.found) {
        extractTool = winrarResult.path
        const isUnrar = winrarResult.isUnrar || path.basename(extractTool).toLowerCase() === 'unrar.exe'
        
        if (isUnrar) {
          // 使用 unrar.exe（纯命令行工具，不会弹出 GUI）
          extractCommand = extractTool
          extractArgs = ['x', '-o+', `"${archivePath}"`, `"${outputDir}\\"`]
        } else {
          // 使用 WinRAR.exe（GUI 程序，如果没有提供密码会弹出密码输入框）
          // 如果压缩包有密码但没有提供密码参数，WinRAR.exe 会自动弹出 GUI 密码输入框
          extractCommand = extractTool
          extractArgs = ['x', '-o+', `"${archivePath}"`, `"${outputDir}\\"`]
        }
      } else if (sevenZipResult.found) {
        extractTool = sevenZipResult.path
        extractCommand = extractTool
        extractArgs = ['x', `"${archivePath}"`, `-o"${outputDir}\\"`, '-y']
      } else {
        return { success: false, error: '未找到 WinRAR 或 7-Zip，请先安装解压工具' }
      }

      console.log('使用解压工具:', extractCommand)
      console.log('解压参数:', extractArgs)
      console.log('压缩包路径:', archivePath)
      console.log('输出目录:', outputDir)

      // 执行解压命令
      return new Promise((resolve) => {
        const isUnrar = winrarResult.found && (winrarResult.isUnrar || path.basename(extractCommand).toLowerCase() === 'unrar.exe')
        const isWinRAR = winrarResult.found && !isUnrar && extractCommand.toLowerCase().includes('winrar')
        const is7Zip = extractCommand.toLowerCase().includes('7z')

        let command = extractCommand
        let args = []

        if (isUnrar) {
          // unrar.exe 命令格式: unrar x -o+ -p<password> "archive.rar" "output\"
          // unrar.exe 是纯命令行工具，不会弹出 GUI，如果没有密码会返回错误
          if (password) {
            args = ['x', '-o+', `-p${password}`, archivePath, outputDir + '\\']
          } else {
            args = ['x', '-o+', archivePath, outputDir + '\\']
          }
        } else if (isWinRAR) {
          // WinRAR.exe 命令格式: WinRAR x -o+ -p<password> "archive.rar" "output\"
          // WinRAR.exe 是 GUI 程序，如果没有提供密码且压缩包有密码，会自动弹出 GUI 密码输入框
          // 注意：WinRAR.exe 在遇到密码保护的压缩包时，如果没有提供 -p 参数，会阻塞并弹出密码输入框
          // 这会导致我们的 Promise 一直等待，直到用户输入密码或取消
          if (password) {
            args = ['x', '-o+', `-p${password}`, archivePath, outputDir + '\\']
          } else {
            // 没有密码时，如果压缩包有密码，WinRAR.exe 会弹出密码输入框
            // 使用 -ibck 参数可以让 WinRAR 在后台运行，但这可能无法阻止密码输入框
            // 尝试使用 -ibck 参数
            args = ['x', '-o+', '-ibck', archivePath, outputDir + '\\']
            console.log('⚠️ 警告: 使用 WinRAR.exe 且未提供密码，如果压缩包有密码，可能会弹出密码输入框')
          }
        } else if (is7Zip) {
          // 7z.exe 命令格式: 7z x "archive.zip" -o"output\" -p<password> -y
          if (password) {
            args = ['x', archivePath, `-o${outputDir}\\`, `-p${password}`, '-y']
          } else {
            args = ['x', archivePath, `-o${outputDir}\\`, '-y']
          }
        } else {
          // 默认尝试 WinRAR 格式
          if (password) {
            args = ['x', '-o+', `-p${password}`, archivePath, outputDir + '\\']
          } else {
            args = ['x', '-o+', archivePath, outputDir + '\\']
          }
        }

        console.log('=== 解压命令信息 ===')
        console.log('使用工具:', isUnrar ? 'unrar.exe' : isWinRAR ? 'WinRAR.exe' : is7Zip ? '7z.exe' : '未知')
        console.log('执行命令:', command)
        console.log('命令参数:', args)
        console.log('压缩包路径:', archivePath)
        console.log('输出目录:', outputDir)
        console.log('是否提供密码:', password ? '是 (' + password.replace(/./g, '*') + ')' : '否')
        console.log('==================')

        const childProcess = spawn(command, args, {
          cwd: path.dirname(extractCommand),
          shell: false, // 不使用 shell，直接执行命令
          windowsVerbatimArguments: false
        })

        let stdout = ''
        let stderr = ''
        let hasOutput = false

        childProcess.stdout.on('data', (data) => {
          const text = data.toString()
          stdout += text
          hasOutput = true
          console.log('[stdout]', text)
        })

        childProcess.stderr.on('data', (data) => {
          const text = data.toString()
          stderr += text
          hasOutput = true
          console.log('[stderr]', text)
        })

        childProcess.on('close', (code) => {
          console.log('=== 解压结果 ===')
          console.log('退出码:', code)
          console.log('stdout 长度:', stdout.length)
          console.log('stderr 长度:', stderr.length)
          console.log('是否有输出:', hasOutput)
          
          if (stdout) {
            console.log('stdout 内容:', stdout.substring(0, 500)) // 只打印前500字符
          }
          if (stderr) {
            console.log('stderr 内容:', stderr.substring(0, 500)) // 只打印前500字符
          }
          
          if (code === 0 || code === null) {
            console.log('✅ 解压成功')
            resolve({
              success: true,
              outputDir: outputDir,
              message: '解压成功'
            })
          } else {
            console.error('❌ 解压失败，退出码:', code)
            
            // 检查是否是密码错误
            const output = (stdout + stderr).toLowerCase()
            console.log('检查输出中是否包含密码相关关键词...')
            
            const passwordKeywords = [
              'password',
              '密码',
              'wrong password',
              'incorrect password',
              'password is wrong',
              'wrong password for',
              'enter password',
              '请输入密码',
              'bad password',
              'invalid password'
            ]
            
            const foundKeywords = passwordKeywords.filter(keyword => output.includes(keyword))
            console.log('找到的密码关键词:', foundKeywords)
            
            // WinRAR 退出码说明：
            // 0 = 成功
            // 1 = 警告
            // 2 = 致命错误
            // 10 = 无文件
            // 11 = 密码错误（通常）
            // unrar.exe 退出码 10 通常也表示密码错误
            const isWinRARPasswordError = (isWinRAR || isUnrar) && (code === 11 || code === 10)
            const hasPasswordKeywords = foundKeywords.length > 0
            const requiresPassword = hasPasswordKeywords || isWinRARPasswordError || (code === 10 && output.length > 0)
            
            console.log('退出码:', code)
            console.log('是否 WinRAR/unrar:', isWinRAR || isUnrar)
            console.log('是否 WinRAR 密码错误退出码 (11/10):', isWinRARPasswordError)
            console.log('是否有密码关键词:', hasPasswordKeywords)
            console.log('判断结果 - 需要密码:', requiresPassword)
            console.log('==================')
            
            resolve({
              success: false,
              error: `解压失败 (退出码: ${code}): ${stderr || stdout || '未知错误'}`,
              requiresPassword: requiresPassword
            })
          }
        })

        childProcess.on('error', (error) => {
          console.error('❌ 解压进程错误:', error)
          resolve({
            success: false,
            error: `解压进程错误: ${error.message}`
          })
        })
      })
    } catch (error) {
      console.error('解压文件异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // 获取真正的 SaveData 目录路径（考虑自定义路径）
  function getSaveDataDirectory() {
    try {
      // 先尝试从设置文件读取自定义路径
      const defaultSaveDataPath = path.join(process.cwd(), 'SaveData')
      const settingsPath = path.join(defaultSaveDataPath, 'Settings', 'settings.json')
      
      if (fs.existsSync(settingsPath)) {
        try {
          const settingsData = fs.readFileSync(settingsPath, 'utf8')
          const settings = JSON.parse(settingsData)
          
          if (settings.settings && settings.settings.saveDataLocation === 'custom' && settings.settings.saveDataPath) {
            // 使用自定义路径
            const customPath = path.join(settings.settings.saveDataPath, 'SaveData')
            console.log('使用自定义 SaveData 路径:', customPath)
            return customPath
          }
        } catch (error) {
          console.warn('读取设置文件失败，使用默认路径:', error)
        }
      }
      
      // 使用默认路径
      console.log('使用默认 SaveData 路径:', defaultSaveDataPath)
      return defaultSaveDataPath
    } catch (error) {
      console.error('获取 SaveData 路径失败:', error)
      // 降级到默认路径
      return path.join(process.cwd(), 'SaveData')
    }
  }

  // 测试压缩包密码（不实际解压，只验证密码）
  ipcMain.handle('test-archive-password', async (event, archivePath, password) => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, error: '此功能仅在 Windows 系统上可用' }
      }

      const fs = require('fs')
      const path = require('path')
      const { spawn } = require('child_process')

      // 检查压缩包文件是否存在
      if (!fs.existsSync(archivePath)) {
        return { success: false, error: '压缩包文件不存在' }
      }

      // 检测 WinRAR
      const winrarResult = await new Promise((resolve) => {
        console.log('=== 开始检测 WinRAR/unrar.exe ===')
        
        // 优先查找 unrar.exe（纯命令行工具，不会弹出 GUI）
        const unrarPaths = [
          'C:\\Program Files\\WinRAR\\unrar.exe',
          'C:\\Program Files (x86)\\WinRAR\\unrar.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'unrar.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'unrar.exe')
        ]

        console.log('检查标准路径中的 unrar.exe...')
        for (const unrarPath of unrarPaths) {
          console.log('  检查:', unrarPath, fs.existsSync(unrarPath) ? '✅ 找到' : '❌ 不存在')
          if (fs.existsSync(unrarPath)) {
            console.log('✅ 找到 unrar.exe:', unrarPath)
            resolve({ found: true, path: unrarPath, isUnrar: true })
            return
          }
        }

        // 如果找不到 unrar.exe，再查找 WinRAR.exe
        const winrarPaths = [
          'C:\\Program Files\\WinRAR\\WinRAR.exe',
          'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'WinRAR.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'WinRAR.exe')
        ]

        console.log('检查标准路径中的 WinRAR.exe...')
        for (const winrarPath of winrarPaths) {
          console.log('  检查:', winrarPath, fs.existsSync(winrarPath) ? '✅ 找到' : '❌ 不存在')
          if (fs.existsSync(winrarPath)) {
            // 如果找到 WinRAR.exe，检查同目录下是否有 unrar.exe
            const winrarDir = path.dirname(winrarPath)
            const unrarInSameDir = path.join(winrarDir, 'unrar.exe')
            console.log('  检查同目录下的 unrar.exe:', unrarInSameDir, fs.existsSync(unrarInSameDir) ? '✅ 找到' : '❌ 不存在')
            if (fs.existsSync(unrarInSameDir)) {
              console.log('✅ 在同目录找到 unrar.exe:', unrarInSameDir)
              resolve({ found: true, path: unrarInSameDir, isUnrar: true })
              return
            }
            console.log('⚠️ 找到 WinRAR.exe，但同目录下没有 unrar.exe:', winrarPath)
            resolve({ found: true, path: winrarPath, isUnrar: false })
            return
          }
        }

        // 尝试通过注册表查找
        console.log('通过注册表查找 WinRAR...')
        try {
          const { execSync } = require('child_process')
          const regQuery = 'reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe64" 2>nul || reg query "HKLM\\SOFTWARE\\WinRAR" /v "exe32" 2>nul'
          const result = execSync(regQuery, { encoding: 'utf-8', timeout: 3000 })
          const pathMatch = result.match(/REG_SZ\s+(.+)/i)
          if (pathMatch && pathMatch[1]) {
            const regPath = pathMatch[1].trim()
            console.log('  注册表路径:', regPath, fs.existsSync(regPath) ? '✅ 存在' : '❌ 不存在')
            if (fs.existsSync(regPath)) {
              const isUnrar = path.basename(regPath).toLowerCase() === 'unrar.exe'
              console.log('  是否为 unrar.exe:', isUnrar)
              
              // 如果注册表找到的是 WinRAR.exe，检查同目录下是否有 unrar.exe
              if (!isUnrar) {
                const regDir = path.dirname(regPath)
                const unrarInSameDir = path.join(regDir, 'unrar.exe')
                console.log('  检查同目录下的 unrar.exe:', unrarInSameDir, fs.existsSync(unrarInSameDir) ? '✅ 找到' : '❌ 不存在')
                if (fs.existsSync(unrarInSameDir)) {
                  console.log('✅ 在同目录找到 unrar.exe:', unrarInSameDir)
                  resolve({ found: true, path: unrarInSameDir, isUnrar: true })
                  return
                }
              }
              
              console.log('✅ 使用注册表找到的工具:', regPath, isUnrar ? '(unrar.exe)' : '(WinRAR.exe)')
              resolve({ found: true, path: regPath, isUnrar: isUnrar })
              return
            }
          }
        } catch (regError) {
          console.log('  注册表查询失败:', regError.message)
        }

        console.log('❌ 未找到 WinRAR 或 unrar.exe')
        resolve({ found: false })
      })

      if (!winrarResult.found) {
        return { success: false, error: '未找到 WinRAR 或 unrar.exe' }
      }

      const extractTool = winrarResult.path
      const isUnrar = winrarResult.isUnrar || path.basename(extractTool).toLowerCase() === 'unrar.exe'
      const isWinRAR = !isUnrar && extractTool.toLowerCase().includes('winrar')

      // 使用测试命令（t）来验证密码，而不是实际解压
      // WinRAR: WinRAR t -p<password> "archive.rar"
      // unrar: unrar t -p<password> "archive.rar"
      let command = extractTool
      let args = []

      if (isUnrar) {
        // unrar.exe 测试命令: unrar t -p<password> "archive.rar"
        args = ['t', `-p${password}`, archivePath]
      } else if (isWinRAR) {
        // WinRAR.exe 测试命令: WinRAR t -p<password> "archive.rar"
        // 使用 -ibck 参数让 WinRAR 在后台运行，避免弹出 GUI
        args = ['t', `-p${password}`, '-ibck', archivePath]
      } else {
        args = ['t', `-p${password}`, archivePath]
      }

      console.log('=== 测试密码 ===')
      console.log('使用工具:', isUnrar ? 'unrar.exe' : isWinRAR ? 'WinRAR.exe' : '未知')
      console.log('命令:', command)
      console.log('参数:', args)
      console.log('压缩包:', archivePath)
      console.log('密码:', password.replace(/./g, '*'))
      console.log('==================')

      return new Promise((resolve) => {
        const childProcess = spawn(command, args, {
          cwd: path.dirname(command),
          shell: false,
          windowsVerbatimArguments: false
        })

        let stdout = ''
        let stderr = ''

        childProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        childProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        childProcess.on('close', (code) => {
          console.log('=== 密码测试结果 ===')
          console.log('退出码:', code)
          console.log('stdout 长度:', stdout.length)
          console.log('stderr 长度:', stderr.length)
          
          // 退出码 0 表示测试成功（密码正确）
          // 退出码 11 通常表示密码错误
          // 退出码 10 也可能表示密码错误
          const passwordCorrect = code === 0 || code === null
          const passwordError = (isUnrar || isWinRAR) && (code === 11 || code === 10)
          
          console.log('密码是否正确:', passwordCorrect)
          console.log('==================')
          
          if (passwordCorrect) {
            resolve({
              success: true,
              passwordCorrect: true,
              message: '密码正确'
            })
          } else if (passwordError) {
            resolve({
              success: true,
              passwordCorrect: false,
              message: '密码错误',
              exitCode: code
            })
          } else {
            // 其他错误
            resolve({
              success: false,
              passwordCorrect: false,
              error: `测试失败 (退出码: ${code}): ${stderr || stdout || '未知错误'}`,
              exitCode: code
            })
          }
        })

        childProcess.on('error', (error) => {
          console.error('❌ 测试密码进程错误:', error)
          resolve({
            success: false,
            passwordCorrect: false,
            error: `测试进程错误: ${error.message}`
          })
        })
      })
    } catch (error) {
      console.error('测试密码异常:', error)
      return {
        success: false,
        passwordCorrect: false,
        error: error.message
      }
    }
  })

  // 读取常用密码列表
  ipcMain.handle('read-archive-passwords', async () => {
    try {
      // 获取真正的 SaveData 目录路径
      const saveDataDir = getSaveDataDirectory()
      // 密码文件路径：SaveData/passwords.txt
      const passwordsPath = path.join(saveDataDir, 'passwords.txt')
      
      let fileCreated = false
      
      // 如果文件不存在，创建默认文件
      if (!fs.existsSync(passwordsPath)) {
        console.log('📝 密码文件不存在，创建默认文件...')
        const defaultPasswords = [
          '123456',
          'password',
          '1234',
          '12345',
          '12345678',
          '123456789',
          '1234567890',
          '000000',
          '888888',
          '666666'
        ].join('\n')
        
        // 确保目录存在
        const passwordsDir = path.dirname(passwordsPath)
        if (!fs.existsSync(passwordsDir)) {
          fs.mkdirSync(passwordsDir, { recursive: true })
        }
        
        // 创建默认密码文件
        fs.writeFileSync(passwordsPath, defaultPasswords, 'utf8')
        console.log('✅ 创建默认密码文件:', passwordsPath)
        fileCreated = true
      }
      
      // 读取密码文件
      const content = fs.readFileSync(passwordsPath, 'utf8')
      const passwords = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      return {
        success: true,
        passwords: passwords,
        filePath: passwordsPath,
        fileCreated: fileCreated // 标记文件是否是新创建的
      }
    } catch (error) {
      console.error('读取密码文件失败:', error)
      return {
        success: false,
        passwords: [],
        error: error.message
      }
    }
  })

  // 写入密码列表到文件
  ipcMain.handle('write-archive-passwords', async (event, passwords) => {
    try {
      // 获取真正的 SaveData 目录路径
      const saveDataDir = getSaveDataDirectory()
      const passwordsPath = path.join(saveDataDir, 'passwords.txt')
      
      // 确保目录存在
      const passwordsDir = path.dirname(passwordsPath)
      if (!fs.existsSync(passwordsDir)) {
        fs.mkdirSync(passwordsDir, { recursive: true })
      }
      
      // 写入密码文件（每行一个密码）
      const content = Array.isArray(passwords) 
        ? passwords.join('\n') 
        : passwords
      
      fs.writeFileSync(passwordsPath, content, 'utf8')
      
      return {
        success: true,
        filePath: passwordsPath
      }
    } catch (error) {
      console.error('写入密码文件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // 获取文件图标（主要用于 exe 文件）
  ipcMain.handle('get-file-icon', async (event, filePath, size = 32) => {
    try {
      if (process.platform !== 'win32') {
        return { success: false, error: '此功能仅在 Windows 系统上可用' }
      }

      const { nativeImage } = require('electron')
      const fs = require('fs')

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' }
      }

      // 检查是否为 exe 文件
      const ext = path.extname(filePath).toLowerCase()
      if (ext !== '.exe' && ext !== '.lnk') {
        return { success: false, error: '仅支持 .exe 和 .lnk 文件' }
      }

      // 使用 Electron 的 app.getFileIcon 方法（如果可用）
      if (app.getFileIcon) {
        try {
          const icon = await app.getFileIcon(filePath, { size: size === 16 ? 'small' : 'normal' })
          if (icon && !icon.isEmpty()) {
            // 转换为 base64 data URL
            const pngBuffer = icon.toPNG()
            const base64 = pngBuffer.toString('base64')
            const dataUrl = `data:image/png;base64,${base64}`
            return { success: true, icon: dataUrl }
          }
        } catch (iconError) {
          console.warn('使用 app.getFileIcon 失败，尝试备用方法:', iconError.message)
        }
      }

      // 备用方法：使用 PowerShell 提取图标
      return new Promise((resolve) => {
        // 转义 PowerShell 字符串中的特殊字符
        const escapedPath = filePath.replace(/'/g, "''").replace(/\$/g, '`$')
        
        const powershell = spawn('powershell', [
          '-Command',
          `
          try {
            Add-Type -AssemblyName System.Drawing
            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${escapedPath}')
            if ($icon) {
              $bitmap = $icon.ToBitmap()
              $ms = New-Object System.IO.MemoryStream
              $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
              $bytes = $ms.ToArray()
              $base64 = [Convert]::ToBase64String($bytes)
              Write-Output $base64
              $icon.Dispose()
              $bitmap.Dispose()
              $ms.Dispose()
            } else {
              Write-Output "ERROR: 无法提取图标"
            }
          } catch {
            Write-Output "ERROR: $($_.Exception.Message)"
          }
          `
        ])
        
        // 设置超时（5秒）
        const timeout = setTimeout(() => {
          if (powershell && !powershell.killed) {
            powershell.kill()
          }
          resolve({ success: false, error: '提取图标超时' })
        }, 5000)

        let output = ''
        let errorOutput = ''

        powershell.stdout.on('data', (data) => {
          output += data.toString()
        })

        powershell.stderr.on('data', (data) => {
          errorOutput += data.toString()
        })

        powershell.on('close', (code) => {
          clearTimeout(timeout)
          if (code !== 0 || errorOutput) {
            console.error('提取图标失败:', errorOutput)
            resolve({ success: false, error: errorOutput || '提取图标失败' })
            return
          }

          const base64 = output.trim()
          if (base64 && !base64.startsWith('ERROR:')) {
            const dataUrl = `data:image/png;base64,${base64}`
            resolve({ success: true, icon: dataUrl })
          } else {
            resolve({ success: false, error: '无法提取图标' })
          }
        })
        
        powershell.on('error', (error) => {
          clearTimeout(timeout)
          console.error('PowerShell 进程错误:', error)
          resolve({ success: false, error: error.message || 'PowerShell 进程启动失败' })
        })
      })
    } catch (error) {
      console.error('获取文件图标异常:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerIpcHandlers
}

