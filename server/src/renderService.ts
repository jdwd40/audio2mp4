import { spawn } from 'child_process';
import { readdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { jobStore } from './jobStore.js';
import { jobEventEmitter } from './eventEmitter.js';
import { config } from './config.js';
import { JobData } from './types.js';

/**
 * Start the render process for a job
 */
export async function startRenderJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  try {
    // Mark this job as active
    jobStore.setActiveJob(jobId);
    
    // Update job status to processing
    jobStore.updateStatus(jobId, 'processing');
    jobEventEmitter.emitLog(jobId, 'Starting render job...');
    jobEventEmitter.emitLog(jobId, `Processing ${job.meta.tracks.length} tracks at ${job.meta.width}x${job.meta.height}@${job.meta.fps}fps`);

    // Process each track to create segments
    const segmentFiles: string[] = [];
    
    for (let i = 0; i < job.meta.tracks.length; i++) {
      const trackTitle = job.meta.tracks[i].title || `Track ${i + 1}`;
      
      jobEventEmitter.emitProgress(jobId, {
        step: 'segment',
        index: i,
        total: job.meta.tracks.length,
      });
      
      jobEventEmitter.emitLog(jobId, `[${i + 1}/${job.meta.tracks.length}] Processing: ${trackTitle}`);
      
      const segmentPath = await renderSegment(job, i);
      segmentFiles.push(segmentPath);
      
      jobEventEmitter.emitLog(jobId, `[${i + 1}/${job.meta.tracks.length}] Segment complete`);
    }

    // Concatenate all segments
    jobEventEmitter.emitProgress(jobId, {
      step: 'concat',
    });
    
    jobEventEmitter.emitLog(jobId, 'Concatenating segments...');
    
    const outputPath = await concatenateSegments(job, segmentFiles);
    
    jobEventEmitter.emitLog(jobId, 'Render complete!');
    
    // Update job status and emit done event
    jobStore.updateStatus(jobId, 'done');
    jobStore.clearActiveJob();
    jobEventEmitter.emitDone(jobId, `/api/render/${jobId}/download`);
    
    // Schedule cleanup
    scheduleCleanup(jobId);
    
  } catch (error) {
    console.error(`Error rendering job ${jobId}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    jobStore.updateStatus(jobId, 'error', errorMessage);
    jobStore.clearActiveJob();
    jobEventEmitter.emitError(jobId, `Render failed: ${errorMessage}`);
    
    // Schedule cleanup even on error
    scheduleCleanup(jobId);
  }
}

/**
 * Render a single segment (image + audio -> video)
 */
async function renderSegment(job: JobData, index: number): Promise<string> {
  const { tempDir, meta } = job;
  
  // Find audio and image files for this index
  const files = await readdir(tempDir);
  const audioFile = files.find(f => f.startsWith(`audio_${index}.`));
  const imageFile = files.find(f => f.startsWith(`image_${index}.`));
  
  if (!audioFile || !imageFile) {
    throw new Error(`Missing files for track ${index}`);
  }
  
  const audioPath = join(tempDir, audioFile);
  const imagePath = join(tempDir, imageFile);
  const segmentPath = join(tempDir, `seg_${String(index + 1).padStart(2, '0')}.mp4`);
  
  // Build FFmpeg command
  // ffmpeg -y -loop 1 -i cover_i -i audio_i \
  //   -c:v libx264 -tune stillimage -pix_fmt yuv420p \
  //   -vf "scale=W:-2,pad=W:H:(ow-iw)/2:(oh-ih)/2" \
  //   -r FPS -c:a aac -shortest -movflags +faststart seg_i.mp4
  
  const args = [
    '-y', // Overwrite output files
    '-loop', '1', // Loop the image
    '-i', imagePath,
    '-i', audioPath,
    '-c:v', 'libx264',
    '-tune', 'stillimage',
    '-pix_fmt', 'yuv420p',
    // Scale to fit within target dimensions (maintain aspect ratio), then pad to exact size
    '-vf', `scale=${meta.width}:${meta.height}:force_original_aspect_ratio=decrease,pad=${meta.width}:${meta.height}:(ow-iw)/2:(oh-ih)/2`,
    '-r', String(meta.fps),
    '-c:a', 'aac',
    '-shortest', // End when audio ends
    '-movflags', '+faststart',
    segmentPath,
  ];
  
  await runFFmpeg(job.id, args);
  
  return segmentPath;
}

/**
 * Concatenate multiple segments into final output
 */
async function concatenateSegments(job: JobData, segmentFiles: string[]): Promise<string> {
  const { tempDir } = job;
  
  // Create list.txt for concat demuxer
  // file 'seg_01.mp4'
  // file 'seg_02.mp4'
  const listContent = segmentFiles
    .map(file => `file '${file.replace(/\\/g, '/')}'`) // Use forward slashes for cross-platform
    .join('\n');
  
  const listPath = join(tempDir, 'list.txt');
  await writeFile(listPath, listContent, 'utf-8');
  
  const outputPath = join(tempDir, 'output.mp4');
  
  // ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp4
  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    outputPath,
  ];
  
  await runFFmpeg(job.id, args);
  
  return outputPath;
}

/**
 * Execute FFmpeg with given arguments and stream output to SSE
 */
function runFFmpeg(jobId: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = config.ffmpeg.path;
    
    // Log the command being executed
    jobEventEmitter.emitLog(jobId, `$ ${ffmpegPath} ${args.join(' ')}`);
    
    const proc = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stderrBuffer = '';
    
    // Capture stdout (usually not much from FFmpeg)
    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      jobEventEmitter.emitLog(jobId, text);
    });
    
    // Capture stderr (where FFmpeg writes progress and logs)
    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderrBuffer += text;
      
      // Emit line by line
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() || ''; // Keep the last incomplete line
      
      for (const line of lines) {
        if (line.trim()) {
          jobEventEmitter.emitLog(jobId, line);
        }
      }
    });
    
    proc.on('error', (error) => {
      reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
    });
    
    proc.on('close', (code) => {
      // Emit any remaining buffer
      if (stderrBuffer.trim()) {
        jobEventEmitter.emitLog(jobId, stderrBuffer);
      }
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Schedule cleanup of job temp directory after configured time
 */
function scheduleCleanup(jobId: string): void {
  const cleanupMs = config.cleanup.minutes * 60 * 1000;
  
  setTimeout(async () => {
    const job = jobStore.get(jobId);
    if (!job) return;
    
    try {
      await rm(job.tempDir, { recursive: true, force: true });
      console.log(`Cleaned up temp directory for job ${jobId}`);
      
      // Clean up event emitter
      jobEventEmitter.cleanup(jobId);
      
      // Remove from job store
      jobStore.delete(jobId);
    } catch (error) {
      console.error(`Error cleaning up job ${jobId}:`, error);
    }
  }, cleanupMs);
  
  console.log(`Scheduled cleanup for job ${jobId} in ${config.cleanup.minutes} minutes`);
}

