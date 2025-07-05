// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

if (log.transports.file) {
  log.info(`Log file is at: ${log.transports.file.getFile().path}`);
}

let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200, // 窗口宽度
    height: 800, // 窗口高度
    minWidth: 600, // 最小宽度
    minHeight: 400, // 最小高度
    webPreferences: {
      // 启用 Node.js 集成，允许在渲染进程中使用 Node.js API
      nodeIntegration: true,
      // 允许 Electron 的上下文隔离功能，提高安全性
      // 注意：如果您在渲染进程中使用 require()，可能需要关闭此项或使用预加载脚本
      contextIsolation: false, // 对于简单应用，暂时关闭上下文隔离以简化
      // 允许使用 remote 模块（Electron 12+ 已弃用，但旧版本可能需要）
      // enableRemoteModule: true, // 根据 Electron 版本决定是否需要
      // 预加载脚本路径 (可选，用于在渲染进程加载前执行脚本)
      // preload: path.join(__dirname, 'preload.js')
    },
    title: "时间复式记账法", // 窗口标题
    icon: path.join(__dirname, 'assets/icon.png') // 应用图标，请确保有此文件
  });

  // Use the built-in 'isPackaged' property to determine mode
  const isDev = !app.isPackaged;

  if (isDev) {
    log.info('Running in development mode.');
    // 开发环境：加载 React 开发服务器
    mainWindow.loadURL('http://localhost:3000');
    // 打开开发者工具 (仅在开发模式下)
    mainWindow.webContents.openDevTools();
  } else {
    log.info('Running in production mode.');
    // The 'build' folder is relative to the app's root in the package.
    const prodPath = path.join(__dirname, 'build', 'index.html');
    log.info(`Attempting to load production build from: ${prodPath}`);

    // Show the path we are trying to load
    mainWindow.loadFile(prodPath).catch(err => {
      log.error('Failed to load file:', err);
    });
    
    // Keep dev tools open for debugging.
    mainWindow.webContents.openDevTools();
  }
}

// 当 Electron 应用准备就绪时调用 createWindow
app.whenReady().then(createWindow);

ipcMain.on('toggle-always-on-top', (event, isAlwaysOnTop) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  }
});

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户明确使用 Cmd + Q 退出，
  // 否则应用程序及其菜单栏会保持活动状态。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在 macOS 上，当 dock 图标被点击时，如果应用没有打开的窗口，则重新创建一个
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 可选：安装 electron-is-dev 库
// npm install electron-is-dev --save-dev
