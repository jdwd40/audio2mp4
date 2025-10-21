# Audio2MP4 Web

A web application that converts multiple audio files with cover images into a single MP4 video file.

## Features

- Upload 2-10 audio tracks with corresponding cover images
- Drag-and-drop reordering of tracks
- Multiple output presets (1920x1080, 1080x1080, 1080x1920)
- Real-time progress tracking via Server-Sent Events
- Direct download of the rendered video

## Project Structure

```
audio2mp4-web/
  docs/               # Documentation and task specifications
  client/             # Vite + React (TypeScript)
  server/             # Express (TypeScript)
  package.json        # Root package with npm workspaces
  README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- FFmpeg installed on the system

### Installation

```bash
npm install
```

### Development

Start the client development server:
```bash
npm run dev:client
```

Start the server development server:
```bash
npm run dev:server
```

### Build

Build both client and server:
```bash
npm run build
```

## Documentation

For detailed task specifications and development roadmap, see [docs/cursor_tasks.md](docs/cursor_tasks.md).

## License

MIT

