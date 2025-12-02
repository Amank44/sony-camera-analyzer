import React, { useState } from 'react';

export default function CameraCard({ camera, streamPort }) {
    const [expanded, setExpanded] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'fileName', direction: 'asc' });
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [playbackError, setPlaybackError] = useState(false);

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getResolutionLabel = (width, height) => {
        if (!width) return '';
        if (width >= 3840) return '4K';
        if (width >= 1920) return 'HD';
        return 'Proxy';
    };

    const isSlowMotion = (fps) => {
        return fps && fps > 60;
    };

    const formatCounts = camera.files.reduce((acc, file) => {
        const fmt = file.format || 'UNKNOWN';
        acc[fmt] = (acc[fmt] || 0) + 1;
        return acc;
    }, {});

    const getParentFolderName = (filePath) => {
        if (!filePath) return '';

        // Normalize slashes
        const normalizedPath = filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');

        // Find index of M4ROOT or XDROOT (case insensitive)
        const rootIndex = parts.findIndex(p =>
            p.toUpperCase() === 'M4ROOT' ||
            p.toUpperCase() === 'XDROOT' ||
            p.toUpperCase() === 'PRIVATE'
        );

        if (rootIndex > 0) {
            return parts[rootIndex - 1];
        }

        // Fallback: if no root folder found, try to find a meaningful parent
        // Skip common technical folders at the end
        const technicalFolders = ['CLIP', 'SUB', 'THMBNL', 'STREAM', 'GENERAL', 'XML', 'TAKE'];
        for (let i = parts.length - 2; i >= 0; i--) {
            if (!technicalFolders.includes(parts[i].toUpperCase())) {
                return parts[i];
            }
        }

        return 'Unknown';
    };

    // Get unique folder names for this camera
    const uniqueFolders = [...new Set(camera.files.map(f => getParentFolderName(f.filePath)))].filter(f => f && f !== 'Unknown');

    // Sorting Logic
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFiles = [...camera.files].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span className="ml-1 text-gray-600">↕</span>;
        return <span className="ml-1 text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleOpenMedia = (media) => {
        setPlaybackError(false);
        setSelectedMedia(media);
    };

    // Reset error if stream port becomes available (retry playback)
    React.useEffect(() => {
        if (streamPort && playbackError) {
            setPlaybackError(false);
        }
    }, [streamPort]);

    const getStreamUrl = (filePath) => {
        if (streamPort) {
            return `http://localhost:${streamPort}/stream?file=${encodeURIComponent(filePath)}`;
        }
        return `media://${filePath}`;
    };

    return (
        <>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden mb-4 transition-all hover:border-blue-500/50">
                <div
                    className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-900/30 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-white">{camera.model}</h3>
                                {uniqueFolders.map(folder => (
                                    <span key={folder} className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                                        {folder}
                                    </span>
                                ))}
                            </div>
                            <p className="text-sm text-gray-400">S/N: {camera.id}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">{camera.files.length} files</p>
                            <p className="text-xs text-gray-400">{formatSize(camera.totalSize)}</p>
                        </div>
                        <div className="flex space-x-2">
                            {Object.entries(formatCounts).map(([fmt, count]) => (
                                <span key={fmt} className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                                    {fmt}: {count}
                                </span>
                            ))}
                        </div>
                        <svg
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {expanded && (
                    <div className="border-t border-gray-700 bg-gray-900/30 p-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-800/50 cursor-pointer select-none">
                                    <tr>
                                        <th className="px-4 py-2">Preview</th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('fileName')}>
                                            File Name <SortIcon column="fileName" />
                                        </th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('filePath')}>
                                            File Location <SortIcon column="filePath" />
                                        </th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('size')}>
                                            Size <SortIcon column="size" />
                                        </th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('duration')}>
                                            Duration <SortIcon column="duration" />
                                        </th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('width')}>
                                            Res <SortIcon column="width" />
                                        </th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('created')}>
                                            Created <SortIcon column="created" />
                                        </th>
                                        <th className="px-4 py-2 hover:text-white" onClick={() => requestSort('format')}>
                                            Format <SortIcon column="format" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedFiles.map((file, idx) => {
                                        const resLabel = getResolutionLabel(file.width, file.height);
                                        const slowMo = isSlowMotion(file.frameRate);

                                        return (
                                            <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/30 group">
                                                <td className="px-4 py-2">
                                                    {file.thumbnail ? (
                                                        <div
                                                            className="relative w-16 h-9 bg-gray-900 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                                            onClick={(e) => {
                                                                e.stopPropagation();

                                                                // Smart Playback: Try to find a proxy file (S03) if this is a main clip
                                                                let playPath = file.filePath;
                                                                let isProxy = false;

                                                                const baseName = file.fileName.substring(0, file.fileName.lastIndexOf('.'));
                                                                const ext = file.fileName.substring(file.fileName.lastIndexOf('.'));

                                                                // Check if we are already a proxy
                                                                if (!baseName.endsWith('S03')) {
                                                                    const proxyName = `${baseName}S03${ext}`;
                                                                    // Look for proxy in the same camera list
                                                                    const proxyFile = camera.files.find(f => f.fileName === proxyName);
                                                                    if (proxyFile) {
                                                                        playPath = proxyFile.filePath;
                                                                        isProxy = true;
                                                                    }
                                                                }

                                                                handleOpenMedia({
                                                                    src: file.thumbnail,
                                                                    name: file.fileName,
                                                                    filePath: playPath,
                                                                    isProxy: isProxy,
                                                                    type: 'video'
                                                                });
                                                            }}
                                                        >
                                                            <img
                                                                src={file.thumbnail}
                                                                alt="Thumbnail"
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-9 bg-gray-800 rounded flex items-center justify-center">
                                                            <span className="text-[10px] text-gray-600">No Preview</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 font-medium text-white">{file.fileName}</td>
                                                <td className="px-4 py-2 text-xs" title={file.filePath}>
                                                    {file.filePath}
                                                </td>
                                                <td className="px-4 py-2">{formatSize(file.size)}</td>
                                                <td className="px-4 py-2 font-mono text-xs text-gray-300">
                                                    {formatDuration(file.duration)}
                                                    {slowMo && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-yellow-900/50 text-yellow-300 border border-yellow-700/50">S&Q</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {resLabel && (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${resLabel === '4K' ? 'bg-purple-900/50 text-purple-300 border-purple-700/50' :
                                                                resLabel === 'HD' ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' :
                                                                    'bg-gray-700 text-gray-300 border-gray-600'
                                                            }`}>
                                                            {resLabel}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">{new Date(file.created).toLocaleString()}</td>
                                                <td className="px-4 py-2 uppercase">{file.format}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Media Modal */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    onClick={() => setSelectedMedia(null)}
                >
                    <div className="max-w-6xl w-full max-h-[90vh] relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700 flex items-center justify-center">
                            {!playbackError ? (
                                <video
                                    src={getStreamUrl(selectedMedia.filePath)}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                        const msg = e.target.error ? e.target.error.message : 'Unknown Error';
                                        console.error("Video playback error:", msg);
                                        if (window.electronAPI) {
                                            window.electronAPI.logError(`Video playback error for ${selectedMedia.filePath}: ${msg}`);
                                        }
                                        setPlaybackError(msg);
                                    }}
                                />
                            ) : (
                                <div className="relative w-full h-full">
                                    <img
                                        src={selectedMedia.src}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <div className="bg-red-900/90 text-white px-6 py-4 rounded-lg border border-red-500/50 backdrop-blur-sm flex flex-col items-center space-y-2 max-w-md text-center">
                                            <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span className="font-bold text-lg">Playback Failed</span>
                                            <span className="text-sm text-red-200">{typeof playbackError === 'string' ? playbackError : 'Format not supported'}</span>
                                            <span className="text-xs text-gray-400 mt-2">Try checking if a proxy file exists for this clip.</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedMedia.isProxy && !playbackError && (
                                <div className="absolute top-4 left-4 px-2 py-1 bg-green-900/80 text-green-300 text-xs font-bold rounded border border-green-700/50 backdrop-blur-sm">
                                    PLAYING PROXY
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex items-center justify-between w-full px-4">
                            <div className="flex flex-col">
                                <p className="text-white font-medium text-lg">{selectedMedia.name}</p>
                                {selectedMedia.isProxy && <p className="text-gray-400 text-xs">Using proxy file for playback</p>}
                            </div>
                            <button
                                className="text-gray-400 hover:text-white transition-colors"
                                onClick={() => setSelectedMedia(null)}
                            >
                                Close (Esc)
                            </button>
                        </div>
                        <button
                            className="absolute -top-12 right-0 text-white hover:text-gray-300"
                            onClick={() => setSelectedMedia(null)}
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
