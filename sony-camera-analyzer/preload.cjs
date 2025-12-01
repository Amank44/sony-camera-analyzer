const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    analyzeFootage: (folderPath) => ipcRenderer.invoke('analyze-footage', folderPath),
    exportReport: (data) => ipcRenderer.invoke('export-report', data),
    onProgress: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('analysis-progress', subscription);
        return () => {
            ipcRenderer.removeListener('analysis-progress', subscription);
        };
    }
});
