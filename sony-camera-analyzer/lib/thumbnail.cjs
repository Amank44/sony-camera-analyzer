const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));

const THUMBNAIL_DIR = path.join(os.tmpdir(), 'sony-camera-analyzer-thumbs');

// Ensure thumbnail directory exists
async function ensureThumbnailDir() {
    try {
        await fs.access(THUMBNAIL_DIR);
    } catch {
        await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
    }
    return THUMBNAIL_DIR;
}

async function findExistingThumbnail(videoPath) {
    try {
        const videoDir = path.dirname(videoPath);
        const videoName = path.basename(videoPath, path.extname(videoPath)); // e.g., C0001

        // Potential thumbnail directories (relative to video file)
        // 1. Same folder
        // 2. ../THMBNL (Sibling folder)
        // 3. ../../THMBNL (Grandparent sibling - common in M4ROOT structure)
        const searchDirs = [
            videoDir,
            path.join(videoDir, '..', 'THMBNL'),
            path.join(videoDir, '..', '..', 'THMBNL'),
            path.join(videoDir, 'THMBNL')
        ];

        // Potential filenames: C0001.JPG, C0001T01.JPG (Sony suffix)
        const potentialNames = [
            `${videoName}.JPG`,
            `${videoName}.jpg`,
            `${videoName}T01.JPG`,
            `${videoName}T01.jpg`
        ];

        // If it's a proxy file (ends with S03), try the main file's thumbnail too
        if (videoName.endsWith('S03')) {
            const mainName = videoName.slice(0, -3); // Remove S03
            potentialNames.push(
                `${mainName}.JPG`,
                `${mainName}.jpg`,
                `${mainName}T01.JPG`,
                `${mainName}T01.jpg`
            );
        }

        for (const dir of searchDirs) {
            for (const name of potentialNames) {
                const thumbPath = path.join(dir, name);
                try {
                    await fs.access(thumbPath);
                    // Found it!
                    // console.log(`Found existing thumbnail: ${thumbPath}`);
                    return thumbPath;
                } catch {
                    // Not found, continue
                }
            }
        }
    } catch (error) {
        console.error("Error searching for existing thumbnail:", error);
    }
    return null;
}

async function generateThumbnail(videoPath) {
    try {
        // 1. Try to find existing thumbnail first
        const existingThumbPath = await findExistingThumbnail(videoPath);
        if (existingThumbPath) {
            const data = await fs.readFile(existingThumbPath);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
        }

        // 2. If not found, generate with FFmpeg
        const thumbDir = await ensureThumbnailDir();
        const filename = `${path.basename(videoPath, path.extname(videoPath))}_thumb.jpg`;
        const outputPath = path.join(thumbDir, filename);

        // Check if generated thumbnail already exists to save time
        try {
            await fs.access(outputPath);
            const data = await fs.readFile(outputPath);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
        } catch {
            // Generate if doesn't exist
        }

        console.log(`Generating thumbnail for: ${path.basename(videoPath)}`);

        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: [1], // Take screenshot at 1 second mark
                    filename: filename,
                    folder: thumbDir,
                    size: '320x180'
                })
                .on('end', async () => {
                    try {
                        const data = await fs.readFile(outputPath);
                        const base64 = `data:image/jpeg;base64,${data.toString('base64')}`;
                        resolve(base64);
                    } catch (err) {
                        console.error("Error reading generated thumbnail:", err);
                        resolve(null);
                    }
                })
                .on('error', (err) => {
                    console.error(`Error generating thumbnail for ${videoPath}:`, err.message);
                    // Fallback: Try at 0 seconds if 1 second failed
                    if (err.message.includes('seek')) {
                        // Retry logic could go here, but for now just log
                    }
                    resolve(null);
                });
        });
    } catch (error) {
        console.error("Thumbnail generation failed:", error);
        return null;
    }
}

module.exports = { generateThumbnail };
