# Sony Camera Footage Analyzer

A cross-platform desktop application (Mac & Windows) that analyzes Sony camera footage, identifies which files belong to which camera using metadata, and generates detailed reports.

## Features

- 📁 **Folder Analysis** - Scan parent folders containing multiple card folders
- 🎥 **Camera Identification** - Parse Sony XML files and video metadata to identify cameras
- 📊 **Detailed Reports** - View camera breakdown with file counts, sizes, and format distribution
- ⚠️ **Mixed Folder Detection** - Identify folders containing footage from multiple cameras
- 💾 **Export Reports** - Export analysis results to CSV format
- 🔒 **Read-Only** - No file moving or copying - completely safe for your footage

## Supported Formats

- Video: `.mp4`, `.mov`, `.mxf`
- Metadata: Sony XML files (XDCAM, XAVC, Alpha/FX series)

## Installation

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building Executables

```bash
# Build for current platform
npm run electron:build

# The output will be in the 'dist' folder
```

## Usage

1. **Select Folder** - Click to select the parent folder containing your card folders
2. **Analysis** - The app will scan all subfolders for video files and XML metadata
3. **Review Results** - View the camera breakdown, file counts, and sizes
4. **Export** - Export the analysis to CSV for further processing

## Technology Stack

- **Framework**: Electron + React + Vite
- **UI**: Tailwind CSS v4
- **XML Parsing**: fast-xml-parser
- **Video Metadata**: exiftool-vendored

## Project Structure

```
sony-camera-analyzer/
├── main.cjs              # Electron main process
├── preload.cjs           # Secure IPC bridge
├── lib/                  # Node.js backend logic
│   ├── xmlParser.cjs     # Sony XML metadata parser
│   ├── videoMetadata.cjs # Video file metadata extractor
│   └── analyzer.cjs      # Main analysis engine
├── src/                  # React frontend
│   ├── components/       # UI components
│   │   ├── Dashboard.jsx
│   │   ├── CameraCard.jsx
│   │   └── ProgressBar.jsx
│   └── App.jsx
└── dist/                 # Build output
```

## Safety

This application performs **read-only operations only**. It will:
- ✅ Read video files and XML metadata
- ✅ Analyze and group files by camera
- ✅ Generate reports

It will **NOT**:
- ❌ Move or copy files
- ❌ Modify your footage
- ❌ Delete anything
- ❌ Send data to external servers

## License

MIT
