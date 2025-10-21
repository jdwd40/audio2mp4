export interface Track {
  title?: string;
}

export interface RenderMeta {
  tracks: Track[];
  width: number;
  height: number;
  fps: number;
}

export interface JobData {
  id: string;
  meta: RenderMeta;
  tempDir: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export const ALLOWED_AUDIO_TYPES = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'];
export const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp'];

export const AUDIO_MIMETYPES = [
  'audio/mpeg',          // mp3
  'audio/wav',           // wav
  'audio/x-wav',         // wav
  'audio/mp4',           // m4a
  'audio/x-m4a',         // m4a
  'audio/aac',           // aac
  'audio/flac',          // flac
  'audio/ogg',           // ogg
  'audio/x-flac',        // flac
];

export const IMAGE_MIMETYPES = [
  'image/jpeg',          // jpg, jpeg
  'image/png',           // png
  'image/webp',          // webp
];

