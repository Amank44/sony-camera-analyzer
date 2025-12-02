const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { startServer, getPort } = require('./lib/streamServer.cjs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        backgroundColor: '#0f172a',
        titleBarStyle: 'hiddenInset', // Mac
        frame: true // Windows
    });

    // In development, load from localhost
    // In production, load from index.html
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
}

app.whenReady().then(async () => {
    // Start streaming server
    await startServer();

    // Register 'media' protocol to serve local files (images, etc.)
    protocol.handle('media', (request) => {
        const filePath = request.url.slice('media://'.length);
        const decodedPath = decodeURIComponent(filePath);
        return net.fetch(`file:///${decodedPath}`);
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('log-error', (event, error) => {
    console.error("🔴 FRONTEND ERROR:", error);
});

ipcMain.handle('get-stream-port', () => {
    return getPort();
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Folder Containing Card Folders'
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('analyze-footage', async (event, folderPath) => {
    try {
        const { analyzeFootage } = require('./lib/analyzer.cjs');
        const results = await analyzeFootage(folderPath, (progress) => {
            event.sender.send('analysis-progress', progress);
        });
        return { success: true, data: results };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-report', async (event, { format, data, filename }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: filename,
        filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });

    if (result.canceled) return { success: false };

    await fs.writeFile(result.filePath, data);
    return { success: true, path: result.filePath };
});
