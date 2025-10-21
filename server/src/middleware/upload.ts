import multer from 'multer';
import { Request } from 'express';
import { config } from '../config.js';
import { AUDIO_MIMETYPES, IMAGE_MIMETYPES } from '../types.js';

const storage = multer.memoryStorage();

/**
 * Get file extension from filename
 */
const getExtension = (filename: string): string => {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
};

/**
 * File filter to validate audio and image file types
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const fieldName = file.fieldname;
  const ext = getExtension(file.originalname);

  // Check if it's an audio file
  if (fieldName.startsWith('audio_')) {
    const allowedExts = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'];
    const isValidMime = AUDIO_MIMETYPES.includes(file.mimetype);
    const isValidExt = allowedExts.includes(ext);
    
    // Accept if either mimetype or extension is valid
    // (Some clients may send generic mimetype like application/octet-stream)
    if (isValidMime || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio file type: ${ext || file.mimetype}. Allowed types: mp3, wav, m4a, aac, flac, ogg`));
    }
    return;
  }

  // Check if it's an image file
  if (fieldName.startsWith('image_')) {
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    const isValidMime = IMAGE_MIMETYPES.includes(file.mimetype);
    const isValidExt = allowedExts.includes(ext);
    
    // Accept if either mimetype or extension is valid
    if (isValidMime || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image file type: ${ext || file.mimetype}. Allowed types: jpg, jpeg, png, webp`));
    }
    return;
  }

  // Unknown field
  cb(new Error(`Unknown file field: ${fieldName}`));
};

/**
 * Multer configuration for handling file uploads
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileMB * 1024 * 1024, // per file limit
    files: 20, // max 10 tracks * 2 files per track
  },
});

