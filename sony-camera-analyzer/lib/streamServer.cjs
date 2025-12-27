const http = require('http');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// FFmpeg initialization with error handling
let ffmpegAvailable = false;

try {
    const ffmpegPath = require('ffmpeg-static');

    // Set ffmpeg path
    // In production (asar), we need to point to the unpacked binary
    // In development, we use the one in node_modules directly
    const isDev = process.env.NODE_ENV === 'development';
    const finalFfmpegPath = isDev
        ? ffmpegPath
        : ffmpegPath.replace('app.asar', 'app.asar.unpacked');

    if (fs.existsSync(finalFfmpegPath)) {
        console.log(`✅ FFmpeg binary found at: ${finalFfmpegPath}`);
        ffmpeg.setFfmpegPath(finalFfmpegPath);

        // Verify FFmpeg execution asynchronously (non-blocking)
        ffmpeg.getAvailableFormats((err, formats) => {
            if (err) {
                console.error('⚠️ FFmpeg execution failed:', err.message);
                console.log('📝 Video streaming will not be available, but XML analysis will work.');
                ffmpegAvailable = false;
            } else {
                console.log('✅ FFmpeg is executable. Available formats:', Object.keys(formats).length);
                ffmpegAvailable = true;
            }
        });
    } else {
        console.error(`⚠️ FFmpeg binary NOT found at: ${finalFfmpegPath}`);
        console.log('📝 Video streaming will not be available, but XML analysis will work.');
    }
} catch (err) {
    console.error('⚠️ Failed to initialize FFmpeg:', err.message);
    console.log('📝 Video streaming will not be available, but XML analysis will work.');
}


let server;
let serverPort = 0;

function startServer() {
    return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://${req.headers.host}`);

            if (url.pathname === '/stream') {
                const filePath = url.searchParams.get('file');
                if (!filePath) {
                    res.statusCode = 400;
                    res.end('Missing file parameter');
                    return;
                }

                const decodedPath = decodeURIComponent(filePath);
                console.log(`🎥 Streaming request for: ${path.basename(decodedPath)}`);

                // Check if file exists
                if (!fs.existsSync(decodedPath)) {
                    res.statusCode = 404;
                    res.end('File not found');
                    return;
                }

                // Transcode to compatible MP4 stream
                res.writeHead(200, {
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*'
                });

                const command = ffmpeg(decodedPath)
                    .format('mp4')
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions([
                        '-movflags frag_keyframe+empty_moov', // Fragmented MP4 for streaming
                        '-preset ultrafast', // Low CPU usage, fast start
                        '-vf scale=-2:720', // Downscale to 720p for performance
                        '-crf 23', // Reasonable quality
                        '-pix_fmt yuv420p' // Ensure browser compatibility
                    ])
                    .on('error', (err) => {
                        if (err.message !== 'Output stream closed') {
                            console.error('Streaming error:', err.message);
                        }
                        // If headers haven't been sent, send 500
                        if (!res.headersSent) {
                            res.statusCode = 500;
                            res.end('Streaming Error: ' + err.message);
                        } else {
                            res.end();
                        }
                    })
                    .pipe(res, { end: true });

                // Kill ffmpeg if client disconnects
                req.on('close', () => {
                    if (command && typeof command.kill === 'function') {
                        command.kill();
                    }
                });

            } else {
                res.statusCode = 404;
                res.end('Not found');
            }
        });

        server.listen(0, '127.0.0.1', () => {
            serverPort = server.address().port;
            console.log(`🚀 Stream server running on port ${serverPort}`);
            resolve(serverPort);
        });
    });
}

function getPort() {
    return serverPort;
}

module.exports = { startServer, getPort };
