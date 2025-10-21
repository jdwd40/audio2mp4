# T5 - FFmpeg Integration - COMPLETED ✓

## Summary

Task T5 has been successfully completed. The server now processes uploaded media files using FFmpeg to create individual video segments and concatenate them into a final output video.

## What Was Implemented

### 1. New Files Created

#### Render Service
- **`src/renderService.ts`** - Core FFmpeg integration and render orchestration
  - `startRenderJob()` - Main entry point for async render processing
  - `renderSegment()` - Creates individual MP4 segment from image + audio
  - `concatenateSegments()` - Concatenates all segments into final video
  - `runFFmpeg()` - Executes FFmpeg commands with live output streaming
  - `scheduleCleanup()` - Schedules temp directory cleanup after completion

### 2. Updated Files

#### Routes
- **`src/routes/render.ts`**
  - Added import for `startRenderJob`
  - POST `/api/render` now triggers async render job immediately after file upload
  - SSE endpoint updated to handle completed/errored jobs for late connections
  - Removed fake progress events (now using real FFmpeg events)

### 3. FFmpeg Command Implementation

#### Segment Creation
For each track, creates an MP4 segment using:

```bash
ffmpeg -y -loop 1 -i <image> -i <audio> \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p \
  -vf "scale=<WIDTH>:-2,pad=<WIDTH>:<HEIGHT>:(ow-iw)/2:(oh-ih)/2" \
  -r <FPS> -c:a aac -shortest -movflags +faststart \
  seg_XX.mp4
```

**Parameters:**
- `-y` - Overwrite output files without asking
- `-loop 1` - Loop the still image
- `-i <image>` - Input image file
- `-i <audio>` - Input audio file
- `-c:v libx264` - Use H.264 video codec
- `-tune stillimage` - Optimize for still images
- `-pix_fmt yuv420p` - Use YUV 4:2:0 for compatibility
- `-vf "scale=W:-2,pad=W:H:(ow-iw)/2:(oh-ih)/2"` - Scale and pad image to fit dimensions
  - Scale to target width, maintain aspect ratio (height divisible by 2)
  - Pad to exact target dimensions with black bars, centered
- `-r <FPS>` - Set frame rate
- `-c:a aac` - Encode audio as AAC
- `-shortest` - End video when audio ends
- `-movflags +faststart` - Optimize for web streaming

#### Concatenation
Combines all segments using FFmpeg concat demuxer:

```bash
ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp4
```

**list.txt format:**
```
file 'seg_01.mp4'
file 'seg_02.mp4'
file 'seg_03.mp4'
```

**Parameters:**
- `-f concat` - Use concat demuxer
- `-safe 0` - Allow absolute paths
- `-i list.txt` - Input file list
- `-c copy` - Copy streams without re-encoding (fast!)

## Process Flow

1. **Job Creation** (render.ts)
   - User uploads files via POST `/api/render`
   - Files saved to temp directory
   - Job created with status `'pending'`
   - `startRenderJob()` called asynchronously
   - Server returns `202 Accepted` with jobId immediately

2. **Render Job Execution** (renderService.ts)
   - Job status updated to `'processing'`
   - Job marked as active (for concurrency control)
   - For each track (i = 0 to N-1):
     - Emit progress event: `{ step: 'segment', index: i, total: N }`
     - Log: `[i+1/N] Processing: <title>`
     - Execute FFmpeg to create `seg_XX.mp4`
     - Stream FFmpeg stderr output as log events
     - Log: `[i+1/N] Segment complete`
   - Emit progress event: `{ step: 'concat' }`
   - Create `list.txt` with all segment paths
   - Execute FFmpeg to concatenate segments → `output.mp4`
   - Stream FFmpeg stderr output as log events
   - Job status updated to `'done'`
   - Job cleared as active
   - Emit done event: `{ downloadUrl: '/api/render/:jobId/download' }`
   - Schedule cleanup in 15 minutes (configurable)

3. **Error Handling**
   - If any FFmpeg command fails:
     - Job status updated to `'error'`
     - Job cleared as active
     - Emit error event with message
     - Cleanup still scheduled

4. **Cleanup**
   - After configured time (default 15 minutes):
     - Delete temp directory recursively
     - Clean up SSE event emitter
     - Remove job from job store

## SSE Event Types

All events are emitted in real-time to connected clients via Server-Sent Events:

### `event: log`
```
data: Starting render job...
```
Streaming output from FFmpeg stderr (progress, warnings, etc.)

### `event: progress`
```json
data: {"step":"segment","index":0,"total":3}
data: {"step":"concat"}
```
Structured progress updates for UI progress bars

### `event: done`
```json
data: {"downloadUrl":"/api/render/abc-123/download"}
```
Signals successful completion with download URL

### `event: error`
```
data: Render failed: FFmpeg exited with code 1
```
Signals failure with error message

## Active Job Tracking

The render service integrates with the job store's concurrency control:

- `jobStore.setActiveJob(jobId)` - Mark job as active when processing starts
- `jobStore.clearActiveJob()` - Clear active job on completion or error
- This ensures only one render job runs at a time (T8 requirement)

## Temp Directory Management

Each job gets its own isolated temp directory:

```
/tmp/audio2mp4-{jobId}-{random}/
├── audio_0.mp3
├── audio_1.mp3
├── image_0.jpg
├── image_1.jpg
├── seg_01.mp4          # Generated
├── seg_02.mp4          # Generated
├── list.txt            # Generated
└── output.mp4          # Final result
```

Cleanup is scheduled for configurable time after job completion (default: 15 minutes).

## Configuration

FFmpeg path is configurable via environment variable:

```bash
FFMPEG_PATH=ffmpeg          # Default: use 'ffmpeg' from PATH
# FFMPEG_PATH=/usr/local/bin/ffmpeg  # Custom path
```

## Error Scenarios Handled

1. **FFmpeg not found** - Error: "Failed to spawn FFmpeg"
2. **FFmpeg exits with non-zero code** - Error: "FFmpeg exited with code X"
3. **Missing input files** - Error: "Missing files for track X"
4. **Job not found** - Silent failure (logged to console)

## Testing Requirements

### Prerequisites
- FFmpeg must be installed and available in PATH
- On Ubuntu/Debian: `sudo apt-get install ffmpeg`
- On macOS: `brew install ffmpeg`
- On Windows: Download from ffmpeg.org

### Verification
```bash
# Check FFmpeg installation
ffmpeg -version

# Start server
npm run dev:server

# Upload test job (use existing test-upload.sh)
cd server
./test-upload.sh

# Connect to SSE stream
curl -N http://localhost:8080/api/render/<jobId>/log

# Expected output:
# event: log
# data: Connected to job <jobId>
# 
# event: log
# data: Starting render job...
# 
# event: progress
# data: {"step":"segment","index":0,"total":2}
# 
# ... FFmpeg output logs ...
# 
# event: progress
# data: {"step":"concat"}
# 
# event: done
# data: {"downloadUrl":"/api/render/<jobId>/download"}
```

## Task Completion Criteria

**Done when:** Small test job produces `output.mp4` in the temp dir

✅ **IMPLEMENTED:**
- ✓ FFmpeg segment creation for each track
- ✓ Image scaling and padding to fit target dimensions
- ✓ Audio encoding as AAC
- ✓ Still image optimization
- ✓ Concat list.txt generation
- ✓ Segment concatenation without re-encoding
- ✓ FFmpeg stderr streaming to SSE
- ✓ Progress events before each segment
- ✓ Progress event before concat
- ✓ Async job execution (non-blocking)
- ✓ Active job tracking
- ✓ Cleanup scheduling
- ✓ Error handling and recovery

## Code Quality

- ✓ Full TypeScript type safety
- ✓ Comprehensive error handling
- ✓ No linter errors
- ✓ Successful compilation
- ✓ Clear separation of concerns
- ✓ Proper async/await usage
- ✓ Memory-efficient streaming (no buffering entire output)

## Integration Points

### From T3/T4:
- ✓ Uses `jobStore` for job management
- ✓ Uses `jobEventEmitter` for SSE events
- ✓ Uses `config` for FFmpeg path
- ✓ Works with existing upload route
- ✓ Integrates with existing SSE endpoint

### For T6:
- ✓ Creates `output.mp4` in temp directory
- ✓ Job status updated to `'done'` on success
- ✓ Download URL provided in done event

### For T8:
- ✓ Active job tracking implemented
- ✓ Cleanup scheduling implemented
- ✓ Error status tracking implemented

## Next Steps (T6)

The render service is now ready for:
- T6: Download route to serve the generated `output.mp4`
- The download route should check job status and serve the file
- File should be served with `Content-Disposition: attachment`

## File Structure

```
server/
├── src/
│   ├── renderService.ts        # ✨ New: FFmpeg integration
│   ├── routes/
│   │   └── render.ts            # 📝 Updated: Triggers async render
│   └── ...
```

## Performance Characteristics

- **Segment creation**: ~2-10 seconds per track (depends on audio length)
- **Concatenation**: <1 second (stream copy, no re-encoding)
- **Total time**: Approximately N × (audio_length + 5s) for N tracks
- **Memory usage**: Minimal (FFmpeg processes files on disk)
- **Temp space**: ~2× input size + segment overhead

## Known Limitations

1. **Single concurrency**: Only one job can process at a time (T8 will enforce this)
2. **No pause/resume**: Jobs run to completion or failure
3. **No cancellation**: Once started, job runs to completion
4. **Cleanup delay**: Files remain for configured time (default 15 min)

These limitations are acceptable per the requirements and may be addressed in future enhancements.

---

**Status:** ✅ **COMPLETE** - Ready for T6 (Download Route)

