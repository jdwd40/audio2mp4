Nova here, active. Below is a **lean, LLM-efficient spec** for your web app.

# Spec: Multi-Track Audio + Cover → Single MP4 (Web)

## Goal

User drags in **2–10 audio files** and **2–10 cover images**, pairs each audio with a cover, **reorders tracks**, clicks **Render**, then **downloads one MP4** where each track’s cover is shown for the duration of its audio.

## Core UX

* **Canvas presets**: 1920x1080, 1080x1080, 1080x1920 at 30fps.
* **Drag-and-drop** area accepts audio files; auto-creates rows in order 1…N.
* Each row shows:

  * Index, optional title
  * **Cover picker** (image file)
  * **Audio filename** (readonly)
  * Drag handle to reorder
  * Delete row
* **Add row** button to insert more pairs (up to 10).
* **Render MP4** button, **progress log** panel, **Download** button when done.
* Validate before submit: 2–10 rows, each with audio + image.

## File Types & Limits

* Audio: `.mp3, .wav, .m4a, .aac, .flac, .ogg` (reject others)
* Images: `.jpg, .png, .webp`
* Default per-file limit: 100 MB. Default total payload limit: 600 MB.
* Reject with clear errors.

## Output

* Single **H.264 + AAC MP4**, yuv420p, faststart.
* Each track segment uses its cover, scaled and padded to match preset, image loops for **exact audio duration**.
* Segments concatenated in order, no re-encode on concat step.

## Frontend (Vite + React, TS)

* State: array of `{ id, title?, audioFile, imageFile }`.
* Reorder via HTML5 drag-and-drop.
* On **Render**:

  * Build `FormData`:

    * `meta` JSON: `{ tracks:[{title?}], width, height, fps }`
    * Files: `image_0..n`, `audio_0..n` matching track order
  * `POST /api/render` → `{ jobId }`
  * Open `EventSource /api/render/:jobId/log`:

    * `log` events → append lines
    * `progress` events → show step and counts
    * `done` → show `downloadUrl`
    * `error` → show message
* After completion: click **Download** to GET MP4.

## Backend (Node + Express, TS)

* Middleware: `multer` for multipart, size limits from env.
* Routes:

  * `POST /api/render`

    * Validate counts/types/limits, create `jobId`, store files to temp dir.
    * Kick off async render, return 202 `{ jobId }`.
  * `GET /api/render/:jobId/log` (SSE)

    * Stream `log`, `progress`, `done | error`.
  * `GET /api/render/:jobId/download`

    * Serve MP4 with `Content-Disposition: attachment`.
  * `POST /api/ping` → `{ ok: true }`.
* Rendering (FFmpeg):

  * For each track i:

    ```
    ffmpeg -y -loop 1 -i cover_i -i audio_i \
      -c:v libx264 -tune stillimage -pix_fmt yuv420p \
      -vf "scale=<W>:-2,pad=<W>:<H>:(ow-iw)/2:(oh-ih)/2" \
      -r <FPS> -c:a aac -shortest -movflags +faststart seg_i.mp4
    ```
  * Write `list.txt` with `file 'seg_i.mp4'` lines.
  * Concat:

    ```
    ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp4
    ```
  * Emit SSE `progress` before each segment and before concat. Pipe ffmpeg stderr to `log`.

## Data & Storage

* Temp working directory per `jobId` under OS temp.
* Artefacts: uploaded files, `seg_*.mp4`, `list.txt`, `output.mp4`.
* Cleanup temp dir **15 minutes** after job completion or failure.

## Errors & Edge Cases

* `<2` or `>10` tracks → 400.
* Missing image/audio in any row → 400.
* Type/size violations → 415/413 with clear reason.
* FFmpeg failure → SSE `error` + 500, clean temp.
* Concurrency: allow **one active job per process**; else 429 with “try later”.

## Security

* CORS allowlist for dev origin.
* Multer disk storage with safe filenames, no path traversal.
* Never interpolate user strings into shell, pass as args only.
* Limit request body size.

## Accessibility

* Keyboard reordering fallback (Up/Down buttons).
* Labels on inputs, visible focus states, live region for progress.

## Config (ENV)

* `SERVER_PORT` default 8080
* `CORS_ORIGIN`
* `MAX_FILE_MB` default 100
* `MAX_TOTAL_MB` default 600
* `CLEANUP_MINUTES` default 15
* `FFMPEG_PATH` optional, else `ffmpeg` in PATH

## Acceptance Criteria

* User can import 2–10 audio files, pair each with an image, reorder tracks.
* Render produces a single MP4 with correct order and durations.
* Three presets produce correctly sized video with padded covers.
* Download works in major browsers.
* Large invalid uploads are blocked with clear messages.
* Temp files are removed after completion.

## Nice-to-Have (later)

* Per-track text overlay via `drawtext`.
* Crossfade between segments, configurable seconds.
* Queue and multi-job support with simple job status endpoint.
* Auth and short-term output caching.

If you want, I can wrap this as a **Cursor task list** next, with file scaffolding steps and commit checkpoints.
