# T4 — SSE Progress Stream

## What was implemented

✅ **Server-Sent Events (SSE) endpoint** for real-time job progress streaming

### Components Created

1. **`src/eventEmitter.ts`** - Job event management system
   - Manages SSE connections per job
   - Supports multiple event types: `log`, `progress`, `done`, `error`
   - Handles connection lifecycle and cleanup

2. **`GET /api/render/:jobId/log`** - SSE endpoint
   - Streams real-time progress updates for a job
   - Returns 404 if job doesn't exist
   - Automatically sends demo events for testing

### Event Types

The SSE endpoint emits the following event types:

#### 1. `log` event
```
event: log
data: <text line>
```
Used for general log messages during processing.

#### 2. `progress` event
```
event: progress
data: {"step":"segment","index":0,"total":2}
```
Used to report progress during segment generation or concatenation.
- `step`: either `"segment"` or `"concat"`
- `index`: current item being processed (optional)
- `total`: total number of items (optional)

#### 3. `done` event
```
event: done
data: {"downloadUrl":"/api/render/:jobId/download"}
```
Emitted when the job completes successfully.

#### 4. `error` event
```
event: error
data: <error message>
```
Emitted when the job fails.

## How to Test

### Automated Test Script

Run the included test script:

```bash
cd server
./test-sse.sh
```

This will:
1. Create a test job with 2 tracks
2. Connect to the SSE endpoint
3. Display events as they arrive
4. Auto-disconnect after 5 seconds

### Manual Testing

#### Step 1: Start the server

```bash
npm run dev:server
```

#### Step 2: Create a job

Use the existing upload script or curl:

```bash
./test-upload.sh
```

Note the `jobId` from the response.

#### Step 3: Connect to SSE endpoint

```bash
curl -N http://localhost:8080/api/render/<jobId>/log
```

Replace `<jobId>` with your actual job ID.

You should see:
```
: connected

event: log
data: Connected to job <jobId>

event: log
data: Job processing will begin...

event: progress
data: {"step":"segment","index":0,"total":2}

event: log
data: Simulating processing of 2 tracks
```

The connection will stay open and stream events in real-time.

### Browser Testing

#### Option 1: Use the test HTML page

Open `test-sse.html` in your browser:

```bash
# Open in your default browser (Linux)
xdg-open test-sse.html

# Or just open the file directly in any browser
```

The page provides:
- Input field for job ID
- Connect/Disconnect buttons
- Real-time log display with syntax highlighting
- Auto-connect via URL parameter: `test-sse.html?jobId=<job-id>`

#### Option 2: JavaScript console

You can also test from the browser console:

```javascript
const jobId = '<your-job-id>';
const eventSource = new EventSource(`http://localhost:8080/api/render/${jobId}/log`);

eventSource.addEventListener('log', (event) => {
  console.log('Log:', event.data);
});

eventSource.addEventListener('progress', (event) => {
  const progress = JSON.parse(event.data);
  console.log('Progress:', progress);
});

eventSource.addEventListener('done', (event) => {
  const result = JSON.parse(event.data);
  console.log('Done:', result.downloadUrl);
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  console.error('Error:', event.data);
  eventSource.close();
});
```

## Architecture

### In-Memory Event System

The `JobEventEmitter` class manages:
- One `EventEmitter` per job ID
- Multiple SSE connections per job (if multiple clients connect)
- Automatic cleanup when connections close

### Connection Lifecycle

1. **Client connects** → `GET /api/render/:jobId/log`
2. **Server registers connection** → Sets SSE headers, stores response object
3. **Events are emitted** → Broadcast to all connected clients for that job
4. **Client disconnects** → Cleanup listeners, remove from connections map
5. **Job cleanup** → After job completes + cleanup period, remove emitter

## Integration with T5

When T5 (FFmpeg integration) is implemented:
- Replace demo `setTimeout` calls with real FFmpeg events
- Emit `log` events for FFmpeg stderr output
- Emit `progress` events before each segment and concat step
- Emit `done` event with download URL when complete
- Emit `error` event if FFmpeg fails

Example for T5:
```typescript
// Before processing each segment
jobEventEmitter.emitProgress(jobId, {
  step: 'segment',
  index: i,
  total: tracks.length
});

// FFmpeg stderr lines
ffmpegProcess.stderr.on('data', (data) => {
  jobEventEmitter.emitLog(jobId, data.toString());
});

// On completion
jobEventEmitter.emitDone(jobId, `/api/render/${jobId}/download`);

// On error
jobEventEmitter.emitError(jobId, error.message);
```

## Done Criteria ✓

- [x] Route `GET /api/render/:jobId/log` implemented
- [x] Returns SSE stream with proper headers
- [x] Supports event types: `log`, `progress`, `done`, `error`
- [x] In-memory event emitter keyed by `jobId`
- [x] Opening the SSE URL streams a heartbeat or fake log
- [x] Test script demonstrates functionality

## Next Steps (T5)

Replace demo events with real FFmpeg integration:
1. Spawn FFmpeg processes for each track
2. Capture and stream stderr output
3. Parse FFmpeg progress
4. Emit real-time updates to connected clients

