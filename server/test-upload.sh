#!/bin/bash

# Test script for /api/render endpoint
# Usage: ./test-upload.sh

set -e

SERVER_URL="http://localhost:8080"
TEST_DIR="$(mktemp -d)"

echo "Creating test files in $TEST_DIR..."

# Create dummy audio files (10KB each)
dd if=/dev/zero of="$TEST_DIR/audio_0.mp3" bs=1024 count=10 2>/dev/null
dd if=/dev/zero of="$TEST_DIR/audio_1.mp3" bs=1024 count=10 2>/dev/null

# Create dummy image files (4 bytes each - minimal)
echo -n "TEST" > "$TEST_DIR/image_0.jpg"
echo -n "TEST" > "$TEST_DIR/image_1.jpg"

echo ""
echo "=== Test 1: Valid 2-track upload ==="
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$SERVER_URL/api/render" \
  -F 'meta={"tracks":[{"title":"Track 1"},{"title":"Track 2"}],"width":1920,"height":1080,"fps":30}' \
  -F "audio_0=@$TEST_DIR/audio_0.mp3" \
  -F "audio_1=@$TEST_DIR/audio_1.mp3" \
  -F "image_0=@$TEST_DIR/image_0.jpg" \
  -F "image_1=@$TEST_DIR/image_1.jpg")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "202" ]; then
  echo "✓ Success! Response: $BODY"
else
  echo "✗ Failed! HTTP $HTTP_CODE: $BODY"
fi

echo ""
echo "=== Test 2: Too few tracks (1 track, should fail) ==="
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$SERVER_URL/api/render" \
  -F 'meta={"tracks":[{"title":"Track 1"}],"width":1920,"height":1080,"fps":30}' \
  -F "audio_0=@$TEST_DIR/audio_0.mp3" \
  -F "image_0=@$TEST_DIR/image_0.jpg")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly rejected! Response: $BODY"
else
  echo "✗ Unexpected! HTTP $HTTP_CODE: $BODY"
fi

echo ""
echo "=== Test 3: Missing audio file (should fail) ==="
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$SERVER_URL/api/render" \
  -F 'meta={"tracks":[{"title":"Track 1"},{"title":"Track 2"}],"width":1920,"height":1080,"fps":30}' \
  -F "audio_0=@$TEST_DIR/audio_0.mp3" \
  -F "image_0=@$TEST_DIR/image_0.jpg" \
  -F "image_1=@$TEST_DIR/image_1.jpg")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ Correctly rejected! Response: $BODY"
else
  echo "✗ Unexpected! HTTP $HTTP_CODE: $BODY"
fi

echo ""
echo "=== Test 4: Invalid file type (should fail) ==="
echo "invalid" > "$TEST_DIR/invalid.txt"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$SERVER_URL/api/render" \
  -F 'meta={"tracks":[{"title":"Track 1"},{"title":"Track 2"}],"width":1920,"height":1080,"fps":30}' \
  -F "audio_0=@$TEST_DIR/invalid.txt" \
  -F "audio_1=@$TEST_DIR/audio_1.mp3" \
  -F "image_0=@$TEST_DIR/image_0.jpg" \
  -F "image_1=@$TEST_DIR/image_1.jpg")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "415" ]; then
  echo "✓ Correctly rejected! Response: $BODY"
else
  echo "✗ Unexpected! HTTP $HTTP_CODE: $BODY"
fi

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "All tests completed!"

