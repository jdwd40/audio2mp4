import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { upload } from '../middleware/upload.js';
import { jobStore } from '../jobStore.js';
import { RenderMeta, JobData } from '../types.js';
import { config } from '../config.js';
import { jobEventEmitter } from '../eventEmitter.js';

export const renderRouter = Router();

/**
 * POST /api/render
 * Accept multipart/form-data with metadata and files
 * Returns 202 { jobId }
 */
renderRouter.post('/render', upload.any(), async (req: Request, res: Response) => {
  try {
    // Check if another job is already processing
    if (jobStore.isJobActive()) {
      return res.status(429).json({
        error: 'Server is busy processing another job. Please try again later.',
      });
    }

    // Parse metadata
    const metaString = req.body.meta;
    if (!metaString) {
      return res.status(400).json({ error: 'Missing meta field in request' });
    }

    let meta: RenderMeta;
    try {
      meta = JSON.parse(metaString);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON in meta field' });
    }

    // Validate metadata structure
    if (!meta.tracks || !Array.isArray(meta.tracks)) {
      return res.status(400).json({ error: 'meta.tracks must be an array' });
    }

    if (meta.tracks.length < 2 || meta.tracks.length > 10) {
      return res.status(400).json({
        error: `Number of tracks must be between 2 and 10, got ${meta.tracks.length}`,
      });
    }

    if (!meta.width || !meta.height || !meta.fps) {
      return res.status(400).json({
        error: 'meta must include width, height, and fps',
      });
    }

    // Validate files
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Calculate total payload size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    if (totalSizeMB > config.upload.maxTotalMB) {
      return res.status(413).json({
        error: `Total payload size (${totalSizeMB.toFixed(2)}MB) exceeds limit of ${config.upload.maxTotalMB}MB`,
      });
    }

    // Organize files by track index
    const audioFiles = new Map<number, Express.Multer.File>();
    const imageFiles = new Map<number, Express.Multer.File>();

    for (const file of files) {
      const match = file.fieldname.match(/^(audio|image)_(\d+)$/);
      if (!match) {
        return res.status(400).json({
          error: `Invalid field name: ${file.fieldname}. Expected format: audio_N or image_N`,
        });
      }

      const [, type, indexStr] = match;
      const index = parseInt(indexStr, 10);

      if (index < 0 || index >= meta.tracks.length) {
        return res.status(400).json({
          error: `File index ${index} out of range (tracks: ${meta.tracks.length})`,
        });
      }

      if (type === 'audio') {
        if (audioFiles.has(index)) {
          return res.status(400).json({
            error: `Duplicate audio file for track ${index}`,
          });
        }
        audioFiles.set(index, file);
      } else {
        if (imageFiles.has(index)) {
          return res.status(400).json({
            error: `Duplicate image file for track ${index}`,
          });
        }
        imageFiles.set(index, file);
      }
    }

    // Validate that each track has both audio and image
    for (let i = 0; i < meta.tracks.length; i++) {
      if (!audioFiles.has(i)) {
        return res.status(400).json({
          error: `Missing audio file for track ${i}`,
        });
      }
      if (!imageFiles.has(i)) {
        return res.status(400).json({
          error: `Missing image file for track ${i}`,
        });
      }
    }

    // Create job
    const jobId = randomUUID();
    const tempDir = await mkdtemp(join(tmpdir(), `audio2mp4-${jobId}-`));

    // Save files to temp directory
    for (let i = 0; i < meta.tracks.length; i++) {
      const audioFile = audioFiles.get(i)!;
      const imageFile = imageFiles.get(i)!;

      // Get file extensions
      const audioExt = getFileExtension(audioFile.originalname) || 'mp3';
      const imageExt = getFileExtension(imageFile.originalname) || 'jpg';

      // Save files with standardized names
      await writeFile(
        join(tempDir, `audio_${i}.${audioExt}`),
        audioFile.buffer
      );
      await writeFile(
        join(tempDir, `image_${i}.${imageExt}`),
        imageFile.buffer
      );
    }

    // Create job data
    const jobData: JobData = {
      id: jobId,
      meta,
      tempDir,
      status: 'pending',
      createdAt: new Date(),
    };

    jobStore.set(jobId, jobData);

    // TODO: Start async render job (will be implemented in T5)
    // For now, just mark as pending
    console.log(`Job ${jobId} created in ${tempDir}`);
    console.log(`  Tracks: ${meta.tracks.length}`);
    console.log(`  Dimensions: ${meta.width}x${meta.height}@${meta.fps}fps`);
    console.log(`  Total size: ${totalSizeMB.toFixed(2)}MB`);

    // Return 202 Accepted with jobId
    return res.status(202).json({ jobId });

  } catch (error) {
    console.error('Error in /api/render:', error);
    
    // Handle specific multer errors
    if (error instanceof Error) {
      if (error.message.includes('File too large')) {
        return res.status(413).json({
          error: `File size exceeds limit of ${config.upload.maxFileMB}MB`,
        });
      }
      if (error.message.includes('Invalid')) {
        return res.status(415).json({ error: error.message });
      }
    }

    return res.status(500).json({
      error: 'Internal server error while processing upload',
    });
  }
});

/**
 * GET /api/render/:jobId/log
 * Server-Sent Events endpoint for job progress
 */
renderRouter.get('/render/:jobId/log', (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Check if job exists
  const job = jobStore.get(jobId);
  if (!job) {
    return res.status(404).json({ error: `Job ${jobId} not found` });
  }

  // Register SSE connection
  jobEventEmitter.registerConnection(jobId, res);

  console.log(`SSE connection established for job ${jobId}`);

  // Send a welcome log message
  jobEventEmitter.emitLog(jobId, `Connected to job ${jobId}`);

  // For testing purposes, send some fake progress updates
  // This demonstrates the SSE functionality until T5 implements real FFmpeg processing
  setTimeout(() => {
    jobEventEmitter.emitLog(jobId, 'Job processing will begin...');
  }, 1000);

  setTimeout(() => {
    jobEventEmitter.emitProgress(jobId, {
      step: 'segment',
      index: 0,
      total: job.meta.tracks.length,
    });
  }, 2000);

  setTimeout(() => {
    jobEventEmitter.emitLog(jobId, `Simulating processing of ${job.meta.tracks.length} tracks`);
  }, 3000);

  // Note: In T5, the actual render process will emit real events
  // For now, this heartbeat demonstrates the SSE connection works
});

/**
 * Helper function to extract file extension
 */
function getFileExtension(filename: string): string | null {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
}

