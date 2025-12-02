const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    getFilePath: (file) => webUtils.getPathForFile(file),
    analyzeFootage: (path) => ipcRenderer.invoke('analyze-footage', path),
    exportReport: (options) => ipcRenderer.invoke('export-report', options),
    getStreamPort: () => ipcRenderer.invoke('get-stream-port'),
    logError: (msg) => ipcRenderer.invoke('log-error', msg),
    onProgress: (callback) => {
        const subscription = (event, value) => callback(value);
        ipcRenderer.on('analysis-progress', subscription);
        // Return a cleanup function
        return () => {
            ipcRenderer.removeListener('analysis-progress', subscription);
        };
    },
    offProgress: () => ipcRenderer.removeAllListeners('analysis-progress')
});
