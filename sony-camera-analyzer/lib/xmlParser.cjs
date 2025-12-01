const { XMLParser } = require('fast-xml-parser');
const fs = require('fs').promises;
const path = require('path');

class SonyXMLParser {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    async findXMLFiles(directory) {
        const xmlFiles = [];

        async function scan(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await scan(fullPath);
                    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) {
                        xmlFiles.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${dir}:`, error.message);
            }
        }

        await scan(directory);
        return xmlFiles;
    }

    async parseXMLFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = this.parser.parse(content);
            return this.extractCameraInfo(data, filePath);
        } catch (error) {
            console.error(`Error parsing XML ${filePath}:`, error.message);
            return null;
        }
    }

    extractCameraInfo(xmlData, filePath) {
        // Handle multiple Sony XML schemas
        let serial = null;
        let model = null;
        let videoFiles = [];

        // Sony MediaProfile (MEDIAPRO.XML) - Main format for Sony cameras
        if (xmlData.MediaProfile?.Properties?.System) {
            const system = xmlData.MediaProfile.Properties.System;
            serial = system['@_systemId'] || system.systemId;
            model = system['@_systemKind'] || system.systemKind;

            // Extract video file paths from Material elements
            if (xmlData.MediaProfile.Contents?.Material) {
                const materials = Array.isArray(xmlData.MediaProfile.Contents.Material)
                    ? xmlData.MediaProfile.Contents.Material
                    : [xmlData.MediaProfile.Contents.Material];

                const xmlDir = path.dirname(filePath);
                videoFiles = materials
                    .flatMap(m => {
                        const files = [];

                        // Main Material URI
                        const uri = m['@_uri'] || m.uri;
                        if (uri && (uri.endsWith('.MP4') || uri.endsWith('.MXF') || uri.endsWith('.MOV') || uri.endsWith('.mp4') || uri.endsWith('.mxf') || uri.endsWith('.mov'))) {
                            files.push(uri);
                        }

                        // Proxy URI
                        if (m.Proxy) {
                            const proxyUri = m.Proxy['@_uri'] || m.Proxy.uri;
                            if (proxyUri) {
                                files.push(proxyUri);
                            }
                        }

                        return files;
                    })
                    .map(uri => {
                        // Convert relative path to absolute
                        const cleanUri = uri.replace(/^\.\//, '').replace(/^\.\\/, '');
                        return path.join(xmlDir, cleanUri);
                    });
            }

            console.log(`✓ Found MediaProfile: Serial=${serial}, Model=${model}, Videos=${videoFiles.length}`);
        }
        // CUEUP.XML - Contains clip history (no camera info, but has file references)
        else if (xmlData.cueupinfo?.history?.clip) {
            const clips = Array.isArray(xmlData.cueupinfo.history.clip)
                ? xmlData.cueupinfo.history.clip
                : [xmlData.cueupinfo.history.clip];

            const xmlDir = path.dirname(filePath);
            videoFiles = clips
                .map(c => {
                    const uri = c['@_uri'] || c.uri;
                    if (uri) {
                        const cleanUri = uri.replace(/^\.\//, '').replace(/^\.\\/, '');
                        return path.join(xmlDir, cleanUri);
                    }
                    return null;
                })
                .filter(f => f !== null);

            console.log(`ℹ Found CUEUP.XML with ${videoFiles.length} clip references (no camera info)`);
            // CUEUP.XML doesn't have camera info, so we return null
            return null;
        }
        // DISCMETA.XML - Just disc metadata, no camera or file info
        else if (xmlData.DiscMeta) {
            console.log(`ℹ Found DISCMETA.XML (disc metadata only, skipping)`);
            return null;
        }
        // Sony XDCAM / XAVC
        else if (xmlData.NonRealTimeMeta?.Device) {
            serial = xmlData.NonRealTimeMeta.Device.SerialNumber;
            model = xmlData.NonRealTimeMeta.Device.ModelName;

            console.log(`✓ Found NonRealTimeMeta: Serial=${serial}, Model=${model}`);
        }
        else if (xmlData.XAVCMetadata?.Device) {
            serial = xmlData.XAVCMetadata.Device.SerialNumber;
            model = xmlData.XAVCMetadata.Device.ModelName;

            console.log(`✓ Found XAVCMetadata: Serial=${serial}, Model=${model}`);
        }
        else if (xmlData.Clip?.Device) {
            serial = xmlData.Clip.Device.SerialNumber;
            model = xmlData.Clip.Device.ModelName;

            console.log(`✓ Found Clip: Serial=${serial}, Model=${model}`);
        }
        else {
            console.log(`⚠ Unknown XML format in ${path.basename(filePath)}`);
        }

        if (serial) {
            return {
                serialNumber: String(serial),
                model: model || 'Unknown Model',
                sourceFile: filePath,
                videoFiles: videoFiles // List of video files from this XML
            };
        }
        return null;
    }

    async parseAllXMLInFolder(folderPath) {
        console.log(`\n🔍 Starting XML scan in: ${folderPath}`);
        const files = await this.findXMLFiles(folderPath);
        console.log(`📄 Found ${files.length} XML files total`);

        const results = [];
        for (const file of files) {
            console.log(`\n📖 Parsing: ${path.basename(file)}`);
            const info = await this.parseXMLFile(file);
            if (info) {
                console.log(`✅ Successfully parsed: ${path.basename(file)}`);
                if (info.videoFiles && info.videoFiles.length > 0) {
                    console.log(`   📹 Contains ${info.videoFiles.length} video file references`);
                }
                results.push(info);
            }
        }

        console.log(`\n✅ Total cameras found from XML: ${results.length}\n`);
        return results;
    }
}

module.exports = new SonyXMLParser();
