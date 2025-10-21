export const config = {
  server: {
    port: parseInt(process.env.SERVER_PORT || '8080', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  upload: {
    maxFileMB: parseInt(process.env.MAX_FILE_MB || '100', 10),
    maxTotalMB: parseInt(process.env.MAX_TOTAL_MB || '600', 10),
  },
  cleanup: {
    minutes: parseInt(process.env.CLEANUP_MINUTES || '15', 10),
  },
  ffmpeg: {
    path: process.env.FFMPEG_PATH || 'ffmpeg',
  },
};

