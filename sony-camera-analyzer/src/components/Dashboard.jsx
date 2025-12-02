import React, { useState, useEffect } from 'react';
import CameraCard from './CameraCard';
import ProgressBar from './ProgressBar';

export default function Dashboard() {
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState({ progress: 0, message: '', step: '' });
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const [streamPort, setStreamPort] = useState(null);

    useEffect(() => {
        // Listen for progress updates
        if (window.electronAPI) {
            const cleanup = window.electronAPI.onProgress((data) => {
                setProgress(data);
            });

            // Get stream port
            window.electronAPI.getStreamPort().then(port => {
                console.log("Stream server port:", port);
                setStreamPort(port);
            });

            return cleanup;
        }
    }, []);

    const handleSelectFolder = async () => {
        try {
            const folderPath = await window.electronAPI.selectFolder();
            if (folderPath) {
                setAnalyzing(true);
                setResults(null);
                setError(null);

                const response = await window.electronAPI.analyzeFootage(folderPath);

                if (response.success) {
                    setResults(response.data);
                } else {
                    setError(response.error);
                }
                setAnalyzing(false);
            }
        } catch (err) {
            setError(err.message);
            setAnalyzing(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        console.log("Dropped files:", files);

        if (files && files.length > 0) {
            // Use Electron utility to get path
            const path = window.electronAPI.getFilePath(files[0]);
            console.log("Detected path:", path);

            if (path) {
                // Trigger analysis
                setAnalyzing(true);
                setResults(null);
                setError(null);
                try {
                    const response = await window.electronAPI.analyzeFootage(path);
                    if (response.success) {
                        setResults(response.data);
                    } else {
                        setError(response.error);
                    }
                } catch (err) {
                    setError(err.message);
                }
                setAnalyzing(false);
            } else {
                console.error("No path detected on dropped item");
                setError("Could not detect folder path. Please try using the button.");
            }
        }
    };

    const handleExport = async (format) => {
        if (!results) return;

        let content = '';
        if (format === 'csv') {
            // Generate CSV
            content = 'Camera ID,Model,File Name,Folder,Size,Timestamp,Format\n';
            results.cameras.forEach(cam => {
                cam.files.forEach(f => {
                    content += `${cam.id},${cam.model},${f.fileName},${f.filePath},${f.size},${f.created},${f.format}\n`;
                });
            });
        } else {
            // Simple HTML export for now
            content = `<html><body><h1>Report</h1><p>Total Files: ${results.stats.totalFiles}</p></body></html>`;
        }

        await window.electronAPI.exportReport({
            format,
            data: content,
            filename: `report.${format}`
        });
    };

    const groupResultsByDate = (cameras) => {
        const dates = {};

        cameras.forEach(camera => {
            camera.files.forEach(file => {
                let dateObj;
                try {
                    // Handle invalid or missing dates
                    if (!file.created) {
                        throw new Error('No date');
                    }
                    dateObj = new Date(file.created);
                    if (isNaN(dateObj.getTime())) {
                        throw new Error('Invalid date');
                    }
                } catch (e) {
                    // Fallback to "Unknown Date"
                    dateObj = new Date(0); // Epoch
                }

                const dateKey = dateObj.getTime() === 0
                    ? "Unknown Date"
                    : dateObj.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                const sortKey = dateObj.getTime() === 0
                    ? "0000-00-00"
                    : dateObj.toISOString().split('T')[0];

                if (!dates[sortKey]) {
                    dates[sortKey] = {
                        displayDate: dateKey,
                        cameras: {}
                    };
                }

                if (!dates[sortKey].cameras[camera.id]) {
                    dates[sortKey].cameras[camera.id] = {
                        ...camera,
                        files: [],
                        totalSize: 0
                    };
                }

                dates[sortKey].cameras[camera.id].files.push(file);
                dates[sortKey].cameras[camera.id].totalSize += file.size;
            });
        });

        // Sort dates descending (newest first)
        return Object.entries(dates)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, data]) => ({
                date: data.displayDate,
                cameras: Object.values(data.cameras)
            }));
    };

    const groupedResults = results ? groupResultsByDate(results.cameras) : [];

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Sony Camera Footage Analyzer
                </h1>
                <p className="text-gray-400 mt-2">Identify and organize multi-camera footage</p>
            </header>

            {!results && !analyzing && (
                <div
                    className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl transition-all cursor-pointer ${isDragging
                        ? 'border-blue-500 bg-blue-900/30 scale-[1.02]'
                        : 'border-gray-700 bg-gray-800/30 hover:bg-gray-800/50'
                        }`}
                    onClick={handleSelectFolder}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <svg className={`w-16 h-16 mb-4 transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className={`text-xl font-medium ${isDragging ? 'text-blue-300' : 'text-gray-300'}`}>
                        {isDragging ? 'Drop Folder Here' : 'Select Footage Folder'}
                    </span>
                    <p className={`text-sm mt-2 ${isDragging ? 'text-blue-400' : 'text-gray-500'}`}>
                        {isDragging ? 'Release to analyze' : 'Choose parent folder containing cards or drag & drop'}
                    </p>
                </div>
            )}

            {analyzing && (
                <div className="mt-8">
                    <ProgressBar {...progress} />
                </div>
            )}

            {error && (
                <div className="mt-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                    Error: {error}
                </div>
            )}

            {results && (
                <div className="mt-8 space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-gray-400 text-sm">Total Files</h3>
                            <p className="text-2xl font-bold">{results.stats.totalFiles}</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-gray-400 text-sm">Total Size</h3>
                            <p className="text-2xl font-bold">{(results.stats.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-gray-400 text-sm">Cameras</h3>
                            <p className="text-2xl font-bold">{results.cameras.length}</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-gray-400 text-sm">Mixed Folders</h3>
                            <p className="text-2xl font-bold">{results.mixedFolders.length}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-4">
                        <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium">Export CSV</button>
                        <button onClick={handleSelectFolder} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium">Analyze Another</button>
                    </div>

                    {/* Date Groups */}
                    <div className="space-y-8">
                        {groupedResults.map((group, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <h2 className="text-2xl font-bold text-white">{group.date}</h2>
                                    <div className="h-px flex-1 bg-gray-700"></div>
                                </div>

                                {group.cameras.map(camera => (
                                    <CameraCard key={camera.id} camera={camera} streamPort={streamPort} />
                                ))}
                            </div>
                        ))}
                    </div>

                    {results.unknownFiles.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-xl font-semibold text-gray-200 mb-4">Unknown Files ({results.unknownFiles.length})</h2>
                            <div className="bg-gray-800/30 p-4 rounded-lg">
                                <p className="text-gray-400">Files without metadata or serial number.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
