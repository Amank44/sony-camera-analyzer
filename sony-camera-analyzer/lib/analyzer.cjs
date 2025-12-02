const xmlParser = require('./xmlParser.cjs');
const { extractMetadata, closeExifTool } = require('./videoMetadata.cjs');
const { generateThumbnail } = require('./thumbnail.cjs');
const fs = require('fs').promises;
const path = require('path');

async function findVideoFiles(dir) {
    const videoExtensions = ['.mp4', '.mov', '.mxf'];
    const videoFiles = [];

    async function scan(directory) {
        try {
            const entries = await fs.readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    await scan(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (videoExtensions.includes(ext)) {
                        videoFiles.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning ${directory}:`, error.message);
        }
    }

    await scan(dir);
    return videoFiles;
}

function buildCameraRegistry(xmlData) {
    const registry = {};
    const videoToCameraMap = {}; // Map video file paths to camera serial

    for (const data of xmlData) {
        if (data.serialNumber) {
            registry[data.serialNumber] = data;

            // Map each video file from this XML to this camera
            if (data.videoFiles && data.videoFiles.length > 0) {
                for (const videoPath of data.videoFiles) {
                    // Normalize path for comparison
                    const normalizedPath = path.normalize(videoPath).toLowerCase();
                    videoToCameraMap[normalizedPath] = data.serialNumber;
                }
            }
        }
    }

    return { registry, videoToCameraMap };
}

function groupByCamera(videoMetadata, cameraRegistry, videoToCameraMap) {
    const cameras = {};
    const unknown = [];

    for (const video of videoMetadata) {
        let serial = video.serialNumber;

        // If no serial from video metadata, try to match from XML mapping
        if (!serial && video.filePath) {
            const normalizedPath = path.normalize(video.filePath).toLowerCase();
            serial = videoToCameraMap[normalizedPath];

            if (serial) {
                console.log(`✓ Matched ${path.basename(video.filePath)} to camera ${serial} via XML`);
                // Update video metadata with camera info
                video.serialNumber = serial;
                if (cameraRegistry[serial]) {
                    video.model = cameraRegistry[serial].model;
                }
            }
        }

        if (serial) {
            if (!cameras[serial]) {
                cameras[serial] = {
                    id: serial,
                    model: video.model || (cameraRegistry[serial] ? cameraRegistry[serial].model : 'Unknown Model'),
                    files: [],
                    totalSize: 0
                };
            }
            cameras[serial].files.push(video);
            cameras[serial].totalSize += (video.size || 0);
        } else {
            unknown.push(video);
        }
    }

    return { cameras: Object.values(cameras), unknown };
}

function findMixedFolders(videoMetadata) {
    const folderMap = {};

    for (const video of videoMetadata) {
        if (!video.serialNumber) continue;

        const folder = path.dirname(video.filePath);
        if (!folderMap[folder]) {
            folderMap[folder] = new Set();
        }
        folderMap[folder].add(video.serialNumber);
    }

    const mixed = [];
    for (const [folder, serials] of Object.entries(folderMap)) {
        if (serials.size > 1) {
            mixed.push({
                folder,
                cameraCount: serials.size,
                cameras: Array.from(serials)
            });
        }
    }
    return mixed;
}

function calculateStatistics(cameras, videoMetadata) {
    let totalSize = 0;
    const formatCounts = {};

    for (const video of videoMetadata) {
        totalSize += (video.size || 0);
        const fmt = video.format || 'UNKNOWN';
        formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }

    return {
        totalFiles: videoMetadata.length,
        totalSize,
        formatDistribution: formatCounts
    };
}

async function analyzeFootage(folderPath, progressCallback) {
    try {
        console.log(`\n🚀 Starting analysis of: ${folderPath}\n`);

        // Step 1: Scan for XML files
        progressCallback({ step: 'xml', message: 'Scanning XML files...', progress: 0 });
        const xmlData = await xmlParser.parseAllXMLInFolder(folderPath);

        // Step 2: Build camera registry and video-to-camera mapping
        const { registry: cameraRegistry, videoToCameraMap } = buildCameraRegistry(xmlData);
        console.log(`📋 Camera registry built with ${Object.keys(cameraRegistry).length} cameras`);
        console.log(`📹 Video-to-camera mapping has ${Object.keys(videoToCameraMap).length} entries`);

        // Step 3: Scan for video files
        progressCallback({ step: 'scan', message: 'Finding video files...', progress: 10 });
        const videoFiles = await findVideoFiles(folderPath);
        console.log(`\n🎬 Found ${videoFiles.length} video files\n`);

        // Step 4: Extract metadata
        progressCallback({ step: 'extract', message: 'Extracting metadata...', progress: 20 });
        const videoMetadata = [];

        for (let i = 0; i < videoFiles.length; i++) {
            console.log(`📊 Processing ${i + 1}/${videoFiles.length}: ${path.basename(videoFiles[i])}`);

            // Run metadata extraction and thumbnail generation in parallel
            const [metadata, thumbnailPath] = await Promise.all([
                extractMetadata(videoFiles[i]),
                generateThumbnail(videoFiles[i])
            ]);

            if (metadata) {
                metadata.thumbnail = thumbnailPath;
                videoMetadata.push(metadata);
            }

            const percentage = 20 + Math.round(((i + 1) / videoFiles.length) * 60); // 20% to 80%
            progressCallback({
                step: 'extract',
                message: `Processing ${i + 1}/${videoFiles.length}`,
                progress: percentage,
                currentFile: videoFiles[i]
            });
        }

        // Step 5: Group by camera
        console.log(`\n🔗 Grouping files by camera...\n`);
        progressCallback({ step: 'group', message: 'Grouping files...', progress: 85 });
        const { cameras, unknown } = groupByCamera(videoMetadata, cameraRegistry, videoToCameraMap);

        // Step 6: Identify mixed folders
        const mixedFolders = findMixedFolders(videoMetadata);

        // Step 7: Stats
        const stats = calculateStatistics(cameras, videoMetadata);

        console.log(`\n✅ Analysis complete!`);
        console.log(`   📷 Cameras: ${cameras.length}`);
        console.log(`   📹 Total files: ${stats.totalFiles}`);
        console.log(`   ❓ Unknown files: ${unknown.length}`);
        console.log(`   ⚠️  Mixed folders: ${mixedFolders.length}\n`);

        progressCallback({ step: 'done', message: 'Analysis complete', progress: 100 });

        return {
            cameras,
            unknownFiles: unknown,
            mixedFolders,
            stats
        };

    } catch (error) {
        console.error("❌ Analysis failed:", error);
        throw error;
    }
}

module.exports = { analyzeFootage };
