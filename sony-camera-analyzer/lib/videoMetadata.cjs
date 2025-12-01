const { exiftool } = require('exiftool-vendored');
const fs = require('fs').promises;

async function extractMetadata(filePath) {
    try {
        const metadata = await exiftool.read(filePath);
        const stats = await fs.stat(filePath);

        return {
            filePath,
            fileName: require('path').basename(filePath),
            serialNumber: metadata.SerialNumber || metadata.InternalSerialNumber,
            model: metadata.Model || metadata.CameraModelName,
            created: metadata.CreateDate ? metadata.CreateDate.toString() : stats.birthtime.toISOString(),
            size: stats.size,
            duration: metadata.Duration,
            format: metadata.FileType || require('path').extname(filePath).slice(1).toUpperCase(),
            resolution: (metadata.ImageWidth && metadata.ImageHeight) ? `${metadata.ImageWidth}x${metadata.ImageHeight}` : null
        };
    } catch (error) {
        console.error(`Error extracting metadata for ${filePath}:`, error);
        return {
            filePath,
            fileName: require('path').basename(filePath),
            error: error.message
        };
    }
}

function closeExifTool() {
    exiftool.end();
}

module.exports = { extractMetadata, closeExifTool };
