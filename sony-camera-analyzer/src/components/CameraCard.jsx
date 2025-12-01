import React, { useState } from 'react';

export default function CameraCard({ camera }) {
    const [expanded, setExpanded] = useState(false);

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    return (
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
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-2">File Name</th>
                                    <th className="px-4 py-2">File Location</th>
                                    <th className="px-4 py-2">Size</th>
                                    <th className="px-4 py-2">Created</th>
                                    <th className="px-4 py-2">Format</th>
                                </tr>
                            </thead>
                            <tbody>
                                {camera.files.map((file, idx) => (
                                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/30">
                                        <td className="px-4 py-2 font-medium text-white">{file.fileName}</td>
                                        <td className="px-4 py-2 text-xs" title={file.filePath}>
                                            {file.filePath}
                                        </td>
                                        <td className="px-4 py-2">{formatSize(file.size)}</td>
                                        <td className="px-4 py-2">{new Date(file.created).toLocaleString()}</td>
                                        <td className="px-4 py-2 uppercase">{file.format}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
