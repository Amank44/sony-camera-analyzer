# Sony Camera Footage Analyzer - Developer Documentation

## Project Overview

A cross-platform desktop application (Mac & Windows) that analyzes Sony camera footage, identifies which files belong to which camera using metadata, and generates detailed reports. The application does NOT move or copy files - it only identifies and reports.

---

## Requirements

### Functional Requirements

1. **Folder Analysis**
   - User selects a parent folder containing subfolders (card1, card2, card3, etc.)
   - Application scans all subfolders recursively
   - Identifies video files: `.mp4`, `.mov`, `.mxf`
   - Identifies XML metadata files from Sony cameras

2. **Camera Identification**
   - Parse Sony XML files to extract camera serial numbers and model information
   - Extract metadata from video files (camera serial number, model, creation date)
   - Group files by camera serial number
   - Identify mixed folders (folders containing footage from multiple cameras)

3. **Reporting**
   - Display results in a modern dashboard UI
   - Show camera breakdown with file counts, total size, format distribution
   - Highlight folders with mixed camera footage
   - Export reports in CSV and HTML formats
   - Reports must include: filename, current folder, camera ID, size, timestamp, format

4. **Performance**
   - Fast analysis for large footage libraries (1TB+ datasets)
   - Progress tracking with real-time updates
   - Non-blocking UI during analysis

5. **Safety**
   - Read-only operations - NO file moving or copying
   - No risk to original footage files

### Non-Functional Requirements

1. **Platform Support**
   - macOS 10.13+
   - Windows 10/11
   - Single codebase for both platforms

2. **Distribution**
   - Standalone executables (no Python/Node.js installation required)
   - Windows: `.exe` installer
   - Mac: `.dmg` or `.app` bundle
   - Target file size: < 100MB

3. **UI/UX**
   - Modern, professional dashboard design
   - Responsive layout
   - Dark theme with gradient backgrounds
   - Real-time progress indicators
   - Intuitive drag-and-drop or folder selection

---

## Technology Stack Recommendation

### Recommended: Electron + React

**Why Electron?**
- ✅ Single codebase for Mac & Windows
- ✅ Full file system access
- ✅ Can bundle all dependencies (no user installation needed)
- ✅ Modern UI capabilities with web technologies
- ✅ Easy to package into standalone executables
- ✅ Large community and extensive documentation

**Tech Stack:**
- **Framework**: Electron 28+
- **UI**: React 18 + Tailwind CSS
- **File System**: Node.js `fs` module
- **XML Parsing**: `fast-xml-parser` or native `DOMParser`
- **Video Metadata**: `exiftool-vendored` or `fluent-ffmpeg`
- **Build Tool**: `electron-builder`

### Alternative Options

1. **Tauri + React** (Rust-based, smaller file size ~40MB)
2. **Qt/PyQt** (Python, requires bundling Python runtime)
3. **.NET MAUI** (C#, native Windows, good Mac support)

---

## Project Structure

```
sony-camera-analyzer/
├── package.json                 # Dependencies and build config
├── main.js                      # Electron main process
├── preload.js                   # Secure IPC bridge
│
├── src/
│   ├── renderer/
│   │   ├── index.html          # App entry point
│   │   ├── App.jsx             # Main React component
│   │   ├── components/
│   │   │   ├── Dashboard.jsx   # Main dashboard UI
│   │   │   ├── CameraCard.jsx  # Camera detail cards
│   │   │   ├── ProgressBar.jsx # Analysis progress
│   │   │   └── ExportPanel.jsx # Export functionality
│   │   └── styles/
│   │       └── main.css        # Custom styles
│   │
│   └── lib/
│       ├── xmlParser.js        # Sony XML metadata parser
│       ├── videoMetadata.js    # Video file metadata extractor
│       ├── analyzer.js         # Main analysis engine
│       └── reportGenerator.js  # CSV/HTML report generation
│
├── assets/
│   ├── icon.icns              # Mac app icon
│   ├── icon.ico               # Windows app icon
│   └── logo.png               # App logo
│
└── build/                     # Build output (auto-generated)
    ├── mac/
    │   └── Sony Camera Analyzer.dmg
    └── win/
        └── Sony Camera Analyzer Setup.exe
```

---

## Core Implementation Details

### 1. XML Parser (`lib/xmlParser.js`)

**Purpose**: Extract camera metadata from Sony XML files

**Sony XML Structures to Support:**
- Sony XDCAM structure (`NonRealTimeMeta`)
- Sony XAVC structure (`XAVCMetadata`)
- Sony Alpha/FX series (`Clip` element)

**Key Data Points:**
- Camera serial number
- Camera model name
- Manufacturer
- Recording date/time
- Clip name

**Implementation:**

```javascript
class SonyXMLParser {
  async findXMLFiles(directory) {
    // Recursively scan for .xml files
    // Common Sony locations: PRIVATE/, GENERAL/, Clip/ folders
  }

  async parseXMLFile(filePath) {
    // Parse XML using fast-xml-parser or DOMParser
    // Extract camera metadata
    // Return structured data
  }

  extractCameraInfo(xmlData) {
    // Handle multiple Sony XML schemas:
    // - NonRealTimeMeta.Device.SerialNumber
    // - XAVCMetadata.Device.SerialNumber
    // - Clip.Device.SerialNumber
    // - Fallback to other patterns
  }
}
```

**XML Path Examples:**

```xml
<!-- Sony XDCAM -->
<NonRealTimeMeta>
  <Device>
    <SerialNumber>12345678</SerialNumber>
    <ModelName>PXW-FX6</ModelName>
  </Device>
</NonRealTimeMeta>

<!-- Sony XAVC -->
<XAVCMetadata>
  <Device>
    <SerialNumber>87654321</SerialNumber>
    <ModelName>ILCE-7SM3</ModelName>
  </Device>
</XAVCMetadata>
```

---

### 2. Video Metadata Extractor (`lib/videoMetadata.js`)

**Purpose**: Extract metadata from video files

**Required Metadata:**
- Camera serial number
- Camera model
- File creation date
- File size
- Video duration
- Resolution (width x height)
- Frame rate
- Codec

**Implementation Options:**

**Option A: exiftool-vendored** (Recommended)
```javascript
const { exiftool } = require('exiftool-vendored');

async function extractMetadata(filePath) {
  const metadata = await exiftool.read(filePath);
  return {
    serialNumber: metadata.SerialNumber || metadata.InternalSerialNumber,
    model: metadata.Model || metadata.CameraModelName,
    created: metadata.CreateDate,
    size: stats.size,
    duration: metadata.Duration,
    // ... other fields
  };
}
```

**Option B: fluent-ffmpeg** (Alternative)
```javascript
const ffmpeg = require('fluent-ffmpeg');

function extractMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      // Extract relevant metadata from metadata.format and metadata.streams
      resolve(parsedData);
    });
  });
}
```

**Supported Formats:**
- MP4 (H.264, H.265/HEVC)
- MOV (ProRes, H.264)
- MXF (XDCAM, XAVC)

---

### 3. Analysis Engine (`lib/analyzer.js`)

**Purpose**: Main analysis logic coordinating all components

**Workflow:**

```javascript
async function analyzeFootage(folderPath, progressCallback) {
  // Step 1: Scan for XML files
  progressCallback({ step: 'xml', message: 'Scanning XML files...' });
  const xmlData = await xmlParser.parseAllXMLInFolder(folderPath);
  
  // Step 2: Build camera registry from XML
  const cameraRegistry = buildCameraRegistry(xmlData);
  
  // Step 3: Scan for video files
  progressCallback({ step: 'scan', message: 'Finding video files...' });
  const videoFiles = await findVideoFiles(folderPath);
  
  // Step 4: Extract metadata from each video
  progressCallback({ step: 'extract', message: 'Extracting metadata...' });
  const videoMetadata = [];
  for (let i = 0; i < videoFiles.length; i++) {
    const metadata = await extractMetadata(videoFiles[i]);
    videoMetadata.push(metadata);
    progressCallback({ 
      current: i + 1, 
      total: videoFiles.length,
      percentage: Math.round((i + 1) / videoFiles.length * 100)
    });
  }
  
  // Step 5: Group files by camera serial number
  progressCallback({ step: 'group', message: 'Grouping by camera...' });
  const cameras = groupByCamera(videoMetadata, cameraRegistry);
  
  // Step 6: Identify mixed folders
  const mixedFolders = findMixedFolders(videoMetadata);
  
  // Step 7: Calculate statistics
  const stats = calculateStatistics(cameras, videoMetadata);
  
  return {
    cameras,
    mixedFolders,
    stats,
    unknownFiles: videoMetadata.filter(v => !v.serialNumber)
  };
}
```

**Key Functions:**

- `buildCameraRegistry()`: Create lookup map of serial → camera info
- `findVideoFiles()`: Recursive file scanning
- `groupByCamera()`: Group videos by serial number
- `findMixedFolders()`: Identify folders with multiple cameras
- `calculateStatistics()`: Compute totals, averages, format distribution

---

### 4. Report Generator (`lib/reportGenerator.js`)

**CSV Format:**

```csv
Camera ID,Serial Number,Model,File Name,Current Folder,Size,Timestamp,Format
Camera A,SNY-12345,Sony FX6,C0001.MP4,card1,4.2 GB,2024-12-01 09:15:23,mp4
Camera A,SNY-12345,Sony FX6,C0002.MP4,card1,3.8 GB,2024-12-01 09:28:45,mp4
Camera B,SNY-67890,Sony A7S III,CLIP001.MOV,card3,5.1 GB,2024-12-01 10:12:08,mov
```

**HTML Format:**

```javascript
function generateHTMLReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Camera Footage Analysis Report</title>
      <style>
        /* Professional table styling */
      </style>
    </head>
    <body>
      <h1>Camera Footage Analysis Report</h1>
      
      <div class="summary">
        <p>Total Files: ${data.totalFiles}</p>
        <p>Total Size: ${data.totalSize}</p>
        <p>Cameras: ${data.cameras.length}</p>
      </div>
      
      ${data.cameras.map(camera => `
        <h2>${camera.id} - ${camera.model}</h2>
        <table>
          <!-- Camera files table -->
        </table>
      `).join('')}
    </body>
    </html>
  `;
}
```

---

## UI Design Specifications

### Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  [Camera Icon] Sony Camera Footage Analyzer         │
│  Identify and organize multi-camera footage         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │  [Folder Icon]                            │    │
│  │  Select Footage Folders                   │    │
│  │  Choose parent folder containing cards    │    │
│  │                                            │    │
│  │      [Start Analysis] Button               │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Summary Stats (4 cards)                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Total   │ │ Total   │ │ Cameras │ │ Mixed   │ │
│  │ Files   │ │ Size    │ │ Detected│ │ Folders │ │
│  │  247    │ │ 1.2 TB  │ │    4    │ │    3    │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────┤
│  Export Reports                                     │
│  [Export CSV] [Export HTML]                        │
├─────────────────────────────────────────────────────┤
│  Camera Breakdown                                   │
│  ┌───────────────────────────────────────────┐    │
│  │ [✓] Camera A - Sony FX6 (SNY-12345)       │    │
│  │     68 files • 324 GB                      │    │
│  │     [MP4: 45] [MOV: 18] [MXF: 5]          │    │
│  │                                            │    │
│  │     Files Table:                           │    │
│  │     File Name │ Folder │ Size │ Timestamp │    │
│  │     ─────────────────────────────────────  │    │
│  │     C0001.MP4 │ card1  │ 4.2GB│ 09:15:23  │    │
│  │     C0002.MP4 │ card1  │ 3.8GB│ 09:28:45  │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │ [✓] Camera B - Sony A7S III (SNY-67890)   │    │
│  │     92 files • 456 GB                      │    │
│  │     ...                                    │    │
│  └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Color Scheme

```css
/* Dark Theme */
Background: Linear gradient from #0f172a to #1e3a8a
Cards: rgba(255, 255, 255, 0.1) with backdrop blur
Text Primary: #ffffff
Text Secondary: #93c5fd (blue-200)
Accent: #3b82f6 (blue-500)
Success: #10b981 (green-500)
Warning: #f59e0b (orange-500)
```

### Component Design

**Camera Card:**
- Header with camera name, model, serial
- Statistics: file count, total size
- Format breakdown badges (MP4, MOV, MXF)
- Expandable file list table
- Rounded corners, subtle shadows
- Hover effects

**Progress Bar:**
- Percentage indicator
- Current file being processed
- Step indicator (XML → Scan → Extract → Group)
- Smooth animations

---

## Electron Configuration

### package.json

```json
{
  "name": "sony-camera-analyzer",
  "version": "1.0.0",
  "description": "Analyze and organize Sony camera footage",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win"
  },
  "build": {
    "appId": "com.sonycamera.analyzer",
    "productName": "Sony Camera Analyzer",
    "files": [
      "**/*",
      "!**/*.ts",
      "!*.md"
    ],
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns",
      "category": "public.app-category.video"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "dependencies": {
    "fast-xml-parser": "^4.3.2",
    "exiftool-vendored": "^25.0.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

### main.js (Electron Main Process)

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset', // Mac
    frame: true // Windows
  });

  mainWindow.loadFile('src/renderer/index.html');
}

app.whenReady().then(createWindow);

// IPC Handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder Containing Card Folders'
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('analyze-footage', async (event, folderPath) => {
  const { analyzeFootage } = require('./src/lib/analyzer');
  
  try {
    const results = await analyzeFootage(folderPath, (progress) => {
      event.sender.send('analysis-progress', progress);
    });
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-report', async (event, { format, data, filename }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });
  
  if (result.canceled) return { success: false };
  
  await fs.writeFile(result.filePath, data);
  return { success: true, path: result.filePath };
});
```

### preload.js (Security Bridge)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  analyzeFootage: (folderPath) => ipcRenderer.invoke('analyze-footage', folderPath),
  exportReport: (data) => ipcRenderer.invoke('export-report', data),
  onProgress: (callback) => {
    ipcRenderer.on('analysis-progress', (event, data) => callback(data));
  }
});
```

---

## Build & Deployment

### Development Setup

```bash
# 1. Clone/create project
mkdir sony-camera-analyzer
cd sony-camera-analyzer

# 2. Initialize npm
npm init -y

# 3. Install dependencies
npm install electron --save-dev
npm install electron-builder --save-dev
npm install fast-xml-parser exiftool-vendored

# 4. Copy project files into structure

# 5. Run development version
npm start
```

### Building Executables

```bash
# Build for current platform
npm run build

# Build for Mac (requires Mac)
npm run build:mac

# Build for Windows (can run on any platform)
npm run build:win
```

### Output

**Windows:**
- `build/win/Sony Camera Analyzer Setup.exe` (~80-100MB)
- Includes NSIS installer
- Silent installation available

**Mac:**
- `build/mac/Sony Camera Analyzer.dmg` (~80-100MB)
- Drag-to-Applications installer
- Notarization recommended for distribution

### Code Signing (Optional but Recommended)

**Windows:**
- Use `electron-builder` with certificate
- Purchase code signing certificate (~$100-400/year)
- Prevents "Unknown Publisher" warnings

**Mac:**
- Requires Apple Developer account ($99/year)
- Use `electron-builder` with certificate
- Notarization required for macOS 10.15+

---

## Testing Strategy

### Unit Tests

Test individual components:
- XML parser with various Sony XML formats
- Video metadata extraction with different file types
- File grouping logic
- Report generation

### Integration Tests

Test complete workflows:
- Full analysis of sample footage folder
- Export functionality
- Progress tracking
- Error handling

### Manual Testing Checklist

- [ ] Select folder and start analysis
- [ ] Progress bar updates correctly
- [ ] Results display accurately
- [ ] Export CSV works
- [ ] Export HTML works
- [ ] Mixed folder detection works
- [ ] Unknown files handled properly
- [ ] Large dataset performance (1TB+)
- [ ] App works offline
- [ ] Windows installation
- [ ] Mac installation

### Performance Benchmarks

**Target Performance:**
- 1000 video files: < 2 minutes
- 5000 video files: < 10 minutes
- 10000 video files: < 20 minutes

**Optimization Strategies:**
- Parallel file processing (worker threads)
- Stream large files instead of loading into memory
- Cache metadata extraction results
- Lazy load file lists in UI

---

## Error Handling

### Common Errors & Solutions

**1. Permission Denied**
- Issue: Cannot read files/folders
- Solution: Request elevated permissions, show user-friendly error

**2. Corrupted XML**
- Issue: Malformed XML files
- Solution: Skip and continue, log error, report in UI

**3. Missing Metadata**
- Issue: Video file has no camera serial
- Solution: Add to "Unknown Files" list, attempt filename pattern matching

**4. Large File Timeout**
- Issue: Metadata extraction takes too long
- Solution: Implement timeout (30s), skip file, report in UI

**5. Out of Memory**
- Issue: Processing too many files at once
- Solution: Process in batches, use streams

### Error Reporting UI

```
┌─────────────────────────────────────┐
│ ⚠️ Warning: 15 files skipped        │
│                                     │
│ • 10 files: No metadata found       │
│ • 3 files: Permission denied        │
│ • 2 files: Corrupted/unreadable     │
│                                     │
│ [View Details] [Continue]           │
└─────────────────────────────────────┘
```

---

## Security Considerations

1. **File System Access**
   - Read-only operations only
   - Never write to analyzed folders
   - Validate all file paths

2. **XML Parsing**
   - Protect against XML bombs
   - Limit XML file size (< 10MB)
   - Use safe parsing libraries

3. **User Data**
   - No data sent to external servers
   - All processing happens locally
   - No analytics or tracking

4. **Code Injection**
   - Context isolation enabled
   - No `eval()` or dynamic code execution
   - Sanitize all user inputs

---

## Future Enhancements (Phase 2)

1. **Auto-Organize**
   - Optional automatic file moving
   - Dry-run mode showing what would be moved
   - Undo functionality

2. **Batch Processing**
   - Process multiple shoot days at once
   - Queue management

3. **Custom Templates**
   - User-defined folder naming schemes
   - Camera naming/labeling

4. **Cloud Integration**
   - Export reports to Google Drive/Dropbox
   - Share reports with team

5. **Advanced Filtering**
   - Filter by date range
   - Filter by camera model
   - Filter by format

6. **Statistics Dashboard**
   - Camera usage statistics
   - Storage utilization charts
   - Timeline visualization

---

## Support & Documentation

### User Documentation

Create a simple PDF/HTML guide:
1. Installation instructions
2. How to select folders
3. Understanding the results
4. Exporting reports
5. FAQ
6. Troubleshooting

### Developer Documentation

- API documentation for each module
- Architecture diagrams
- Contribution guidelines
- Release process

---

## Deliverables Checklist

- [ ] Complete source code
- [ ] package.json with all dependencies
- [ ] README.md with setup instructions
- [ ] User documentation (PDF)
- [ ] Developer documentation (this file)
- [ ] Mac .dmg installer
- [ ] Windows .exe installer
- [ ] Sample test data
- [ ] Unit tests
- [ ] Build scripts
- [ ] Icon assets (.icns, .ico)

---

## Contact & Questions

For implementation questions, contact:
- Technical Lead: [Your contact]
- Project Manager: [Your contact]

---

## Estimated Development Timeline

**Phase 1: Core Functionality (4-6 weeks)**
- Week 1-2: Project setup, XML parser, video metadata extractor
- Week 3-4: Analysis engine, grouping logic
- Week 5: UI development (React dashboard)
- Week 6: Report generation, testing, bug fixes

**Phase 2: Polish & Distribution (2-3 weeks)**
- Week 7: Performance optimization
- Week 8: Build process, installers, documentation
- Week 9: Final testing, deployment

**Total Estimated Time: 6-9 weeks**

---

## License

Specify your license here (MIT, Apache, Proprietary, etc.)

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Author: [Your Name]*