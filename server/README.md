# Server

Express TypeScript server for Audio2MP4 Web.

## Prerequisites

- **Node.js** 18+ 
- **FFmpeg** - Required for video rendering
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Environment Variables

Create a `.env` file in this directory with:

```bash
SERVER_PORT=8080
CORS_ORIGIN=http://localhost:5173

# File upload limits (in MB)
MAX_FILE_MB=100
MAX_TOTAL_MB=600

# Job cleanup (in minutes)
CLEANUP_MINUTES=15

# FFmpeg path (leave empty to use system default)
FFMPEG_PATH=
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `./test-upload.sh` - Test the upload endpoint with various scenarios

## API Endpoints

### Health Check
- `POST /api/ping` - Returns `{ ok: true }`

### Render Job

#### Create Render Job
- `POST /api/render`
- Content-Type: `multipart/form-data`
- Returns: `202 { jobId: string }`

**Request Format:**
- `meta` (JSON string): `{ tracks: [{ title?: string }], width: number, height: number, fps: number }`
- `audio_0`, `audio_1`, ..., `audio_N` (files): Audio files for each track
- `image_0`, `image_1`, ..., `image_N` (files): Image files for each track

**Constraints:**
- 2 ≤ tracks ≤ 10
- Audio types: mp3, wav, m4a, aac, flac, ogg
- Image types: jpg, jpeg, png, webp
- Per-file size ≤ `MAX_FILE_MB` (default 100MB)
- Total payload ≤ `MAX_TOTAL_MB` (default 600MB)

**Error Codes:**
- `400` - Invalid request (missing files, wrong track count, etc.)
- `413` - Payload too large
- `415` - Unsupported file type
- `429` - Server busy (another job is processing)
- `500` - Internal server error

**Example:**
```bash
curl -X POST http://localhost:8080/api/render \
  -F 'meta={"tracks":[{"title":"Track 1"},{"title":"Track 2"}],"width":1920,"height":1080,"fps":30}' \
  -F 'audio_0=@track1.mp3' \
  -F 'audio_1=@track2.mp3' \
  -F 'image_0=@cover1.jpg' \
  -F 'image_1=@cover2.jpg'
```

#### Monitor Job Progress (SSE)
- `GET /api/render/:jobId/log`
- Content-Type: `text/event-stream`
- Returns: Server-Sent Events stream

**Event Types:**
- `log` - Text log messages from FFmpeg
- `progress` - JSON: `{ step: "segment"|"concat", index?: number, total?: number }`
- `done` - JSON: `{ downloadUrl: string }`
- `error` - Error message

**Example:**
```bash
curl -N http://localhost:8080/api/render/{jobId}/log
```

#### Download Rendered Video
- `GET /api/render/:jobId/download`
- Returns: MP4 video file
- Content-Disposition: attachment

**Example:**
```bash
curl -O http://localhost:8080/api/render/{jobId}/download
```

## Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run tests
./test-upload.sh
```

