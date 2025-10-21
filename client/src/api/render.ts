/**
 * API client for render endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface RenderJobResponse {
  jobId: string;
}

export interface RenderMeta {
  tracks: { title?: string }[];
  width: number;
  height: number;
  fps: number;
}

export type LogEventHandler = (message: string) => void;
export type ProgressEventHandler = (data: { step: 'segment' | 'concat'; index?: number; total?: number }) => void;
export type DoneEventHandler = (downloadUrl: string) => void;
export type ErrorEventHandler = (message: string) => void;

export interface RenderEventHandlers {
  onLog?: LogEventHandler;
  onProgress?: ProgressEventHandler;
  onDone?: DoneEventHandler;
  onError?: ErrorEventHandler;
}

/**
 * Submit a render job to the backend
 */
export async function submitRenderJob(
  meta: RenderMeta,
  audioFiles: File[],
  imageFiles: File[]
): Promise<RenderJobResponse> {
  const formData = new FormData();
  
  // Add metadata as JSON string
  formData.append('meta', JSON.stringify(meta));
  
  // Add audio files
  audioFiles.forEach((file, index) => {
    formData.append(`audio_${index}`, file);
  });
  
  // Add image files
  imageFiles.forEach((file, index) => {
    formData.append(`image_${index}`, file);
  });
  
  const response = await fetch(`${API_BASE}/api/render`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Server error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Connect to job progress SSE stream
 */
export function connectToJobProgress(
  jobId: string,
  handlers: RenderEventHandlers
): EventSource {
  const eventSource = new EventSource(`${API_BASE}/api/render/${jobId}/log`);
  
  eventSource.addEventListener('log', (event) => {
    handlers.onLog?.(event.data);
  });
  
  eventSource.addEventListener('progress', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onProgress?.(data);
    } catch (error) {
      console.error('Failed to parse progress event:', error);
    }
  });
  
  eventSource.addEventListener('done', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onDone?.(data.downloadUrl);
    } catch (error) {
      console.error('Failed to parse done event:', error);
    }
  });
  
  eventSource.addEventListener('error', (event) => {
    handlers.onError?.(event.data);
  });
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
  };
  
  return eventSource;
}

/**
 * Get download URL for a completed job
 */
export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/render/${jobId}/download`;
}

