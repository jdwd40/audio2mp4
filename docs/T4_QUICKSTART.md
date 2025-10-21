# T4 Quick Start Guide

## Testing the SSE Implementation

### Method 1: Automated Script (Recommended)
```bash
cd server
./test-sse.sh
```

### Method 2: Manual Testing
```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Create a job
cd server
./test-upload.sh
# Note the jobId from response

# Terminal 3: Watch SSE stream
curl -N http://localhost:8080/api/render/<jobId>/log
```

### Method 3: Browser
1. Open `server/test-sse.html` in your browser
2. Enter a job ID
3. Click "Connect"
4. Watch events stream in real-time

## What's Working

✅ SSE endpoint: `GET /api/render/:jobId/log`  
✅ Event types: `log`, `progress`, `done`, `error`  
✅ Real-time streaming  
✅ Multiple clients per job  
✅ Proper cleanup  

## Example Output

```
: connected

event: log
data: Connected to job c5a17271-9410-4eb3-9701-cf7c12541829

event: log
data: Job processing will begin...

event: progress
data: {"step":"segment","index":0,"total":2}

event: log
data: Simulating processing of 2 tracks
```

## Ready for T5

The SSE infrastructure is complete. T5 will replace demo events with real FFmpeg output.

