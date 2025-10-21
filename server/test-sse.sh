#!/bin/bash

# T4 Test Script: SSE Progress Stream
# This script tests the Server-Sent Events endpoint

set -e

SERVER_URL="${SERVER_URL:-http://localhost:8080}"
API_URL="$SERVER_URL/api"

echo "=== T4: SSE Progress Stream Test ==="
echo "Server: $SERVER_URL"
echo ""

# Step 1: Create a test job
echo "Step 1: Creating a test job..."
echo ""

# Create temporary test files
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Generate test audio file (silent audio)
dd if=/dev/zero bs=1024 count=100 2>/dev/null | \
  base64 > "$TMP_DIR/audio_0.mp3"

dd if=/dev/zero bs=1024 count=100 2>/dev/null | \
  base64 > "$TMP_DIR/audio_1.mp3"

# Generate test image files (minimal data)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | \
  base64 -d > "$TMP_DIR/image_0.png"

echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | \
  base64 -d > "$TMP_DIR/image_1.png"

# Create metadata
META='{
  "tracks": [
    {"title": "Track 1"},
    {"title": "Track 2"}
  ],
  "width": 1920,
  "height": 1080,
  "fps": 30
}'

# Upload and create job
RESPONSE=$(curl -s -X POST "$API_URL/render" \
  -F "meta=$META" \
  -F "audio_0=@$TMP_DIR/audio_0.mp3" \
  -F "audio_1=@$TMP_DIR/audio_1.mp3" \
  -F "image_0=@$TMP_DIR/image_0.png" \
  -F "image_1=@$TMP_DIR/image_1.png")

echo "Upload response: $RESPONSE"
echo ""

# Extract jobId
JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "ERROR: Failed to create job"
  exit 1
fi

echo "✓ Job created: $JOB_ID"
echo ""

# Step 2: Connect to SSE endpoint
echo "Step 2: Connecting to SSE endpoint..."
echo "Endpoint: $API_URL/render/$JOB_ID/log"
echo ""
echo "Listening for events (will auto-stop after 5 seconds)..."
echo "---"

# Use curl to connect to SSE endpoint
# -N: disable buffering
# --max-time: timeout after 5 seconds
curl -N --max-time 5 "$API_URL/render/$JOB_ID/log" 2>/dev/null || true

echo ""
echo "---"
echo ""
echo "✓ SSE connection test complete"
echo ""
echo "Expected output:"
echo "  - event: log messages"
echo "  - event: progress with JSON data"
echo "  - Connection should stream for 5 seconds"
echo ""
echo "=== T4 Test Complete ==="

