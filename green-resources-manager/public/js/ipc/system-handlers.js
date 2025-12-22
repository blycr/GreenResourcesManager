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
  ipcMain.handle('extract-archive', async (event, archivePath, outputDir) => {
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

      // 检测 WinRAR
      const winrarResult = await new Promise((resolve) => {
        const possiblePaths = [
          'C:\\Program Files\\WinRAR\\WinRAR.exe',
          'C:\\Program Files\\WinRAR\\unrar.exe',
          'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
          'C:\\Program Files (x86)\\WinRAR\\unrar.exe',
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

      // 选择解压工具（优先 WinRAR，其次 7-Zip）
      let extractTool = null
      let extractCommand = null
      let extractArgs = []

      if (winrarResult.found) {
        extractTool = winrarResult.path
        const isUnrar = path.basename(extractTool).toLowerCase() === 'unrar.exe'
        
        if (isUnrar) {
          // 使用 unrar.exe
          extractCommand = extractTool
          extractArgs = ['x', '-o+', `"${archivePath}"`, `"${outputDir}\\"`]
        } else {
          // 使用 WinRAR.exe
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
        const isUnrar = path.basename(extractCommand).toLowerCase() === 'unrar.exe'
        const isWinRAR = extractCommand.toLowerCase().includes('winrar')
        const is7Zip = extractCommand.toLowerCase().includes('7z')

        let command = extractCommand
        let args = []

        if (isUnrar) {
          // unrar.exe 命令格式: unrar x -o+ "archive.rar" "output\"
          args = ['x', '-o+', archivePath, outputDir + '\\']
        } else if (isWinRAR) {
          // WinRAR.exe 命令格式: WinRAR x -o+ "archive.rar" "output\"
          args = ['x', '-o+', archivePath, outputDir + '\\']
        } else if (is7Zip) {
          // 7z.exe 命令格式: 7z x "archive.zip" -o"output\" -y
          args = ['x', archivePath, `-o${outputDir}\\`, '-y']
        } else {
          // 默认尝试 WinRAR 格式
          args = ['x', '-o+', archivePath, outputDir + '\\']
        }

        console.log('执行解压命令:', command)
        console.log('命令参数:', args)

        const childProcess = spawn(command, args, {
          cwd: path.dirname(extractCommand),
          shell: false, // 不使用 shell，直接执行命令
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
            console.log('✅ 解压成功')
            resolve({
              success: true,
              outputDir: outputDir,
              message: '解压成功'
            })
          } else {
            console.error('❌ 解压失败，退出码:', code)
            console.error('stdout:', stdout)
            console.error('stderr:', stderr)
            resolve({
              success: false,
              error: `解压失败 (退出码: ${code}): ${stderr || stdout || '未知错误'}`
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
}

module.exports = {
  registerIpcHandlers
}

