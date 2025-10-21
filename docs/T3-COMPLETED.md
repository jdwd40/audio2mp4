# T3 - Upload Endpoint with Multer - COMPLETED ✓

## Summary

Task T3 has been successfully completed. The server now has a fully functional upload endpoint that accepts multipart/form-data uploads with comprehensive validation.

## What Was Implemented

### 1. Dependencies Installed
- `multer` (^2.0.2) - For handling multipart/form-data uploads
- `uuid` (^13.0.0) - For generating unique job IDs
- `@types/multer` (^2.0.0) - TypeScript types for multer

### 2. New Files Created

#### Configuration Files
- **`src/config.ts`** - Centralized configuration management with environment variable support
  - Server port and CORS settings
  - Upload limits (MAX_FILE_MB, MAX_TOTAL_MB)
  - Cleanup settings (CLEANUP_MINUTES)
  - FFmpeg path configuration

#### Type Definitions
- **`src/types.ts`** - TypeScript interfaces and constants
  - `Track`, `RenderMeta`, `JobData` interfaces
  - Allowed file type constants (AUDIO/IMAGE types and mimetypes)

#### Job Management
- **`src/jobStore.ts`** - In-memory job storage
  - Job CRUD operations
  - Active job tracking (for T8 concurrency limits)
  - Job status management

#### Middleware
- **`src/middleware/upload.ts`** - Multer configuration and file validation
  - File type validation (by mimetype and extension)
  - Per-file size limits
  - Maximum file count limits
  - Memory storage for uploaded files

- **`src/middleware/errorHandler.ts`** - Centralized error handling
  - Converts errors to JSON responses
  - Handles Multer-specific errors (file size, count, etc.)
  - Proper HTTP status codes (400, 413, 415, 500)

#### Routes
- **`src/routes/render.ts`** - Main render endpoint
  - `POST /api/render` route implementation
  - Comprehensive validation logic
  - Temporary directory creation
  - File saving with standardized naming
  - Job creation and storage

### 3. Updated Files
- **`src/index.ts`** - Added error handler middleware and config usage
- **`src/routes/api.ts`** - Integrated render router

### 4. Testing
- **`server/test-upload.sh`** - Comprehensive test script
  - Tests valid 2-track upload (✓)
  - Tests too few tracks validation (✓)
  - Tests missing file validation (✓)
  - Tests invalid file type validation (✓)

## API Endpoint

### POST /api/render

**Request Format:**
- Content-Type: `multipart/form-data`
- Field `meta` (JSON string):
  ```json
  {
    "tracks": [{ "title": "Track 1" }, { "title": "Track 2" }],
    "width": 1920,
    "height": 1080,
    "fps": 30
  }
  ```
- Files: `audio_0`, `audio_1`, ..., `audio_N` (audio files)
- Files: `image_0`, `image_1`, ..., `image_N` (image files)

**Response:**
- Success: `202 Accepted` with `{ "jobId": "uuid" }`
- Error: Appropriate status code with `{ "error": "message" }`

## Validation Implemented

### Track Count
- ✓ Minimum 2 tracks
- ✓ Maximum 10 tracks

### File Types
- ✓ Audio: mp3, wav, m4a, aac, flac, ogg
- ✓ Images: jpg, jpeg, png, webp
- ✓ Validates by both MIME type and file extension

### File Sizes
- ✓ Per-file limit: 100MB (configurable via MAX_FILE_MB)
- ✓ Total payload limit: 600MB (configurable via MAX_TOTAL_MB)

### File Completeness
- ✓ Each track must have both audio and image
- ✓ No duplicate files for the same track
- ✓ File indices must match track count

### Metadata
- ✓ Valid JSON in meta field
- ✓ Required fields: tracks, width, height, fps
- ✓ Tracks array structure validation

## Error Handling

All errors return proper JSON responses with appropriate HTTP status codes:

- **400 Bad Request** - Invalid request format, wrong track count, missing files
- **413 Payload Too Large** - File or total payload exceeds limits
- **415 Unsupported Media Type** - Invalid file types
- **429 Too Many Requests** - Server busy (concurrency check for T8)
- **500 Internal Server Error** - Unexpected server errors

## File Storage

- Creates unique temp directory per job: `/tmp/audio2mp4-{jobId}-{random}/`
- Saves files with standardized names:
  - `audio_0.mp3`, `audio_1.mp3`, etc.
  - `image_0.jpg`, `image_1.jpg`, etc.
- Preserves original file extensions
- Files stored in memory until saved to disk

## Testing Results

All validation tests pass successfully:

```bash
$ ./test-upload.sh

=== Test 1: Valid 2-track upload ===
✓ Success! Response: {"jobId":"..."}

=== Test 2: Too few tracks (1 track, should fail) ===
✓ Correctly rejected! Response: {"error":"Number of tracks must be between 2 and 10, got 1"}

=== Test 3: Missing audio file (should fail) ===
✓ Correctly rejected! Response: {"error":"Missing audio file for track 1"}

=== Test 4: Invalid file type (should fail) ===
✓ Correctly rejected! Response: {"error":"Invalid audio file type: txt. Allowed types: mp3, wav, m4a, aac, flac, ogg"}

All tests completed!
```

## Configuration

Server can be configured via environment variables in `.env`:

```bash
SERVER_PORT=8080
CORS_ORIGIN=http://localhost:5173
MAX_FILE_MB=100
MAX_TOTAL_MB=600
CLEANUP_MINUTES=15
FFMPEG_PATH=
```

## Documentation

Updated `server/README.md` with:
- Environment variable documentation
- API endpoint documentation
- Request/response examples
- Constraint details
- Error code reference

## Task Completion Criteria

**Done when:** You can POST a small 2-track form via curl and receive {jobId}

✅ **VERIFIED:** Multiple successful uploads tested via both manual curl commands and automated test script.

## Next Steps (T4)

The upload endpoint is now ready for integration with:
- T4: SSE progress stream (`GET /api/render/:jobId/log`)
- T5: FFmpeg integration (actual video rendering)
- T6: Download route (`GET /api/render/:jobId/download`)

## File Structure

```
server/
├── src/
│   ├── config.ts                    # ✨ New: Configuration management
│   ├── types.ts                     # ✨ New: Type definitions
│   ├── jobStore.ts                  # ✨ New: Job storage
│   ├── index.ts                     # 📝 Updated: Added error handler
│   ├── middleware/
│   │   ├── upload.ts                # ✨ New: Multer config & validation
│   │   └── errorHandler.ts          # ✨ New: Error handling
│   └── routes/
│       ├── api.ts                   # 📝 Updated: Added render router
│       └── render.ts                # ✨ New: Upload endpoint
├── test-upload.sh                   # ✨ New: Test script
└── README.md                        # 📝 Updated: API documentation
```

