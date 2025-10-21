

```
audio2mp4-web/
  docs/               # put this file here
  client/             # Vite + React (TS)
  server/             # Express (TS)
  package.json        # root (workspaces + scripts)
  README.md
```

---

## T0 — Init repo and workspace

* Create a new git repo `audio2mp4-web`.
* Add root `package.json` with npm workspaces: `["client","server"]`.
* Add `.gitignore` for Node, logs, dist, uploads, temp.
* Add `README.md` linking to `docs/cursor_tasks.md`.

**Done when:** `npm -v` works, `git status` clean.

---

## T1 — Client scaffold (Vite + React + TS)

* In `client/`, scaffold Vite React TS.
* Add minimal pages: `App.tsx`, `styles.css`.
* Add components: `TrackList`, `PresetSelect`, `RenderPanel`.
* State shape: `tracks: {id, title?, audioFile, imageFile}[]`.
* Drag-reorder using HTML5 DnD.
* Validate: 2–10 rows, each has audio+image.

**Done when:** `npm run dev:client` shows the UI, can add rows and reorder (no backend calls yet).

---

## T2 — Server scaffold (Express + TS)

* In `server/`, set up TypeScript Express.
* Env: `SERVER_PORT=8080`, `CORS_ORIGIN=http://localhost:5173` (or your Vite port).
* Middlewares: CORS, JSON, health route `POST /api/ping -> {ok:true}`.

**Done when:** `npm run dev:server` starts server and `curl /api/ping` returns `{ok:true}`.

---

## T3 — Upload endpoint with Multer

* Route: `POST /api/render`
* Accept `multipart/form-data`:

  * field `meta` JSON: `{ tracks:[{title?}], width, height, fps }`
  * files: `image_0..n`, `audio_0..n`
* Validate:

  * 2 ≤ tracks ≤ 10
  * audio types: mp3,wav,m4a,aac,flac,ogg
  * image types: jpg,png,webp
  * per-file size ≤ `MAX_FILE_MB` (default 100)
  * total payload ≤ `MAX_TOTAL_MB` (default 600)
* Create a per-job temp dir under OS tmp, save files there.
* Return `202 { jobId }`, then start async render job.

**Done when:** You can POST a small 2-track form via `curl` and receive `{jobId}`.

---

## T4 — SSE progress stream

* Route: `GET /api/render/:jobId/log` (Server-Sent Events).
* Emit events:

  * `event: log`, `data: <text line>`
  * `event: progress`, JSON `{ step: "segment"|"concat", index?, total? }`
  * `event: done`, JSON `{ downloadUrl: "/api/render/:jobId/download" }`
  * `event: error`, `data: <message>`
* Tie this to an in-memory emitter keyed by `jobId`.

**Done when:** Opening the SSE URL streams a heartbeat or a fake log.

---

## T5 — FFmpeg integration

* For each track i, build a segment:

  * Command:

    ```
    ffmpeg -y -loop 1 -i cover_i -i audio_i \
      -c:v libx264 -tune stillimage -pix_fmt yuv420p \
      -vf "scale=<W>:-2,pad=<W>:<H>:(ow-iw)/2:(oh-ih)/2" \
      -r <FPS> -c:a aac -shortest -movflags +faststart seg_i.mp4
    ```
* Build `list.txt` with lines:

  ```
  file 'seg_01.mp4'
  file 'seg_02.mp4'
  ```
* Concat:

  ```
  ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp4
  ```
* Pipe ffmpeg stderr lines to SSE `log`, emit `progress` before each segment and before concat.

**Done when:** Small test job produces `output.mp4` in the temp dir.

---

## T6 — Download route

* Route: `GET /api/render/:jobId/download`
* Serve `output.mp4` with `Content-Disposition: attachment`.

**Done when:** Browser downloads the file and it plays.

---

## T7 — Client ↔ Server wiring

* On **Render** button:

  * Build `FormData`: `meta` JSON + `image_0..n` + `audio_0..n`.
  * POST `/api/render` → `{jobId}`.
  * Open `EventSource(/api/render/:jobId/log)`.
  * Show live logs, progress, and **Download** link on `done`.
* Presets: 1920x1080x30, 1080x1080x30, 1080x1920x30.

**Done when:** Full flow works end to end for 2–3 tracks.

---

## T8 — Limits, cleanup, errors

* Enforce file type/size checks, return clear 400/413/415 messages.
* Concurrency: single active job per process, return 429 if busy.
* Cleanup: delete job temp dir 15 minutes after `done` or `error`.
* Config via env: `MAX_FILE_MB`, `MAX_TOTAL_MB`, `CLEANUP_MINUTES`, `FFMPEG_PATH`.

**Done when:** Invalid uploads get proper errors, temp dirs are removed.

---

## T9 — Accessibility + polish

* Keyboard-accessible reordering (Up/Down buttons fallback).
* Labels, focus states, `aria-live` for progress log.
* Visual hints and disabled state during render.

**Done when:** Basic a11y checks pass and UI feels responsive.

---

## T10 — Packaging & single-binary deploy (optional)

* Build client and serve static from Express (`app.use(express.static("public"))`).
* `npm run build` copies `client/dist` into `server/public`.
* Start with PM2 or Docker; set Nginx `client_max_body_size 800m`.

**Done when:** One command starts both API and static client on a VPS.

---

## Checkpoints (commit messages)

* `chore: init repo, workspaces, readme`
* `feat(client): scaffold UI, track list, dnd`
* `feat(server): express ts boilerplate + health`
* `feat(server): upload route with multer + validation`
* `feat(server): sse stream for job progress`
* `feat(server): ffmpeg segment + concat`
* `feat(server): download route`
* `feat(client): wire api + sse + download`
* `feat: limits, cleanup, errors`
* `feat: accessibility and ui polish`
* `build: static serve + deploy notes`

---

## Acceptance tests

* Import 2–10 tracks, each with image, reorder, render, download plays correctly.
* Three presets frame images correctly with padding.
* Invalid file types and oversize uploads rejected with clear messages.
* Temp folders deleted after completion.
* If a second render is triggered while one is running, server returns 429.

---


